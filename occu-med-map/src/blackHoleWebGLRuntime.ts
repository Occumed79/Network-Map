import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// The ray-bending and accretion-disk integration in this shader is adapted
// from Chris Matabaro's MIT-licensed black-hole-simulation project:
// https://github.com/chrismatgit/black-hole-simulation
//
// The renderer uses Three.js's official UnrealBloomPass so the hot plasma is
// actually post-processed HDR light, not a collection of stroked canvas rings.

const VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  precision highp int;

  #define PI 3.14159265359
  #define EVENT_HORIZON_RADIUS 1.0
  #define BACKGROUND_DISTANCE 9000.0
  #define MAX_ITERATIONS 150

  varying vec2 vUv;

  uniform sampler2D uSpaceTexture;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uCameraDistance;
  uniform float uOrbitX;
  uniform float uIterations;
  uniform float uProgress;
  uniform float uWhiteHole;

  struct Ray {
    vec3 origin;
    vec3 direction;
  };

  float hash(float n) {
    return fract(sin(n) * 753.5453123);
  }

  float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float n = p.x + p.y * 157.0 + 113.0 * p.z;

    return mix(
      mix(
        mix(hash(n), hash(n + 1.0), f.x),
        mix(hash(n + 157.0), hash(n + 158.0), f.x),
        f.y
      ),
      mix(
        mix(hash(n + 113.0), hash(n + 114.0), f.x),
        mix(hash(n + 270.0), hash(n + 271.0), f.x),
        f.y
      ),
      f.z
    );
  }

  float fbm(vec3 position) {
    float value = 0.0;
    float amplitude = 0.58;
    for (int octave = 0; octave < 5; octave++) {
      value += amplitude * noise(position);
      position = position * 2.17 + vec3(13.1, 7.7, 5.3);
      amplitude *= 0.48;
    }
    return value;
  }

  Ray cameraRay() {
    vec2 screen = vUv * 2.0 - 1.0;
    screen.x *= uResolution.x / max(uResolution.y, 1.0);

    vec3 origin = vec3(uOrbitX, 0.48, uCameraDistance);
    vec3 forward = normalize(-origin);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 cameraUp = normalize(cross(forward, right));
    float focalLength = 1.42;

    Ray ray;
    ray.origin = origin;
    ray.direction = normalize(forward * focalLength + right * screen.x + cameraUp * screen.y);
    return ray;
  }

  vec3 geodesicAcceleration(vec3 position, float angularMomentumSquared) {
    return -1.5 * angularMomentumSquared * position / pow(max(length(position), 0.001), 5.0);
  }

  vec3 sampleSpace(Ray ray) {
    float a = dot(ray.direction, ray.direction);
    float b = 2.0 * dot(ray.direction, ray.origin);
    float c = dot(ray.origin, ray.origin) - BACKGROUND_DISTANCE * BACKGROUND_DISTANCE;
    float discriminant = max(0.0, b * b - 4.0 * a * c);
    float intersection = (-b + sqrt(discriminant)) / (2.0 * a);
    vec3 point = ray.origin + intersection * ray.direction;
    float longitude = atan(point.x, point.z) / (2.0 * PI) + 0.5;
    float latitude = asin(clamp(point.y / BACKGROUND_DISTANCE, -1.0, 1.0)) / PI + 0.5;
    return texture2D(uSpaceTexture, vec2(longitude, latitude)).rgb;
  }

  vec3 traceBlackHole(Ray ray, out float closestDistance, out float swallowed) {
    vec3 position = ray.origin;
    vec3 velocity = normalize(ray.direction);
    vec3 perpendicular = cross(position, velocity);
    float angularMomentumSquared = dot(perpendicular, perpendicular);
    closestDistance = length(position);
    swallowed = 0.0;

    const float innerDiskRadius = 1.58;
    const float outerDiskRadius = 8.7;

    for (int index = 0; index < MAX_ITERATIONS; index++) {
      if (float(index) >= uIterations) break;

      float distanceToHole = length(position);
      closestDistance = min(closestDistance, distanceToHole);

      if (distanceToHole <= EVENT_HORIZON_RADIUS) {
        swallowed = 1.0;
        return mix(vec3(0.0), vec3(5.8, 7.2, 10.5), uWhiteHole);
      }

      if (distanceToHole >= BACKGROUND_DISTANCE) break;

      float stepSize = distanceToHole * distanceToHole * (2.2 / uIterations);
      stepSize = clamp(stepSize, 0.006, 5.5);
      vec3 travel = velocity * stepSize;

      vec3 k1 = stepSize * geodesicAcceleration(position, angularMomentumSquared);
      vec3 k2 = stepSize * geodesicAcceleration(position + travel * 0.5 + k1 * 0.5, angularMomentumSquared);
      vec3 k3 = stepSize * geodesicAcceleration(position + travel * 0.5 + k2 * 0.5, angularMomentumSquared);
      vec3 k4 = stepSize * geodesicAcceleration(position + travel + k3, angularMomentumSquared);
      vec3 acceleration = (k1 + 2.0 * (k2 + k3) + k4) / 6.0;
      vec3 nextPosition = position + travel + acceleration * stepSize;
      float nextDistance = length(nextPosition);

      bool crossesDisk = position.y * nextPosition.y <= 0.0;
      if (
        crossesDisk &&
        distanceToHole > innerDiskRadius &&
        distanceToHole < outerDiskRadius
      ) {
        float radialPosition = (distanceToHole - innerDiskRadius) /
          (outerDiskRadius - innerDiskRadius);
        float angle = atan(nextPosition.z, nextPosition.x);
        float flowDirection = mix(1.0, -1.0, uWhiteHole);
        float differentialRotation = flowDirection * uTime *
          (0.82 / sqrt(max(distanceToHole, 0.1)));
        vec3 plasmaCoordinate = vec3(
          angle * 2.7 - differentialRotation * 5.6,
          radialPosition * 9.5,
          uTime * 0.16 + distanceToHole * 0.31
        );

        float turbulence = fbm(plasmaCoordinate);
        float filaments = pow(
          0.5 + 0.5 * sin(angle * 17.0 - differentialRotation * 13.0 + turbulence * 8.0),
          3.0
        );
        float density = smoothstep(0.0, 0.14, radialPosition) *
          (1.0 - smoothstep(0.62, 1.0, radialPosition));
        density *= 0.28 + turbulence * 0.92 + filaments * 0.68;

        vec3 orbitalDirection = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(nextPosition)));
        float observerVelocity = dot(ray.direction, orbitalDirection);
        float doppler = clamp(sqrt((1.0 - observerVelocity * 0.48) /
          (1.0 + observerVelocity * 0.48)), 0.48, 2.2);
        float gravitationalShift = sqrt(max(
          0.025,
          (1.0 - 1.0 / max(distanceToHole, 1.01)) /
          (1.0 - 1.0 / max(uCameraDistance, 1.01))
        ));

        vec3 outerColor = vec3(1.9, 0.075, 0.018);
        vec3 middleColor = vec3(3.8, 0.52, 0.065);
        vec3 innerColor = vec3(6.2, 2.1, 0.34);
        vec3 plasmaColor = mix(innerColor, middleColor, smoothstep(0.05, 0.36, radialPosition));
        plasmaColor = mix(plasmaColor, outerColor, smoothstep(0.38, 0.9, radialPosition));

        vec3 whiteOuterColor = vec3(0.48, 1.75, 4.8);
        vec3 whiteMiddleColor = vec3(2.8, 5.7, 9.2);
        vec3 whiteInnerColor = vec3(7.2, 8.5, 11.5);
        vec3 whitePlasmaColor = mix(
          whiteInnerColor,
          whiteMiddleColor,
          smoothstep(0.05, 0.36, radialPosition)
        );
        whitePlasmaColor = mix(
          whitePlasmaColor,
          whiteOuterColor,
          smoothstep(0.38, 0.9, radialPosition)
        );
        plasmaColor = mix(plasmaColor, whitePlasmaColor, uWhiteHole);
        plasmaColor *= density * doppler * clamp(gravitationalShift, 0.36, 1.5);

        Ray escapedRay;
        escapedRay.origin = nextPosition;
        escapedRay.direction = normalize(velocity + acceleration);
        vec3 lensedBackground = sampleSpace(escapedRay) * 0.34;
        return plasmaColor + lensedBackground;
      }

      position = nextPosition;
      velocity = normalize(velocity + acceleration);

      if (nextDistance > BACKGROUND_DISTANCE) break;
    }

    Ray escapedRay;
    escapedRay.origin = position;
    escapedRay.direction = velocity;
    return sampleSpace(escapedRay);
  }

  void main() {
    Ray ray = cameraRay();
    float closestDistance;
    float swallowed;
    vec3 tracedScene = traceBlackHole(ray, closestDistance, swallowed);

    float photonRing = exp(-pow((closestDistance - 1.48) * 5.2, 2.0));
    vec3 ringColor = mix(
      vec3(4.8, 1.35, 0.32),
      vec3(4.2, 7.8, 12.0),
      uWhiteHole
    ) * photonRing * mix(1.0 - swallowed, 1.0, uWhiteHole) * 0.16;
    vec3 color = tracedScene * 0.34 + ringColor;

    vec2 centeredUv = vUv - 0.5;
    centeredUv.x *= uResolution.x / max(uResolution.y, 1.0);

    // Build the unmistakable reference silhouette in explicit depth order:
    // rear accretion disk, spherical center, then the front half of the disk.
    // The geodesic trace remains underneath to bend the star field and supply
    // physically inspired plasma variation without obscuring the silhouette.
    float objectRadius = clamp(1.42 / uCameraDistance, 0.085, 1.38);
    vec2 localPoint = centeredUv / objectRadius;
    float diskTilt = mix(-0.065, -0.31, uWhiteHole);
    float tiltCosine = cos(diskTilt);
    float tiltSine = sin(diskTilt);
    vec2 diskPoint = mat2(
      tiltCosine, -tiltSine,
      tiltSine, tiltCosine
    ) * localPoint;

    float ellipseRadius = length(vec2(diskPoint.x / 1.72, diskPoint.y / 0.30));
    float bandDistance = abs(ellipseRadius - 1.0);
    float diskMask = 1.0 - smoothstep(0.055, 0.19, bandDistance);
    float diskHotCore = 1.0 - smoothstep(0.0, 0.075, bandDistance);
    float diskHalo = 1.0 - smoothstep(0.14, 0.39, bandDistance);

    float orbitalAngle = atan(diskPoint.y / 0.30, diskPoint.x / 1.72);
    float flowDirection = mix(1.0, -1.0, uWhiteHole);
    float diskTurbulence = fbm(vec3(
      orbitalAngle * 3.4 - uTime * flowDirection * 2.8,
      bandDistance * 24.0,
      uTime * 0.22
    ));
    float diskFilaments = 0.76 + 0.24 * sin(
      orbitalAngle * 23.0 - uTime * flowDirection * 6.4 + diskTurbulence * 7.0
    );

    vec3 blackDiskHot = vec3(7.2, 5.6, 3.15);
    vec3 blackDiskMiddle = vec3(5.2, 0.62, 0.14);
    vec3 blackDiskOuter = vec3(1.55, 0.09, 2.35);
    vec3 blackDiskColor = mix(
      blackDiskMiddle,
      blackDiskHot,
      diskHotCore
    );
    blackDiskColor = mix(
      blackDiskColor,
      blackDiskOuter,
      smoothstep(0.105, 0.19, bandDistance)
    );

    vec3 whiteDiskHot = vec3(7.0, 8.8, 10.5);
    vec3 whiteDiskMiddle = vec3(0.5, 5.4, 9.2);
    vec3 whiteDiskOuter = vec3(0.12, 0.72, 3.8);
    vec3 whiteDiskColor = mix(
      whiteDiskMiddle,
      whiteDiskHot,
      diskHotCore
    );
    whiteDiskColor = mix(
      whiteDiskColor,
      whiteDiskOuter,
      smoothstep(0.105, 0.19, bandDistance)
    );

    vec3 diskColor = mix(blackDiskColor, whiteDiskColor, uWhiteHole);
    diskColor *= 0.86 + diskTurbulence * 0.24 + diskFilaments * 0.18;
    vec3 haloColor = mix(
      vec3(0.72, 0.035, 1.28),
      vec3(0.04, 1.1, 3.4),
      uWhiteHole
    );
    color += haloColor * diskHalo * (1.0 - diskMask) * 0.38;

    // Rear disk is laid down first so the center sphere can occlude it.
    color = mix(color, diskColor, diskMask * 0.94);

    float centerDistance = length(localPoint);
    float centerMask = 1.0 - smoothstep(0.63, 0.69, centerDistance);
    float centerInterior = 1.0 - smoothstep(0.0, 0.64, centerDistance);
    vec3 blackCenter = vec3(0.000015, 0.000004, 0.000025);
    vec3 whiteCenter = mix(
      vec3(2.1, 4.8, 9.0),
      vec3(8.5, 9.5, 10.8),
      pow(centerInterior, 0.34)
    );
    vec3 centerColor = mix(blackCenter, whiteCenter, uWhiteHole);
    color = mix(color, centerColor, centerMask);

    float centerRim = 1.0 - smoothstep(0.025, 0.085, abs(centerDistance - 0.68));
    vec3 centerRimColor = mix(
      vec3(5.6, 1.05, 0.52),
      vec3(2.0, 7.4, 11.0),
      uWhiteHole
    );
    color += centerRimColor * centerRim * 0.64;

    // The lower half of the projected ellipse is the foreground arc. Drawing
    // it last makes the disk visibly cross in front of the spherical center.
    float frontHalf = 1.0 - smoothstep(-0.015, 0.075, diskPoint.y);
    float frontDiskMask = diskMask * frontHalf;
    color = mix(color, diskColor * 1.08, frontDiskMask * 0.98);

    float vignette = 1.0 - smoothstep(0.26, 0.78, length(vUv - 0.5));
    color *= mix(0.48, 1.0, vignette);
    color = max(color, vec3(0.00035, 0.00015, 0.0008));

    gl_FragColor = vec4(color, 1.0);
  }
`;

export type BlackHoleTransitionOptions = {
  durationMs?: number;
  reducedMotion?: boolean;
  effect?: "black-hole" | "white-hole";
};

export type BlackHoleTransition = {
  finished: Promise<void>;
  dispose: () => void;
};

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createSpaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Could not create procedural space texture");

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, "#01020a");
  background.addColorStop(0.36, "#090315");
  background.addColorStop(0.68, "#020612");
  background.addColorStop(1, "#010104");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const random = seededRandom(0x0cc0_2026);
  context.globalCompositeOperation = "screen";

  for (let cloud = 0; cloud < 16; cloud += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 120 + random() * 330;
    const nebula = context.createRadialGradient(x, y, 0, x, y, radius);
    const violet = cloud % 3 === 0;
    nebula.addColorStop(0, violet ? "rgba(126,44,192,0.075)" : "rgba(28,92,166,0.062)");
    nebula.addColorStop(0.45, violet ? "rgba(80,20,126,0.035)" : "rgba(16,53,105,0.028)");
    nebula.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = nebula;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (let star = 0; star < 3100; star += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const rare = random() > 0.982;
    const radius = rare ? 1.25 + random() * 1.9 : 0.25 + random() * 0.78;
    const brightness = rare ? 0.8 + random() * 0.2 : 0.22 + random() * 0.62;
    const warm = random() > 0.83;
    context.fillStyle = warm
      ? `rgba(255,221,190,${brightness})`
      : `rgba(221,235,255,${brightness})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    if (rare) {
      const glow = context.createRadialGradient(x, y, 0, x, y, radius * 6.5);
      glow.addColorStop(0, `rgba(235,242,255,${brightness * 0.45})`);
      glow.addColorStop(1, "rgba(120,155,255,0)");
      context.fillStyle = glow;
      context.fillRect(x - radius * 7, y - radius * 7, radius * 14, radius * 14);
    }
  }

  context.globalCompositeOperation = "source-over";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function startBlackHoleTransition(
  canvas: HTMLCanvasElement,
  options: BlackHoleTransitionOptions = {},
): BlackHoleTransition {
  const reducedMotion = options.reducedMotion ?? false;
  const whiteHole = options.effect === "white-hole";
  const durationMs = reducedMotion ? 650 : (options.durationMs ?? 4100);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const spaceTexture = createSpaceTexture();
  const uniforms = {
    uSpaceTexture: { value: spaceTexture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uCameraDistance: { value: 19.5 },
    uOrbitX: { value: -0.32 },
    uIterations: { value: reducedMotion ? 68 : 116 },
    uProgress: { value: 0 },
    uWhiteHole: { value: whiteHole ? 1 : 0 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.45, 0.48, 0.48);
  composer.addPass(bloom);

  let disposed = false;
  let animationFrame = 0;
  let finishResolved = false;
  let resolveFinished: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });
  const startedAt = performance.now();

  const resize = () => {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.35);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    uniforms.uResolution.value.set(width, height);
  };

  const render = (now: number) => {
    if (disposed) return;

    const elapsedMs = now - startedAt;
    const rawProgress = Math.min(1, elapsedMs / durationMs);
    const accelerated = rawProgress * rawProgress * (3.0 - 2.0 * rawProgress);
    const plunge = Math.pow(accelerated, 1.72);
    uniforms.uTime.value = elapsedMs / 1000;
    uniforms.uProgress.value = rawProgress;
    const cameraProgress = whiteHole ? Math.pow(accelerated, 0.82) : plunge;
    uniforms.uCameraDistance.value = whiteHole
      ? THREE.MathUtils.lerp(2.4, 19.5, cameraProgress)
      : THREE.MathUtils.lerp(19.5, 1.075, cameraProgress);
    uniforms.uOrbitX.value = THREE.MathUtils.lerp(
      whiteHole ? 0.06 : -0.32,
      whiteHole ? -0.32 : 0.06,
      accelerated,
    ) +
      Math.sin(rawProgress * Math.PI * 2.0) * 0.055 * (1.0 - rawProgress);
    bloom.strength = whiteHole
      ? THREE.MathUtils.lerp(1.9, 1.35, accelerated)
      : THREE.MathUtils.lerp(1.28, 1.72, accelerated);
    bloom.radius = whiteHole
      ? THREE.MathUtils.lerp(0.6, 0.42, accelerated)
      : THREE.MathUtils.lerp(0.4, 0.58, accelerated);
    bloom.threshold = whiteHole ? 0.42 : 0.52;
    renderer.toneMappingExposure = whiteHole
      ? THREE.MathUtils.lerp(1.12, 1.0, accelerated)
      : 1.02;
    composer.render();

    if (rawProgress >= 1 && !finishResolved) {
      finishResolved = true;
      resolveFinished();
    }
    animationFrame = window.requestAnimationFrame(render);
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    window.cancelAnimationFrame(animationFrame);
    window.removeEventListener("resize", resize);
    if (!finishResolved) {
      finishResolved = true;
      resolveFinished();
    }
    scene.remove(plane);
    geometry.dispose();
    material.dispose();
    spaceTexture.dispose();
    bloom.dispose();
    composer.dispose();
    renderer.dispose();
  };

  resize();
  window.addEventListener("resize", resize);
  animationFrame = window.requestAnimationFrame(render);

  return { finished, dispose };
}
