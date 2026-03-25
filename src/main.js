import { loadFilms, buildRecommenderProfiles } from './data.js';
import { buildConstellation, startRender } from './scene.js';
import { buildLegend, bindEvents, setRecommenderFilmIndices, setAppMode, findMyStars, resetStars, bindReviewEvents, initProgressUI } from './ui.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

async function init() {
  const { films, mode } = await loadFilms();

  // ui.js에 모드 전달
  setAppMode(mode);

  // URL 파라미터 보물찾기 (?recommender= 우선, ?user= 폴백)
  const urlParams = new URLSearchParams(window.location.search);
  const highlightRecommender = (urlParams.get('recommender') || urlParams.get('user') || '').toLowerCase();
  let recommenderFilmIndices = [];

  if (highlightRecommender) {
    films.forEach((f, i) => {
      const recommenders = f.recommender.toLowerCase().split(/\s*\/\s*/);
      if (recommenders.some(r => r.trim() === highlightRecommender)) {
        recommenderFilmIndices.push(i);
      }
    });

    if (recommenderFilmIndices.length > 0) {
      const banner = document.getElementById('treasure-banner');
      banner.style.display = 'block';
      banner.textContent = '';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'recommender-name';
      nameSpan.textContent = `@${highlightRecommender}`;
      banner.appendChild(nameSpan);
      banner.appendChild(document.createTextNode(' 님이 추천한 영화 '));
      const countSpan = document.createElement('span');
      countSpan.className = 'found-count';
      countSpan.textContent = recommenderFilmIndices.length;
      banner.appendChild(countSpan);
      banner.appendChild(document.createTextNode('편이 빛나고 있어요! 찾아보세요'));
    }
  }

  // ui.js에 추천자 영화 인덱스 전달
  setRecommenderFilmIndices(recommenderFilmIndices);

  // 헤더 카운터 업데이트
  document.querySelector('.header-right').innerHTML = `${films.length} Films<br>Neural Constellation`;
  document.getElementById('counter').textContent = `${films.length} films`;

  // 추천인별 프로필 집계
  const recommenderProfiles = buildRecommenderProfiles(films);
  console.log('[Cinegraph] 추천인 프로필:', recommenderProfiles);

  // 성좌도 즉시 렌더링 (최우선)
  buildConstellation(films, highlightRecommender, recommenderFilmIndices);
  buildLegend(films);
  bindEvents(films);
  bindReviewEvents(films);

  document.getElementById('find-btn').addEventListener('click', () => findMyStars(films));
  document.getElementById('reset-btn').addEventListener('click', () => resetStars(films));

  document.getElementById('loading').classList.add('hidden');
  startRender(films);

  // 프로그레스는 렌더링 이후 비동기 로드 (API 모드만)
  if (mode === 'api') {
    try {
      const resp = await fetch(`${API_BASE}/api/progress`);
      if (resp.ok) {
        const progress = await resp.json();
        initProgressUI(progress, films);
      }
    } catch {
      console.log('[Cinegraph] Progress fetch failed — skipping progress UI');
    }
  }
}

init();
