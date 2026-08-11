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
const anchors = [
  'react','react-dom','next','vite','vue','svelte','@angular/core','astro',
  'maplibre-gl','mapbox-gl','leaflet','ol','@vitejs/plugin-react',
  '@react-three/fiber','pixi.js','chart.js','recharts'
];
process.exit(anchors.some((name) => Object.prototype.hasOwnProperty.call(all, name)) ? 0 : 1);
NODE
  then
    echo "$manifest" >> /tmp/frontend-manifests.txt
  fi
done

if [[ ! -s /tmp/frontend-manifests.txt ]]; then
  echo 'No compatible frontend package manifest found; leaving repository unchanged.'
  exit 0
fi

cat > /tmp/candidates.txt <<'PKGS'
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

: > /tmp/valid-packages.txt
: > /tmp/skipped-packages.txt
while IFS= read -r pkg; do
  [[ -z "$pkg" ]] && continue
  if npm view "$pkg" version >/dev/null 2>&1; then
    echo "$pkg" >> /tmp/valid-packages.txt
  else
    echo "$pkg" >> /tmp/skipped-packages.txt
  fi
done < /tmp/candidates.txt

mapfile -t packages < /tmp/valid-packages.txt
if [[ ${#packages[@]} -eq 0 ]]; then
  echo 'No installable npm packages resolved.'
  exit 1
fi

if [[ -f pnpm-lock.yaml || -f pnpm-workspace.yaml ]]; then
  PM=pnpm
  corepack prepare pnpm@latest --activate
elif [[ -f yarn.lock ]]; then
  PM=yarn
elif [[ -f bun.lockb || -f bun.lock ]]; then
  PM=bun
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
else
  PM=npm
fi

echo "Package manager: $PM"
cat /tmp/frontend-manifests.txt

export NPM_CONFIG_LEGACY_PEER_DEPS=true
export YARN_ENABLE_IMMUTABLE_INSTALLS=false

while IFS= read -r manifest; do
  dir=$(dirname "$manifest")
  echo "Installing visualization arsenal into $dir"
  case "$PM" in
    pnpm)
      pnpm --dir "$dir" add --save-prod --strict-peer-dependencies=false "${packages[@]}"
      ;;
    yarn)
      (cd "$dir" && yarn add "${packages[@]}")
      ;;
    bun)
      (cd "$dir" && bun add "${packages[@]}")
      ;;
    npm)
      (cd "$dir" && npm install --save --legacy-peer-deps "${packages[@]}")
      ;;
  esac
done < /tmp/frontend-manifests.txt

case "$PM" in
  pnpm)
    pnpm -r --if-present run build
    ;;
  yarn)
    yarn workspaces foreach -A --topological-dev run build || yarn run build || true
    ;;
  bun)
    bun run build --if-present || true
    ;;
  npm)
    npm run build --if-present
    ;;
esac

{
  echo '# Visualization Arsenal'
  echo
  echo 'Installed by the Occumed79 account-wide visualization arsenal installer.'
  echo
  echo '## Installed npm package names'
  sed 's/^/- `/' /tmp/valid-packages.txt | sed 's/$/`/'
  if [[ -s /tmp/skipped-packages.txt ]]; then
    echo
    echo '## Requested names not found as npm packages'
    sed 's/^/- `/' /tmp/skipped-packages.txt | sed 's/$/`/'
  fi
  echo
  echo '## Requested technologies that are not npm packages'
  echo '- GeoJSON — data format'
  echo '- WebGL — browser graphics API'
  echo '- WebGPU — browser graphics API'
  echo '- GLSL — shader language'
  echo '- WGSL — shader language'
} > VISUAL_ARSENAL.md

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
if git diff --cached --quiet; then
  echo 'No dependency changes to commit.'
  exit 0
fi

git commit -m 'Install visualization arsenal [skip ci]'
git push origin HEAD:main
