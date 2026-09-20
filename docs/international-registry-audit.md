# International registry audit

Audit date: 2026-09-20

This inventory is derived from the merged registry work on `main`, the complete
history of `origin/international-europe-wave-1`, the production Render service,
and the project conversation history. A route, workflow, or merged pull request
is **not** treated as proof that a registry works in production.

## Production `main`: 17 country integrations

The national totals below were read from `https://network-map-v846.onrender.com`
without viewport bounds. `0` is not treated as proof that an official registry
is empty.

| Country / jurisdiction | Source | Production result | Repair state |
| --- | --- | ---: | --- |
| Germany | Bundes-Klinik-Atlas | 1,572 | Working |
| Canada | ODHF | 7,033 | Working |
| Australia | HealthDirect | 14,580 | Working |
| Brazil | CNES | 0 | Not synchronized |
| Croatia | HZZO primary care | 0 | Coordinate parser fixed on `fix/international-registry-truth`; deployment pending |
| Chile | MINSAL | 5,356 | Working |
| Colombia | REPS / SISPRO | HTTP 503 | Source request times out; repair pending |
| Ireland | HSE health centres | 813 | Working |
| Latvia | Medical facilities | 473 | Working |
| Lithuania | VASPVT | HTTP 503 | Deleted ArcGIS item; replacement official dataset found; adapter pending |
| Singapore | MOH CHAS | 1,193 | Working |
| Mexico | CLUES | 1,905 | Working |
| Taiwan | NLSC medical facilities | 52 | Working |
| New Zealand | Health NZ | 3,418 | Working |
| Czechia | NRPZS | 0 | Not synchronized |
| Argentina | REFES | 0 | Not synchronized |
| Finland | Suomi.fi PTV | 0 | Not synchronized |

### Confirmed synchronization failures

| Registry | Latest inspected failure | Repair in this branch |
| --- | --- | --- |
| Brazil CNES | 64.7 MB official archive downloaded; extractor passed zero rows because the bulk schema uses uppercase fields such as `CO_CNES` | Accept the current uppercase bulk schema and retain lowercase API compatibility |
| Czechia NRPZS | 40,772 rows staged; promotion validation rolled back, then invalid `\quit 2` syntax let the workflow continue | Reconcile the canonical count from rows PostgreSQL parsed; print validation diagnostics; force SQL errors on failed guards |
| Argentina REFES | Catalog request failed on the ministry portal's incomplete TLS certificate chain | Resolve metadata through the federal `www.datos.gob.ar` API; constrain the resource host and validate the downloaded file before import |
| Finland PTV | 37,636 service locations fetched; wrapper objects were treated as location records, yielding one mapped row | Unwrap the v11 `locationChannel` response before filtering and normalization |

## Unmerged Europe branch: 40 additional visible layers

These layers exist on `origin/international-europe-wave-1` but are not deployed
from `main`. They remain **unverified in production** until the source, fetched
record count, normalized coordinates, database lineage (for synchronized
sources), map rendering, and reload are checked end to end.

| Source class | Countries / jurisdictions |
| --- | --- |
| National or regional official sources | Andorra; Armenia; Azerbaijan; Bosnia & Herzegovina; Cyprus; Denmark; England; France; Kosovo; Liechtenstein; Moldova; Montenegro; North Macedonia; Northern Ireland; San Marino; Scotland; Türkiye; Ukraine; Wales |
| Eurostat/GISCO hospital layer | Albania; Austria; Belgium; Bulgaria; Estonia; Greece; Hungary; Italy; Luxembourg; Malta; Netherlands; Norway; Poland; Portugal; Romania; Serbia; Slovakia; Slovenia; Spain; Sweden; Switzerland |

Denmark appears once above because its final branch toggle uses the national SOR
sync instead of the earlier GISCO hospital layer. Portugal is not present on
deployed `main`; it appears only as an unmerged GISCO hospital layer.

## Other countries found in branch history

| Country | Repository state | Required action |
| --- | --- | --- |
| Iceland | Importer, workflow, stored-route registration, and validation commits exist, but the final sidebar registry omits the toggle | Reconcile the missing UI registration, then production-verify |
| Georgia | Source access was probed and a toggle briefly existed, but it was deliberately removed from the final scoped registry | Keep excluded unless a usable official public source is verified |

## Acceptance standard

A country is only marked working after this chain succeeds:

1. Official source and endpoint verified.
2. Nonzero upstream records fetched (unless an empty official registry is independently proven).
3. Coordinates normalized and validated.
4. For synchronized sources, successful workflow run and production database lineage verified.
5. Production endpoint returns an explicit registry state and national count.
6. Map renders the records in the correct country.
7. Reload/sync is rechecked after deployment.

The UI must distinguish `ready`, `not_synchronized`, and `source_failed`, and it
must label viewport counts as viewport counts. It must never present a viewport
zero or an unrun sync as an empty national registry.
