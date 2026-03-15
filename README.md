# Cinegraph — 영화 임베딩 성좌도

> **56편의 추천 영화를 AI 임베딩으로 분석하고, Neural Constellation으로 시각화하는 프로젝트**

인스타그램에서 팔로워들에게 "인생 영화 하나만 추천해주세요"라고 물었습니다.
56편의 영화가 모였고, 각 영화의 시놉시스·테마·추천인 코멘트를 Google Gemini Embedding API로 벡터화한 뒤,
UMAP으로 2D 좌표로 변환하고, Three.js로 인터랙티브 성좌도를 만들었습니다.

비슷한 감성의 영화는 가까이, 다른 장르는 멀리 — AI가 읽어낸 영화들의 관계를 눈으로 볼 수 있습니다.

---

## Demo

[Live Demo](https://cinegraph.vercel.app)

### 보물찾기 모드

추천인에게 자기 영화를 찾게 하려면 URL 뒤에 `?user=아이디`를 붙이세요:

```
https://cinegraph.vercel.app?user=erani13
https://cinegraph.vercel.app?user=chris_chang_arong
```

해당 유저가 추천한 영화만 밝게 빛나고, 나머지는 어두워집니다.

- 드래그로 3D 회전
- 스크롤로 줌 인/아웃
- 영화 위에 마우스를 올리면 추천 카드가 나타남
- 하단 범례 클릭으로 클러스터 필터링
- 상단 검색으로 영화/감독/추천인 검색

---

## 작동 방식

```
영화 56편 텍스트 (시놉시스 + 테마 + 추천인 코멘트)
    ↓  Google Gemini Embedding API
768차원 벡터
    ↓  UMAP (2D 축소)
x, y 좌표
    ↓  K-Means
클러스터 번호
    ↓  Three.js + Bloom
인터랙티브 성좌도
```

### 왜 제목만 넣지 않았나?

"인터스텔라"와 "어바웃 타임"은 제목만 보면 완전 다른 영화입니다.
하지만 둘 다 "시간과 사랑, 가족"이라는 테마를 공유합니다.
시놉시스 + 테마 키워드 + 추천인의 한 줄 코멘트를 조합해야 **의미 기반 클러스터링**이 가능합니다.

---

## 직접 만들어보기

### 1단계: 임베딩 생성 (Python)

```bash
pip install google-genai umap-learn scikit-learn numpy
export GEMINI_API_KEY="your-api-key"
python embed_films.py
```

`embed_films.py` 안의 `FILMS` 리스트를 자기 영화로 바꾸면 됩니다.
실행하면 `films_embedded.json`이 생성됩니다.

**Gemini API 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 무료로 발급 가능합니다.**

### 2단계: 웹 페이지 열기

```bash
# 로컬 서버 (아무거나)
python -m http.server 8000
# 또는
npx serve .
```

`http://localhost:8000` 접속하면 성좌도가 나타납니다.

### 3단계: 배포 (선택)

GitHub Pages, Vercel, Netlify 등에 `index.html` + `films_embedded.json`만 올리면 됩니다.

---

## 내 영화로 바꾸기

`embed_films.py`의 `FILMS` 리스트를 수정하세요:

```python
FILMS = [
    {
        "title": "영화 제목",
        "title_en": "English Title",
        "year": 2024,
        "director": "감독 이름",
        "recommender": "추천인",
        "note": "추천인의 한 줄 코멘트 (선택)",
        "description": "시놉시스 + 테마 키워드. 이 텍스트가 임베딩의 입력이 됩니다."
    },
    # ... 더 추가
]
```

**팁:**
- `description`이 가장 중요합니다 — 줄거리 + 감정 키워드를 넣으세요
- 영화가 20편 미만이면 UMAP `n_neighbors`를 줄이세요 (기본값 8)
- 클러스터 수(`n_clusters`)는 영화 수 / 7 정도가 적당합니다

---

## 파일 구조

```
Cinegraph/
├── embed_films.py          # Gemini API → UMAP → JSON
├── index.html              # Three.js 인터랙티브 성좌도
├── films_embedded.json     # (생성됨) 2D 좌표 + 클러스터 데이터
└── README.md
```

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 임베딩 | Google Gemini Embedding API (`gemini-embedding-001`) |
| 차원 축소 | UMAP (`umap-learn`) |
| 클러스터링 | K-Means (`scikit-learn`) |
| 3D 렌더링 | Three.js r128 |
| 글로우 효과 | UnrealBloomPass (Three.js 후처리) |
| 파티클 | 커스텀 GLSL 셰이더 + Additive Blending |
| 애니메이션 | GSAP |

Three.js 파티클 구조는 [Mamboleoo의 Sparkly Skull CodePen](https://codepen.io/Mamboleoo/pen/yLbxYdx)에서 영감을 받았습니다.

---

## 라이선스

MIT
