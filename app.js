const NEWS_JSON_PATH = "./data/news.json";
const BOK_TERMS_URL =
  "https://www.bok.or.kr/portal/bbs/B0000249/view.do?menuNo=200765&nttId=10096081";

const FALLBACK_TERMS = {
  NIM: {
    description: "금리 환경 변화가 수익성에 미치는 영향을 보여주는 지표",
    detail:
      "순이자마진(NIM)은 금융기관의 핵심 수익성 지표로, 조달금리와 운용수익률의 차이가 어떻게 반영되는지를 보여줍니다."
  },
  CET1: {
    description: "위기 대응 능력을 판단하는 핵심 자본지표",
    detail:
      "보통주자본비율(CET1)은 손실흡수력이 높은 자본 수준을 보여주는 대표 건전성 지표입니다."
  },
  LCR: {
    description: "단기 유동성 대응 능력을 나타내는 지표",
    detail:
      "유동성커버리지비율(LCR)은 단기 자금 유출 상황에서 고유동성 자산으로 얼마나 버틸 수 있는지 보여줍니다."
  },
  "Terminal Rate": {
    description: "금리 인상 사이클의 최종 수준",
    detail:
      "터미널 레이트는 중앙은행이 기준금리 인상 사이클에서 도달할 것으로 예상되는 최고 수준을 뜻합니다."
  },
  "Forward Guidance": {
    description: "중앙은행의 향후 정책 방향 신호",
    detail:
      "포워드 가이던스는 중앙은행이 시장과 소통하는 방식으로, 향후 금리 경로와 정책 기조에 대한 기대를 형성합니다."
  },
  Delinquency: {
    description: "연체 흐름을 통해 자산건전성 악화를 조기 파악하는 지표",
    detail:
      "연체율 상승은 대출 포트폴리오의 질 악화 가능성을 시사하며, 충당금·건전성 관리와 직결됩니다."
  },
  "Cost of Risk": {
    description: "대출 손실 위험이 비용으로 얼마나 반영되는지 보여주는 지표",
    detail:
      "대손비용률은 경기 둔화, 연체 확대, 취약 차주 증가 국면에서 수익성과 건전성을 함께 읽는 데 유용합니다."
  }
};

const ui = {
  newsContainer: document.getElementById("newsContainer"),
  todayTermBox: document.getElementById("todayTermBox"),
  refreshTermBtn: document.getElementById("refreshTermBtn")
};

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
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

function flattenNewsData(payload) {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.news)) {
    return payload.news;
  }

  if (payload.categories && typeof payload.categories === "object") {
    return Object.entries(payload.categories).flatMap(([category, items]) => {
      if (!Array.isArray(items)) return [];
      return items.map((item) => ({
        ...item,
        category
      }));
    });
  }

  return [];
}

function normalizeNewsItem(item) {
  const termWord = item?.term?.word || "";
  const termMeaning = item?.term?.meaning || "";

  const fallbackTerm = FALLBACK_TERMS[termWord];

  return {
    title: item.title || "제목 없음",
    link: item.link || "#",
    source: item.source || "출처 미상",
    pubDate: item.pubDate || item.date || item.publishedAt || "",
    summary: stripHtml(item.summary || item.description || ""),
    importance: item.importance || "",
    insight: item.insight || "시장 변화가 경영 판단에 미치는 영향 점검 필요",
    category: item.category || "",
    term: termWord
      ? {
          word: termWord,
          meaning:
            termMeaning ||
            fallbackTerm?.description ||
            "관련 금융 흐름을 이해하는 데 참고할 수 있는 개념입니다.",
          detail: fallbackTerm?.detail || termMeaning || ""
        }
      : null
  };
}

function pickTodayTerm(newsItems) {
  const termItems = newsItems.filter((item) => item.term && item.term.word);

  if (termItems.length === 0) {
    const fallbackList = Object.entries(FALLBACK_TERMS).map(([word, value]) => ({
      word,
      meaning: value.description,
      detail: value.detail
    }));

    const seed = Number(sessionStorage.getItem("mg-term-seed") || 0);
    return fallbackList[seed % fallbackList.length];
  }

  const seed = Number(sessionStorage.getItem("mg-term-seed") || 0);
  const picked = termItems[seed % termItems.length].term;

  return {
    word: picked.word,
    meaning: picked.meaning,
    detail: picked.detail
  };
}

function renderTodayTerm(term) {
  if (!term) {
    ui.todayTermBox.innerHTML = `
      <p class="today-term-meaning">오늘 표시할 용어가 없습니다.</p>
      <p class="today-term-detail">뉴스 데이터가 쌓이면 자동으로 연결됩니다.</p>
    `;
    return;
  }

  ui.todayTermBox.innerHTML = `
    <div class="today-term-key">${escapeHtml(term.word)}</div>
    <p class="today-term-meaning">${escapeHtml(term.meaning)}</p>
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
      return `
        <a
          class="news-item"
          href="${escapeHtml(news.link)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="news-top">
            <span class="news-source">${escapeHtml(news.source)}</span>
            <span class="news-date">${escapeHtml(formatDate(news.pubDate))}</span>
            ${
              news.category
                ? `<span class="news-source">${escapeHtml(news.category)}</span>`
                : ""
            }
          </div>

          <h3 class="news-title">${escapeHtml(news.title)}</h3>

          ${
            news.summary
              ? `<p class="news-summary">${escapeHtml(news.summary)}</p>`
              : ""
          }

          <div class="news-bottom">
            ${
              news.term
                ? `
                  <div class="chip-row">
                    <span class="chip chip-term">용어: ${escapeHtml(news.term.word)}</span>
                  </div>
                `
                : ""
            }

            ${
              news.importance
                ? `
                  <div class="chip-row">
                    <span class="chip chip-term">의미: ${escapeHtml(news.importance)}</span>
                  </div>
                `
                : ""
            }

            <div class="divider"></div>

            <div class="chip-row">
              <span class="chip chip-imp">MG 시사점: ${escapeHtml(news.insight)}</span>
            </div>
          </div>
        </a>
      `;
    })
    .join("");
}

async function loadNews() {
  const response = await fetch(NEWS_JSON_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`news.json 로드 실패: ${response.status}`);
  }

  return response.json();
}

async function init() {
  try {
    const payload = await loadNews();
    const flatNews = flattenNewsData(payload).map(normalizeNewsItem);
    const todayTerm = pickTodayTerm(flatNews);

    renderTodayTerm(todayTerm);
    renderNews(flatNews);
  } catch (error) {
    console.error(error);

    ui.todayTermBox.innerHTML = `
      <p class="today-term-meaning">용어 정보를 불러오지 못했습니다.</p>
      <p class="today-term-detail">data/news.json 경로와 JSON 구조를 확인해주세요.</p>
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
