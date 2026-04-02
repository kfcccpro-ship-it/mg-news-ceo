const NEWS_JSON_PATH = "./data/news.json";
const BOK_TERMS_URL =
  "https://www.bok.or.kr/portal/bbs/B0000249/view.do?menuNo=200765&nttId=10096081";

/**
 * 실무자용 용어 중심
 * - 너무 기초적인 용어 제외
 * - 영어/지표/정책 신호 중심
 * - 필요할 때만 노출
 */
const TERMS = {
  NIM: {
    description: "금리 환경 변화가 수익성에 미치는 영향을 보여주는 지표",
    detail:
      "순이자마진(NIM)은 금융기관의 핵심 수익성 지표로, 조달금리와 운용수익률의 차이가 어떻게 반영되는지를 보여줍니다.",
    keywords: [
      "순이자마진",
      "nim",
      "마진",
      "예대마진",
      "수익성",
      "순이자",
      "조달금리",
      "예금금리",
      "대출금리"
    ]
  },
  CET1: {
    description: "위기 대응 능력을 판단하는 핵심 자본지표",
    detail:
      "보통주자본비율(CET1)은 손실흡수력이 높은 자본 수준을 보여주는 대표 건전성 지표입니다.",
    keywords: [
      "cet1",
      "자본비율",
      "자본적정성",
      "보통주자본",
      "자기자본",
      "bis",
      "건전성",
      "스트레스테스트"
    ]
  },
  LCR: {
    description: "단기 유동성 대응 능력을 나타내는 지표",
    detail:
      "유동성커버리지비율(LCR)은 단기 자금 유출 상황에서 고유동성 자산으로 얼마나 버틸 수 있는지 보여줍니다.",
    keywords: [
      "lcr",
      "유동성",
      "유동성커버리지비율",
      "자금조달",
      "예금이탈",
      "런",
      "자금시장",
      "단기유동성"
    ]
  },
  "Terminal Rate": {
    description: "금리 인상 사이클의 최종 수준",
    detail:
      "터미널 레이트는 중앙은행이 기준금리 인상 사이클에서 도달할 것으로 예상되는 최고 수준을 뜻합니다.",
    keywords: [
      "terminal rate",
      "최종금리",
      "최종 금리",
      "금리인상",
      "기준금리",
      "긴축",
      "통화정책",
      "fomc"
    ]
  },
  "Forward Guidance": {
    description: "중앙은행의 향후 정책 방향 신호",
    detail:
      "포워드 가이던스는 중앙은행이 시장과 소통하는 방식으로, 향후 금리 경로와 정책 기조에 대한 기대를 형성합니다.",
    keywords: [
      "forward guidance",
      "포워드 가이던스",
      "정책 신호",
      "통화정책",
      "기준금리",
      "금리경로",
      "연준",
      "중앙은행",
      "매파",
      "비둘기파"
    ]
  },
  Delinquency: {
    description: "연체 흐름을 통해 자산건전성 악화를 조기 파악하는 지표",
    detail:
      "연체율 상승은 대출 포트폴리오의 질 악화 가능성을 시사하며, 충당금·건전성 관리와 직결됩니다.",
    keywords: [
      "연체",
      "연체율",
      "부실",
      "고정이하여신",
      "npl",
      "건전성",
      "충당금",
      "부실채권"
    ]
  },
  "Deposit Beta": {
    description: "시장금리 변화가 예금금리에 얼마나 빠르게 반영되는지를 보여주는 개념",
    detail:
      "수신 경쟁이 심화될수록 예금금리 전가 속도가 높아지고, 이는 조달비용 상승과 NIM 압박으로 이어질 수 있습니다.",
    keywords: [
      "수신경쟁",
      "예금금리",
      "조달비용",
      "예금",
      "수신",
      "금리경쟁",
      "마진압박"
    ]
  },
  "Cost of Risk": {
    description: "대출 손실 위험이 비용으로 얼마나 반영되는지 보여주는 지표",
    detail:
      "대손비용률은 경기 둔화, 연체 확대, 취약 차주 증가 국면에서 수익성과 건전성을 함께 읽는 데 유용합니다.",
    keywords: [
      "대손",
      "대손비용",
      "충당금",
      "손실흡수",
      "건전성",
      "연체",
      "부실",
      "위험비용"
    ]
  },
  "Digital Channel": {
    description: "비대면 고객 접점 경쟁력을 판단하는 핵심 영역",
    detail:
      "단순 앱 보유 여부보다 가입·상담·대출·민원 등 주요 업무가 얼마나 매끄럽게 디지털화되어 있는지가 중요합니다.",
    keywords: [
      "비대면",
      "디지털",
      "앱",
      "플랫폼",
      "모바일",
      "인터넷은행",
      "핀테크",
      "채널"
    ]
  }
};

const MG_IMPLICATION_RULES = [
  {
    text: "금리 변화에 따른 수신 경쟁 및 예대율 관리 필요",
    keywords: [
      "금리",
      "기준금리",
      "인하",
      "인상",
      "수신",
      "예금",
      "대출",
      "예대율",
      "마진",
      "통화정책"
    ]
  },
  {
    text: "자산건전성 및 연체 흐름 점검 필요",
    keywords: [
      "연체",
      "부실",
      "충당금",
      "건전성",
      "위험",
      "신용",
      "npl",
      "부도",
      "취약차주"
    ]
  },
  {
    text: "유동성 버퍼와 자금조달 구조 점검 필요",
    keywords: [
      "유동성",
      "lcr",
      "예금이탈",
      "자금시장",
      "조달",
      "채권",
      "런",
      "단기자금"
    ]
  },
  {
    text: "비대면 채널 경쟁력 강화 필요",
    keywords: [
      "비대면",
      "디지털",
      "앱",
      "플랫폼",
      "핀테크",
      "인터넷은행",
      "모바일",
      "채널"
    ]
  },
  {
    text: "자본여력과 손실흡수력 점검 필요",
    keywords: [
      "자본",
      "cet1",
      "자본비율",
      "bis",
      "스트레스테스트",
      "손실흡수",
      "건전성"
    ]
  }
];

const ui = {
  newsContainer: document.getElementById("newsContainer"),
  todayTermBox: document.getElementById("todayTermBox"),
  refreshTermBtn: document.getElementById("refreshTermBtn")
};

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(dateValue) {
  if (!dateValue) return "날짜 정보 없음";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

function getNewsText(news) {
  const title = news.title || "";
  const summary = news.summary || news.description || "";
  return normalizeText(`${title} ${stripHtml(summary)}`);
}

function scoreTermMatch(news, termInfo) {
  const text = getNewsText(news);
  let score = 0;

  for (const keyword of termInfo.keywords) {
    const key = normalizeText(keyword);
    if (!key) continue;

    if (text.includes(key)) {
      score += key.length >= 8 ? 3 : 2;
    }
  }

  return score;
}

function findMatchedTerm(news) {
  let bestTerm = null;
  let bestScore = 0;

  for (const [termName, termInfo] of Object.entries(TERMS)) {
    const score = scoreTermMatch(news, termInfo);
    if (score > bestScore) {
      bestScore = score;
      bestTerm = {
        name: termName,
        ...termInfo
      };
    }
  }

  return bestScore >= 2 ? bestTerm : null;
}

function findMgImplication(news) {
  const text = getNewsText(news);

  let bestRule = null;
  let bestScore = 0;

  for (const rule of MG_IMPLICATION_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (text.includes(normalizeText(keyword))) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  return bestScore >= 1
    ? bestRule.text
    : "시장 변화가 수익성·건전성·채널 전략에 미치는 영향 점검 필요";
}

function decorateNews(news) {
  const matchedTerm = findMatchedTerm(news);
  const implication = findMgImplication(news);

  return {
    ...news,
    matchedTerm,
    implication
  };
}

function pickTodayTerm(newsItems) {
  const matchedTerms = newsItems
    .map((item) => item.matchedTerm)
    .filter(Boolean);

  const source =
    matchedTerms.length > 0
      ? matchedTerms
      : Object.entries(TERMS).map(([name, info]) => ({ name, ...info }));

  const daySeed = new Date().toISOString().slice(0, 10);
  const manualSeed = Number(sessionStorage.getItem("mg-term-seed") || 0);
  const hash = [...(daySeed + manualSeed)].reduce(
    (acc, ch) => acc + ch.charCodeAt(0),
    0
  );
  const index = hash % source.length;

  return source[index];
}

function renderTodayTerm(term) {
  if (!term) {
    ui.todayTermBox.innerHTML = `
      <p class="today-term-meaning">오늘 표시할 용어가 없습니다.</p>
      <p class="today-term-detail">뉴스 데이터가 충분히 쌓이면 자동으로 연결됩니다.</p>
    `;
    return;
  }

  ui.todayTermBox.innerHTML = `
    <div class="today-term-key">${escapeHtml(term.name)}</div>
    <p class="today-term-meaning">${escapeHtml(term.description)}</p>
    <p class="today-term-detail">${escapeHtml(term.detail || "")}</p>
    <div class="term-actions">
      <a
        class="mini-link"
        href="${BOK_TERMS_URL}"
        target="_blank"
        rel="noopener noreferrer"
      >
        원문 학습 자료 보기
      </a>
    </div>
  `;
}

function renderNews(newsItems) {
  if (!Array.isArray(newsItems) || newsItems.length === 0) {
    ui.newsContainer.innerHTML = `
      <div class="empty">표시할 뉴스가 없습니다.</div>
    `;
    return;
  }

  ui.newsContainer.innerHTML = newsItems
    .map((news) => {
      const source = news.source || news.press || "출처 미상";
      const date = formatDate(news.pubDate || news.date || news.publishedAt);
      const title = news.title || "제목 없음";
      const summaryRaw = news.summary || news.description || "";
      const summary = stripHtml(summaryRaw).trim();
      const link = news.link || "#";

      return `
        <a
          class="news-item"
          href="${escapeHtml(link)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="news-top">
            <span class="news-source">${escapeHtml(source)}</span>
            <span class="news-date">${escapeHtml(date)}</span>
          </div>

          <h3 class="news-title">${escapeHtml(title)}</h3>

          ${
            summary
              ? `<p class="news-summary">${escapeHtml(summary)}</p>`
              : ""
          }

          <div class="news-bottom">
            ${
              news.matchedTerm
                ? `
                <div class="chip-row">
                  <span class="chip chip-term">용어: ${escapeHtml(news.matchedTerm.name)}</span>
                </div>
              `
                : ""
            }

            <div class="divider"></div>

            <div class="chip-row">
              <span class="chip chip-imp">MG 시사점: ${escapeHtml(news.implication)}</span>
            </div>
          </div>
        </a>
      `;
    })
    .join("");
}

function normalizeNewsData(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.news)) return payload.news;
  return [];
}

async function loadNews() {
  const response = await fetch(NEWS_JSON_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`news.json 로드 실패: ${response.status}`);
  }

  const payload = await response.json();
  return normalizeNewsData(payload);
}

async function init() {
  try {
    const rawNews = await loadNews();
    const decoratedNews = rawNews.map(decorateNews);
    const todayTerm = pickTodayTerm(decoratedNews);

    renderTodayTerm(todayTerm);
    renderNews(decoratedNews);
  } catch (error) {
    console.error(error);

    ui.todayTermBox.innerHTML = `
      <p class="today-term-meaning">용어 정보를 불러오지 못했습니다.</p>
      <p class="today-term-detail">데이터 경로와 JSON 구조를 확인해주세요.</p>
    `;

    ui.newsContainer.innerHTML = `
      <div class="error">
        뉴스 데이터를 불러오지 못했습니다.<br />
        <span style="font-size: 13px;">data/news.json 경로 또는 JSON 구조를 확인해주세요.</span>
      </div>
    `;
  }
}

ui.refreshTermBtn?.addEventListener("click", () => {
  const current = Number(sessionStorage.getItem("mg-term-seed") || 0);
  sessionStorage.setItem("mg-term-seed", String(current + 1));
  init();
});

init();
