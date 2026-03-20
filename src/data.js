import * as THREE from 'three';

// 클러스터 색상
export const COLORS = [
  new THREE.Color('#1EE3CF'),
  new THREE.Color('#6B48FF'),
  new THREE.Color('#125D98'),
  new THREE.Color('#CFD6DE'),
  new THREE.Color('#FF6B6B'),
  new THREE.Color('#C084FC'),
  new THREE.Color('#34D399'),
];

export const COLORS_HEX = ['#1EE3CF','#6B48FF','#125D98','#CFD6DE','#FF6B6B','#C084FC','#34D399'];

export const CLUSTER_NAMES = [
  '인생이라는 이름의 모험',
  '우리가 서로를 안는 순간',
  '말하지 못한 것들의 아름다움',
  '가장자리에서 빛나는 사람들',
  '꽃과 불꽃 사이의 고요',
  '만약이라는 이름의 세계',
  '시대를 관통하는 울림',
];

function generateDemoData() {
  const raw = [
    {"title":"포레스트 검프","title_en":"Forrest Gump","year":1994,"director":"로버트 저메키스","recommender":"ban_byung_jong","note":"마음이 따뜻해짐","description":"낮은 지능이지만 순수한 마음으로 격동의 미국 현대사를 관통하며 사랑과 우정, 운명을 보여주는 한 남자의 일대기."},
    {"title":"언터처블: 1%의 우정","title_en":"The Intouchables","year":2011,"director":"올리비에 나카슈","recommender":"ban_byung_jong","note":"마음이 따뜻해짐","description":"전신마비 부자와 빈민가 출신 간병인이 계급과 편견을 넘어 진정한 우정을 만들어가는 실화 기반 이야기."},
    {"title":"인생은 아름다워","title_en":"La vita è bella","year":1997,"director":"로베르토 베니니","recommender":"fencer211 / seed_106","note":"","description":"나치 수용소에서 아들을 지키기 위해 모든 것을 게임으로 만든 아버지의 이야기."},
    {"title":"아이 엠 샘","title_en":"I Am Sam","year":2001,"director":"제시 넬슨","recommender":"whateveriwant2007","note":"","description":"지적 장애를 가진 아버지가 딸의 양육권을 지키기 위해 싸우는 이야기."},
    {"title":"로렌조 오일","title_en":"Lorenzo's Oil","year":1992,"director":"조지 밀러","recommender":"truthann0630","note":"영화 보면서 가장 많이 울었던 영화","description":"희귀병에 걸린 아들을 위해 부모가 의학계에 맞서 치료법을 찾아나가는 실화."},
    {"title":"키즈 리턴","title_en":"Kids Return","year":1996,"director":"기타노 다케시","recommender":"hipxhiparchive","note":"","description":"학교를 떠난 두 소년이 권투와 야쿠자 세계에서 각자의 길을 걷다 다시 만나는 이야기."},
    {"title":"그린북","title_en":"Green Book","year":2018,"director":"피터 패럴리","recommender":"jeon7230","note":"","description":"1960년대 미국 남부를 여행하는 흑인 피아니스트와 이탈리아계 운전사의 우정."},
    {"title":"퍼펙트 데이즈","title_en":"Perfect Days","year":2023,"director":"빔 벤더스","recommender":"b_k.indie","note":"","description":"도쿄의 공중화장실 청소부가 반복되는 일상 속에서 발견하는 작은 아름다움."},
    {"title":"굿윌 헌팅","title_en":"Good Will Hunting","year":1997,"director":"거스 밴 샌트","recommender":"hipxhiparchive","note":"","description":"천재적 두뇌를 가졌지만 상처 속에 갇힌 청년과 그를 이해하려는 심리학자의 만남."},
    {"title":"인턴","title_en":"The Intern","year":2015,"director":"낸시 마이어스","recommender":"kittypink2025","note":"","description":"은퇴한 70대 남성이 패션 스타트업에서 인턴으로 일하며 젊은 CEO와 세대를 초월한 우정을 쌓는 이야기."},
    {"title":"러브레터","title_en":"Love Letter","year":1995,"director":"이와이 슌지","recommender":"chris_chang_arong","note":"","description":"죽은 연인에게 보낸 편지가 같은 이름의 다른 사람에게 닿으면서 풀려나는 기억과 사랑의 이야기."},
    {"title":"일 포스티노","title_en":"Il Postino","year":1994,"director":"마이클 래드포드","recommender":"chris_chang_arong","note":"","description":"작은 섬의 우편배달부가 시인 네루다를 만나 시와 사랑을 배워가는 이야기."},
    {"title":"어바웃 타임","title_en":"About Time","year":2013,"director":"리처드 커티스","recommender":"erani13 / puppy_farmer","note":"","description":"시간여행 능력을 가진 남자가 깨닫는 것은 결국 평범한 하루하루가 소중하다는 것."},
    {"title":"Her","title_en":"Her","year":2013,"director":"스파이크 존즈","recommender":"kleary.kim","note":"영상미도 좋았어요","description":"인공지능 운영체제와 사랑에 빠진 외로운 남자의 이야기."},
    {"title":"번지점프를 하다","title_en":"Bungee Jumping of Their Own","year":2001,"director":"김대승","recommender":"erani13","note":"","description":"전생의 연인이 다른 몸으로 다시 만나는 이야기."},
    {"title":"시네마 천국","title_en":"Cinema Paradiso","year":1988,"director":"주세페 토르나토레","recommender":"chris_chang_arong / _seola_kim","note":"","description":"시칠리아 작은 마을의 영화관에서 자란 소년이 어른이 되어 돌아보는 기억과 사랑."},
    {"title":"원스 어폰 어 타임 인 아메리카","title_en":"Once Upon a Time in America","year":1984,"director":"세르지오 레오네","recommender":"chris_chang_arong","note":"","description":"금주법 시대부터 시작되는 갱스터들의 우정과 배신을 시간을 넘나들며 그린 서사시."},
    {"title":"패왕별희","title_en":"Farewell My Concubine","year":1993,"director":"천카이거","recommender":"ljs2_31","note":"옛날영화지만","description":"경극 배우 두 사람의 예술과 사랑, 그리고 중국 현대사의 격변 속에서 무너지는 관계."},
    {"title":"살인의 추억","title_en":"Memories of Murder","year":2003,"director":"봉준호","recommender":"erani13","note":"","description":"화성 연쇄살인사건을 쫓는 형사들의 좌절과 분노."},
    {"title":"인비져블 게스트","title_en":"The Invisible Guest","year":2016,"director":"오리올 파울로","recommender":"sy000214","note":"","description":"살인 혐의를 벗기 위한 사업가와 변호사의 치밀한 심리전."},
    {"title":"나비효과","title_en":"The Butterfly Effect","year":2004,"director":"에릭 브레스","recommender":"ahffkdyd6","note":"","description":"과거를 바꿀 수 있는 능력을 가진 남자가 깨닫는 선택의 무게."},
    {"title":"양들의 침묵","title_en":"The Silence of the Lambs","year":1991,"director":"조나단 드미","recommender":"ahffkdyd6","note":"","description":"FBI 수습 요원이 천재 식인 살인마의 도움으로 연쇄살인범을 쫓는 이야기."},
    {"title":"샤이닝","title_en":"The Shining","year":1980,"director":"스탠리 큐브릭","recommender":"ahffkdyd6","note":"","description":"외진 호텔에서 겨울을 보내는 가족에게 벌어지는 초자연적 공포."},
    {"title":"타인의 삶","title_en":"The Lives of Others","year":2006,"director":"플로리안 헨켈","recommender":"chris_chang_arong","note":"","description":"동독 비밀경찰이 감시 대상의 삶에 감화되어 양심의 선택을 하는 이야기."},
    {"title":"인터스텔라","title_en":"Interstellar","year":2014,"director":"크리스토퍼 놀란","recommender":"ryuseongnam","note":"","description":"멸망하는 지구를 떠나 새로운 행성을 찾아 떠나는 우주 탐험."},
    {"title":"인셉션","title_en":"Inception","year":2010,"director":"크리스토퍼 놀란","recommender":"sy000214","note":"","description":"꿈 속의 꿈에 침투해 생각을 심는 도둑의 이야기."},
    {"title":"인 타임","title_en":"In Time","year":2011,"director":"앤드류 니콜","recommender":"ahffkdyd6","note":"","description":"시간이 화폐인 미래 세계에서 빈부 격차와 생존을 그린 SF."},
    {"title":"13층","title_en":"The Thirteenth Floor","year":1999,"director":"요제프 루스낙","recommender":"lah_namack","note":"","description":"가상현실 시뮬레이션 속에서 현실의 경계가 무너지는 이야기."},
    {"title":"임포스터","title_en":"Impostor","year":2001,"director":"게리 플레더","recommender":"lah_namack","note":"","description":"자신이 외계인 복제품인지 진짜 인간인지 증명해야 하는 남자의 이야기."},
    {"title":"마이너리티 리포트","title_en":"Minority Report","year":2002,"director":"스티븐 스필버그","recommender":"lah_namack","note":"공상과학영화 좋아하시면 꼭","description":"범죄를 예측하는 시스템에 의해 미래의 살인자로 지목된 형사의 도주."},
    {"title":"벤허","title_en":"Ben-Hur","year":1959,"director":"윌리엄 와일러","recommender":"s.u.n.g.1313","note":"1959년 버전 추천","description":"로마 시대 유대인 귀족이 배신당하고 노예로 전락했다가 복수와 구원을 찾아가는 서사시."},
    {"title":"Blood In, Blood Out","title_en":"Blood In, Blood Out","year":1993,"director":"테일러 핵포드","recommender":"s.u.n.g.1313","note":"","description":"세 명의 히스패닉 사촌이 갱, 감옥, 경찰이라는 다른 길을 걸으며 정체성과 충성을 시험받는 이야기."},
    {"title":"대부","title_en":"The Godfather","year":1972,"director":"프란시스 코폴라","recommender":"chris_chang_arong","note":"","description":"이탈리아 마피아 가문의 권력 승계와 가족 이야기."},
    {"title":"미션","title_en":"The Mission","year":1986,"director":"롤랑 조페","recommender":"chris_chang_arong / copywriter.cd","note":"삶과 삶의 목표를 지키고자 하는 선교사들의 숭고한 이야기. 어린 나이에 거대한 감동을 안겨준 영화","description":"남미 원주민을 지키려는 선교사와 식민 권력의 충돌."},
    {"title":"브레이브하트","title_en":"Braveheart","year":1995,"director":"멜 깁슨","recommender":"abraham09130","note":"","description":"스코틀랜드 독립을 위해 싸운 윌리엄 월레스의 이야기."},
    {"title":"악마는 프라다를 입는다","title_en":"The Devil Wears Prada","year":2006,"director":"데이비드 프랭클","recommender":"kittypink2025","note":"","description":"패션 잡지 편집장 밑에서 일하며 야망과 자기 정체성 사이에서 갈등하는 젊은 여성."},
    {"title":"맘마미아!","title_en":"Mamma Mia!","year":2008,"director":"필리다 로이드","recommender":"kittypink2025","note":"","description":"그리스 섬에서 벌어지는 ABBA 음악과 함께하는 유쾌한 가족 이야기."},
    {"title":"혐오스러운 마츠코의 일생","title_en":"Memories of Matsuko","year":2006,"director":"나카시마 테츠야","recommender":"somuchjin_","note":"","description":"사랑받고 싶어 끝없이 헤매는 한 여성의 파란만장한 인생."},
    {"title":"괴물","title_en":"Monster","year":2023,"director":"고레에다 히로카즈","recommender":"triever___","note":"서스펜스가 부분적으로 들어간 휴먼드라마","description":"같은 사건을 세 가지 시점으로 보여주며 진실이 뒤집히는 이야기."},
    {"title":"레옹","title_en":"Léon: The Professional","year":1994,"director":"뤽 베송","recommender":"_picto__","note":"감독판 추천","description":"고독한 킬러와 가족을 잃은 소녀의 만남."},
    {"title":"쇼생크 탈출","title_en":"The Shawshank Redemption","year":1994,"director":"프랭크 다라본트","recommender":"erani13 / kingsunny0815","note":"","description":"무고하게 수감된 은행가가 인내와 희망으로 자유를 찾는 이야기."},
    {"title":"타이타닉","title_en":"Titanic","year":1997,"director":"제임스 카메론","recommender":"erani13","note":"","description":"침몰하는 배 위에서 계급을 넘어 피어나는 사랑."},
    {"title":"어벤져스: 엔드게임","title_en":"Avengers: Endgame","year":2019,"director":"루소 형제","recommender":"viewty_kuma","note":"","description":"우주 절반의 생명을 되돌리기 위한 히어로들의 마지막 전투."},
    {"title":"조커","title_en":"Joker","year":2019,"director":"토드 필립스","recommender":"_only.you.hana","note":"제 인생영화입니다","description":"사회에서 소외된 한 남자가 광기로 빠져드는 과정."},
    {"title":"돈 워리","title_en":"Don't Worry, He Won't Get Far on Foot","year":2018,"director":"거스 밴 샌트","recommender":"snow_white0914","note":"","description":"알코올 중독 사고로 장애를 입은 만화가의 회복과 예술 이야기."},
    {"title":"문라이트","title_en":"Moonlight","year":2016,"director":"배리 젠킨스","recommender":"snow_white0914","note":"","description":"마이애미 빈민가에서 자란 흑인 소년의 세 시기를 통해 그린 정체성과 사랑."},
    {"title":"찬실이는 복도 많지","title_en":"Lucky Chan-sil","year":2019,"director":"김초희","recommender":"sy000214","note":"","description":"영화감독의 갑작스러운 죽음 후 방황하는 프로듀서의 이야기."},
    {"title":"싱글 라이더","title_en":"Single Rider","year":2017,"director":"이주영","recommender":"sy000214","note":"","description":"파산한 펀드매니저가 호주로 떠난 아내를 찾아가는 이야기."},
    {"title":"진짜로 일어날지도 몰라 기적","title_en":"I Wish","year":2011,"director":"고레에다 히로카즈","recommender":"sy000214","note":"","description":"부모의 이혼으로 떨어진 형제가 신칸센이 교차하는 순간 소원을 빌러 떠나는 이야기."},
    {"title":"타워링","title_en":"The Towering Inferno","year":1974,"director":"존 길러민","recommender":"moomyoengc","note":"나를 영화를 좋아하게 만든 영화","description":"초고층 빌딩 화재에 갇힌 사람들의 생존 드라마."},
    {"title":"매드 맥스","title_en":"Mad Max","year":1979,"director":"조지 밀러","recommender":"moomyoengc","note":"영화는 이런 거구나","description":"문명 붕괴 후의 황무지에서 벌어지는 복수와 생존."},
    {"title":"가위손","title_en":"Edward Scissorhands","year":1990,"director":"팀 버튼","recommender":"grim_gongjang","note":"","description":"가위 손을 가진 인조인간이 마을에서 겪는 사랑과 거부."},
    {"title":"척의 일생","title_en":"Chuck","year":2016,"director":"필립 팔라르도","recommender":"maybe_caillou","note":"요 근래 본 것 중에서는 제일 좋았습니다","description":"헤비급 챔피언 무하마드 알리에게 도전한 무명 복서 척 웹너의 실화."},
    {"title":"화양연화","title_en":"In the Mood for Love","year":2000,"director":"왕가위","recommender":"yunjeongeom778","note":"","description":"1960년대 홍콩, 배우자의 불륜을 알게 된 두 이웃이 서로에게 끌리면서도 선을 넘지 않는 이야기."},
    {"title":"루빙화","title_en":"Lu Bing Hua","year":1989,"director":"양리궈","recommender":"zlexygirlz","note":"대만영화인데 아직도 기억에남아요","description":"시골 마을의 가난한 소년이 뛰어난 그림 재능을 가졌지만 인정받지 못하고 병으로 떠나는 이야기."},
    {"title":"헤드윅","title_en":"Hedwig and the Angry Inch","year":2001,"director":"존 카메론 미첼","recommender":"vinsvin13","note":"OST 미쳤어요","description":"성전환 수술이 실패한 록 가수가 자신의 정체성과 사랑을 찾아 떠나는 뮤지컬."},
    {"title":"우리들","title_en":"The World of Us","year":2016,"director":"윤가은","recommender":"gims564724","note":"초딩영화인데 잊혀지지 않음","description":"초등학교 여자아이들의 우정과 배신, 외로움을 섬세하게 그린 이야기."},
    {"title":"길버트 그레이프","title_en":"What's Eating Gilbert Grape","year":1993,"director":"라세 할스트롬","recommender":"actressj76","note":"","description":"작은 마을에 갇힌 청년이 장애가 있는 동생과 비만 어머니를 돌보며 자신의 삶을 찾아가는 이야기."},
    {"title":"여인의 향기","title_en":"Scent of a Woman","year":1992,"director":"마틴 브레스트","recommender":"actressj76","note":"","description":"시력을 잃은 퇴역 장교가 젊은 학생과 함께한 뉴욕 여행에서 삶의 의미를 되찾는 이야기."},
    {"title":"어둠 속의 댄서","title_en":"Dancer in the Dark","year":2000,"director":"라스 폰 트리에","recommender":"actressj76","note":"","description":"시력을 잃어가는 이민자 여성이 아들의 수술비를 위해 모든 것을 희생하는 뮤지컬 비극."},
  ];

  const clusters = [
    [0,1,2,3,4,6,9,55],
    [10,11,12,13,14,53],
    [15,16,17,54,57,58],
    [18,19,20,21,22,23],
    [24,25,26,27,28,29],
    [30,31,32,33,34,56],
    [5,7,8,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52],
  ];

  const result = [];
  clusters.forEach((indices, ci) => {
    const angle = (ci / clusters.length) * Math.PI * 2 + 0.3;
    const cx = Math.cos(angle) * 3.2;
    const cy = Math.sin(angle) * 3.2;
    indices.forEach(idx => {
      if (idx >= raw.length) return;
      result.push({ ...raw[idx], x: cx + (Math.random()-0.5)*2.4, y: cy + (Math.random()-0.5)*2.4, cluster: ci });
    });
  });
  return result;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

/**
 * 추천인별 프로필 집계
 * @param {Array} films - films_embedded.json 데이터
 * @returns {Object} { recommender_id: { count, clusters, decades, keywords } }
 */
export function buildRecommenderProfiles(films) {
  const profiles = {};

  films.forEach(film => {
    // '/' 로 구분된 복수 추천인 파싱 (공백 trim)
    const recommenders = film.recommender.split(/\s*\/\s*/).map(r => r.trim()).filter(Boolean);

    recommenders.forEach(rec => {
      if (!profiles[rec]) {
        profiles[rec] = { count: 0, clusters: {}, decades: {}, keywords: [] };
      }
      const p = profiles[rec];

      // 추천 영화 수
      p.count++;

      // 클러스터 분포
      const cl = String(film.cluster);
      p.clusters[cl] = (p.clusters[cl] || 0) + 1;

      // 연대 분포 (1980 → '1980s')
      const decade = `${Math.floor(film.year / 10) * 10}s`;
      p.decades[decade] = (p.decades[decade] || 0) + 1;

      // description에서 마지막 문장의 키워드 추출 (쉼표 구분)
      const desc = film.description || '';
      const lastSentence = desc.split(/[.!?。]\s*/).filter(Boolean).pop() || '';
      const kws = lastSentence.split(/[,，]\s*/).map(k => k.trim()).filter(k => k.length > 0 && k.length < 15);
      p.keywords.push(...kws);
    });
  });

  // 키워드 중복 제거 + 빈도순 정렬 → 상위 5개만 남기기
  for (const rec of Object.keys(profiles)) {
    const freq = {};
    profiles[rec].keywords.forEach(k => { freq[k] = (freq[k] || 0) + 1; });
    profiles[rec].keywords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);
  }

  return profiles;
}

export async function loadFilms() {
  // 1차: API에서 로드
  try {
    const resp = await fetch(`${API_BASE}/api/films`);
    if (!resp.ok) throw new Error(`API ${resp.status}`);
    const raw = await resp.json();
    const filmsArray = Array.isArray(raw) ? raw : raw?.films;
    if (!Array.isArray(filmsArray)) {
      throw new Error('Unexpected API response shape');
    }
    const films = filmsArray.map(f => ({
      ...f,
      status: f.status || 'unwatched',
      review: f.content ?? null,
    }));
    films.forEach(f => { delete f.content; });
    console.log(`[Cinegraph] API mode — ${films.length} films loaded`);
    return { films, mode: 'api' };
  } catch (err) {
    console.warn('[Cinegraph] API failed:', err.message);
    // 2차: 정적 JSON 폴백
    try {
      const resp = await fetch('/films_embedded.json');
      const raw = await resp.json();
      const films = raw.map(f => ({
        ...f,
        status: 'unwatched',
        review: null,
      }));
      console.log(`[Cinegraph] Fallback mode — API unavailable, using static data (${films.length} films)`);
      return { films, mode: 'fallback' };
    } catch (err2) {
      console.warn('[Cinegraph] Static JSON failed:', err2.message);
      // 3차: 데모 데이터
      const films = generateDemoData().map(f => ({
        ...f,
        status: 'unwatched',
        review: null,
      }));
      console.log(`[Cinegraph] Fallback mode — using demo data (${films.length} films)`);
      return { films, mode: 'fallback' };
    }
  }
}
