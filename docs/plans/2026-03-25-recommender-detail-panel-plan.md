# Recommender Detail Panel — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 추천자가 `?recommender=handle` URL로 들어오면 자신이 추천한 영화들과 나의 감상을 보여주는 독립 오버레이 패널을 만든다.

**Architecture:** 기존 DNA 카드와 별도의 독립 컴포넌트. HTML 컨테이너 + CSS 스타일 + JS 함수(`showRecommenderDetail` / `hideRecommenderDetail`). 새 API나 DB 변경 없음. 기존 `films[]` 배열에서 모든 데이터를 파생.

**Tech Stack:** Vanilla JS (ES Modules), CSS, Vite

**Design doc:** `docs/plans/2026-03-25-recommender-detail-panel-design.md`

---

## 핵심 규칙

- DNA 카드와 Detail Panel은 **동시에 열리지 않음**
- Detail Panel은 **읽기 전용** (감상평 편집 기능 없음)
- DNA 카드의 요약 역할을 흡수하지 않음 — **책임 분리 유지**

---

### Task 1: HTML 컨테이너 추가

**Files:**
- Modify: `index.html:63` (dna-card 닫힌 직후)

**Step 1: `#recommender-detail` 컨테이너 삽입**

`index.html`의 `</div><!-- dna-card -->` (line 63) 바로 뒤에 삽입:

```html
<div class="recommender-detail" id="recommender-detail">
  <button class="rd-close" id="rd-close">&times;</button>
  <div class="rd-header">
    <div class="rd-id" id="rd-id">@recommender</div>
    <div class="rd-subtitle" id="rd-subtitle"></div>
  </div>
  <div class="rd-film-list" id="rd-film-list"></div>
</div>
```

**Step 2: Verify**

브라우저에서 `index.html` 소스 확인 — `#recommender-detail` 요소 존재.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add recommender detail panel HTML container"
```

---

### Task 2: CSS 스타일링

**Files:**
- Modify: `style.css` (dna-card 스타일 블록 이후, ~line 401 부근)

**Step 1: 데스크탑 스타일 추가**

`style.css`에서 `.dna-label` 블록 (line ~401) 이후에 삽입:

```css
  /* ═══ Recommender Detail Panel ═══ */

  .recommender-detail {
    position: fixed; top: 50%; right: -400px; z-index: 300;
    transform: translateY(-50%);
    width: 340px; max-height: 80vh;
    overflow-y: auto;
    background: rgba(8,8,18,0.95);
    border: 1px solid rgba(30,227,207,0.15);
    border-radius: 3px;
    padding: 24px;
    backdrop-filter: blur(16px);
    transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .recommender-detail.visible { right: 24px; }

  .recommender-detail::before {
    content: ''; position: absolute; top: 0; left: 0;
    width: 3px; height: 100%;
    background: linear-gradient(to bottom, #6B48FF, #1EE3CF);
    border-radius: 3px 0 0 3px;
  }

  .rd-close {
    position: absolute; top: 8px; right: 12px;
    background: none; border: none; color: #555;
    font-size: 18px; cursor: pointer; line-height: 1;
  }
  .rd-close:hover { color: #e8e4df; }

  .rd-header { margin-bottom: 20px; }

  .rd-id {
    font-family: 'Cormorant Garamond', serif;
    font-size: 22px; font-weight: 600;
    color: #1EE3CF; letter-spacing: 1px;
  }

  .rd-subtitle {
    font-size: 12px; color: #7a7670;
    margin-top: 4px; letter-spacing: 0.5px;
  }

  .rd-film-list {
    display: flex; flex-direction: column; gap: 12px;
  }

  .rd-film-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 3px;
    padding: 14px;
  }

  .rd-film-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 15px; font-weight: 600;
    color: #e8e4df; letter-spacing: 0.5px;
  }

  .rd-film-director {
    font-size: 11px; color: #555; margin-top: 2px;
  }

  .rd-film-status {
    font-size: 11px; margin-top: 8px; letter-spacing: 0.5px;
  }
  .rd-film-status.watched  { color: #1EE3CF; }
  .rd-film-status.watching { color: #C084FC; }
  .rd-film-status.unwatched { color: #555; }

  .rd-film-note {
    font-size: 11px; color: #7a7670;
    margin-top: 8px; font-style: italic;
  }

  .rd-film-reflection {
    font-size: 12px; color: #9a9590;
    margin-top: 8px; line-height: 1.5;
    border-left: 2px solid rgba(30,227,207,0.2);
    padding-left: 10px;
  }

  .rd-film-no-reflection {
    font-size: 11px; color: #444;
    margin-top: 8px; font-style: italic;
  }
```

**Step 2: 모바일 반응형 추가**

`style.css` `@media` 블록 (line ~533 부근, dna-card 모바일 스타일 이후)에 추가:

```css
    .recommender-detail {
      top: auto; right: 0; bottom: -100%;
      left: 0; width: 100%;
      transform: none;
      border-radius: 12px 12px 0 0;
      max-height: 70vh; overflow-y: auto;
    }
    .recommender-detail.visible { bottom: 0; right: 0; }
```

**Step 3: Verify**

브라우저에서 `#recommender-detail`에 수동으로 `visible` 클래스 토글 → 패널 슬라이드 인/아웃 확인.

**Step 4: Commit**

```bash
git add style.css
git commit -m "feat: add recommender detail panel styles"
```

---

### Task 3: JS — `showRecommenderDetail()` / `hideRecommenderDetail()`

**Files:**
- Modify: `src/ui.js`

**Step 1: 함수 구현**

`ui.js` 하단, `showDnaCard()` 함수 이후 (line ~544 부근)에 추가:

```js
// ═══════════════════════════════════════════════
// Recommender Detail Panel
// ═══════════════════════════════════════════════

const STATUS_ICON = { watched: '★', watching: '◐', unwatched: '○' };
const STATUS_LABEL = { watched: 'watched', watching: 'watching', unwatched: 'unwatched' };

function showRecommenderDetail(recommenderId, films) {
  // DNA 카드가 열려있으면 닫기 (동시에 열리지 않음)
  document.getElementById('dna-card').classList.remove('visible');

  const panel = document.getElementById('recommender-detail');
  const idLower = recommenderId.toLowerCase();

  // 해당 추천자의 영화 필터링
  const recFilms = films
    .filter(f => {
      const handles = f.recommender.toLowerCase().split(/\s*\/\s*/);
      return handles.some(h => h.trim() === idLower);
    });

  // 헤더
  document.getElementById('rd-id').textContent = `@${recommenderId}`;
  document.getElementById('rd-subtitle').textContent =
    `${recFilms.length}편의 영화를 추천해주었어요`;

  // 영화 리스트
  const listEl = document.getElementById('rd-film-list');
  listEl.innerHTML = '';

  recFilms.forEach(f => {
    const card = document.createElement('div');
    card.className = 'rd-film-card';

    const status = f.status || 'unwatched';
    const icon = STATUS_ICON[status];
    const label = STATUS_LABEL[status];
    const review = f.review ?? f.content ?? null;

    let html = '';
    html += `<div class="rd-film-title">${f.title} (${f.year})</div>`;
    html += `<div class="rd-film-director">${f.director}</div>`;
    html += `<div class="rd-film-status ${status}">${icon} ${label}</div>`;

    if (f.note) {
      html += `<div class="rd-film-note">추천: "${f.note}"</div>`;
    }

    if (review) {
      html += `<div class="rd-film-reflection">${review}</div>`;
    } else {
      html += `<div class="rd-film-no-reflection">아직 감상을 쓰지 않았어요</div>`;
    }

    card.innerHTML = html;
    listEl.appendChild(card);
  });

  // 슬라이드인
  panel.classList.add('visible');

  // 닫기 버튼
  document.getElementById('rd-close').onclick = () => hideRecommenderDetail();
}

function hideRecommenderDetail() {
  document.getElementById('recommender-detail').classList.remove('visible');
}
```

**Step 2: export 추가**

`ui.js` 하단의 export 목록 또는 함수 선언 앞에 `export` 키워드를 확인하고, `showRecommenderDetail`과 `hideRecommenderDetail`을 export.

현재 `ui.js`는 named export 패턴을 사용하므로 하단 export 블록이 없음 — 각 함수에 직접 export를 붙이거나, 기존 패턴에 맞춰 처리.

기존 export 패턴 확인:
- `export function setRecommenderFilmIndices(...)` (line 25)
- `export function setAppMode(...)` (line 36)
- 나머지는 `main.js`에서 직접 import하는 함수들

`showRecommenderDetail`과 `hideRecommenderDetail` 앞에 `export` 붙이기:

```js
export function showRecommenderDetail(recommenderId, films) { ... }
export function hideRecommenderDetail() { ... }
```

**Step 3: Verify**

`npm run build` — 빌드 성공 확인.

**Step 4: Commit**

```bash
git add src/ui.js
git commit -m "feat: implement showRecommenderDetail / hideRecommenderDetail"
```

---

### Task 4: DNA 카드에 "상세 보기" 버튼 추가

**Files:**
- Modify: `index.html:46` (dna-card 내부)
- Modify: `src/ui.js` (`showDnaCard` 함수)

**Step 1: HTML에 버튼 자리 추가**

`index.html`의 dna-card 내부, `dna-save` 버튼 (line 46) 바로 뒤에:

```html
<button class="dna-detail-btn" id="dna-detail-btn">상세 보기</button>
```

**Step 2: CSS 스타일 추가**

`style.css`의 `.dna-save:hover` (line 380) 이후에:

```css
  .dna-detail-btn {
    position: absolute; top: 10px; right: 90px;
    background: rgba(107,72,255,0.1);
    border: 1px solid rgba(107,72,255,0.2);
    border-radius: 3px;
    color: #6B48FF; font-size: 10px;
    font-family: 'DM Sans', 'Noto Sans KR', sans-serif;
    padding: 3px 10px; cursor: pointer;
    letter-spacing: 0.5px; transition: all 0.2s;
  }
  .dna-detail-btn:hover { background: rgba(107,72,255,0.2); }
```

**Step 3: JS 이벤트 연결**

`ui.js`의 `showDnaCard()` 함수 내, 닫기 버튼 바인딩 (line ~538) 이후에 추가:

```js
  // 상세 보기 버튼 → Detail Panel 열기
  document.getElementById('dna-detail-btn').onclick = () => {
    showRecommenderDetail(recommenderId, films);
  };
```

`showDnaCard`의 파라미터가 `(recommenderId, films)`인지 확인 — 현재 `showDnaCard(recommenderId, films)` (line 458). 맞음. `films`는 `_films`가 아니라 인자로 받으므로 두 번째 인자 그대로 전달.

단, `showDnaCard` 안에서 `films`는 직접 인자가 아니라 `_films` 또는 외부 변수일 수 있으므로, 실제 코드 확인 필요:

현재 `showDnaCard(recommenderId, films)` — `films` 인자를 직접 받음. 이 `films`를 그대로 `showRecommenderDetail`에 전달.

**Step 4: Verify**

브라우저에서 `findMyStars` → DNA 카드 열림 → "상세 보기" 클릭 → DNA 카드 닫히고 Detail Panel 열림.

**Step 5: Commit**

```bash
git add index.html style.css src/ui.js
git commit -m "feat: add 'view details' button to DNA card → opens detail panel"
```

---

### Task 5: `?recommender=` URL 진입 시 자동 오픈

**Files:**
- Modify: `src/main.js:3` (import 추가)
- Modify: `src/main.js:40` (Detail Panel 호출 추가)

**Step 1: import에 `showRecommenderDetail` 추가**

`main.js` line 3:

```js
// Before
import { buildLegend, bindEvents, setRecommenderFilmIndices, setAppMode, findMyStars, resetStars, bindReviewEvents, initProgressUI } from './ui.js';
// After
import { buildLegend, bindEvents, setRecommenderFilmIndices, setAppMode, findMyStars, resetStars, bindReviewEvents, initProgressUI, showRecommenderDetail } from './ui.js';
```

**Step 2: URL 진입 시 Detail Panel 자동 오픈**

`main.js`에서 banner 표시 블록 (line 26-40) 내부, `}` 닫는 괄호 (line 40) 직전에 추가:

```js
      // Detail Panel 자동 오픈 (primary entry flow)
      showRecommenderDetail(highlightRecommender, films);
```

최종 구조:

```js
    if (recommenderFilmIndices.length > 0) {
      // ... banner 표시 코드 ...
      banner.appendChild(document.createTextNode('편이 빛나고 있어요! 찾아보세요'));

      // Detail Panel 자동 오픈 (primary entry flow)
      showRecommenderDetail(highlightRecommender, films);
    }
```

주의: `showRecommenderDetail`은 `films` 배열을 받는데, 이 시점에서 `films`에는 아직 `status`/`review` 데이터가 API 모드에서 이미 포함되어 있음 (`loadFilms()`에서 JOIN). 문제 없음.

단, `buildConstellation()`과 `startRender()` 이전에 호출되므로, DOM만 조작하는 Detail Panel은 성좌도 렌더링과 독립적 — 순서 문제 없음.

**Step 3: Verify**

1. `npm run build` — 빌드 성공
2. 브라우저에서 `?recommender=erani13` 접속 → 성좌도 하이라이트 + Detail Panel 자동 오픈
3. 패널 닫기 → 성좌도 정상 동작

**Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: auto-open detail panel on ?recommender= URL entry"
```

---

### Task 6: 최종 통합 검증

**Step 1: 빌드 검증**

```bash
npm run build
```
Expected: 에러 없이 성공.

**Step 2: 흐름 1 (Primary) 검증**

`npm run dev` → `?recommender=erani13` 접속:
- [ ] 성좌도 하이라이트 + 펄스 정상
- [ ] Detail Panel 자동 오픈
- [ ] 영화 리스트 표시 (제목, 연도, 감독, 상태, note, reflection)
- [ ] 닫기 버튼 동작
- [ ] DNA 카드 열리지 않음

**Step 3: 흐름 2 (Secondary) 검증**

성좌도에서 검색창에 `erani13` 입력 → "내 별 찾기":
- [ ] DNA 카드 열림 + "상세 보기" 버튼 보임
- [ ] "상세 보기" 클릭 → DNA 카드 닫힘 + Detail Panel 열림
- [ ] 같은 영화 리스트 표시

**Step 4: 모바일 검증**

DevTools 모바일 뷰포트 (375px):
- [ ] Detail Panel 하단에서 슬라이드업
- [ ] 스크롤 동작
- [ ] 닫기 버튼 정상

**Step 5: 엣지 케이스**

- [ ] 존재하지 않는 추천자 (`?recommender=nobody`) → Detail Panel 열리지 않음 (기존 `recommenderFilmIndices.length > 0` 가드)
- [ ] 복수 추천자 영화 (`fencer211 / seed_106`) → 양쪽 추천자 모두에서 해당 영화 표시

**Step 6: Commit (있다면)**

통합 검증에서 수정 필요하면 여기서 커밋.

---

## 변경 파일 요약

| 파일 | Task | 변경 내용 |
|------|------|----------|
| `index.html` | 1, 4 | `#recommender-detail` 컨테이너 + DNA 카드에 "상세 보기" 버튼 |
| `style.css` | 2, 4 | Detail Panel 스타일 (데스크탑 + 모바일) + 버튼 스타일 |
| `src/ui.js` | 3, 4 | `showRecommenderDetail()`, `hideRecommenderDetail()` + DNA 카드 이벤트 |
| `src/main.js` | 5 | import 추가 + URL 진입 시 자동 오픈 |
