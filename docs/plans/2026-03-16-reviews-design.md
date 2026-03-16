# 감상평 + 댓글 기능 설계

## 목표
영화 카드에서 감상평을 쓰고, 추천인이 댓글을 달 수 있게 한다.

## DB 스키마

```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  film_title_en VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
  author_thread_id VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## API

| 메서드 | 경로 | 역할 | 인증 |
|--------|------|------|------|
| GET | /api/reviews | 모든 감상평 조회 | 없음 |
| GET | /api/reviews/:film_title_en | 특정 영화 감상평 + 댓글 | 없음 |
| POST | /api/reviews | 감상평 작성 | ADMIN_PASSWORD |
| PUT | /api/reviews/:id | 감상평 수정 | ADMIN_PASSWORD |
| POST | /api/reviews/:id/comments | 댓글 작성 | thread_id만 |

## 인증
- 관리자: .env의 ADMIN_PASSWORD 하나로 비교
- 추천인: thread_id 입력만으로 댓글 가능 (로그인 없음)

## 프론트 흐름
- 영화 호버 → 카드에 감상평 있으면 표시, 없으면 "감상평 쓰기" 버튼
- 버튼 클릭 → 입력창 + 비밀번호 → POST /api/reviews
- 추천인 아이디 검색 → 본인 영화에 댓글 입력창 → POST /api/reviews/:id/comments

## 데이터 로딩
- 앱 시작 시 GET /api/reviews로 전체 감상평 가져오기
- film_title_en으로 films_embedded.json과 매칭

## 범위 밖
- 감상평/댓글 삭제
- 비밀번호 암호화 (나중에 bcrypt)
- 프로덕션 배포
