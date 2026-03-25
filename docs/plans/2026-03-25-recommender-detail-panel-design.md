# Recommender Detail Panel — Design Document

> **Date:** 2026-03-25
> **Status:** Approved
> **Next:** Implementation plan (`2026-03-25-recommender-detail-panel-plan.md`)

---

## Goal

추천자가 자신의 이름으로 URL에 들어오면, 자신이 추천한 영화들과 나의 감상을 한 화면에서 볼 수 있게 한다. "인정받는 느낌"을 주는 것이 핵심.

## Domain Model (현재 그대로, 변경 없음)

```
Film (films_embedded.json, 106편)
  ├── title, title_en, year, director, description
  ├── recommender (slash-delimited handles, M:N)
  ├── note (추천 이유)
  ├── x, y, cluster
  └── status, content ← API 모드에서 reviews JOIN

Recommender (파생 엔티티, 별도 저장 없음)
  └── Film.recommender 파싱으로 도출

Reflection (DB reviews 테이블)
  └── 영화당 1:1, status + content
```

**관계 규칙:**
- Film ↔ Recommender = many-to-many (Film.recommender 문자열에 인코딩)
- Film → Reflection = 1:1 (현재 single author MVP)

## Component Responsibility

| 컴포넌트 | 역할 | DOM | 함수 |
|----------|------|-----|------|
| DNA Card (기존) | 취향 통계 요약 | `#dna-card` | `showDnaCard()` |
| Detail Panel (신규) | 관계 상세 — 영화별 상태 | `#recommender-detail` | `showRecommenderDetail()` |

**규칙:** 동시에 열리지 않음. Detail Panel 열면 DNA 카드 닫힘.
**절대 합치지 않음.** DNA 카드 = 요약, Detail Panel = 관계 상세.

## Entry Flows

```
Primary: ?recommender=erani13 URL 진입
  → 성좌도 로드 + 하이라이트 + 펄스
  → Detail Panel 자동 오픈
  → DNA 카드 열리지 않음

Secondary: findMyStars → DNA 카드 열림 → "상세 보기" 클릭
  → DNA 카드 닫힘
  → Detail Panel 열림
```

## Panel Layout

```
┌─────────────────────────────┐
│                      [✕ 닫기]│
│ @erani13                    │
│ 4편의 영화를 추천해주었어요      │
│                             │
│ ┌─────────────────────────┐ │
│ │ 쇼생크 탈출 (1994)        │ │
│ │ 프랭크 다라본트            │ │
│ │ ★ watched               │ │
│ │ 추천: "마음이 따뜻해짐"     │ │
│ │ 감상: "희망이라는 단어가..." │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 살인의 추억 (2003)        │ │
│ │ 봉준호                   │ │
│ │ ○ unwatched             │ │
│ │ 감상: 아직 쓰지 않았어요    │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Film Card Rules:**
- `note` 비어있으면 → "추천:" 줄 숨김
- `content` null이면 → "아직 쓰지 않았어요"
- status 아이콘: ★ watched, ◐ watching, ○ unwatched

## Data Source

```
새 API: 없음
새 DB 테이블: 없음
새 의존성: 없음

기존 films[] 배열에서 파생:
  films.filter(f => parseRecommenders(f.recommender).includes(handle))
    .map(f => ({ title, title_en, year, director, note, status, review }))
```

## Files to Change

| 파일 | 변경 내용 |
|------|----------|
| `index.html` | `#recommender-detail` 컨테이너 추가 |
| `style.css` | Detail Panel 스타일 (기존 DNA 카드 스타일 참고) |
| `src/ui.js` | `showRecommenderDetail()`, `hideRecommenderDetail()` 추가 |
| `src/ui.js` | DNA 카드에 "상세 보기" 버튼 추가 |
| `src/main.js` | `?recommender=` 진입 시 Detail Panel 자동 오픈 |

## What NOT to Build

| 안 만듦 | 이유 |
|---------|------|
| Recommender 테이블 | 파생 데이터로 충분 |
| 로그인/인증 | 읽기 전용 |
| 댓글/좋아요/소셜 | 스코프 밖 |
| 어드민 도구 확장 | 불필요 |
| Detail Panel에서 감상평 쓰기 | 다음 단계 |
| 추천자 목록/검색 페이지 | 다음 단계 |

## Risks

| 위험 | 결과 | 방지법 |
|------|------|--------|
| Panel에 편집 기능 추가 | 인증 필요 → 스코프 폭발 | 읽기 전용만 |
| 추천자 프로필 페이지 분리 | 라우팅 필요 → 복잡도 급증 | 오버레이로 충분 |
| 추천자 간 비교 기능 | 새 UI 표면 → 과잉 | 안 만듦 |
| M:N 관계를 DB에 정규화 | 마이그레이션 → 위험 | JSON 파싱 유지 |
| Detail Panel이 DNA 카드의 요약 역할을 흡수 | 혼합 목적 UI → 비대화 | DNA 카드 = 요약, Detail Panel = 관계 상세. 절대 합치지 않음 |
