#!/usr/bin/env bash
set -euo pipefail

mapfile -t manifests < <(find . -name package.json \
  -not -path '*/node_modules/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -not -path '*/.next/*' \
  -not -path '*/coverage/*' \
  | sort)

: > /tmp/frontend-manifests.txt
for manifest in "${manifests[@]}"; do
  if node - "$manifest" <<'NODE'
const fs = require('fs');
const p = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}), ...(pkg.peerDependencies || {}) };
const anchors = ['react','react-dom','next','vite','vue','svelte','@angular/core','astro','maplibre-gl','mapbox-gl','leaflet','ol','@vitejs/plugin-react','@react-three/fiber','pixi.js','chart.js','recharts'];
process.exit(anchors.some((name) => Object.prototype.hasOwnProperty.call(all, name)) ? 0 : 1);
NODE
  then
    echo "$manifest" >> /tmp/frontend-manifests.txt
  fi
done

if [[ ! -s /tmp/frontend-manifests.txt ]]; then
  echo 'No browser frontend detected. Nothing to install.'
  exit 0
fi

cat > /tmp/packages.txt <<'PKGS'
maplibre-gl
deck.gl
leaflet
ol
@kepler.gl/components
@turf/turf
proj4
topojson-client
supercluster
h3-js
leaflet.markercluster
leaflet.heat
leaflet.vectorgrid
echarts
plotly.js
d3
vega
vega-lite
@observablehq/plot
chart.js
apexcharts
recharts
@nivo/core
victory
@visx/visx
@antv/g2
@ant-design/charts
uplot
billboard.js
dygraphs
frappe-charts
cytoscape
sigma
graphology
@antv/g6
@xyflow/react
vis-network
d3-force
elkjs
dagre
webcola
@viz-js/viz
mermaid
bpmn-js
drawflow
rete
litegraph.js
@baklavajs/core
@logicflow/core
@antv/x6
three
@babylonjs/core
@react-three/fiber
@react-three/drei
pixi.js
@luma.gl/core
regl
ogl
aframe
@threlte/core
@tresjs/core
p5
gsap
motion
lottie-web
animejs
@react-spring/web
@formkit/auto-animate
@theatre/core
popmotion
lenis
@barba/core
matter-js
@dimforge/rapier3d
cannon-es
ammojs-typed
planck
oimo
tsparticles
particles.js
konva
fabric
paper
two.js
roughjs
@svgdotjs/svg.js
@cornerstonejs/core
@ohif/core
@kitware/vtk.js
@niivue/niivue
openseadragon
3dmol
molstar
ngl
dicom-parser
papaya-viewer
itk-wasm
PKGS

mapfile -t packages < /tmp/packages.txt

if [[ -f pnpm-lock.yaml || -f pnpm-workspace.yaml ]]; then
  PM=pnpm
  PNPM_SPEC=$(node - <<'NODE'
try {
  const pkg = require(process.cwd() + '/package.json');
  const pm = pkg.packageManager || '';
  if (pm.startsWith('pnpm@')) process.stdout.write(pm);
} catch {}
NODE
)
  [[ -n "$PNPM_SPEC" ]] || PNPM_SPEC='pnpm@10.18.3'
  corepack prepare "$PNPM_SPEC" --activate
elif [[ -f yarn.lock ]]; then
  PM=yarn
elif [[ -f bun.lockb || -f bun.lock ]]; then
  PM=bun
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
else
  PM=npm
fi

echo "Using $PM"
cat /tmp/frontend-manifests.txt
export NPM_CONFIG_LEGACY_PEER_DEPS=true
export YARN_ENABLE_IMMUTABLE_INSTALLS=false

while IFS= read -r manifest; do
  dir=$(dirname "$manifest")
  echo "Installing visualization libraries into $dir"
  case "$PM" in
    pnpm) pnpm --dir "$dir" add --save-prod --strict-peer-dependencies=false "${packages[@]}" ;;
    yarn) (cd "$dir" && yarn add "${packages[@]}") ;;
    bun) (cd "$dir" && bun add "${packages[@]}") ;;
    npm) (cd "$dir" && npm install --save --legacy-peer-deps "${packages[@]}") ;;
  esac
done < /tmp/frontend-manifests.txt

{
  echo '# Visualization Arsenal'
  echo
  echo 'Installed by the Occumed79 account-wide visualization library installer.'
  echo
  echo '## Installed npm packages'
  sed 's/^/- `/' /tmp/packages.txt | sed 's/$/`/'
  echo
  echo '## Requested technologies that are built-in standards/formats, not packages'
  echo '- GeoJSON — data format'
  echo '- WebGL — browser graphics API'
  echo '- WebGPU — browser graphics API'
  echo '- GLSL — shader language'
  echo '- WGSL — shader language'
} > VISUAL_ARSENAL.md

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
if ! git diff --cached --quiet; then
  git commit -m 'Install visualization arsenal [skip ci]'
  git push origin HEAD:main
fi

# Verification is deliberately non-blocking: the user's request is to preload the
# visualization libraries. A pre-existing app build issue must not erase the
# successfully generated package manifest and lockfile.
set +e
case "$PM" in
  pnpm) pnpm -r --if-present run build ;;
  yarn) yarn run build ;;
  bun) bun run build --if-present ;;
  npm) npm run build --if-present ;;
esac
BUILD_EXIT=$?
set -e
if [[ $BUILD_EXIT -ne 0 ]]; then
  echo "::warning::Dependencies were installed and committed, but the repository build exited with code $BUILD_EXIT."
fi
