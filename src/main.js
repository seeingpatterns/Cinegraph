import { loadFilms, loadReviews, buildRecommenderProfiles } from './data.js';
import { buildConstellation, startRender } from './scene.js';
import { buildLegend, bindEvents, setUserFilmIndices, setReviewsMap, findMyStars, resetStars, bindReviewEvents } from './ui.js';

async function init() {
  const films = await loadFilms();
  const reviewsMap = await loadReviews();
  setReviewsMap(reviewsMap);

  // URL 파라미터 보물찾기
  const urlParams = new URLSearchParams(window.location.search);
  const highlightUser = urlParams.get('user')?.toLowerCase() || '';
  let userFilmIndices = [];

  if (highlightUser) {
    films.forEach((f, i) => {
      const recommenders = f.recommender.toLowerCase().split(/\s*\/\s*/);
      if (recommenders.some(r => r.trim() === highlightUser)) {
        userFilmIndices.push(i);
      }
    });

    if (userFilmIndices.length > 0) {
      const banner = document.getElementById('treasure-banner');
      banner.style.display = 'block';
      banner.innerHTML = `<span class="user-name">@${highlightUser}</span> 님이 추천한 영화 <span class="found-count">${userFilmIndices.length}</span>편이 빛나고 있어요! 찾아보세요`;
    }
  }

  // ui.js에 userFilmIndices 전달
  setUserFilmIndices(userFilmIndices);

  // 헤더 카운터 업데이트
  document.querySelector('.header-right').innerHTML = `${films.length} Films<br>Neural Constellation`;
  document.getElementById('counter').textContent = `${films.length} films`;

  // 작업 1-2: 추천인별 프로필 집계
  const recommenderProfiles = buildRecommenderProfiles(films);
  console.log('[Cinegraph] 추천인 프로필:', recommenderProfiles);

  buildConstellation(films, highlightUser, userFilmIndices);
  buildLegend(films);
  bindEvents(films);
  bindReviewEvents(films);

  // find-panel 버튼 이벤트 바인딩 (index.html의 onclick은 전역 함수를 참조하므로 여기서 바인딩)
  document.getElementById('find-btn').addEventListener('click', () => findMyStars(films));
  document.getElementById('reset-btn').addEventListener('click', () => resetStars(films));

  document.getElementById('loading').classList.add('hidden');
  startRender(films);
}

init();
