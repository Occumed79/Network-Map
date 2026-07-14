from __future__ import annotations

import re
from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one literal match in {path}, found {count}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str, *, flags: int = 0) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"Expected one regex match in {path}, found {count}: {pattern[:140]!r}")
    write(path, updated)


# Remove the document-wide cosmetic DOM rewrite and its self-triggering observer.
shell_path = "occu-med-map/src/PhaseTwoShell.tsx"
regex_once(
    shell_path,
    r"\nfunction retitleLegacyMapTools\(\): void \{.*?\n\}\n\nexport default function PhaseTwoShell",
    "\nexport default function PhaseTwoShell",
    flags=re.S,
)
regex_once(
    shell_path,
    r"\n  useEffect\(\(\) => \{\n    retitleLegacyMapTools\(\);.*?observer\.disconnect\(\);\n    \};\n  \}, \[\]\);\n",
    "\n",
    flags=re.S,
)

# Preview now uses normal browser APIs and the primary Provider Explorer route.
replace_once("occu-med-map/src/main.tsx", '    import("./phaseTwoPreviewIsolation"),\n', "")
replace_once("occu-med-map/src/phaseTwoLayerModel.ts", "    p2: '1',\n", "")
replace_once(
    "api-server/src/routes/index.ts",
    'import providerExplorerP2ReadRouter from "./providerExplorerP2Read";\n',
    "",
)
replace_once("api-server/src/routes/index.ts", "router.use(providerExplorerP2ReadRouter);\n", "")

# Copilot's first branch commit already corrected the primary legacy projection.
provider_path = "api-server/src/routes/providerExplorer.ts"
provider = read(provider_path)
if "mp.created_at AS imported_at" in provider:
    raise RuntimeError("Legacy Provider Explorer projection still references mp.created_at")
if "COALESCE(mp.scraped_at, mp.updated_at) AS imported_at" not in provider:
    raise RuntimeError("Correct legacy imported_at projection is missing")
if "export function legacyProviderSelectForTest" not in provider:
    provider, count = re.subn(
        r"\nfunction addSharedFilters\(",
        '\nexport function legacyProviderSelectForTest(): string { return selectSql("legacy"); }\n\nfunction addSharedFilters(',
        provider,
        count=1,
    )
    if count != 1:
        raise RuntimeError("Could not expose the primary legacy projection for regression testing")
    write(provider_path, provider)

# Move the backend regression test from the deleted compatibility route to the primary route.
backend_smoke = "api-server/scripts/provider-explorer-smoke.ts"
smoke = read(backend_smoke)
smoke = smoke.replace(
    "import { buildLiveCacheKeyForTest, buildStoredWhereForTest } from '../src/routes/providerExplorer';",
    "import { buildLiveCacheKeyForTest, buildStoredWhereForTest, legacyProviderSelectForTest } from '../src/routes/providerExplorer';",
)
smoke = smoke.replace("import { p2LegacyProviderSelectForTest } from '../src/routes/providerExplorerP2Read';\n", "")
smoke = smoke.replace("p2LegacyProviderSelectForTest()", "legacyProviderSelectForTest()")
if "providerExplorerP2Read" in smoke or "p2LegacyProviderSelectForTest" in smoke:
    raise RuntimeError("Backend smoke test still references the compatibility route")
write(backend_smoke, smoke)

# Update frontend regression guards to prohibit the removed architecture.
p2_smoke_path = "occu-med-map/scripts/phase-two-map-smoke.ts"
p2_smoke = read(p2_smoke_path)
p2_smoke = p2_smoke.replace("assert.equal(params.get('p2'), '1');", "assert.equal(params.get('p2'), null);")
p2_smoke, count = re.subn(
    r"\nconst previewIsolation = readFileSync\(resolve\(here, '\.\./src/phaseTwoPreviewIsolation\.ts'\), 'utf8'\);.*?assert\.doesNotMatch\(previewIsolation, /document\\\.querySelector/\);\n",
    "\n",
    p2_smoke,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Could not remove obsolete preview-isolation smoke assertions")
p2_smoke = p2_smoke.replace(
    'assert.match(main, /import\\("\\.\\/phaseTwoPreviewIsolation"\\)/);',
    'assert.doesNotMatch(main, /phaseTwoPreviewIsolation/);',
)
replace_marker = "assert.doesNotMatch(shell, /visibleCapped:\\s*true/);"
if replace_marker not in p2_smoke:
    raise RuntimeError("Could not find shell regression guard insertion point")
p2_smoke = p2_smoke.replace(
    replace_marker,
    "\n".join(
        [
            replace_marker,
            "assert.doesNotMatch(shell, /retitleLegacyMapTools/);",
            "assert.doesNotMatch(shell, /createTreeWalker/);",
            "assert.doesNotMatch(shell, /new MutationObserver/);",
        ]
    ),
    1,
)
backend_marker = "const diagnosticsGate = readFileSync(resolve(here, '../src/usDiagnosticsGate.ts'), 'utf8');"
if backend_marker not in p2_smoke:
    raise RuntimeError("Could not find backend regression guard insertion point")
p2_smoke = p2_smoke.replace(
    backend_marker,
    """const routeIndex = readFileSync(resolve(here, '../../api-server/src/routes/index.ts'), 'utf8');
assert.doesNotMatch(routeIndex, /providerExplorerP2Read/);

const providerExplorer = readFileSync(resolve(here, '../../api-server/src/routes/providerExplorer.ts'), 'utf8');
assert.match(providerExplorer, /COALESCE\\(mp\\.scraped_at, mp\\.updated_at\\) AS imported_at/);
assert.doesNotMatch(providerExplorer, /mp\\.created_at AS imported_at/);

const diagnosticsGate = readFileSync(resolve(here, '../src/usDiagnosticsGate.ts'), 'utf8');""",
    1,
)
p2_smoke = p2_smoke.replace(
    "console.log('P2 preview toggle is explicit, aborted loading clears, paging remains uncapped, and stable production boot is unchanged');",
    "console.log('P2 preview uses the unified provider route, avoids global runtime patches, and keeps loading and pagination stable');",
)
write(p2_smoke_path, p2_smoke)

# Delete the two temporary compatibility shims.
for obsolete_path in (
    "occu-med-map/src/phaseTwoPreviewIsolation.ts",
    "api-server/src/routes/providerExplorerP2Read.ts",
):
    obsolete = Path(obsolete_path)
    if obsolete.exists():
        obsolete.unlink()

# Final source guards before dependency installation or compilation.
for path, forbidden in {
    shell_path: ("retitleLegacyMapTools", "createTreeWalker", "new MutationObserver"),
    "occu-med-map/src/main.tsx": ("phaseTwoPreviewIsolation",),
    "api-server/src/routes/index.ts": ("providerExplorerP2Read",),
}.items():
    source = read(path)
    for token in forbidden:
        if token in source:
            raise RuntimeError(f"Forbidden token {token!r} remains in {path}")

for root in (Path("occu-med-map/src"), Path("api-server/src")):
    for path in root.rglob("*"):
        if not path.is_file() or "node_modules" in path.parts:
            continue
        try:
            source = path.read_text()
        except UnicodeDecodeError:
            continue
        for forbidden in ("phaseTwoPreviewIsolation", "providerExplorerP2Read", "mp.created_at AS imported_at"):
            if forbidden in source:
                raise RuntimeError(f"Obsolete reference {forbidden!r} remains in {path}")

print("Phase 2 clean repair edits applied successfully")
