import * as THREE from 'three';
import gsap from 'gsap';
import { COLORS, COLORS_HEX, CLUSTER_NAMES } from './data.js';
import {
  camera, group, composer, renderer, bloomPass,
  filmNodePoints, filmPositions3D, sparkles,
  Sparkle, pixelRatio,
  handleResize, setDragging,
} from './scene.js';

// ═══════════════════════════════════════════════
// 모듈 스코프 상태
// ═══════════════════════════════════════════════

let hoveredIdx = -1;
let activeCluster = -1;
let searchTerm = '';
let isDragging = false;
let hasDragged = false;
let dragStart = { x: 0, y: 0 };

let userFilmIndices = [];
export function setUserFilmIndices(indices) { userFilmIndices = indices; }

// ═══════════════════════════════════════════════
// Raycaster
// ═══════════════════════════════════════════════

const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.04;
const mouseNDC = new THREE.Vector2();

// ═══════════════════════════════════════════════
// 범례
// ═══════════════════════════════════════════════

function buildLegend(films) {
  const legend = document.getElementById('legend');
  const clusterSet = [...new Set(films.map(f => f.cluster))].sort((a, b) => a - b);
  legend.innerHTML = '';
  clusterSet.forEach(c => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-dot" style="background:${COLORS_HEX[c % COLORS_HEX.length]}"></span>${CLUSTER_NAMES[c] || 'Cluster ' + c}`;
    item.addEventListener('click', () => {
      if (activeCluster === c) {
        activeCluster = -1;
        document.querySelectorAll('.legend-item').forEach(el => el.classList.remove('dimmed'));
      } else {
        activeCluster = c;
        document.querySelectorAll('.legend-item').forEach(el => el.classList.add('dimmed'));
        item.classList.remove('dimmed');
      }
    });
    legend.appendChild(item);
  });
}

// ═══════════════════════════════════════════════
// 이벤트 바인딩
// ═══════════════════════════════════════════════

function bindEvents(films) {
  window.addEventListener('mousemove', (e) => onMouseMove(e, films));

  renderer.domElement.addEventListener('mousedown', (e) => {
    isDragging = true; hasDragged = false;
    dragStart = { x: e.clientX, y: e.clientY };
    setDragging(true);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    setDragging(false);
  });

  renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    camera.position.z = Math.max(1.2, Math.min(6, camera.position.z + e.deltaY * 0.003));
  }, { passive: false });

  document.getElementById('search').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
  });

  window.addEventListener('resize', handleResize);

  // 모바일 터치 지원
  renderer.domElement.addEventListener('touchstart', (e) => {
    isDragging = true; hasDragged = false;
    setDragging(true);
    const t = e.touches[0];
    dragStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  renderer.domElement.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    const dx = t.clientX - dragStart.x;
    const dy = t.clientY - dragStart.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDragged = true;

    if (isDragging && hasDragged) {
      gsap.to(group.rotation, {
        y: group.rotation.y + dx * 0.005,
        x: THREE.MathUtils.clamp(group.rotation.x + dy * 0.005, -0.8, 0.8),
        duration: 0.5, ease: 'power1.out',
      });
      dragStart = { x: t.clientX, y: t.clientY };
    }
  }, { passive: true });

  renderer.domElement.addEventListener('touchend', (e) => {
    if (!hasDragged && e.changedTouches.length > 0) {
      // 탭: 별 선택
      const t = e.changedTouches[0];
      mouseNDC.x = (t.clientX / window.innerWidth) * 2 - 1;
      mouseNDC.y = -(t.clientY / window.innerHeight) * 2 + 1;

      if (filmNodePoints) {
        raycaster.setFromCamera(mouseNDC, camera);
        const intersects = raycaster.intersectObject(filmNodePoints);
        if (intersects.length > 0 && intersects[0].index < films.length) {
          hoveredIdx = intersects[0].index;
          const f = films[hoveredIdx];
          const color = COLORS[f.cluster % COLORS.length];
          for (let j = 0; j < 10; j++) {
            const spark = new Sparkle();
            spark.setup(filmPositions3D[hoveredIdx], color);
            sparkles.push(spark);
          }
          updateCard(t.clientX, t.clientY, films);
        } else {
          hoveredIdx = -1;
          document.getElementById('card').classList.remove('visible');
        }
      }
    }
    isDragging = false;
    setDragging(false);
  });

  // Enter 키로 검색
  document.getElementById('find-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') findMyStars(films);
  });
}

// ═══════════════════════════════════════════════
// 마우스 이동 — Raycaster 호버 감지
// ═══════════════════════════════════════════════

function onMouseMove(e, films) {
  mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

  if (isDragging) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDragged = true;

    gsap.to(group.rotation, {
      y: group.rotation.y + dx * 0.005,
      x: THREE.MathUtils.clamp(group.rotation.x + dy * 0.005, -0.8, 0.8),
      duration: 0.5,
      ease: 'power1.out',
    });
    dragStart = { x: e.clientX, y: e.clientY };
    return;
  }

  // Raycaster → filmNodePoints
  if (!filmNodePoints) return;
  raycaster.setFromCamera(mouseNDC, camera);
  const intersects = raycaster.intersectObject(filmNodePoints);

  if (intersects.length > 0) {
    const idx = intersects[0].index;
    if (idx !== hoveredIdx && idx < films.length) {
      hoveredIdx = idx;
      // 호버 시 스파클 분출
      const f = films[idx];
      const color = COLORS[f.cluster % COLORS.length];
      for (let j = 0; j < 10; j++) {
        const spark = new Sparkle();
        spark.setup(filmPositions3D[idx], color);
        sparkles.push(spark);
      }
      updateCard(e.clientX, e.clientY, films);
    } else if (idx === hoveredIdx) {
      positionCard(e.clientX, e.clientY);
    }
    renderer.domElement.style.cursor = 'pointer';
  } else {
    if (hoveredIdx >= 0) {
      hoveredIdx = -1;
      document.getElementById('card').classList.remove('visible');
    }
    renderer.domElement.style.cursor = isDragging ? 'grabbing' : 'grab';
  }
}

// ═══════════════════════════════════════════════
// 카드 UI
// ═══════════════════════════════════════════════

function updateCard(mx, my, films) {
  const card = document.getElementById('card');
  if (hoveredIdx < 0) { card.classList.remove('visible'); return; }

  const f = films[hoveredIdx];
  const hex = COLORS_HEX[f.cluster % COLORS_HEX.length];

  card.style.setProperty('--cc', hex);
  document.getElementById('card-year').textContent = f.year;
  document.getElementById('card-title').textContent = f.title;
  document.getElementById('card-title-en').textContent = f.title_en;
  document.getElementById('card-meta').innerHTML = `<strong>${f.director}</strong> · 추천 @${f.recommender}`;
  document.getElementById('card-desc').textContent = f.description;

  const noteEl = document.getElementById('card-note');
  if (f.note) { noteEl.textContent = f.note; noteEl.style.display = 'block'; }
  else { noteEl.style.display = 'none'; }

  positionCard(mx, my);
  card.classList.add('visible');
}

function positionCard(mx, my) {
  const card = document.getElementById('card');
  // 모바일: CSS가 위치를 제어하므로 스킵
  if (window.innerWidth <= 768) return;
  let left = mx + 20, top = my - 20;
  if (left + 320 > window.innerWidth - 16) left = mx - 340;
  if (top + (card.offsetHeight || 200) > window.innerHeight - 16) top = window.innerHeight - (card.offsetHeight || 200) - 16;
  if (top < 16) top = 16;
  card.style.left = left + 'px';
  card.style.top = top + 'px';
}

// ═══════════════════════════════════════════════
// 내 별 찾기
// ═══════════════════════════════════════════════

function findMyStars(films) {
  const input = document.getElementById('find-input').value.trim().toLowerCase().replace(/^@/, '');
  if (!input) return;

  // 유저 영화 찾기
  userFilmIndices = [];
  films.forEach((f, i) => {
    const recommenders = f.recommender.toLowerCase().split(/\s*\/\s*/);
    if (recommenders.some(r => r.trim() === input)) {
      userFilmIndices.push(i);
    }
  });

  if (userFilmIndices.length === 0) {
    const banner = document.getElementById('treasure-banner');
    banner.style.display = 'block';
    banner.innerHTML = `<span class="user-name">@${input}</span> 님의 추천 영화를 찾지 못했어요`;
    setTimeout(() => { banner.style.display = 'none'; }, 3000);
    return;
  }

  // 배너 표시
  const banner = document.getElementById('treasure-banner');
  banner.style.display = 'block';
  const titles = userFilmIndices.map(i => films[i].title).join(', ');
  banner.innerHTML = `<span class="user-name">@${input}</span> 님이 추천한 영화 <span class="found-count">${userFilmIndices.length}</span>편이 빛나고 있어요!<br><small style="opacity:0.7">${titles}</small>`;

  // 노드 비주얼 업데이트
  updateNodeVisuals(films);

  // 유저 영화에 스파클 폭발
  userFilmIndices.forEach(idx => {
    const color = COLORS[films[idx].cluster % COLORS.length];
    for (let j = 0; j < 20; j++) {
      const spark = new Sparkle();
      spark.setup(filmPositions3D[idx], new THREE.Color('#ffffff'));
      sparkles.push(spark);
    }
  });

  // UI 업데이트
  document.getElementById('reset-btn').style.display = 'inline-block';
  document.getElementById('find-input').style.borderColor = '#1EE3CF';
}

// ═══════════════════════════════════════════════
// 초기화
// ═══════════════════════════════════════════════

function resetStars(films) {
  userFilmIndices = [];
  document.getElementById('treasure-banner').style.display = 'none';
  document.getElementById('reset-btn').style.display = 'none';
  document.getElementById('find-input').value = '';
  document.getElementById('find-input').style.borderColor = '';
  updateNodeVisuals(films);
}

// ═══════════════════════════════════════════════
// 노드 비주얼 업데이트
// ═══════════════════════════════════════════════

function updateNodeVisuals(films) {
  if (!filmNodePoints) return;
  const colArr = [], sizeArr = [];
  films.forEach((f, i) => {
    const c = COLORS[f.cluster % COLORS.length];
    const isUserFilm = userFilmIndices.length > 0 && userFilmIndices.includes(i);
    const isDimmed = userFilmIndices.length > 0 && !isUserFilm;
    const mult = isDimmed ? 0.12 : isUserFilm ? 1.5 : 1.0;
    colArr.push(c.r * mult, c.g * mult, c.b * mult);
    sizeArr.push((isUserFilm ? 9 : isDimmed ? 3 : 5) * pixelRatio);
  });
  filmNodePoints.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
  filmNodePoints.geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizeArr, 1));
}

// ═══════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════

export { buildLegend, bindEvents, findMyStars, resetStars };
