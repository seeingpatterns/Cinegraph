# XSS 방어 + Rate Limiting 설계

**Goal:** 댓글 XSS 취약점 차단 + 비밀번호 브루트포스 방지

**Architecture:** 프론트엔드 innerHTML → textContent 전환, 백엔드 express-rate-limit 적용

---

## 1. XSS 방어 — innerHTML → textContent

### 대상 파일: `src/ui.js`

| 라인 | 현재 | 위험도 | 수정 방법 |
|------|------|--------|-----------|
| 311 | `div.innerHTML = ...${c.body}` | 🚨 사용자 입력 | DOM API로 작성자/본문 분리 삽입 |
| 276 | `innerHTML = ...${f.director}...${f.recommender}` | ⚠️ DB 데이터 | DOM API로 요소 생성 |
| 365 | `banner.innerHTML = ...${input}` | 🚨 사용자 입력 | textContent로 전환 |
| 374 | `banner.innerHTML = ...${input}...${titles}` | 🚨 사용자 입력 | textContent + DOM API |

### 수정하지 않는 것 (안전)
- `el.innerHTML = ''` (초기화용, 라인 49/299/431/463/473)
- 하드코딩 데이터만 사용하는 범례/DNA 차트 (라인 53/444/477/482)

---

## 2. Rate Limiting — express-rate-limit

### 대상 파일: `backend/server.js`, `backend/package.json`

| 리미터 | 대상 | 제한 | 이유 |
|--------|------|------|------|
| `authLimiter` | `POST /api/reviews`, `PUT /api/reviews/:id` | 5회/15분 | 비밀번호 브루트포스 방지 |
| `generalLimiter` | 나머지 전체 | 100회/15분 | 일반 남용 방지 |

### 429 응답
```json
{ "error": "너무 많은 요청이에요. 잠시 후 다시 시도해주세요" }
```

### 선택 이유
- 라이브러리: `express-rate-limit` (npm 주간 200만+ 다운로드)
- 저장소: 메모리 기반 (단일 서버, 충분)
- DOMPurify 대신 textContent: 의존성 0, 원천 차단
