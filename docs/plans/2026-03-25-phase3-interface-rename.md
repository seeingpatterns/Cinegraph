# Phase 3: Interface Renaming (`user` → `recommender`) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** export 함수명과 cross-module 파라미터에 남아있는 `user` → `recommender`로 리네임하여 도메인 언어를 완전히 통일한다.

**Architecture:** 3개 파일(scene.js, ui.js, main.js)에 걸쳐 7개 심볼을 atomic하게 리네임. 모든 변경은 단일 커밋으로 처리. data.js는 변경 없음.

**Tech Stack:** Vanilla JS (ES Modules), Vite

---

## 1. Rename Map (전체)

| # | 현재 이름 | 새 이름 | 위치 | 종류 |
|---|----------|---------|------|------|
| 1 | `setUserFilmIndices` | `setRecommenderFilmIndices` | ui.js:25 (export) | export 함수 |
| 2 | `setUserFilmIndices` | `setRecommenderFilmIndices` | main.js:3 (import) | import |
| 3 | `setUserFilmIndices` | `setRecommenderFilmIndices` | main.js:44 (call) | 호출 |
| 4 | `highlightUser` | `highlightRecommender` | scene.js:247 (param) | 함수 파라미터 |
| 5 | `highlightUser` | `highlightRecommender` | scene.js:355 (usage) | 파라미터 사용 |
| 6 | `highlightUser` | `highlightRecommender` | scene.js:356 (usage) | 파라미터 사용 |
| 7 | `highlightUser` | `highlightRecommender` | scene.js:382 (usage) | 파라미터 사용 |
| 8 | `userFilmIndices` | `recommenderFilmIndices` | scene.js:247 (param) | 함수 파라미터 |
| 9 | `userFilmIndices` | `recommenderFilmIndices` | scene.js:355 (usage) | 파라미터 사용 |
| 10 | `userFilmIndices` | `recommenderFilmIndices` | scene.js:382 (usage) | 파라미터 사용 |

> **참고:** main.js:55 `buildConstellation(films, highlightRecommender, recommenderFilmIndices)` — 호출자의 로컬 변수는 이미 Phase 2에서 리네임 완료. 함수 시그니처(scene.js)만 남아있음.

## 2. Dependency Graph

```
main.js
  ├── imports setUserFilmIndices ← ui.js (export)
  ├── calls   setUserFilmIndices(recommenderFilmIndices)
  └── calls   buildConstellation(films, highlightRecommender, recommenderFilmIndices)
                    ↓
              scene.js: buildConstellation(films, highlightUser, userFilmIndices)
                         파라미터명 "highlightUser", "userFilmIndices" ← Phase 3 대상

ui.js
  └── export function setUserFilmIndices(indices) ← Phase 3 대상
       (내부에서 recommenderFilmIndices에 할당 — 이미 Phase 2에서 리네임됨)
```

```
파일 의존 방향:
  main.js → ui.js    (setUserFilmIndices import)
  main.js → scene.js (buildConstellation import)
  ui.js   → scene.js (setHighlightedFilms 등 — Phase 3 무관)
```

## 3. Atomic Safety 분석

### 왜 atomic이어야 하는가?
- `main.js`가 `ui.js`에서 `setUserFilmIndices`를 import
- import 이름을 바꾸면 export 이름도 **동시에** 바뀌어야 함
- `buildConstellation`의 파라미터는 scene.js 내부에서만 사용 → 파일 내 완결

### Atomic 전략
- 모든 변경을 한 번에 적용 → 단일 `git commit`
- Vite HMR이 3개 파일을 동시에 리로드하므로 중간 상태 없음
- 변경 순서는 실행 순서가 아니라 **편집 순서** — 아래 순서대로 편집하면 안전

## 4. 변경 순서 (편집 순서)

### Task 1: scene.js — `buildConstellation` 파라미터 리네임

**Files:**
- Modify: `src/scene.js:247, 355, 356, 382`

**Step 1: 파라미터 선언 변경 (line 247)**
```js
// Before
function buildConstellation(films, highlightUser, userFilmIndices) {
// After
function buildConstellation(films, highlightRecommender, recommenderFilmIndices) {
```

**Step 2: 파라미터 사용 변경 (lines 355-356)**
```js
// Before
const isHighlighted = highlightUser && userFilmIndices.includes(i);
const isDimmed = highlightUser && !isHighlighted;
// After
const isHighlighted = highlightRecommender && recommenderFilmIndices.includes(i);
const isDimmed = highlightRecommender && !isHighlighted;
```

**Step 3: 파라미터 사용 변경 (line 382)**
```js
// Before
const isHighlighted = highlightUser && userFilmIndices.includes(i);
// After
const isHighlighted = highlightRecommender && recommenderFilmIndices.includes(i);
```

> scene.js의 export 목록은 변경 불필요 — `buildConstellation` 이름 자체는 유지.

### Task 2: ui.js — export 함수명 리네임

**Files:**
- Modify: `src/ui.js:25`

**Step 1: export 함수명 변경**
```js
// Before
export function setUserFilmIndices(indices) { recommenderFilmIndices = indices; }
// After
export function setRecommenderFilmIndices(indices) { recommenderFilmIndices = indices; }
```

### Task 3: main.js — import & 호출 리네임

**Files:**
- Modify: `src/main.js:3, 44`

**Step 1: import 변경 (line 3)**
```js
// Before
import { buildLegend, bindEvents, setUserFilmIndices, setAppMode, findMyStars, resetStars, bindReviewEvents, initProgressUI } from './ui.js';
// After
import { buildLegend, bindEvents, setRecommenderFilmIndices, setAppMode, findMyStars, resetStars, bindReviewEvents, initProgressUI } from './ui.js';
```

**Step 2: 호출 변경 (line 44)**
```js
// Before
setUserFilmIndices(recommenderFilmIndices);
// After
setRecommenderFilmIndices(recommenderFilmIndices);
```

### Task 4: 검증

**Step 1: grep으로 잔여 "user" 확인**
```bash
cd /Users/jungeunkim/Dev/Trace
grep -rn 'setUserFilmIndices\|highlightUser\b\|userFilmIndices\b' src/
```
Expected: **출력 없음** (0 matches)

**Step 2: Vite 빌드 확인**
```bash
npm run build
```
Expected: 에러 없이 빌드 성공

**Step 3: 브라우저 확인**
- `npm run dev` → 성좌도 정상 렌더링
- `?recommender=erani13` → 해당 추천자 영화 하이라이트 정상 동작

### Task 5: 커밋

```bash
git add src/scene.js src/ui.js src/main.js
git commit -m "refactor: rename export interfaces user → recommender (Phase 3)"
```

## 5. 변경되지 않는 것 (확인)

| 항목 | 이유 |
|------|------|
| `data.js` | "user" 관련 심볼 없음 |
| `index.html` | Phase 2에서 이미 `@recommender`로 변경됨 |
| `style.css` | Phase 2에서 이미 `.recommender-name`으로 변경됨 |
| `buildConstellation` 함수명 | 도메인과 무관한 중립적 이름 — 유지 |
| `setHighlightedFilms` (scene.js) | Phase 2에서 이미 리네임됨 |
| URL 파라미터 `?user=` 폴백 | 하위호환 유지 (의도적) |
| `backend/server.js` | Phase 4 범위 |
| `db/init/*.sql` | Phase 4 범위 |

## 6. 위험 요소

| 위험 | 확률 | 대응 |
|------|------|------|
| import/export 불일치 | 낮음 | grep 검증 (Task 4 Step 1) |
| Vite HMR 캐시 | 극히 낮음 | `npm run build`로 full 빌드 검증 |
| 다른 파일에서 dynamic import | 없음 | 전체 프로젝트에 dynamic import 미사용 |

---

> **총 변경:** 3개 파일, 7개 라인, 3개 심볼 리네임
> **예상 커밋:** 1개 (atomic)
