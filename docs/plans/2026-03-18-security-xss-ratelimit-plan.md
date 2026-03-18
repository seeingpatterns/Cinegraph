# XSS 방어 + Rate Limiting 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 댓글 XSS 취약점 원천 차단 + 비밀번호 브루트포스 방지로 프로덕션 보안 수준 확보

**Architecture:** 프론트엔드 4곳의 innerHTML을 textContent/DOM API로 전환하여 XSS 원천 차단. 백엔드에 express-rate-limit을 추가하여 인증 엔드포인트(5회/15분)와 전체(100회/15분) 제한 적용.

**Tech Stack:** DOM API (textContent), express-rate-limit

---

## Task 1: XSS 방어 — 댓글 렌더링 (라인 311)

**Files:**
- Modify: `src/ui.js:308-313`

**Step 1: 댓글 innerHTML을 DOM API로 교체**

현재 코드 (라인 308-313):
```javascript
data.comments.forEach(c => {
  const div = document.createElement('div');
  div.className = 'comment-item';
  div.innerHTML = `<span class="comment-author">@${c.author_thread_id}</span> ${c.body}`;
  commentsEl.appendChild(div);
});
```

변경 후:
```javascript
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
```

**Step 2: 브라우저에서 수동 확인**

Run: Vite dev server에서 댓글이 있는 영화 카드 클릭
Expected: 댓글이 정상 표시되고, `<script>alert(1)</script>` 같은 댓글이 텍스트로 표시됨

**Step 3: Commit**

```bash
git add src/ui.js
git commit -m "security: fix XSS in comment rendering — innerHTML → DOM API"
```

---

## Task 2: XSS 방어 — 카드 메타 정보 (라인 276)

**Files:**
- Modify: `src/ui.js:276`

**Step 1: card-meta innerHTML을 DOM API로 교체**

현재 코드 (라인 276):
```javascript
document.getElementById('card-meta').innerHTML = `<strong>${f.director}</strong> · 추천 @${f.recommender}`;
```

변경 후:
```javascript
const metaEl = document.getElementById('card-meta');
metaEl.textContent = '';
const strong = document.createElement('strong');
strong.textContent = f.director;
metaEl.appendChild(strong);
metaEl.appendChild(document.createTextNode(` · 추천 @${f.recommender}`));
```

**Step 2: 브라우저에서 수동 확인**

Run: 영화 별 호버 시 카드 표시
Expected: "감독명 · 추천 @추천인" 형식으로 정상 표시, 감독명이 굵게(bold)

**Step 3: Commit**

```bash
git add src/ui.js
git commit -m "security: fix XSS in card meta — innerHTML → DOM API"
```

---

## Task 3: XSS 방어 — 검색 배너 (라인 365, 374)

**Files:**
- Modify: `src/ui.js:362-374`

**Step 1: 못찾음 배너 (라인 363-366) innerHTML 교체**

현재 코드:
```javascript
const banner = document.getElementById('treasure-banner');
banner.style.display = 'block';
banner.innerHTML = `<span class="user-name">@${input}</span> 님의 추천 영화를 찾지 못했어요`;
```

변경 후:
```javascript
const banner = document.getElementById('treasure-banner');
banner.style.display = 'block';
banner.textContent = '';
const nameSpan = document.createElement('span');
nameSpan.className = 'user-name';
nameSpan.textContent = `@${input}`;
banner.appendChild(nameSpan);
banner.appendChild(document.createTextNode(' 님의 추천 영화를 찾지 못했어요'));
```

**Step 2: 찾음 배너 (라인 371-374) innerHTML 교체**

현재 코드:
```javascript
const banner = document.getElementById('treasure-banner');
banner.style.display = 'block';
const titles = userFilmIndices.map(i => films[i].title).join(', ');
banner.innerHTML = `<span class="user-name">@${input}</span> 님이 추천한 영화 <span class="found-count">${userFilmIndices.length}</span>편이 빛나고 있어요!<br><small style="opacity:0.7">${titles}</small>`;
```

변경 후:
```javascript
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
```

**Step 3: 브라우저에서 수동 확인**

Run: 추천인 검색 — 존재하는 이름 + 존재하지 않는 이름 둘 다 테스트
Expected: 배너가 정상 표시, 스타일(색상, 줄바꿈, 투명도) 유지

**Step 4: Commit**

```bash
git add src/ui.js
git commit -m "security: fix XSS in search banners — innerHTML → DOM API"
```

---

## Task 4: Rate Limiting — express-rate-limit 설치 및 적용

**Files:**
- Modify: `backend/package.json` (npm install로 자동)
- Modify: `backend/server.js:5-13, 129-130, 161-162`

**Step 1: express-rate-limit 설치**

```bash
cd backend && npm install express-rate-limit
```

**Step 2: server.js에 import + 리미터 설정 추가**

`backend/server.js` 라인 5 뒤에 (import 블록):
```javascript
import rateLimit from 'express-rate-limit';
```

`app.use(helmet());` (라인 13) 뒤에 추가:
```javascript
// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '너무 많은 요청이에요. 잠시 후 다시 시도해주세요' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '너무 많은 요청이에요. 잠시 후 다시 시도해주세요' },
});

app.use(generalLimiter);
```

**Step 3: 인증 엔드포인트에 authLimiter 적용**

POST /api/reviews (라인 130):
```javascript
// 변경 전:
app.post('/api/reviews', async (req, res) => {

// 변경 후:
app.post('/api/reviews', authLimiter, async (req, res) => {
```

PUT /api/reviews/:id (라인 162):
```javascript
// 변경 전:
app.put('/api/reviews/:id', async (req, res) => {

// 변경 후:
app.put('/api/reviews/:id', authLimiter, async (req, res) => {
```

**Step 4: 서버 실행 확인**

Run: `cd backend && node server.js`
Expected: `Backend listening on http://0.0.0.0:3000` (에러 없이 시작)

**Step 5: Commit**

```bash
git add backend/server.js backend/package.json backend/package-lock.json
git commit -m "security: add rate limiting — auth 5req/15min, general 100req/15min"
```

---

## 진행 체크리스트

| # | Task | 상태 |
|---|------|------|
| 1 | XSS — 댓글 렌더링 (라인 311) | ⬜ |
| 2 | XSS — 카드 메타 (라인 276) | ⬜ |
| 3 | XSS — 검색 배너 (라인 365, 374) | ⬜ |
| 4 | Rate Limiting — express-rate-limit | ⬜ |
