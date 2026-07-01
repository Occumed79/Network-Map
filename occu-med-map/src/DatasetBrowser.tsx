import { useState, useEffect, useMemo, useCallback } from "react";

type DatasetProvider = {
  clinic_name?: string;
  name?: string;
  address_1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  website?: string | null;
  lat?: number;
  lng?: number;
  npi?: string | null;
  source_url?: string | null;
  taxonomy_description?: string | null;
  services?: string | null;
  source_id?: string;
};

type DatasetKey = "bluehive" | "dentists" | "indexed";

const DATASETS: { key: DatasetKey; label: string; color: string; icon: string }[] = [
  { key: "bluehive", label: "BlueHive Providers", color: "#3b82f6", icon: "BH" },
  { key: "dentists", label: "Dentists", color: "#06b6d4", icon: "DN" },
  { key: "indexed", label: "Indexed Providers", color: "#10b981", icon: "IDX" },
];

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

function googleMapsLink(p: DatasetProvider): string {
  const name = encodeURIComponent(p.clinic_name || p.name || "");
  const addr = [p.address_1, p.city, p.state, p.zip].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + addr)}`;
}

function googleMapsPlaceLink(p: DatasetProvider): string {
  if (p.lat && p.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  }
  return googleMapsLink(p);
}

type Props = {
  open: boolean;
  onClose: () => void;
  blueHiveData: any[];
  dentistData: any[];
  indexedData: any[];
};

export default function DatasetBrowser({ open, onClose, blueHiveData, dentistData, indexedData }: Props) {
  const [activeDataset, setActiveDataset] = useState<DatasetKey>("bluehive");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    if (open) {
      setActiveDataset("bluehive");
      setSearch("");
      setPage(0);
    }
  }, [open]);

  const allProviders: DatasetProvider[] = useMemo(() => {
    const data =
      activeDataset === "bluehive" ? blueHiveData :
      activeDataset === "dentists" ? dentistData :
      indexedData;
    return (data || []).filter((p: any) => p.lat != null && p.lng != null);
  }, [activeDataset, blueHiveData, dentistData, indexedData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allProviders;
    const q = search.toLowerCase().trim();
    return allProviders.filter((p) => {
      const name = (p.clinic_name || p.name || "").toLowerCase();
      const city = (p.city || "").toLowerCase();
      const state = (p.state || "").toLowerCase();
      const npi = (p.npi || "").toLowerCase();
      return name.includes(q) || city.includes(q) || state.includes(q) || npi.includes(q);
    });
  }, [allProviders, search]);

  const paged = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
  }, []);

  if (!open) return null;

  const activeMeta = DATASETS.find((d) => d.key === activeDataset)!;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 8, 16, 0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 10000,
          animation: "dsFadeIn 0.25s ease",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(920px, 92vw)",
          height: "min(720px, 88vh)",
          background:
            "linear-gradient(160deg, rgba(20,28,46,0.92) 0%, rgba(12,18,32,0.95) 100%)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.12)",
          backdropFilter: "blur(40px) saturate(220%)",
          WebkitBackdropFilter: "blur(40px) saturate(220%)",
          zIndex: 10001,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'Inter', -apple-system, 'SF Pro Display', 'SF Pro Text', sans-serif",
          animation: "dsScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Specular highlight overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "50%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
            pointerEvents: "none",
            borderRadius: "24px 24px 0 0",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${activeMeta.color}40, ${activeMeta.color}10)`,
                border: `1px solid ${activeMeta.color}50`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: activeMeta.color,
                letterSpacing: 0.5,
              }}
            >
              {activeMeta.icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#e8eef8",
                  letterSpacing: -0.3,
                  fontFamily: "'Inter', -apple-system, 'SF Pro Display', sans-serif",
                }}
              >
                Dataset Browser
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(180,215,255,0.5)",
                  marginTop: 2,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {filtered.length.toLocaleString()} providers
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(220,238,255,0.7)",
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.12)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "rgba(220,238,255,0.7)";
            }}
          >
            ✕
          </button>
        </div>

        {/* Dataset tabs + search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          {DATASETS.map((ds) => {
            const count =
              ds.key === "bluehive"
                ? blueHiveData.filter((p: any) => p.lat != null).length
                : ds.key === "dentists"
                ? dentistData.filter((p: any) => p.lat != null).length
                : indexedData.filter((p: any) => p.lat != null).length;
            const isActive = activeDataset === ds.key;
            return (
              <button
                key={ds.key}
                onClick={() => {
                  setActiveDataset(ds.key);
                  setSearch("");
                  setPage(0);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 12,
                  border: `1px solid ${isActive ? ds.color + "60" : "rgba(255,255,255,0.10)"}`,
                  background: isActive
                    ? `linear-gradient(135deg, ${ds.color}25, ${ds.color}08)`
                    : "rgba(255,255,255,0.04)",
                  color: isActive ? ds.color : "rgba(180,215,255,0.6)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "'Inter', -apple-system, sans-serif",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: ds.color,
                    boxShadow: isActive ? `0 0 8px ${ds.color}` : "none",
                  }}
                />
                {ds.label}
                <span style={{ fontSize: 10, opacity: 0.6 }}>
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              minWidth: 220,
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(180,215,255,0.4)" }}>⌕</span>
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search name, city, NPI…"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#e8eef8",
                fontSize: 12,
                fontFamily: "'Inter', -apple-system, sans-serif",
                width: "100%",
              }}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(0);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(180,215,255,0.4)",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Cards scroll area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {paged.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "rgba(180,215,255,0.35)",
                fontSize: 13,
                fontFamily: "'Inter', -apple-system, sans-serif",
              }}
            >
              No providers found
            </div>
          )}

          {paged.map((p, i) => {
            const name = p.clinic_name || p.name || "Unnamed";
            const address = [p.address_1, p.city, p.state, p.zip]
              .filter(Boolean)
              .join(", ");
            const mapsUrl = googleMapsPlaceLink(p);
            const website = p.website;
            const npiUrl = p.source_url;

            return (
              <div
                key={p.source_id || i}
                style={{
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: "16px 18px",
                  transition: "all 0.25s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${activeMeta.color}40`;
                  e.currentTarget.style.background = `linear-gradient(145deg, ${activeMeta.color}10 0%, rgba(255,255,255,0.02) 100%)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.background =
                    "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name */}
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#e8eef8",
                        fontFamily: "'Inter', -apple-system, 'SF Pro Text', sans-serif",
                        letterSpacing: -0.2,
                        marginBottom: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {name}
                    </div>

                    {/* Address */}
                    {address && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(180,215,255,0.5)",
                          fontFamily: "'Inter', -apple-system, sans-serif",
                          marginBottom: 6,
                        }}
                      >
                        {address}
                      </div>
                    )}

                    {/* Taxonomy / services */}
                    {p.taxonomy_description && (
                      <div
                        style={{
                          fontSize: 10,
                          color: activeMeta.color,
                          fontFamily: "'IBM Plex Mono', monospace",
                          marginBottom: 4,
                          opacity: 0.8,
                        }}
                      >
                        {p.taxonomy_description}
                      </div>
                    )}
                    {p.services && !p.taxonomy_description && (
                      <div
                        style={{
                          fontSize: 10,
                          color: activeMeta.color,
                          fontFamily: "'IBM Plex Mono', monospace",
                          marginBottom: 4,
                          opacity: 0.8,
                        }}
                      >
                        {p.services}
                      </div>
                    )}
                  </div>

                  {/* Source badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: activeMeta.color,
                        boxShadow: `0 0 6px ${activeMeta.color}`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 8.5,
                        color: "rgba(180,215,255,0.4)",
                        fontFamily: "'IBM Plex Mono', monospace",
                        letterSpacing: 0.5,
                      }}
                    >
                      {(p as any).data_source ? String((p as any).data_source).toUpperCase().slice(0, 6) : activeMeta.icon}
                    </span>
                  </div>
                </div>

                {/* Action links */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 10,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Google Maps link */}
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 11px",
                      borderRadius: 9,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.05)",
                      color: "#67e8f9",
                      fontSize: 10.5,
                      fontWeight: 500,
                      textDecoration: "none",
                      fontFamily: "'Inter', -apple-system, sans-serif",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(103,232,249,0.12)";
                      e.currentTarget.style.borderColor = "rgba(103,232,249,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                    }}
                  >
                    📍 Maps
                  </a>

                  {/* Phone */}
                  {p.phone && (
                    <a
                      href={`tel:${p.phone}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 11px",
                        borderRadius: 9,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.05)",
                        color: "#67e8f9",
                        fontSize: 10.5,
                        fontWeight: 500,
                        textDecoration: "none",
                        fontFamily: "'Inter', -apple-system, sans-serif",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(103,232,249,0.12)";
                        e.currentTarget.style.borderColor = "rgba(103,232,249,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                      }}
                    >
                      📞 {p.phone}
                    </a>
                  )}

                  {/* Website */}
                  {website && (
                    <a
                      href={website.startsWith("http") ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 11px",
                        borderRadius: 9,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.05)",
                        color: "#93c5fd",
                        fontSize: 10.5,
                        fontWeight: 500,
                        textDecoration: "none",
                        fontFamily: "'Inter', -apple-system, sans-serif",
                        transition: "all 0.2s ease",
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(147,197,253,0.12)";
                        e.currentTarget.style.borderColor = "rgba(147,197,253,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                      }}
                    >
                      🔗 Website
                    </a>
                  )}

                  {/* NPI link */}
                  {p.npi && npiUrl && (
                    <a
                      href={npiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 11px",
                        borderRadius: 9,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.05)",
                        color: "#93c5fd",
                        fontSize: 10.5,
                        fontWeight: 500,
                        textDecoration: "none",
                        fontFamily: "'IBM Plex Mono', monospace",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(147,197,253,0.12)";
                        e.currentTarget.style.borderColor = "rgba(147,197,253,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                      }}
                    >
                      NPI: {p.npi}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 24px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                color: "rgba(180,215,255,0.4)",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              Page {page + 1} of {totalPages} · Showing {paged.length} of{" "}
              {filtered.length.toLocaleString()}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  padding: "6px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: page === 0 ? "transparent" : "rgba(255,255,255,0.06)",
                  color: page === 0 ? "rgba(180,215,255,0.2)" : "rgba(220,238,255,0.8)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: page === 0 ? "default" : "pointer",
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  transition: "all 0.2s ease",
                }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  padding: "6px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background:
                    page >= totalPages - 1 ? "transparent" : "rgba(255,255,255,0.06)",
                  color:
                    page >= totalPages - 1 ? "rgba(180,215,255,0.2)" : "rgba(220,238,255,0.8)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: page >= totalPages - 1 ? "default" : "pointer",
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  transition: "all 0.2s ease",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes dsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dsScaleIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </>
  );
}
