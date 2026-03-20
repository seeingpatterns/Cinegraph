import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { COLORS } from './data.js';

// ═══════════════════════════════════════════════
// 상수 & 셰이더
// ═══════════════════════════════════════════════

const pixelRatio = Math.min(window.devicePixelRatio, 2);

const vertexShader = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform sampler2D pointTexture;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, 1.0);
    gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
  }
`;

// ═══════════════════════════════════════════════
// Scene, Camera, Renderer
// ═══════════════════════════════════════════════

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 1000);
camera.position.z = 2.7;

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ═══════════════════════════════════════════════
// Bloom 후처리 (EffectComposer)
// ═══════════════════════════════════════════════

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85
);
bloomPass.threshold = 0;
bloomPass.strength = 0.6;

const composer = new EffectComposer(renderer);
composer.setPixelRatio(pixelRatio);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ═══════════════════════════════════════════════
// 메인 그룹
// ═══════════════════════════════════════════════

const group = new THREE.Group();
scene.add(group);

// ═══════════════════════════════════════════════
// 텍스처 생성
// ═══════════════════════════════════════════════

function createDotTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.15, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

const dotTexture = createDotTexture();

// ═══════════════════════════════════════════════
// Sparkle 파티클 시스템
// ═══════════════════════════════════════════════

const sparkles = [];
const sparklesGeometry = new THREE.BufferGeometry();
let _sparklesAttrCount = 0; // sparkles 길이와 color/size 버퍼 길이를 동기화하기 위한 추적값
const sparklesMaterial = new THREE.ShaderMaterial({
  uniforms: {
    pointTexture: { value: dotTexture }
  },
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  blending: THREE.AdditiveBlending,
  alphaTest: 0.01,
  transparent: true,
  depthWrite: false,
});
const sparklesPoints = new THREE.Points(sparklesGeometry, sparklesMaterial);
group.add(sparklesPoints);

// ═══════════════════════════════════════════════
// Sparkle 클래스
// ═══════════════════════════════════════════════

class Sparkle extends THREE.Vector3 {
  setup(origin, color) {
    this.x = origin.x;
    this.y = origin.y;
    this.z = origin.z;
    this.v = new THREE.Vector3();
    this.v.x = THREE.MathUtils.randFloat(0.001, 0.006) * (Math.random() > 0.5 ? 1 : -1);
    this.v.y = THREE.MathUtils.randFloat(0.001, 0.006) * (Math.random() > 0.5 ? 1 : -1);
    this.v.z = THREE.MathUtils.randFloat(0.001, 0.006) * (Math.random() > 0.5 ? 1 : -1);
    this.size = Math.random() * 4 + 0.5 * pixelRatio;
    this.slowDown = 0.4 + Math.random() * 0.58;
    this.color = color;
  }
  update() {
    if (this.v.x > 0.001 || this.v.y > 0.001 || this.v.z > 0.001) {
      this.add(this.v);
      this.v.multiplyScalar(this.slowDown);
    }
  }
}

function updateSparklesGeometry() {
  const sizes = [], colors = [];
  sparkles.forEach(s => {
    sizes.push(s.size);
    colors.push(s.color.r, s.color.g, s.color.b);
  });
  sparklesGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  sparklesGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  _sparklesAttrCount = sparkles.length;
}

// ═══════════════════════════════════════════════
// Star 클래스 (배경 은하)
// ═══════════════════════════════════════════════

class Star {
  setup(color) {
    this.r = Math.random() * 3 + 1;
    this.phi = Math.random() * Math.PI * 2;
    this.theta = Math.random() * Math.PI;
    this.v = new THREE.Vector2().random().subScalar(0.5).multiplyScalar(0.0007);
    this.x = this.r * Math.sin(this.phi) * Math.sin(this.theta);
    this.y = this.r * Math.cos(this.phi);
    this.z = this.r * Math.sin(this.phi) * Math.cos(this.theta);
    this.size = Math.random() * 4 + 0.5 * pixelRatio;
    this.color = color;
  }
  update() {
    this.phi += this.v.x;
    this.theta += this.v.y;
    this.x = this.r * Math.sin(this.phi) * Math.sin(this.theta);
    this.y = this.r * Math.cos(this.phi);
    this.z = this.r * Math.sin(this.phi) * Math.cos(this.theta);
  }
}

// ═══════════════════════════════════════════════
// 은하 배경 생성
// ═══════════════════════════════════════════════

const stars = [];
const galaxyColors = COLORS.map(c => c.clone().multiplyScalar(0.5));
const galaxyVertices = [], galaxyColorsArr = [], galaxySizes = [];

for (let i = 0; i < 1500; i++) {
  const star = new Star();
  star.setup(galaxyColors[Math.floor(Math.random() * galaxyColors.length)]);
  galaxyVertices.push(star.x, star.y, star.z);
  galaxyColorsArr.push(star.color.r, star.color.g, star.color.b);
  galaxySizes.push(star.size);
  stars.push(star);
}

const starsGeometry = new THREE.BufferGeometry();
starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(galaxySizes, 1));
starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(galaxyColorsArr, 3));
starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(galaxyVertices, 3));
const galaxyPoints = new THREE.Points(starsGeometry, sparklesMaterial);
scene.add(galaxyPoints);

// ═══════════════════════════════════════════════
// 모듈 레벨 변수
// ═══════════════════════════════════════════════

let filmNodePoints = null;
let filmPositions3D = [];
const lines = [];
let _userFilmIndices = [];

function setHighlightedFilms(indices) {
  _userFilmIndices = indices;
}

// ═══════════════════════════════════════════════
// 상태 기반 시각 인코딩
// ═══════════════════════════════════════════════

const STATUS_VISUALS = {
  unwatched: { brightness: 0.25, saturation: 0.15 },
  watching:  { brightness: 0.6,  saturation: 0.5  },
  watched:   { brightness: 1.0,  saturation: 1.0  },
};

let _filmStatuses = [];
let _appMode = 'fallback';

/**
 * 클러스터 기본 색상에 status 기반 밝기+채도를 적용
 * 타겟 기반 보간
 */
function applyStatusVisuals(baseColor, status) {
  const target = STATUS_VISUALS[status] || STATUS_VISUALS.unwatched;
  const hsl = {};
  baseColor.getHSL(hsl);
  const targetS = hsl.s * target.saturation;
  const targetL = Math.max(hsl.l * target.brightness, 0.03);
  const result = new THREE.Color();
  result.setHSL(hsl.h, targetS, targetL);
  return result;
}

function setSceneMode(mode) {
  _appMode = mode;
}

// ═══════════════════════════════════════════════
// buildConstellation — 성좌 생성
// ═══════════════════════════════════════════════

function buildConstellation(films, highlightUser, userFilmIndices) {
  // 좌표 정규화 → -0.6 ~ 0.6 범위 (CodePen 해골과 비슷한 스케일)
  const xs = films.map(f => f.x);
  const ys = films.map(f => f.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const range = Math.max(maxX - minX, maxY - minY) || 1;

  films.forEach(f => {
    f.nx = ((f.x - (minX + maxX) / 2) / range) * 1.2;
    f.ny = ((f.y - (minY + maxY) / 2) / range) * 1.2;
    f.nz = (Math.random() - 0.5) * 0.15;
  });

  // 겹치는 별 분리: 최소 거리 0.05 보장
  const MIN_DIST = 0.05;
  for (let i = 0; i < films.length; i++) {
    for (let j = i + 1; j < films.length; j++) {
      const dx = films[j].nx - films[i].nx;
      const dy = films[j].ny - films[i].ny;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < MIN_DIST && d > 0) {
        const push = (MIN_DIST - d) / 2;
        const nx = dx / d, ny = dy / d;
        films[i].nx -= nx * push;
        films[i].ny -= ny * push;
        films[j].nx += nx * push;
        films[j].ny += ny * push;
      } else if (d === 0) {
        films[j].nx += MIN_DIST * 0.5;
        films[j].ny += MIN_DIST * 0.5;
      }
    }
  }

  filmPositions3D = films.map(f => new THREE.Vector3(f.nx, f.ny, f.nz));

  // ── 연결선 (같은 클러스터 + 거리 기반) ──
  const clusterMap = {};
  films.forEach((f, i) => {
    if (!clusterMap[f.cluster]) clusterMap[f.cluster] = [];
    clusterMap[f.cluster].push(i);
  });

  // 클러스터별 + 모든 근접 연결 (Neural Network 느낌)
  Object.entries(clusterMap).forEach(([cluster, indices]) => {
    const color = COLORS[cluster % COLORS.length];
    const lineMat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
    });

    const lineCoords = [];

    // 클러스터 내: 거리 0.35 이내 모든 쌍 연결
    for (let i = 0; i < indices.length; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        const a = filmPositions3D[indices[i]];
        const b = filmPositions3D[indices[j]];
        const d = a.distanceTo(b);
        if (d < 0.35) {
          lineCoords.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }

    if (lineCoords.length > 0) {
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineCoords, 3));
      const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
      lineMesh.userData.cluster = parseInt(cluster);
      group.add(lineMesh);
      lines.push(lineMesh);
    }
  });

  // 클러스터 간 약한 연결 (거리 0.18 이내)
  const interMat = new THREE.LineBasicMaterial({
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 0.08,
  });
  const interCoords = [];
  for (let i = 0; i < films.length; i++) {
    for (let j = i + 1; j < films.length; j++) {
      if (films[i].cluster === films[j].cluster) continue;
      const d = filmPositions3D[i].distanceTo(filmPositions3D[j]);
      if (d < 0.18) {
        interCoords.push(
          filmPositions3D[i].x, filmPositions3D[i].y, filmPositions3D[i].z,
          filmPositions3D[j].x, filmPositions3D[j].y, filmPositions3D[j].z,
        );
      }
    }
  }
  if (interCoords.length > 0) {
    const interGeo = new THREE.BufferGeometry();
    interGeo.setAttribute('position', new THREE.Float32BufferAttribute(interCoords, 3));
    group.add(new THREE.LineSegments(interGeo, interMat));
  }

  // ── 영화 노드: 큰 파티클 ──
  _filmStatuses = films.map(f => f.status || 'unwatched');

  const nodePosArr = [], nodeColArr = [], nodeSizeArr = [];
  films.forEach((f, i) => {
    const baseColor = COLORS[f.cluster % COLORS.length];
    const isUserFilm = highlightUser && userFilmIndices.includes(i);
    const isDimmed = highlightUser && !isUserFilm;

    let finalColor;
    if (isDimmed) {
      finalColor = { r: baseColor.r * 0.12, g: baseColor.g * 0.12, b: baseColor.b * 0.12 };
    } else if (isUserFilm) {
      finalColor = { r: baseColor.r * 1.5, g: baseColor.g * 1.5, b: baseColor.b * 1.5 };
    } else {
      finalColor = applyStatusVisuals(baseColor, _filmStatuses[i]);
    }

    nodePosArr.push(f.nx, f.ny, f.nz);
    nodeColArr.push(finalColor.r, finalColor.g, finalColor.b);
    nodeSizeArr.push((isUserFilm ? 9 : isDimmed ? 3 : 5) * pixelRatio);
  });

  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodePosArr, 3));
  nodeGeo.setAttribute('color', new THREE.Float32BufferAttribute(nodeColArr, 3));
  nodeGeo.setAttribute('size', new THREE.Float32BufferAttribute(nodeSizeArr, 1));
  filmNodePoints = new THREE.Points(nodeGeo, sparklesMaterial);
  group.add(filmNodePoints);

  // ── 각 영화에서 초기 Sparkle 분출 ──
  films.forEach((f, i) => {
    const color = COLORS[f.cluster % COLORS.length];
    const isUserFilm = highlightUser && userFilmIndices.includes(i);
    const count = isUserFilm ? 15 : 3; // 유저 영화는 스파클 폭발
    for (let j = 0; j < count; j++) {
      const spark = new Sparkle();
      spark.setup(filmPositions3D[i], isUserFilm ? new THREE.Color('#ffffff') : color);
      sparkles.push(spark);
    }
  });

  // 초기 sparkle 생성 직후 color/size 버퍼도 1회 동기화
  updateSparklesGeometry();
}

// ═══════════════════════════════════════════════
// 렌더 루프
// ═══════════════════════════════════════════════

let _films = [];
let _prev = 0;
let isDragging = false;

function render(a) {
  requestAnimationFrame(render);

  // 은하 회전
  galaxyPoints.rotation.y += 0.0005;

  // 자동 미세 회전
  if (!isDragging) {
    group.rotation.y += 0.0003;
  }

  // 주기적 sparkle 생성
  if (a - _prev > 30) {
    if (sparkles.length < 15000) {
      lines.forEach(l => {
        const cluster = l.userData.cluster;
        const clusterFilms = _films.reduce((acc, f, i) => {
          if (f.cluster === cluster) acc.push(i);
          return acc;
        }, []);
        if (clusterFilms.length > 0) {
          for (let k = 0; k < 2; k++) {
            const idx = clusterFilms[Math.floor(Math.random() * clusterFilms.length)];
            const color = COLORS[cluster % COLORS.length];
            const spark = new Sparkle();
            spark.setup(filmPositions3D[idx], color);
            sparkles.push(spark);
          }
        }
      });

      updateSparklesGeometry();
    }
    _prev = a;
  }

  // hover/click 등으로 sparkles.length가 변하면 draw 직전에 color/size도 즉시 동기화
  const sizeAttr = sparklesGeometry.getAttribute('size');
  const colorAttr = sparklesGeometry.getAttribute('color');
  const sizeCount = sizeAttr ? sizeAttr.count : 0;
  const colorCount = colorAttr ? colorAttr.count : 0;
  if (sparkles.length !== _sparklesAttrCount || sizeCount !== sparkles.length || colorCount !== sparkles.length) {
    updateSparklesGeometry();
  }

  // Sparkle 위치 업데이트
  const tempSparkles = [];
  sparkles.forEach(s => {
    s.update();
    tempSparkles.push(s.x, s.y, s.z);
  });
  sparklesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tempSparkles, 3));

  // Star 위치 업데이트
  const tempStars = [];
  stars.forEach(s => { s.update(); tempStars.push(s.x, s.y, s.z); });
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tempStars, 3));

  // 찾은 별 펄스 효과
  if (_userFilmIndices.length > 0 && filmNodePoints) {
    const sizes = filmNodePoints.geometry.attributes.size;
    const pulse = Math.sin(a * 0.004) * 0.5 + 0.5; // 0~1 반복
    for (let i = 0; i < _userFilmIndices.length; i++) {
      const idx = _userFilmIndices[i];
      sizes.array[idx] = (7 + pulse * 8) * pixelRatio; // 7~15 사이 반짝
    }
    sizes.needsUpdate = true;
  }

  // watching 상태 별 미세 halo 효과 (호흡 2.5초 주기)
  if (filmNodePoints && _filmStatuses.length > 0) {
    const colors = filmNodePoints.geometry.attributes.color;
    const breathe = Math.sin(a * 0.0025) * 0.08 + 0.08; // 0 ~ 0.16 범위
    let needsColorUpdate = false;
    for (let i = 0; i < _filmStatuses.length; i++) {
      if (_filmStatuses[i] !== 'watching') continue;
      if (_userFilmIndices.length > 0) continue;
      const baseColor = COLORS[_films[i].cluster % COLORS.length];
      const target = applyStatusVisuals(baseColor, 'watching');
      colors.array[i * 3] = target.r + breathe;
      colors.array[i * 3 + 1] = target.g + breathe;
      colors.array[i * 3 + 2] = target.b + breathe;
      needsColorUpdate = true;
    }
    if (needsColorUpdate) colors.needsUpdate = true;
  }

  composer.render();
}

function startRender(films) {
  _films = films;
  requestAnimationFrame(render);
}

function setDragging(value) {
  isDragging = value;
}

// ═══════════════════════════════════════════════
// handleResize
// ═══════════════════════════════════════════════

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  composer.setSize(window.innerWidth, window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
}

/**
 * 영화 상태 변경 시 별 시각 업데이트 (단일 진입점)
 */
function updateFilmStatus(filmIndex, newStatus, films) {
  _filmStatuses[filmIndex] = newStatus;

  const baseColor = COLORS[films[filmIndex].cluster % COLORS.length];
  const targetColor = applyStatusVisuals(baseColor, newStatus);

  if (!filmNodePoints) return;

  const colors = filmNodePoints.geometry.attributes.color;
  const currentR = colors.array[filmIndex * 3];
  const currentG = colors.array[filmIndex * 3 + 1];
  const currentB = colors.array[filmIndex * 3 + 2];

  const proxy = { r: currentR, g: currentG, b: currentB };
  gsap.to(proxy, {
    r: targetColor.r,
    g: targetColor.g,
    b: targetColor.b,
    duration: 0.5,
    ease: 'power2.out',
    onUpdate: () => {
      colors.array[filmIndex * 3] = proxy.r;
      colors.array[filmIndex * 3 + 1] = proxy.g;
      colors.array[filmIndex * 3 + 2] = proxy.b;
      colors.needsUpdate = true;
    },
  });
}

/**
 * 마일스톤 bloom 펄스 (25/50/75%)
 */
function triggerMilestoneBoom() {
  const original = bloomPass.strength;
  gsap.to(bloomPass, {
    strength: 1.2,
    duration: 0.5,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(bloomPass, { strength: original, duration: 0.5, ease: 'power2.in' });
    },
  });
}

/**
 * 106/106 완료 축하 (절제된 버전)
 */
function celebrateCompletion() {
  const original = bloomPass.strength;
  gsap.to(bloomPass, {
    strength: 1.5,
    duration: 0.8,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(bloomPass, { strength: original, duration: 0.8, ease: 'power2.in' });
    },
  });

  const sampleCount = Math.floor(Math.random() * 6) + 10;
  const indices = [];
  while (indices.length < sampleCount && indices.length < _films.length) {
    const idx = Math.floor(Math.random() * _films.length);
    if (!indices.includes(idx)) indices.push(idx);
  }
  indices.forEach(idx => {
    for (let j = 0; j < 5; j++) {
      const spark = new Sparkle();
      spark.setup(filmPositions3D[idx], new THREE.Color('#ffffff'));
      sparkles.push(spark);
    }
  });
}

// ═══════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════

export {
  scene, camera, renderer, composer, group, bloomPass,
  filmNodePoints, filmPositions3D, sparkles, sparklesMaterial,
  Sparkle, pixelRatio,
  buildConstellation, startRender, handleResize, setDragging, setHighlightedFilms,
  lines, starsGeometry, sparklesGeometry, galaxyPoints, stars,
  updateFilmStatus, setSceneMode, triggerMilestoneBoom, celebrateCompletion,
};
