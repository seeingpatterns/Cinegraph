# 보안 3차: 로깅 + 댓글 사칭 방지 설계

**날짜**: 2026-03-18
**브랜치**: `feat/phase1-dna-card`

## 1. 보안 감사 로깅 (Pino)

### 목적
보안 이벤트만 기록 (운영 모니터링 아님)

### 기술 선택
- **Pino** — 가볍고 빠름, JSON 포맷, Docker stdout 표준
- **pino-pretty** — 개발 환경에서 읽기 쉬운 포맷

### 기록할 이벤트

| 이벤트 | 로그 레벨 | 기록할 정보 |
|--------|-----------|-------------|
| 인증 실패 (감상평/댓글) | `warn` | IP, 엔드포인트, 시간 |
| 인증 성공 (감상평/댓글) | `info` | IP, 엔드포인트, 시간 |
| Rate limit 초과 | `warn` | IP, 시간 |
| 서버 에러 (500) | `error` | IP, 엔드포인트, 에러 메시지 |

### 구현
- `backend/logger.js` — Pino 인스턴스 생성
- `server.js` — 인증 지점 4~5곳에 로그 추가
- stdout 출력 (`docker logs`로 확인)

## 2. 댓글 사칭 방지 (비밀번호 검증)

### 문제
댓글 POST에 인증 없음 → `author_thread_id` 사칭 가능

### 해결
감상평 작성과 동일한 bcrypt 비밀번호 검증을 댓글 POST에 추가

### 변경 전
```
POST /api/reviews/:id/comments
{ author_thread_id, body }
```

### 변경 후
```
POST /api/reviews/:id/comments
{ author_thread_id, body, password }
```

### 구현
- `server.js` — 댓글 POST 핸들러에 bcrypt.compare 추가
- `src/ui.js` — 댓글 폼에 비밀번호 필드 추가
- 인증 실패/성공 Pino 로깅 연동

## 3. sessionStorage UX 개선

### 목적
비밀번호를 매번 입력하는 불편 해소 (탭 닫으면 자동 삭제)

### 구현
- 감상평/댓글 작성 시 비밀번호를 `sessionStorage`에 임시 저장
- 이후 폼에서 자동으로 채워짐
- 탭/브라우저 닫으면 사라짐 (안전)
- 프론트엔드만 변경 (서버 변경 없음)
