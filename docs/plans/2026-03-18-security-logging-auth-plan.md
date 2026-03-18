# 보안 3차: 로깅 + 댓글 인증 + sessionStorage 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 보안 감사 로깅(Pino), 댓글 사칭 방지(bcrypt), 비밀번호 sessionStorage UX 개선

**Architecture:** Pino 로거를 별도 모듈로 분리하고 server.js의 인증 지점에 로그 삽입. 댓글 POST에 감상평과 동일한 bcrypt 검증 추가. 프론트엔드에서 sessionStorage로 비밀번호 임시 저장.

**Tech Stack:** Pino, pino-pretty, bcrypt (기존), Express (기존)

---

### Task 1: Pino 설치 및 로거 모듈 생성

**Files:**
- Modify: `backend/package.json`
- Create: `backend/logger.js`

**Step 1: pino + pino-pretty 설치**

```bash
cd /Users/jungeunkim/Desktop/Trace/backend && npm install pino pino-pretty
```

**Step 2: logger.js 생성**

```javascript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

export default logger;
```

**Step 3: 확인**

```bash
node -e "import('./logger.js').then(m => m.default.info('test'))"
```
Expected: JSON 또는 pretty 로그 출력

**Step 4: 커밋**

```bash
git add backend/logger.js backend/package.json backend/package-lock.json
git commit -m "security: add pino logger module"
```

---

### Task 2: server.js에 보안 로그 삽입

**Files:**
- Modify: `backend/server.js:1-231`

**Step 1: import 추가 (server.js 상단)**

`server.js` 9행 아래에 추가:

```javascript
import logger from './logger.js';
```

**Step 2: Rate limiter에 로그 추가**

`generalLimiter`와 `authLimiter`에 `handler` 옵션 추가:

```javascript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '너무 많은 요청이에요. 잠시 후 다시 시도해주세요' },
  handler: (req, res, next, options) => {
    logger.warn({ ip: req.ip, path: req.path }, 'rate limit exceeded (general)');
    res.status(options.statusCode).json(options.message);
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '너무 많은 요청이에요. 잠시 후 다시 시도해주세요' },
  handler: (req, res, next, options) => {
    logger.warn({ ip: req.ip, path: req.path }, 'rate limit exceeded (auth)');
    res.status(options.statusCode).json(options.message);
  },
});
```

**Step 3: 인증 실패/성공 로그 — POST /api/reviews (149-178행)**

감상평 POST 핸들러에서:

```javascript
app.post('/api/reviews', authLimiter, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' });
  const { film_title_en, content, password } = req.body;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash || !password) {
    logger.warn({ ip: req.ip, path: req.path }, 'auth failed: missing credentials');
    return res.status(401).json({ error: '비밀번호가 틀렸어요' });
  }
  const match = await bcrypt.compare(password, hash);
  if (!match) {
    logger.warn({ ip: req.ip, path: req.path }, 'auth failed: wrong password');
    return res.status(401).json({ error: '비밀번호가 틀렸어요' });
  }
  logger.info({ ip: req.ip, path: req.path }, 'auth success: review create');
  // ... 나머지 동일
```

**Step 4: 인증 실패/성공 로그 — PUT /api/reviews/:id (181-206행)**

감상평 PUT 핸들러에서 동일한 패턴:

```javascript
  if (!hash || !password) {
    logger.warn({ ip: req.ip, path: req.path }, 'auth failed: missing credentials');
    return res.status(401).json({ error: '비밀번호가 틀렸어요' });
  }
  const match = await bcrypt.compare(password, hash);
  if (!match) {
    logger.warn({ ip: req.ip, path: req.path }, 'auth failed: wrong password');
    return res.status(401).json({ error: '비밀번호가 틀렸어요' });
  }
  logger.info({ ip: req.ip, path: req.path }, 'auth success: review update');
```

**Step 5: 서버 에러 로그 — 모든 catch 블록**

각 `catch (e)` 블록에 추가 (총 6곳):

```javascript
  } catch (e) {
    logger.error({ ip: req.ip, path: req.path, err: e.message }, 'server error');
    res.status(500).json({ ... });
  }
```

**Step 6: 서버 시작 로그 교체 (229행)**

```javascript
app.listen(port, '0.0.0.0', () => {
  logger.info({ port }, 'backend listening');
});
```

**Step 7: 커밋**

```bash
git add backend/server.js
git commit -m "security: add pino audit logging to auth and error paths"
```

---

### Task 3: 댓글 POST에 bcrypt 인증 추가

**Files:**
- Modify: `backend/server.js:208-227` (댓글 POST 핸들러)

**Step 1: 댓글 핸들러에 비밀번호 검증 추가**

```javascript
// POST /api/reviews/:id/comments — 댓글 작성 (비밀번호 인증)
app.post('/api/reviews/:id/comments', authLimiter, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' });
  const { author_thread_id, body, password } = req.body;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash || !password) {
    logger.warn({ ip: req.ip, path: req.path }, 'auth failed: missing credentials');
    return res.status(401).json({ error: '비밀번호가 틀렸어요' });
  }
  const match = await bcrypt.compare(password, hash);
  if (!match) {
    logger.warn({ ip: req.ip, path: req.path }, 'auth failed: wrong password');
    return res.status(401).json({ error: '비밀번호가 틀렸어요' });
  }
  logger.info({ ip: req.ip, path: req.path, author: author_thread_id }, 'auth success: comment create');
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
    logger.error({ ip: req.ip, path: req.path, err: e.message }, 'server error');
    res.status(500).json({
      error: '서버 오류가 발생했어요',
      ...(process.env.NODE_ENV !== 'production' && { detail: e.message }),
    });
  }
});
```

**Step 2: 커밋**

```bash
git add backend/server.js
git commit -m "security: require password for comment creation"
```

---

### Task 4: 프론트엔드 — 댓글 폼에 비밀번호 전송 + sessionStorage UX

**Files:**
- Modify: `src/ui.js:835-850` (submitComment 함수)
- Modify: `src/ui.js:805-829` (submitReview 함수)

**Step 1: submitComment에 비밀번호 추가 (ui.js:835-850)**

```javascript
async function submitComment(reviewId, films) {
  const body = document.getElementById('comment-textarea').value.trim();
  if (!body || !_activeThreadId) return;
  const password = sessionStorage.getItem('trace-admin-pw') || '';
  if (!password) return;
  try {
    const resp = await fetch(`${API_BASE}/api/reviews/${reviewId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_thread_id: _activeThreadId, body, password }),
    });
    if (resp.ok) {
      document.getElementById('comment-textarea').value = '';
      if (hoveredIdx >= 0) updateCard(0, 0, films);
    }
  } catch { /* 무시 */ }
}
```

**Step 2: submitReview에서 sessionStorage 저장 (ui.js:805-829)**

인증 성공 시 비밀번호를 sessionStorage에 저장:

```javascript
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
    sessionStorage.setItem('trace-admin-pw', password);
    const review = await resp.json();
    _reviewsMap[_currentFilmTitleEn] = review;
    closeReviewModal();
  } catch {
    errorEl.textContent = '서버 연결 실패'; errorEl.style.display = 'block';
  }
}
```

**Step 3: 감상평 모달에서도 sessionStorage 자동 채우기 (ui.js:792-798)**

```javascript
function openReviewModal(filmTitleEn, filmTitle) {
  _currentFilmTitleEn = filmTitleEn;
  document.getElementById('review-modal-title').textContent = filmTitle;
  document.getElementById('review-textarea').value = '';
  document.getElementById('review-password').value = sessionStorage.getItem('trace-admin-pw') || '';
  document.getElementById('review-modal-error').style.display = 'none';
  document.getElementById('review-modal').classList.add('open');
}
```

**Step 4: 커밋**

```bash
git add src/ui.js
git commit -m "security: add password to comment submit + sessionStorage UX"
```

---

### Task 5: 수동 테스트 및 최종 커밋

**Step 1: Docker 서버 재시작**

```bash
cd /Users/jungeunkim/Desktop/Trace && docker compose down && docker compose up -d
```

**Step 2: 수동 테스트 — 인증 없이 댓글 시도**

```bash
curl -s -X POST http://localhost:3000/api/reviews/1/comments \
  -H "Content-Type: application/json" \
  -d '{"author_thread_id":"test","body":"hello"}' | jq
```
Expected: `401 { "error": "비밀번호가 틀렸어요" }`

**Step 3: 수동 테스트 — 올바른 비밀번호로 댓글**

```bash
curl -s -X POST http://localhost:3000/api/reviews/1/comments \
  -H "Content-Type: application/json" \
  -d '{"author_thread_id":"test","body":"hello","password":"trace-admin-dev"}' | jq
```
Expected: `201` 성공 응답

**Step 4: Docker 로그에서 Pino 출력 확인**

```bash
docker compose logs --tail=20 backend
```
Expected: `auth failed` 또는 `auth success` 로그 메시지 출력

**Step 5: 설계 문서 커밋**

```bash
git add docs/plans/
git commit -m "docs: add security phase 3 design and plan"
```
