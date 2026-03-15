# Cinegraph

Threads에서 추천받은 영화들을 AI로 분석해서, 비슷한 영화끼리 묶어 시각화하는 프로젝트.

Google Gemini Embedding API로 영화들의 의미를 벡터화하고, 자동으로 클러스터링해서 2D 맵으로 보여줍니다.

## Demo

[Live Demo](https://cinegraph.vercel.app)

### 보물찾기 모드

추천인에게 자기 영화를 찾게 하려면 URL 뒤에 `?user=아이디`를 붙이세요:

```
https://cinegraph.vercel.app?user=erani13
https://cinegraph.vercel.app?user=chris_chang_arong
```

해당 유저가 추천한 영화만 밝게 빛나고, 나머지는 어두워집니다.

---

## 이런 결과가 나와요

- 추천받은 영화 56편이 테마별로 자동 묶임
- 비슷한 분위기의 영화끼리 가까이 배치됨
- JSON 파일로 출력 → 웹 시각화에 사용 가능

---

## 시작하기 전에 필요한 것

| 필요한 것 | 설명 | 없으면? |
|-----------|------|---------|
| Python 3.11 또는 3.12 | 코드 실행용 | 아래 설치 방법 참고 |
| Google Gemini API 키 | 영화 임베딩용 (무료) | 아래 발급 방법 참고 |
| 터미널 | 명령어 입력용 | Mac: 터미널 앱, Windows: PowerShell |

> **Python 3.13, 3.14는 호환 문제가 있을 수 있어요. 3.11 또는 3.12를 추천합니다.**

---

## Step 1: Python 확인 및 설치

터미널을 열고 입력하세요:

```bash
python3 --version
```

3.11.x 또는 3.12.x가 나오면 OK. 다음 단계로 넘어가세요.

Python이 없거나 버전이 3.13 이상이면:

**Mac:**
```bash
brew install python@3.12
```
> brew가 없으면 먼저: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

**Windows:**
[python.org/downloads](https://www.python.org/downloads/) 에서 3.12 다운로드 → 설치 시 **"Add to PATH" 체크 필수**

---

## Step 2: 프로젝트 다운로드

```bash
git clone https://github.com/seeingpatterns/Cinegraph.git
cd Cinegraph
```

> git이 없으면: GitHub 페이지에서 초록색 **Code** 버튼 → **Download ZIP** → 압축 풀기 → 터미널에서 그 폴더로 이동

---

## Step 3: 가상 환경 만들기

```bash
python3.12 -m venv venv
```

그 다음 활성화:

**Mac / Linux:**
```bash
source venv/bin/activate
```

**Windows:**
```bash
venv\Scripts\activate
```

터미널 앞에 `(venv)`가 보이면 성공:
```
(venv) yourname@computer Cinegraph %
```

> 터미널을 새로 열 때마다 `source venv/bin/activate`(Mac) 또는 `venv\Scripts\activate`(Windows)를 다시 쳐야 해요. `(venv)`가 안 보이면 활성화가 안 된 상태입니다.

---

## Step 4: 패키지 설치

```bash
pip install google-genai umap-learn scikit-learn numpy python-dotenv
```

설치에 1~2분 걸릴 수 있어요. 에러 없이 끝나면 OK.

**자주 나는 에러:**

| 증상 | 해결 |
|------|------|
| `pip: command not found` | `source venv/bin/activate` 먼저 실행 |
| `error: Microsoft Visual C++ required` (Windows) | Visual C++ Build Tools 설치 |
| `umap-learn` 설치 오래 걸림 | 정상입니다. 3~5분 기다리세요 |

---

## Step 5: Google Gemini API 키 발급 (무료)

1. [Google AI Studio](https://aistudio.google.com/apikey) 접속
2. Google 계정으로 로그인
3. **"Create API Key"** 클릭
4. 생성된 키 복사 (`AIza...` 로 시작하는 긴 문자열)

---

## Step 6: API 키 설정

프로젝트 폴더에 `.env` 파일을 만들고:

```
GEMINI_API_KEY=여기에_복사한_키_붙여넣기
```

또는 터미널에서 환경변수로 설정:

**Mac / Linux:**
```bash
export GEMINI_API_KEY="여기에_복사한_키_붙여넣기"
```

**Windows PowerShell:**
```bash
$env:GEMINI_API_KEY="여기에_복사한_키_붙여넣기"
```

> API 키를 코드에 직접 넣지 마세요. `.env` 파일은 `.gitignore`에 포함되어 있어서 GitHub에 올라가지 않습니다.

---

## Step 7: 실행

```bash
python embed_films.py
```

이렇게 나오면 성공:

```
1/4  임베딩 텍스트 생성 중...
     예시 [0]: 포레스트 검프 (Forrest Gump, 1994) | 감독: 로버트 저메키스 | ...

2/4  Gemini API 호출 중... (56편)
     벡터 차원: 768

3/4  UMAP 2D 변환 중...

4/4  클러스터링 + JSON 저장 중...

완료! → films_embedded.json
     총 56편, 7개 클러스터

── 클러스터 미리보기 ──
  [0] 인터스텔라, 인셉션, ...
  [1] 포레스트 검프, 그린북, ...
  ...
```

---

## 웹 시각화 보기

```bash
python -m http.server 8000
```

`http://localhost:8000` 접속하면 성좌도가 나타납니다.

- 드래그로 3D 회전
- 스크롤로 줌 인/아웃
- 영화 위에 마우스를 올리면 추천 카드가 나타남
- 하단 범례 클릭으로 클러스터 필터링
- 상단 검색으로 영화/감독/추천인 검색
- "내 별 찾기"에 아이디 입력하면 해당 추천 영화가 빛남

### 배포 (선택)

GitHub Pages, Vercel, Netlify 등에 `index.html` + `films_embedded.json`만 올리면 됩니다.

---

## 내 영화로 바꾸고 싶으면?

`embed_films.py`에서 `FILMS` 리스트를 수정하세요:

```python
FILMS = [
    {
        "title": "영화 제목",
        "title_en": "English Title",
        "year": 2024,
        "director": "감독 이름",
        "recommender": "추천해준 사람",
        "note": "추천 코멘트 (선택)",
        "description": "영화 줄거리나 분위기를 2~3문장으로"
    },
    # 더 추가...
]
```

> `description`이 임베딩 품질에 가장 큰 영향을 줍니다. 자세하게 쓸수록 클러스터링이 정확해져요.

### 클러스터 수 바꾸기

`embed_films.py`의 `cluster_films` 함수에서 `n_clusters`를 바꾸세요:

- 영화 20편 이하 → 3~4개
- 영화 50편 → 5~7개
- 영화 100편 이상 → 8~10개

---

## 파일 구조

```
Cinegraph/
├── embed_films.py          # Gemini API → UMAP → JSON
├── index.html              # Three.js 인터랙티브 성좌도
├── films_embedded.json     # (생성됨) 2D 좌표 + 클러스터 데이터
├── .env                    # (직접 생성) API 키
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

## 문제가 생기면?

| 증상 | 해결 |
|------|------|
| `ModuleNotFoundError: No module named 'google'` | `source venv/bin/activate` 후 `pip install google-genai` |
| `(venv)`가 안 보여요 | `source venv/bin/activate` (Mac) 또는 `venv\Scripts\activate` (Windows) |
| API key not valid | [Google AI Studio](https://aistudio.google.com/apikey)에서 키 재발급 |
| import에서 멈춤 / 무한 로딩 | Python 3.14 호환 문제 → 3.12로 venv 재생성 |
| UMAP 설치 에러 | `pip install umap-learn` 재시도 |

---

## 만든 사람

[@seeingpatterns](https://www.threads.net/@seeingpatterns)

Threads에서 추천받은 영화들로 만든 프로젝트입니다.
여러분도 자기만의 영화 맵을 만들어보세요!

## License

MIT
