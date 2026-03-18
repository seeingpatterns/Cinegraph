import * as THREE from 'three';
import gsap from 'gsap';
import { COLORS, COLORS_HEX, CLUSTER_NAMES, buildRecommenderProfiles } from './data.js';
import {
  camera, group, composer, renderer, bloomPass,
  filmNodePoints, filmPositions3D, sparkles,
  Sparkle, pixelRatio,
  handleResize, setDragging, setHighlightedFilms,
} from './scene.js';

// ═══════════════════════════════════════════════
// 모듈 스코프 상태
// ═══════════════════════════════════════════════

let hoveredIdx = -1;
let pinnedIdx = -1;
let activeCluster = -1;
let searchTerm = '';
let isDragging = false;
let hasDragged = false;
let dragStart = { x: 0, y: 0 };

let userFilmIndices = [];
export function setUserFilmIndices(indices) { userFilmIndices = indices; }

let _reviewsMap = {};
export function setReviewsMap(map) { _reviewsMap = map; }

let _activeThreadId = '';
let _currentFilmTitleEn = '';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

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

  window.addEventListener('mouseup', (e) => {
    isDragging = false;
    setDragging(false);

    // 클릭(드래그 아님) → 별 위면 카드 고정, 아니면 고정 해제
    if (!hasDragged) {
      const card = document.getElementById('card');
      // 카드 내부 클릭이면 무시 (버튼 등 클릭 가능하게)
      if (card.contains(e.target)) return;

      // 클릭 위치에 별이 있는지 raycaster로 확인
      mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      let clickedOnStar = false;
      if (filmNodePoints) {
        raycaster.setFromCamera(mouseNDC, camera);
        const intersects = raycaster.intersectObject(filmNodePoints);
        if (intersects.length > 0 && intersects[0].index < films.length) {
          clickedOnStar = true;
          hoveredIdx = intersects[0].index;
        }
      }

      if (clickedOnStar) {
        // 별 클릭 → 카드 고정
        pinnedIdx = hoveredIdx;
        card.classList.add('pinned');
        updateCard(e.clientX, e.clientY, films);
      } else {
        // 빈 공간 클릭 → 고정 해제
        pinnedIdx = -1;
        hoveredIdx = -1;
        card.classList.remove('pinned', 'visible');
      }
    }
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
          pinnedIdx = hoveredIdx;
          const card = document.getElementById('card');
          card.classList.add('pinned');
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
          pinnedIdx = -1;
          const card = document.getElementById('card');
          card.classList.remove('pinned', 'visible');
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

  // 카드가 고정된 상태면 호버 업데이트 건너뛰기
  if (pinnedIdx >= 0) return;

  // Raycaster → filmNodePoints
  if (!filmNodePoints) return;
  raycaster.setFromCamera(mouseNDC, camera);
  const intersects = raycaster.intersectObject(filmNodePoints);

  if (intersects.length > 0) {
    const idx = intersects[0].index;
    // 아이디 검색 중이면 그 사람 추천 영화만 반응
    const isFiltered = userFilmIndices.length > 0 && !userFilmIndices.includes(idx);
    if (isFiltered) {
      if (hoveredIdx >= 0) {
        hoveredIdx = -1;
        document.getElementById('card').classList.remove('visible');
      }
      renderer.domElement.style.cursor = 'default';
      return;
    }
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
  const metaEl = document.getElementById('card-meta');
  metaEl.textContent = '';
  const strong = document.createElement('strong');
  strong.textContent = f.director;
  metaEl.appendChild(strong);
  metaEl.appendChild(document.createTextNode(` · 추천 @${f.recommender}`));
  document.getElementById('card-desc').textContent = f.description;

  const noteEl = document.getElementById('card-note');
  if (f.note) { noteEl.textContent = f.note; noteEl.style.display = 'block'; }
  else { noteEl.style.display = 'none'; }

  // 감상평 표시
  const reviewEl = document.getElementById('card-review');
  const reviewBtn = document.getElementById('card-review-btn');
  const review = _reviewsMap[f.title_en];
  if (review) {
    reviewEl.textContent = review.content;
    reviewEl.style.display = 'block';
    reviewBtn.style.display = 'none';
  } else {
    reviewEl.style.display = 'none';
    reviewBtn.style.display = 'inline-block';
  }

  // 댓글 표시
  const commentsEl = document.getElementById('card-comments');
  const commentForm = document.getElementById('card-comment-form');
  commentsEl.innerHTML = '';
  commentForm.style.display = 'none';

  if (review) {
    // 댓글 비동기 로드
    fetch(`${API_BASE}/api/reviews/${encodeURIComponent(f.title_en)}`)
      .then(r => r.json())
      .then(data => {
        if (data.comments && data.comments.length > 0) {
          data.comments.forEach(c => {
            const div = document.createElement('div');
            div.className = 'comment-item';
            const author = document.createElement('span');
            author.className = 'comment-author';
            author.textContent = `@${c.author_thread_id}`;
            div.appendChild(author);
            div.appendChild(document.createTextNode(` ${c.body}`));
            commentsEl.appendChild(div);
          });
        }
      })
      .catch(() => {});

    // 추천인 본인 영화면 댓글 폼 표시
    if (_activeThreadId) {
      const recommenders = f.recommender.toLowerCase().split(/\s*\/\s*/);
      if (recommenders.some(r => r.trim() === _activeThreadId)) {
        commentForm.style.display = 'block';
      }
    }
  }

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

  _activeThreadId = input;

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
    banner.textContent = '';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'user-name';
    nameSpan.textContent = `@${input}`;
    banner.appendChild(nameSpan);
    banner.appendChild(document.createTextNode(' 님의 추천 영화를 찾지 못했어요'));
    setTimeout(() => { banner.style.display = 'none'; }, 3000);
    return;
  }

  // 배너 표시
  const banner = document.getElementById('treasure-banner');
  banner.style.display = 'block';
  const titles = userFilmIndices.map(i => films[i].title).join(', ');
  banner.textContent = '';
  const nameSpan2 = document.createElement('span');
  nameSpan2.className = 'user-name';
  nameSpan2.textContent = `@${input}`;
  banner.appendChild(nameSpan2);
  banner.appendChild(document.createTextNode(' 님이 추천한 영화 '));
  const countSpan = document.createElement('span');
  countSpan.className = 'found-count';
  countSpan.textContent = userFilmIndices.length;
  banner.appendChild(countSpan);
  banner.appendChild(document.createTextNode('편이 빛나고 있어요!'));
  const br = document.createElement('br');
  banner.appendChild(br);
  const small = document.createElement('small');
  small.style.opacity = '0.7';
  small.textContent = titles;
  banner.appendChild(small);

  // 노드 비주얼 업데이트 + 펄스 효과 활성화
  updateNodeVisuals(films);
  setHighlightedFilms(userFilmIndices);

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

  // 취향 DNA 카드 표시
  showDnaCard(input, films);
}

// ═══════════════════════════════════════════════
// 초기화
// ═══════════════════════════════════════════════

function resetStars(films) {
  userFilmIndices = [];
  _activeThreadId = '';
  setHighlightedFilms([]);
  document.getElementById('treasure-banner').style.display = 'none';
  document.getElementById('reset-btn').style.display = 'none';
  document.getElementById('find-input').value = '';
  document.getElementById('find-input').style.borderColor = '';
  document.getElementById('dna-card').classList.remove('visible');
  updateNodeVisuals(films);
}

// ═══════════════════════════════════════════════
// 취향 DNA 카드
// ═══════════════════════════════════════════════

function showDnaCard(userId, films) {
  const profiles = buildRecommenderProfiles(films);
  const profile = profiles[userId];
  if (!profile) return;

  const card = document.getElementById('dna-card');

  // 아이디 + 영화 수
  document.getElementById('dna-id').textContent = `@${userId}`;
  document.getElementById('dna-count').textContent = `${profile.count}편 추천`;

  // 클러스터 분포 바 차트
  const barsEl = document.getElementById('dna-bars');
  barsEl.innerHTML = '';
  const maxCount = Math.max(...Object.values(profile.clusters), 1);

  // 클러스터를 편수 내림차순 정렬
  const sortedClusters = Object.entries(profile.clusters)
    .sort((a, b) => b[1] - a[1]);

  sortedClusters.forEach(([cl, count]) => {
    const row = document.createElement('div');
    row.className = 'dna-bar-row';
    const pct = Math.round((count / maxCount) * 100);
    const color = COLORS_HEX[Number(cl) % COLORS_HEX.length];
    const name = CLUSTER_NAMES[Number(cl)] || `Cluster ${cl}`;
    row.innerHTML = `
      <div class="dna-bar-name" title="${name}">${name}</div>
      <div class="dna-bar-track">
        <div class="dna-bar-fill" style="width:0%;background:${color}"></div>
      </div>
      <div class="dna-bar-count">${count}</div>
    `;
    barsEl.appendChild(row);

    // 애니메이션: 약간 딜레이 후 width 적용
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.querySelector('.dna-bar-fill').style.width = `${pct}%`;
      });
    });
  });

  // 대표 키워드 (상위 3개)
  const kwEl = document.getElementById('dna-keywords');
  kwEl.innerHTML = '';
  profile.keywords.slice(0, 3).forEach(kw => {
    const tag = document.createElement('span');
    tag.className = 'dna-keyword';
    tag.textContent = kw;
    kwEl.appendChild(tag);
  });

  // 취향 쌍둥이 찾기
  const twinsEl = document.getElementById('dna-twins');
  twinsEl.innerHTML = '';
  const twins = findTasteTwins(userId, profiles);

  if (twins.length === 0) {
    twinsEl.innerHTML = '<span style="font-size:11px;color:#555">아직 데이터가 부족해요</span>';
  } else {
    twins.forEach(({ name, similarity }) => {
      const div = document.createElement('div');
      div.className = 'dna-twin';
      const twinName = document.createElement('span');
      twinName.className = 'dna-twin-name';
      twinName.textContent = `@${name}`;
      div.appendChild(twinName);
      const twinScore = document.createElement('span');
      twinScore.className = 'dna-twin-score';
      twinScore.textContent = `${Math.round(similarity * 100)}% 일치`;
      div.appendChild(twinScore);
      twinsEl.appendChild(div);
    });
  }

  // 슬라이드인
  card.classList.add('visible');

  // 닫기 버튼
  document.getElementById('dna-close').onclick = () => card.classList.remove('visible');

  // 카드 저장 버튼
  document.getElementById('dna-save').onclick = () => {
    renderDnaCardImage(userId, profile, twins);
  };
}

// ═══════════════════════════════════════════════
// 취향 DNA 카드 → PNG 이미지 렌더링
// ═══════════════════════════════════════════════

function renderDnaCardImage(userId, profile, twins) {
  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 배경
  ctx.fillStyle = '#1A1A2E';
  ctx.fillRect(0, 0, W, H);

  // 좌측 그래디언트 액센트 라인
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1EE3CF');
  grad.addColorStop(1, '#6B48FF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 6, H);

  // 상단 로고
  ctx.fillStyle = '#d4c5a9';
  ctx.font = '600 42px "Cormorant Garamond", Georgia, serif';
  ctx.letterSpacing = '8px';
  ctx.fillText('CINEGRAPH', 60, 90);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#555';
  ctx.font = '300 18px "DM Sans", "Noto Sans KR", sans-serif';
  ctx.fillText('영화 임베딩 성좌도', 60, 120);

  // 구분선
  ctx.strokeStyle = 'rgba(30,227,207,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 150);
  ctx.lineTo(W - 60, 150);
  ctx.stroke();

  // 추천인 아이디
  ctx.fillStyle = '#1EE3CF';
  ctx.font = '600 48px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(`@${userId}`, 60, 220);

  // 추천 영화 수
  ctx.fillStyle = '#7a7670';
  ctx.font = '300 22px "DM Sans", "Noto Sans KR", sans-serif';
  ctx.fillText(`${profile.count}편 추천`, 60, 260);

  // 클러스터 분포 섹션
  ctx.fillStyle = '#555';
  ctx.font = '300 14px "DM Sans", sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('CLUSTER DISTRIBUTION', 60, 320);
  ctx.letterSpacing = '0px';

  const sortedClusters = Object.entries(profile.clusters)
    .sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...Object.values(profile.clusters), 1);
  const barStartX = 60;
  const barLabelW = 300;
  const barTrackW = 520;
  const barH = 18;
  let barY = 350;

  sortedClusters.forEach(([cl, count]) => {
    const name = CLUSTER_NAMES[Number(cl)] || `Cluster ${cl}`;
    const color = COLORS_HEX[Number(cl) % COLORS_HEX.length];
    const pct = count / maxCount;

    // 클러스터 이름
    ctx.fillStyle = '#7a7670';
    ctx.font = '300 20px "DM Sans", "Noto Sans KR", sans-serif';
    ctx.fillText(name, barStartX, barY + 14);

    // 바 트랙 배경
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    roundRect(ctx, barStartX + barLabelW, barY, barTrackW, barH, 4);

    // 바 채움
    ctx.fillStyle = color;
    const fillW = Math.max(barTrackW * pct, 4);
    roundRect(ctx, barStartX + barLabelW, barY, fillW, barH, 4);

    // 편수
    ctx.fillStyle = '#555';
    ctx.font = '300 16px "DM Sans", sans-serif';
    ctx.fillText(`${count}`, barStartX + barLabelW + barTrackW + 16, barY + 14);

    barY += 48;
  });

  // 대표 키워드 섹션
  let kwY = barY + 30;
  ctx.fillStyle = '#555';
  ctx.font = '300 14px "DM Sans", sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('KEYWORDS', 60, kwY);
  ctx.letterSpacing = '0px';
  kwY += 36;

  let kwX = 60;
  profile.keywords.slice(0, 3).forEach(kw => {
    ctx.font = '400 22px "DM Sans", "Noto Sans KR", sans-serif';
    const tw = ctx.measureText(kw).width;
    const padX = 20, padY = 10, tagH = 40;

    // 태그 배경
    ctx.fillStyle = 'rgba(212,197,169,0.08)';
    ctx.strokeStyle = 'rgba(212,197,169,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, kwX, kwY, tw + padX * 2, tagH, 4, true);

    // 태그 텍스트
    ctx.fillStyle = '#d4c5a9';
    ctx.fillText(kw, kwX + padX, kwY + 28);

    kwX += tw + padX * 2 + 14;
  });

  // 취향 쌍둥이 섹션
  let twinY = kwY + 80;
  ctx.fillStyle = '#555';
  ctx.font = '300 14px "DM Sans", sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('TASTE TWINS', 60, twinY);
  ctx.letterSpacing = '0px';
  twinY += 36;

  if (twins.length === 0) {
    ctx.fillStyle = '#555';
    ctx.font = '300 20px "DM Sans", "Noto Sans KR", sans-serif';
    ctx.fillText('아직 데이터가 부족해요', 60, twinY);
  } else {
    twins.forEach(({ name, similarity }) => {
      ctx.fillStyle = '#C084FC';
      ctx.font = '500 24px "DM Sans", "Noto Sans KR", sans-serif';
      ctx.fillText(`@${name}`, 60, twinY);

      const nameW = ctx.measureText(`@${name}`).width;
      ctx.fillStyle = '#555';
      ctx.font = '300 18px "DM Sans", sans-serif';
      ctx.fillText(`${Math.round(similarity * 100)}% 일치`, 60 + nameW + 16, twinY);

      twinY += 40;
    });
  }

  // 하단 URL
  ctx.fillStyle = '#555';
  ctx.font = '300 16px "DM Sans", sans-serif';
  ctx.letterSpacing = '1px';
  const url = 'cinegraph-app.vercel.app';
  const urlW = ctx.measureText(url).width;
  ctx.fillText(url, (W - urlW) / 2, H - 40);
  ctx.letterSpacing = '0px';

  // 하단 구분선
  ctx.strokeStyle = 'rgba(30,227,207,0.15)';
  ctx.beginPath();
  ctx.moveTo(60, H - 70);
  ctx.lineTo(W - 60, H - 70);
  ctx.stroke();

  // 다운로드
  const link = document.createElement('a');
  link.download = `cinegraph-${userId}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/** 둥근 사각형 헬퍼 */
function roundRect(ctx, x, y, w, h, r, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * 코사인 유사도로 취향 쌍둥이 찾기
 * 클러스터 분포 벡터를 비교해서 가장 비슷한 추천인 1~2명 반환
 */
function findTasteTwins(userId, profiles) {
  const myProfile = profiles[userId];
  if (!myProfile || myProfile.count < 1) return [];

  // 클러스터 분포를 7차원 벡터로 변환
  function toVector(clusters) {
    const v = [0, 0, 0, 0, 0, 0, 0];
    for (const [cl, count] of Object.entries(clusters)) {
      v[Number(cl)] = count;
    }
    return v;
  }

  function cosineSim(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  const myVec = toVector(myProfile.clusters);
  const results = [];

  for (const [name, profile] of Object.entries(profiles)) {
    if (name === userId) continue;
    if (profile.count < 2) continue; // 1편만 추천한 사람은 제외
    const sim = cosineSim(myVec, toVector(profile.clusters));
    results.push({ name, similarity: sim });
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 2);
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
// 감상평 모달
// ═══════════════════════════════════════════════

function openReviewModal(filmTitleEn, filmTitle) {
  _currentFilmTitleEn = filmTitleEn;
  document.getElementById('review-modal-title').textContent = filmTitle;
  document.getElementById('review-textarea').value = '';
  document.getElementById('review-password').value = '';
  document.getElementById('review-modal-error').style.display = 'none';
  document.getElementById('review-modal').classList.add('open');
}

function closeReviewModal() {
  document.getElementById('review-modal').classList.remove('open');
}

async function submitReview() {
  const content = document.getElementById('review-textarea').value.trim();
  const password = document.getElementById('review-password').value;
  const errorEl = document.getElementById('review-modal-error');

  if (!content) { errorEl.textContent = '감상평을 입력하세요'; errorEl.style.display = 'block'; return; }

  try {
    const resp = await fetch(`${API_BASE}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ film_title_en: _currentFilmTitleEn, content, password }),
    });
    if (!resp.ok) {
      const err = await resp.json();
      errorEl.textContent = err.error; errorEl.style.display = 'block';
      return;
    }
    const review = await resp.json();
    _reviewsMap[_currentFilmTitleEn] = review;
    closeReviewModal();
  } catch {
    errorEl.textContent = '서버 연결 실패'; errorEl.style.display = 'block';
  }
}

// ═══════════════════════════════════════════════
// 댓글 제출
// ═══════════════════════════════════════════════

async function submitComment(reviewId, films) {
  const body = document.getElementById('comment-textarea').value.trim();
  if (!body || !_activeThreadId) return;
  try {
    const resp = await fetch(`${API_BASE}/api/reviews/${reviewId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_thread_id: _activeThreadId, body }),
    });
    if (resp.ok) {
      document.getElementById('comment-textarea').value = '';
      // 카드 갱신
      if (hoveredIdx >= 0) updateCard(0, 0, films);
    }
  } catch { /* 무시 */ }
}

// ═══════════════════════════════════════════════
// 모달/댓글 이벤트 바인딩
// ═══════════════════════════════════════════════

function bindReviewEvents(films) {
  document.getElementById('card-review-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const f = films[hoveredIdx];
    if (f) openReviewModal(f.title_en, f.title);
  });
  document.getElementById('review-cancel-btn').addEventListener('click', closeReviewModal);
  document.getElementById('review-submit-btn').addEventListener('click', submitReview);
  document.getElementById('review-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeReviewModal();
  });
  document.getElementById('comment-submit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const f = films[hoveredIdx];
    const review = f ? _reviewsMap[f.title_en] : null;
    if (review) submitComment(review.id, films);
  });
}

// ═══════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════

export { buildLegend, bindEvents, findMyStars, resetStars, bindReviewEvents };
