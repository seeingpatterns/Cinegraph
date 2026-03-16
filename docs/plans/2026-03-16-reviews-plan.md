# 감상평 + 댓글 기능 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 영화 카드에서 감상평을 쓰고, 추천인이 댓글을 달 수 있게 한다.

**Architecture:** DB에 reviews/comments 테이블 추가, Express에 REST API 추가, 프론트 카드 UI에 감상평 표시 + 입력 기능 추가. 기존 articles/recommendations 테이블은 삭제.

**Tech Stack:** PostgreSQL 16, Express 4, Vite + 바닐라 JS

---

### Task 1: DB 스키마 교체 — articles/recommendations → reviews/comments

**Files:**
- Create: `db/init/03-reviews-comments.sql`
- Modify: `backend/server.js` (schema-check 쿼리 수정)

**Step 1: SQL 마이그레이션 파일 작성**

```sql
-- 기존 테이블 제거
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS articles CASCADE;

-- 새 테이블
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  film_title_en VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  author_thread_id VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Step 2: server.js의 schema-check 수정**

`/api/schema-check` 엔드포인트에서 확인할 테이블을 `('users', 'reviews', 'comments')`로 변경.

**Step 3: Docker 볼륨 리셋 후 테스트**

```bash
docker compose down -v
docker compose up -d
curl http://localhost:3001/api/schema-check
```

Expected: `{"ok":true,"tables":["comments","reviews","users"]}`

**Step 4: Commit**

```bash
git add db/init/03-reviews-comments.sql backend/server.js
git commit -m "feat: replace articles/recommendations with reviews/comments tables"
```

---

### Task 2: ADMIN_PASSWORD 환경변수 추가

**Files:**
- Modify: `docker-compose.yml` (backend environment에 추가)

**Step 1: docker-compose.yml에 환경변수 추가**

backend 서비스의 environment에 추가:
```yaml
ADMIN_PASSWORD: trace-admin-2026
```

**Step 2: Docker 재시작**

```bash
docker compose up -d
```

**Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add ADMIN_PASSWORD env var for review auth"
```

---

### Task 3: Reviews API — CRUD 엔드포인트

**Files:**
- Modify: `backend/server.js`

**Step 1: GET /api/reviews — 전체 감상평 조회**

```js
app.get('/api/reviews', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM reviews ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

**Step 2: GET /api/reviews/:film_title_en — 특정 영화 감상평 + 댓글**

```js
app.get('/api/reviews/:film_title_en', async (req, res) => {
  try {
    const { rows: reviews } = await pool.query(
      'SELECT * FROM reviews WHERE film_title_en = $1',
      [req.params.film_title_en]
    );
    if (reviews.length === 0) return res.json({ review: null, comments: [] });

    const { rows: comments } = await pool.query(
      'SELECT * FROM comments WHERE review_id = $1 ORDER BY created_at ASC',
      [reviews[0].id]
    );
    res.json({ review: reviews[0], comments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

**Step 3: POST /api/reviews — 감상평 작성 (비밀번호 인증)**

```js
app.post('/api/reviews', async (req, res) => {
  const { film_title_en, content, password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 틀렸어요' });
  }
  if (!film_title_en || !content) {
    return res.status(400).json({ error: 'film_title_en과 content가 필요해요' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO reviews (film_title_en, content) VALUES ($1, $2) RETURNING *',
      [film_title_en, content]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: '이미 감상평이 있어요. 수정하려면 PUT을 사용하세요' });
    }
    res.status(500).json({ error: e.message });
  }
});
```

**Step 4: PUT /api/reviews/:id — 감상평 수정**

```js
app.put('/api/reviews/:id', async (req, res) => {
  const { content, password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 틀렸어요' });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE reviews SET content = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [content, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: '감상평을 찾을 수 없어요' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

**Step 5: POST /api/reviews/:id/comments — 댓글 작성**

```js
app.post('/api/reviews/:id/comments', async (req, res) => {
  const { author_thread_id, body } = req.body;
  if (!author_thread_id || !body) {
    return res.status(400).json({ error: 'author_thread_id와 body가 필요해요' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO comments (review_id, author_thread_id, body) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, author_thread_id, body]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

**Step 6: curl로 전체 흐름 테스트**

```bash
# 감상평 작성
curl -X POST http://localhost:3001/api/reviews \
  -H 'Content-Type: application/json' \
  -d '{"film_title_en":"Forrest Gump","content":"정말 좋았다","password":"trace-admin-2026"}'

# 전체 조회
curl http://localhost:3001/api/reviews

# 특정 영화 조회
curl http://localhost:3001/api/reviews/Forrest%20Gump

# 댓글 작성 (review id=1 가정)
curl -X POST http://localhost:3001/api/reviews/1/comments \
  -H 'Content-Type: application/json' \
  -d '{"author_thread_id":"ban_byung_jong","body":"고마워요!"}'

# 다시 조회 (댓글 포함)
curl http://localhost:3001/api/reviews/Forrest%20Gump
```

**Step 7: Commit**

```bash
git add backend/server.js
git commit -m "feat: add reviews and comments REST API endpoints"
```

---

### Task 4: 프론트 — 감상평 데이터 로딩

**Files:**
- Modify: `src/data.js`
- Modify: `src/main.js`

**Step 1: data.js에 감상평 로딩 함수 추가**

```js
const API_BASE = 'http://localhost:3001';

export async function loadReviews() {
  try {
    const resp = await fetch(`${API_BASE}/api/reviews`);
    if (!resp.ok) return {};
    const reviews = await resp.json();
    const map = {};
    reviews.forEach(r => { map[r.film_title_en] = r; });
    return map;
  } catch {
    return {};
  }
}
```

reviews를 `{ "Forrest Gump": { id, content, ... }, ... }` 맵으로 반환.

**Step 2: main.js에서 loadReviews 호출**

```js
import { loadFilms, loadReviews } from './data.js';
```

init() 안에서:
```js
const films = await loadFilms();
const reviewsMap = await loadReviews();
```

reviewsMap을 buildLegend, bindEvents 등에 전달하거나 전역 상태로 관리.

**Step 3: Commit**

```bash
git add src/data.js src/main.js
git commit -m "feat: load reviews data from backend API"
```

---

### Task 5: 프론트 — 카드 UI에 감상평 표시 + 작성 버튼

**Files:**
- Modify: `index.html` (카드에 감상평 영역 추가)
- Modify: `style.css` (감상평 스타일)
- Modify: `src/ui.js` (updateCard에 감상평 표시 로직)

**Step 1: index.html 카드에 감상평 영역 추가**

film-card div 안에 추가:
```html
<div class="card-review" id="card-review"></div>
<button class="card-review-btn" id="card-review-btn">감상평 쓰기</button>
```

**Step 2: style.css에 감상평 스타일 추가**

```css
.card-review {
  margin-top: 10px; font-size: 12px; line-height: 1.7;
  color: #1EE3CF; opacity: 0.9;
  border-top: 1px solid rgba(30, 227, 207, 0.15);
  padding-top: 10px; display: none;
}
.card-review::before { content: '내 감상 — '; font-weight: 500; }

.card-review-btn {
  margin-top: 8px; background: rgba(30, 227, 207, 0.1);
  border: 1px solid rgba(30, 227, 207, 0.2); border-radius: 3px;
  color: #1EE3CF; font-size: 11px; padding: 5px 12px;
  cursor: pointer; display: none;
  font-family: 'DM Sans', 'Noto Sans KR', sans-serif;
}
.card-review-btn:hover {
  background: rgba(30, 227, 207, 0.2);
}
```

**Step 3: ui.js — updateCard에 감상평 표시 로직**

updateCard 함수에서 reviewsMap을 참조하여:
- 감상평 있으면 → `.card-review` 표시, 버튼 숨김
- 감상평 없으면 → `.card-review` 숨김, 버튼 표시

reviewsMap은 모듈 스코프 변수로 관리:
```js
let _reviewsMap = {};
export function setReviewsMap(map) { _reviewsMap = map; }
```

updateCard 안에 추가:
```js
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
```

**Step 4: Commit**

```bash
git add index.html style.css src/ui.js
git commit -m "feat: show reviews in film card with write button"
```

---

### Task 6: 프론트 — 감상평 작성 모달

**Files:**
- Modify: `index.html` (작성 모달 HTML)
- Modify: `style.css` (모달 스타일)
- Modify: `src/ui.js` (모달 열기/닫기 + POST 호출)

**Step 1: index.html에 감상평 작성 모달 추가**

body 끝 부분, script 태그 위에:
```html
<div class="review-modal" id="review-modal">
  <div class="review-modal-content">
    <div class="review-modal-title" id="review-modal-title"></div>
    <textarea id="review-textarea" placeholder="감상평을 적어주세요..." rows="5"></textarea>
    <input type="password" id="review-password" placeholder="비밀번호">
    <div class="review-modal-actions">
      <button id="review-submit-btn">저장</button>
      <button id="review-cancel-btn" class="cancel">취소</button>
    </div>
    <div class="review-modal-error" id="review-modal-error"></div>
  </div>
</div>
```

**Step 2: style.css에 모달 스타일 추가**

```css
.review-modal {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,0.7); display: none;
  align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
}
.review-modal.open { display: flex; }

.review-modal-content {
  background: rgba(8,8,18,0.95);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 3px; padding: 24px; width: 360px; max-width: 90vw;
}

.review-modal-title {
  font-family: 'Noto Sans KR', sans-serif;
  font-weight: 700; font-size: 15px; margin-bottom: 16px;
}

.review-modal textarea {
  width: 100%; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;
  color: #e8e4df; font-size: 13px; padding: 10px;
  font-family: 'DM Sans', 'Noto Sans KR', sans-serif;
  resize: vertical; outline: none;
}
.review-modal textarea:focus { border-color: #1EE3CF; }

.review-modal input[type="password"] {
  width: 100%; margin-top: 8px; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;
  color: #e8e4df; font-size: 13px; padding: 8px 10px;
  font-family: 'DM Sans', 'Noto Sans KR', sans-serif;
  outline: none;
}
.review-modal input:focus { border-color: #1EE3CF; }

.review-modal-actions {
  margin-top: 12px; display: flex; gap: 8px;
}
.review-modal-actions button {
  padding: 8px 16px; border-radius: 3px; font-size: 12px;
  cursor: pointer; border: 1px solid rgba(30,227,207,0.3);
  background: rgba(30,227,207,0.15); color: #1EE3CF;
  font-family: 'DM Sans', 'Noto Sans KR', sans-serif;
}
.review-modal-actions button:hover { background: rgba(30,227,207,0.25); }
.review-modal-actions button.cancel {
  background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);
  color: #7a7670;
}

.review-modal-error {
  margin-top: 8px; font-size: 11px; color: #FF6B6B; display: none;
}
```

**Step 3: ui.js에 모달 열기/닫기 + API 호출 로직**

```js
const API_BASE = 'http://localhost:3001';
let _currentFilmTitleEn = '';

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
  } catch (e) {
    errorEl.textContent = '서버 연결 실패'; errorEl.style.display = 'block';
  }
}
```

bindEvents에서 버튼 이벤트 바인딩:
```js
document.getElementById('card-review-btn').addEventListener('click', () => {
  const f = films[hoveredIdx];
  if (f) openReviewModal(f.title_en, f.title);
});
document.getElementById('review-cancel-btn').addEventListener('click', closeReviewModal);
document.getElementById('review-submit-btn').addEventListener('click', submitReview);
```

**Step 4: Commit**

```bash
git add index.html style.css src/ui.js
git commit -m "feat: add review writing modal with admin password auth"
```

---

### Task 7: 프론트 — 추천인 댓글 기능

**Files:**
- Modify: `src/ui.js`
- Modify: `index.html` (카드에 댓글 영역)
- Modify: `style.css`

**Step 1: index.html 카드에 댓글 영역 추가**

card-review-btn 아래에:
```html
<div class="card-comments" id="card-comments"></div>
<div class="card-comment-form" id="card-comment-form" style="display:none">
  <textarea id="comment-textarea" placeholder="답글을 남겨주세요..." rows="2"></textarea>
  <button id="comment-submit-btn">답글 달기</button>
</div>
```

**Step 2: style.css 댓글 스타일**

```css
.card-comments {
  margin-top: 8px; font-size: 11px; color: #aaa69e;
}
.card-comments .comment-item {
  padding: 6px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.card-comments .comment-author {
  color: #d4c5a9; font-weight: 500;
}

.card-comment-form { margin-top: 8px; }
.card-comment-form textarea {
  width: 100%; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;
  color: #e8e4df; font-size: 11px; padding: 6px 8px;
  font-family: 'DM Sans', 'Noto Sans KR', sans-serif;
  resize: none; outline: none;
}
.card-comment-form button {
  margin-top: 4px; padding: 4px 10px; font-size: 10px;
  background: rgba(30,227,207,0.1); border: 1px solid rgba(30,227,207,0.2);
  border-radius: 3px; color: #1EE3CF; cursor: pointer;
  font-family: 'DM Sans', 'Noto Sans KR', sans-serif;
}
```

**Step 3: ui.js — 추천인이 아이디 검색 후 본인 영화에 댓글 가능**

findMyStars 실행 후, updateCard에서:
- 현재 검색된 thread_id를 모듈 변수에 저장
- 해당 영화에 감상평이 있고 + 추천인 본인 영화면 → 댓글 폼 표시
- 댓글 목록이 있으면 표시

댓글 제출:
```js
async function submitComment(reviewId) {
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
      // 댓글 목록 새로고침
    }
  } catch (e) { /* 무시 */ }
}
```

**Step 4: Commit**

```bash
git add index.html style.css src/ui.js
git commit -m "feat: add recommender comment form on film cards"
```

---

### Task 8: 통합 테스트 + 최종 커밋

**Step 1: Docker 재시작**

```bash
docker compose down -v && docker compose up -d
```

**Step 2: 프론트 시작**

```bash
npm run dev
```

**Step 3: 전체 흐름 테스트**

1. 영화 호버 → 카드에 "감상평 쓰기" 버튼 보이는지
2. 버튼 클릭 → 모달 열림 → 감상평 + 비밀번호 입력 → 저장
3. 같은 영화 다시 호버 → 감상평 보이는지
4. "내 별 찾기"로 추천인 검색 → 본인 영화에 댓글 폼 보이는지
5. 댓글 작성 → 저장 후 표시되는지

**Step 4: 빌드 테스트**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete reviews and comments feature"
```

---

## 실행 순서 요약

| Task | 내용 | 의존성 |
|------|------|--------|
| 1 | DB 스키마 교체 | 없음 |
| 2 | ADMIN_PASSWORD 환경변수 | 없음 |
| 3 | Reviews API (5개 엔드포인트) | Task 1, 2 |
| 4 | 프론트 감상평 데이터 로딩 | Task 3 |
| 5 | 카드 UI에 감상평 표시 | Task 4 |
| 6 | 감상평 작성 모달 | Task 5 |
| 7 | 추천인 댓글 기능 | Task 6 |
| 8 | 통합 테스트 | Task 7 |

Task 1, 2는 병렬 가능.
