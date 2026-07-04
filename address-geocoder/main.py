"""Occu-Med Global Address Geocoder.

Streamlit + Render + Neon Postgres shared cache + free Nominatim fallback.
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any

import pandas as pd
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
import requests
import streamlit as st

try:
    import plotly.express as px
except Exception:
    px = None

try:
    import pycountry
except Exception:
    pycountry = None

APP_TITLE = "Global Address Geocoder"
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
NOMINATIM_BASE_URL = os.getenv("NOMINATIM_BASE_URL", "https://nominatim.openstreetmap.org/search")
GEOCODER_USER_AGENT = os.getenv("GEOCODER_USER_AGENT", "OccuMedAddressGeocoder/1.0")
GEOCODER_ANALYST = os.getenv("GEOCODER_ANALYST", "").strip()
APP_ACCESS_PASSWORD = os.getenv("APP_ACCESS_PASSWORD", "").strip()
RATE_LIMIT_SECONDS = float(os.getenv("NOMINATIM_DELAY_SECONDS", "1.1"))

OUTPUT_COLUMNS = [
    "latitude",
    "longitude",
    "geocode_status",
    "geocode_source",
    "geocode_confidence",
    "normalized_address",
    "geocode_display_name",
    "geocode_error",
    "country_context_used",
    "geocode_address_hash",
    "geocode_usage_count",
    "geocode_manual_override",
]

FALLBACK_COUNTRIES = [
    {"name": "United States", "alpha_2": "US", "alpha_3": "USA"},
    {"name": "Canada", "alpha_2": "CA", "alpha_3": "CAN"},
    {"name": "United Kingdom", "alpha_2": "GB", "alpha_3": "GBR"},
    {"name": "Australia", "alpha_2": "AU", "alpha_3": "AUS"},
    {"name": "Germany", "alpha_2": "DE", "alpha_3": "DEU"},
    {"name": "France", "alpha_2": "FR", "alpha_3": "FRA"},
    {"name": "Mexico", "alpha_2": "MX", "alpha_3": "MEX"},
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# -----------------------------
# Shared Neon cache
# -----------------------------


@st.cache_resource(show_spinner=False)
def get_connection(database_url: str) -> psycopg.Connection:
    if not database_url:
        raise RuntimeError("DATABASE_URL is missing. Add the Neon connection string in Render environment variables.")
    conn = psycopg.connect(database_url, autocommit=True, row_factory=dict_row)
    ensure_schema(conn)
    return conn


def ensure_schema(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS geocode_cache (
                id BIGSERIAL PRIMARY KEY,
                address_hash TEXT UNIQUE NOT NULL,
                raw_address TEXT,
                normalized_address TEXT NOT NULL,
                country_name TEXT,
                country_code TEXT,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                geocode_status TEXT NOT NULL,
                geocode_source TEXT,
                geocode_confidence DOUBLE PRECISION,
                display_name TEXT,
                error TEXT,
                provider_response_json JSONB,
                usage_count INTEGER NOT NULL DEFAULT 1,
                first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by TEXT,
                manual_override_lat DOUBLE PRECISION,
                manual_override_lng DOUBLE PRECISION,
                manual_override_reason TEXT,
                reviewed_by TEXT,
                reviewed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        columns = {
            "address_hash": "TEXT",
            "raw_address": "TEXT",
            "normalized_address": "TEXT",
            "country_name": "TEXT",
            "country_code": "TEXT",
            "latitude": "DOUBLE PRECISION",
            "longitude": "DOUBLE PRECISION",
            "geocode_status": "TEXT",
            "geocode_source": "TEXT",
            "geocode_confidence": "DOUBLE PRECISION",
            "display_name": "TEXT",
            "error": "TEXT",
            "provider_response_json": "JSONB",
            "usage_count": "INTEGER DEFAULT 1",
            "first_seen_at": "TIMESTAMPTZ DEFAULT NOW()",
            "last_used_at": "TIMESTAMPTZ DEFAULT NOW()",
            "created_by": "TEXT",
            "manual_override_lat": "DOUBLE PRECISION",
            "manual_override_lng": "DOUBLE PRECISION",
            "manual_override_reason": "TEXT",
            "reviewed_by": "TEXT",
            "reviewed_at": "TIMESTAMPTZ",
            "created_at": "TIMESTAMPTZ DEFAULT NOW()",
            "updated_at": "TIMESTAMPTZ DEFAULT NOW()",
        }
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema='public' AND table_name='geocode_cache'
            """
        )
        existing = {row["column_name"] for row in cur.fetchall()}
        for name, col_type in columns.items():
            if name not in existing:
                cur.execute(f"ALTER TABLE geocode_cache ADD COLUMN IF NOT EXISTS {name} {col_type}")
        cur.execute("UPDATE geocode_cache SET usage_count = COALESCE(usage_count, 1) WHERE usage_count IS NULL")
        cur.execute("UPDATE geocode_cache SET geocode_status = COALESCE(geocode_status, 'unknown') WHERE geocode_status IS NULL")
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_geocode_cache_address_hash_unique ON geocode_cache(address_hash)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_geocode_cache_country_code ON geocode_cache(country_code)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_geocode_cache_last_used_at ON geocode_cache(last_used_at DESC)")


def parse_json_payload(value: Any) -> Any:
    if value in (None, ""):
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {"raw": value}
    return value


def lookup_cache(conn: psycopg.Connection, address_hash: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM geocode_cache WHERE address_hash=%s", (address_hash,))
        row = cur.fetchone()
        if not row:
            return None
        cur.execute(
            """
            UPDATE geocode_cache
            SET usage_count = COALESCE(usage_count, 0) + 1,
                last_used_at = NOW(),
                updated_at = NOW()
            WHERE address_hash=%s
            RETURNING *
            """,
            (address_hash,),
        )
        return dict(cur.fetchone())


def save_cache(conn: psycopg.Connection, record: dict[str, Any]) -> dict[str, Any]:
    payload = parse_json_payload(record.get("provider_response_json"))
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO geocode_cache (
                address_hash, raw_address, normalized_address, country_name, country_code,
                latitude, longitude, geocode_status, geocode_source, geocode_confidence,
                display_name, error, provider_response_json, usage_count, first_seen_at,
                last_used_at, created_by, created_at, updated_at
            ) VALUES (
                %(address_hash)s, %(raw_address)s, %(normalized_address)s, %(country_name)s, %(country_code)s,
                %(latitude)s, %(longitude)s, %(geocode_status)s, %(geocode_source)s, %(geocode_confidence)s,
                %(display_name)s, %(error)s, %(provider_response_json)s, 1, NOW(), NOW(), %(created_by)s, NOW(), NOW()
            )
            ON CONFLICT (address_hash) DO UPDATE SET
                usage_count = geocode_cache.usage_count + 1,
                last_used_at = NOW(),
                updated_at = NOW()
            RETURNING *
            """,
            {
                **record,
                "provider_response_json": Jsonb(payload),
            },
        )
        return dict(cur.fetchone())


def cache_stats(conn: psycopg.Connection) -> dict[str, int]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE geocode_status='geocoded') AS geocoded,
                COUNT(*) FILTER (WHERE geocode_status='not_found') AS not_found,
                COUNT(*) FILTER (WHERE geocode_status='failed') AS failed,
                COALESCE(SUM(usage_count), 0) AS uses
            FROM geocode_cache
            """
        )
        row = cur.fetchone() or {}
        return {k: int(row.get(k) or 0) for k in ["total", "geocoded", "not_found", "failed", "uses"]}


# -----------------------------
# Address helpers
# -----------------------------


def clean_cell(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""
    return str(value).strip()


def normalize_address(text: str) -> str:
    text = text.lower().strip()
    replacements = {
        " street ": " st ",
        " avenue ": " ave ",
        " boulevard ": " blvd ",
        " drive ": " dr ",
        " road ": " rd ",
        " suite ": " ste ",
    }
    text = f" {text} "
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r",+", ",", text)
    text = re.sub(r"[^a-z0-9,#./&\- ]+", "", text)
    return text.strip(" ,")


def make_address_hash(normalized_address: str, country_code: str) -> str:
    key = f"{normalized_address}|{country_code.lower().strip()}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


@st.cache_data(show_spinner=False)
def country_options() -> list[dict[str, str]]:
    if pycountry is None:
        return FALLBACK_COUNTRIES
    out = []
    for country in pycountry.countries:
        name = getattr(country, "common_name", None) or getattr(country, "name", "")
        a2 = getattr(country, "alpha_2", "")
        a3 = getattr(country, "alpha_3", "")
        if name and a2 and a3:
            out.append({"name": name, "alpha_2": a2, "alpha_3": a3})
    return sorted(out, key=lambda c: c["name"])


def country_by_name(name: str) -> dict[str, str]:
    countries = country_options()
    for country in countries:
        if country["name"] == name:
            return country
    return countries[0]


def guess_country_code(value: str, selected: dict[str, str]) -> str:
    value = clean_cell(value)
    if not value:
        return selected["alpha_2"].lower()
    selected_values = {selected["name"].lower(), selected["alpha_2"].lower(), selected["alpha_3"].lower()}
    if value.lower() in selected_values:
        return selected["alpha_2"].lower()
    if pycountry is not None:
        try:
            match = pycountry.countries.lookup(value)
            return getattr(match, "alpha_2", "").lower()
        except LookupError:
            pass
    return value[:2].lower()


def build_address(row: pd.Series, columns: list[str], country_text: str, mode: str) -> str:
    parts = [clean_cell(row.get(col)) for col in columns]
    parts = [p for p in parts if p]
    if mode != "Do not append country context" and country_text:
        parts.append(country_text)
    return ", ".join(parts)


# -----------------------------
# Geocoder
# -----------------------------


def geocode_nominatim(raw_address: str, normalized_address: str, country_code: str) -> dict[str, Any]:
    headers = {"User-Agent": GEOCODER_USER_AGENT, "Accept": "application/json"}
    params: dict[str, Any] = {
        "q": raw_address,
        "format": "jsonv2",
        "limit": 1,
        "addressdetails": 1,
    }
    if country_code:
        params["countrycodes"] = country_code.lower()
    try:
        response = requests.get(NOMINATIM_BASE_URL, params=params, headers=headers, timeout=20)
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        return {
            "latitude": None,
            "longitude": None,
            "geocode_status": "failed",
            "geocode_source": "nominatim",
            "geocode_confidence": None,
            "display_name": None,
            "error": str(exc),
            "provider_response_json": None,
        }
    if not payload:
        return {
            "latitude": None,
            "longitude": None,
            "geocode_status": "not_found",
            "geocode_source": "nominatim",
            "geocode_confidence": None,
            "display_name": None,
            "error": "No result returned",
            "provider_response_json": [],
        }
    best = payload[0]
    return {
        "latitude": float(best["lat"]) if best.get("lat") else None,
        "longitude": float(best["lon"]) if best.get("lon") else None,
        "geocode_status": "geocoded",
        "geocode_source": "nominatim",
        "geocode_confidence": float(best.get("importance")) if best.get("importance") else None,
        "display_name": best.get("display_name"),
        "error": None,
        "provider_response_json": best,
    }


def record_to_output(record: dict[str, Any], status_override: str | None = None, country_context: str = "") -> dict[str, Any]:
    has_override = record.get("manual_override_lat") is not None and record.get("manual_override_lng") is not None
    lat = record.get("manual_override_lat") if has_override else record.get("latitude")
    lng = record.get("manual_override_lng") if has_override else record.get("longitude")
    return {
        "latitude": lat,
        "longitude": lng,
        "geocode_status": status_override or record.get("geocode_status"),
        "geocode_source": "manual_override" if has_override else record.get("geocode_source"),
        "geocode_confidence": record.get("geocode_confidence"),
        "normalized_address": record.get("normalized_address"),
        "geocode_display_name": record.get("display_name"),
        "geocode_error": record.get("error"),
        "country_context_used": country_context,
        "geocode_address_hash": record.get("address_hash"),
        "geocode_usage_count": record.get("usage_count"),
        "geocode_manual_override": has_override,
    }


def blank_output(status: str, normalized_address: str = "", error: str = "", country_context: str = "") -> dict[str, Any]:
    return {
        "latitude": None,
        "longitude": None,
        "geocode_status": status,
        "geocode_source": None,
        "geocode_confidence": None,
        "normalized_address": normalized_address,
        "geocode_display_name": None,
        "geocode_error": error,
        "country_context_used": country_context,
        "geocode_address_hash": None,
        "geocode_usage_count": None,
        "geocode_manual_override": False,
    }


# -----------------------------
# UI
# -----------------------------


def inject_css() -> None:
    st.markdown(
        """
        <style>
        :root{--bg:#020711;--panel:rgba(10,20,35,.64);--line:rgba(132,224,255,.28);--cyan:#76eaff;--blue:#78a8ff;--text:#f4fbff;--muted:rgba(232,246,255,.72)}
        .stApp{background:radial-gradient(circle at 10% 5%,rgba(74,128,255,.28),transparent 28%),radial-gradient(circle at 90% 10%,rgba(118,234,255,.22),transparent 25%),linear-gradient(135deg,#020711,#071225 48%,#01040a);color:var(--text)}
        .block-container{max-width:1220px;padding-top:1.2rem;padding-bottom:4rem}.stApp:before{content:"";position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:42px 42px;pointer-events:none;mask-image:radial-gradient(circle at center,black,transparent 74%)}
        h1,h2,h3,p,span,div,label{color:inherit}.liquid-card{background:linear-gradient(135deg,rgba(255,255,255,.10),rgba(255,255,255,.035));border:1px solid var(--line);box-shadow:0 24px 80px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.12);backdrop-filter:blur(24px);border-radius:30px;padding:26px;margin:16px 0}.hero{min-height:500px;display:grid;grid-template-columns:1.05fr .95fr;gap:28px;align-items:center}.brand{display:flex;align-items:center;gap:14px;font-weight:900;letter-spacing:.18em}.logo-mark{width:64px;height:40px;position:relative;filter:drop-shadow(0 0 18px rgba(140,235,255,.55))}.logo-mark:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#fff,#dff8ff);clip-path:path('M0 20A20 20 0 0 1 20 0H34V40H20A20 20 0 0 1 0 20ZM38 0H60V40H38V20A20 20 0 0 1 58 0Z')}.hero h1{font-size:clamp(2.8rem,6vw,5.8rem);line-height:.92;margin:22px 0 14px;letter-spacing:-.07em}.muted{color:var(--muted)}.pill{display:inline-flex;gap:8px;align-items:center;border:1px solid rgba(118,234,255,.30);border-radius:999px;padding:8px 14px;background:rgba(118,234,255,.07);box-shadow:0 0 24px rgba(118,234,255,.10)}.metric-row{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.metric{background:rgba(255,255,255,.055);border:1px solid rgba(118,234,255,.18);border-radius:22px;padding:18px}.metric b{font-size:1.6rem;color:#aef5ff}.globe{width:280px;height:280px;margin:auto;border-radius:50%;position:relative;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.95),rgba(118,234,255,.34) 23%,rgba(63,113,255,.12) 56%,rgba(255,255,255,.03));box-shadow:0 0 80px rgba(118,234,255,.35),inset 0 0 60px rgba(255,255,255,.12);animation:spin 9s linear infinite}.globe:before,.globe:after{content:"";position:absolute;inset:18px;border:1px solid rgba(174,245,255,.42);border-radius:50%;transform:rotate(58deg)}.globe:after{inset:46px;transform:rotate(-28deg);border-color:rgba(120,168,255,.45)}@keyframes spin{to{transform:rotate(360deg)}}.code-stream{font-family:ui-monospace,Menlo,monospace;color:rgba(180,245,255,.58);font-size:.75rem;line-height:1.7;max-height:96px;overflow:hidden}.stButton>button,.stDownloadButton>button{border-radius:999px!important;border:1px solid rgba(118,234,255,.48)!important;background:linear-gradient(135deg,rgba(120,168,255,.95),rgba(118,234,255,.86))!important;color:#03111f!important;font-weight:850!important;box-shadow:0 0 34px rgba(118,234,255,.26)!important}.stTextInput input,div[data-baseweb='select']>div,div[data-testid='stFileUploader'] section{background:rgba(255,255,255,.055)!important;border:1px solid rgba(118,234,255,.22)!important;border-radius:18px!important;color:#f4fbff!important}.status-chip{display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(118,234,255,.10);border:1px solid rgba(118,234,255,.22);margin-right:8px}.footer{opacity:.65;text-align:center;padding:30px}.stProgress > div > div > div > div{background:linear-gradient(90deg,#78a8ff,#76eaff)!important}@media(max-width:900px){.hero{grid-template-columns:1fr}.metric-row{grid-template-columns:1fr 1fr}.hero h1{font-size:3rem}}
        </style>
        """,
        unsafe_allow_html=True,
    )


def brand_html() -> str:
    return """
    <div class="brand"><div class="logo-mark"></div><div>OCCU-MED</div></div>
    """


def render_header(country: str) -> None:
    st.markdown(
        f"""
        <div class="liquid-card" style="padding:18px 22px;display:flex;justify-content:space-between;align-items:center;">
            {brand_html()}
            <div class="pill">Selected country: <b>{country}</b></div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_hero() -> None:
    st.markdown(
        f"""
        <div class="liquid-card hero">
            <div>
                {brand_html()}
                <div class="pill" style="margin-top:26px;">Shared Neon cache • Free geocoding fallback • Excel-ready</div>
                <h1>Global Address Geocoder</h1>
                <p class="muted" style="font-size:1.15rem;max-width:680px;">Upload address spreadsheets, select a country context, and geocode locations through a shared organization-wide Neon memory so analysts do not geocode the same clinic twice.</p>
            </div>
            <div>
                <div class="globe"></div>
                <div class="code-stream liquid-card" style="margin-top:20px;padding:14px;">
                    &gt; normalize(address + country)<br>
                    &gt; check shared Neon geocode_cache<br>
                    &gt; cache hit: return coordinates instantly<br>
                    &gt; cache miss: call free Nominatim once<br>
                    &gt; save result for every analyst
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_map(countries: list[dict[str, str]], selected: dict[str, str]) -> None:
    if px is None:
        st.info("Install plotly for the luminous global map.")
        return
    df = pd.DataFrame(countries)
    df["selected"] = df["alpha_3"].eq(selected["alpha_3"])
    df["intensity"] = df["selected"].map({True: 1, False: 0.08})
    fig = px.choropleth(
        df,
        locations="alpha_3",
        color="intensity",
        hover_name="name",
        color_continuous_scale=[[0, "#07172d"], [1, "#76eaff"]],
        projection="natural earth",
    )
    fig.update_layout(
        margin=dict(l=0, r=0, t=0, b=0),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        geo=dict(bgcolor="rgba(0,0,0,0)", showframe=False, showcoastlines=True, coastlinecolor="rgba(160,235,255,.25)"),
        coloraxis_showscale=False,
        height=360,
    )
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})


def read_uploaded(uploaded: Any, sheet: str | None = None) -> pd.DataFrame:
    name = uploaded.name.lower()
    if name.endswith(".csv"):
        return pd.read_csv(uploaded)
    if name.endswith((".xlsx", ".xlsm", ".xls")):
        return pd.read_excel(uploaded, sheet_name=sheet)
    raise ValueError("Upload a CSV, XLSX, XLSM, or XLS file.")


def to_xlsx_bytes(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="geocoded")
    buf.seek(0)
    return buf.getvalue()


def require_password() -> bool:
    if not APP_ACCESS_PASSWORD:
        return True
    with st.sidebar:
        st.markdown("### Access")
        entered = st.text_input("App password", type="password")
    return entered == APP_ACCESS_PASSWORD


def geocode_dataframe(df: pd.DataFrame, address_cols: list[str], country_col: str | None, selected: dict[str, str], mode: str) -> tuple[pd.DataFrame, dict[str, int]]:
    conn = get_connection(DATABASE_URL)
    out_rows: list[dict[str, Any]] = []
    stats = {"total": len(df), "processed": 0, "cache_hits": 0, "cache_misses": 0, "errors": 0}
    progress = st.progress(0, text="Starting geocode run...")
    metric_holder = st.empty()

    for idx, row in df.iterrows():
        spreadsheet_country = clean_cell(row.get(country_col)) if country_col else ""
        if mode == "Use selected country for every row":
            country_text = selected["name"]
        elif mode == "Use spreadsheet country when available, otherwise selected country":
            country_text = spreadsheet_country or selected["name"]
        else:
            country_text = ""

        country_code = guess_country_code(country_text, selected) if country_text else ""
        raw_address = build_address(row, address_cols, country_text, mode)
        normalized = normalize_address(raw_address)
        if not normalized:
            out_rows.append(blank_output("blank", error="No usable address", country_context=country_text))
            stats["errors"] += 1
        else:
            address_hash = make_address_hash(normalized, country_code)
            cached = lookup_cache(conn, address_hash)
            if cached:
                stats["cache_hits"] += 1
                out_rows.append(record_to_output(cached, status_override="cache_hit", country_context=country_text))
            else:
                stats["cache_misses"] += 1
                geo = geocode_nominatim(raw_address, normalized, country_code)
                if geo["geocode_status"] == "failed":
                    stats["errors"] += 1
                saved = save_cache(
                    conn,
                    {
                        "address_hash": address_hash,
                        "raw_address": raw_address,
                        "normalized_address": normalized,
                        "country_name": country_text,
                        "country_code": country_code,
                        "created_by": GEOCODER_ANALYST or None,
                        **geo,
                    },
                )
                out_rows.append(record_to_output(saved, country_context=country_text))
                time.sleep(RATE_LIMIT_SECONDS)

        stats["processed"] += 1
        progress.progress(stats["processed"] / max(stats["total"], 1), text=f"Processed {stats['processed']} of {stats['total']} rows")
        metric_holder.markdown(
            f"""
            <div class="metric-row">
              <div class="metric"><span>Total</span><br><b>{stats['total']}</b></div>
              <div class="metric"><span>Processed</span><br><b>{stats['processed']}</b></div>
              <div class="metric"><span>Cache hits</span><br><b>{stats['cache_hits']}</b></div>
              <div class="metric"><span>Cache misses</span><br><b>{stats['cache_misses']}</b></div>
              <div class="metric"><span>Errors</span><br><b>{stats['errors']}</b></div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    return pd.concat([df.reset_index(drop=True), pd.DataFrame(out_rows)], axis=1), stats


def main() -> None:
    st.set_page_config(page_title=APP_TITLE, page_icon="🌐", layout="wide")
    inject_css()
    countries = country_options()
    names = [c["name"] for c in countries]
    if "selected_country" not in st.session_state:
        st.session_state.selected_country = "United States" if "United States" in names else names[0]

    selected = country_by_name(st.session_state.selected_country)
    render_header(selected["name"])
    render_hero()

    if not require_password():
        st.error("Enter the app password to continue.")
        st.stop()

    with st.container():
        st.markdown('<div class="liquid-card"><h2>1. Select geocoding country context</h2>', unsafe_allow_html=True)
        selected_name = st.selectbox("Country", names, index=names.index(st.session_state.selected_country))
        st.session_state.selected_country = selected_name
        selected = country_by_name(selected_name)
        render_map(countries, selected)
        st.markdown('</div>', unsafe_allow_html=True)

    with st.container():
        st.markdown('<div class="liquid-card"><h2>2. Upload file and map address columns</h2>', unsafe_allow_html=True)
        uploaded = st.file_uploader("Upload Excel or CSV", type=["csv", "xlsx", "xlsm", "xls"])
        if not uploaded:
            st.markdown('</div>', unsafe_allow_html=True)
            st.stop()
        df = read_uploaded(uploaded)
        st.dataframe(df.head(25), use_container_width=True)
        columns = list(df.columns)
        address_cols = st.multiselect("Columns that make up the address", columns, default=[c for c in columns if str(c).lower() in {"address", "city", "state", "zip", "postal_code", "country"}])
        country_col_choice = st.selectbox("Country column, if your file has one", ["None"] + columns)
        country_col = None if country_col_choice == "None" else country_col_choice
        country_mode = st.radio(
            "Country handling",
            [
                "Use selected country for every row",
                "Use spreadsheet country when available, otherwise selected country",
                "Do not append country context",
            ],
            index=1,
        )
        st.markdown('</div>', unsafe_allow_html=True)

    with st.container():
        st.markdown('<div class="liquid-card"><h2>3. Geocode with shared Neon memory</h2><div class="globe" style="width:160px;height:160px"></div>', unsafe_allow_html=True)
        if st.button("Start Geocoding", disabled=not address_cols):
            try:
                result_df, run_stats = geocode_dataframe(df, address_cols, country_col, selected, country_mode)
                st.session_state.result_df = result_df
                st.session_state.run_stats = run_stats
                st.success("Geocoding complete.")
            except Exception as exc:
                st.error(f"Geocoding failed: {exc}")
        st.markdown('</div>', unsafe_allow_html=True)

    if "result_df" in st.session_state:
        result_df = st.session_state.result_df
        st.markdown('<div class="liquid-card"><h2>4. Download results</h2>', unsafe_allow_html=True)
        st.dataframe(result_df.head(100), use_container_width=True)
        st.download_button("Download Excel", data=to_xlsx_bytes(result_df), file_name="geocoded_addresses.xlsx", mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        st.download_button("Download CSV", data=result_df.to_csv(index=False).encode("utf-8"), file_name="geocoded_addresses.csv", mime="text/csv")
        st.markdown('</div>', unsafe_allow_html=True)

    if DATABASE_URL:
        try:
            stats = cache_stats(get_connection(DATABASE_URL))
            st.markdown(
                f"""
                <div class="liquid-card"><h2>Shared Neon cache</h2>
                <span class="status-chip">Total records: {stats['total']}</span>
                <span class="status-chip">Geocoded: {stats['geocoded']}</span>
                <span class="status-chip">Not found: {stats['not_found']}</span>
                <span class="status-chip">Failed: {stats['failed']}</span>
                <span class="status-chip">Total uses: {stats['uses']}</span>
                </div>
                """,
                unsafe_allow_html=True,
            )
        except Exception:
            pass

    st.markdown('<div class="footer">Occu-Med Global Address Geocoder • Render + Neon + Free cache-first geocoding</div>', unsafe_allow_html=True)


if __name__ == "__main__":
    main()
