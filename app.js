const NEWS_JSON_PATH = "./data/news.json";
const BOK_TERMS_URL =
  "https://www.bok.or.kr/portal/bbs/B0000249/view.do?menuNo=200765&nttId=10096081";

const FALLBACK_TERMS = {
  NIM: {
    description: "금리 변화가 금융기관 수익성에 미치는 영향을 보여주는 핵심 지표",
    detail:
      "조달금리와 운용수익률 차이가 순이자수익에 어떻게 반영되는지 이해할 때 활용됩니다."
  },
  CET1: {
    description: "손실흡수력을 보여주는 대표적인 자본적정성 지표",
    detail:
      "위기 상황에서 자본 여력을 얼마나 갖추고 있는지 판단할 때 중요합니다."
  },
  LCR: {
    description: "단기 유동성 충격 대응 능력을 보여주는 지표",
    detail:
      "예금 이탈이나 자금시장 경색 시 얼마나 버틸 수 있는지 판단할 때 참고합니다."
  },
  "Terminal Rate": {
    description: "기준금리 인상 사이클의 최종 수준에 대한 시장 기대",
    detail:
      "금리 전망, 조달비용, 수신 경쟁 강도를 읽을 때 함께 봐야 하는 개념입니다."
  },
  "Forward Guidance": {
    description: "중앙은행이 향후 정책 방향에 대해 시장에 주는 신호",
    detail:
      "시장 금리와 금융기관 대응 전략에 영향을 줄 수 있어 통화정책 해석에 중요합니다."
  },
  Delinquency: {
    description: "연체 흐름을 통해 자산건전성 악화 가능성을 읽는 지표",
    detail:
      "연체율 상승은 충당금 부담과 건전성 관리 강화 필요성으로 이어질 수 있습니다."
  },
  "Cost of Risk": {
    description: "신용위험이 비용으로 얼마나 반영되는지를 보여주는 지표",
    detail:
      "경기 둔화나 취약차주 증가 국면에서 수익성과 건전성을 함께 읽을 때 중요합니다."
  },
  "Deposit Beta": {
    description: "시장금리 변화가 예금금리에 얼마나 빠르게 반영되는지를 보여주는 개념",
    detail:
      "수신 경쟁 심화와 조달비용 상승 압력을 이해할 때 함께 볼 수 있습니다."
  }
};

const LOW_QUALITY_TERMS = new Set([
  "금융환경",
  "시장흐름",
  "시장 흐름",
  "경제환경",
  "경영환경",
  "금융시장"
]);

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

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.news)) return payload.news;

  if (payload.categories && typeof payload.categories === "object") {
    return Object.entries(payload.categories).flatMap(([category, items]) => {
      if (!Array.isArray(items)) return [];
      return items.map((item) => ({
        ...item,
        rawCategory: category
      }));
    });
  }

  return [];
}

function isMeaningfulTerm(termWord, termMeaning) {
  const word = String(termWord || "").trim();
  const meaning = String(termMeaning || "").trim();

  if (!word) return false;
  if (LOW_QUALITY_TERMS.has(word)) return false;
  if (word.length <= 2) return false;
  if (!meaning) return false;
  if (meaning.length < 12) return false;

  return true;
}

function classifyArticle(item) {
  const text = normalizeText(
    [
      item.title,
      item.summary,
      item.source,
      item.rawCategory,
      item.importance,
      item.insight
    ].join(" ")
  );

  const mgKeywords = [
    "새마을금고",
    "mg새마을금고",
    "mg",
    "중앙회",
    "금고"
  ];

  const otherFinanceKeywords = [
    "농협",
    "신협",
    "수협",
    "산림조합",
    "은행",
    "저축은행",
    "보험",
    "증권",
    "카드",
    "캐피탈",
    "인터넷은행",
    "핀테크"
  ];

  const mgScore = mgKeywords.reduce(
    (sum, keyword) => sum + (text.includes(normalizeText(keyword)) ? 2 : 0),
    0
  );

  const otherFinanceScore = otherFinanceKeywords.reduce(
    (sum, keyword) => sum + (text.includes(normalizeText(keyword)) ? 1 : 0),
    0
  );

  if (mgScore >= 2) {
    return { key: "mg", label: "새마을금고 직접 관련" };
  }

  if (otherFinanceScore >= 1) {
    return { key: "other-finance", label: "타 금융권·협동조합" };
  }

  return { key: "macro", label: "경제·금융 환경" };
}

function buildShortInsight(item, sectionKey) {
  const text = normalizeText(
    [item.title, item.summary, item.importance, item.insight].join(" ")
  );

  if (sectionKey === "mg") {
    if (text.includes("연체") || text.includes("부실") || text.includes("건전성")) {
      return "건전성 관리와 연결해 볼 기사입니다.";
    }
    if (text.includes("예금") || text.includes("대출") || text.includes("수신") || text.includes("금리")) {
      return "수신·여신 운영 관점에서 볼 필요가 있습니다.";
    }
    return "새마을금고 운영과 직접 관련된 기사입니다.";
  }

  if (sectionKey === "other-finance") {
    if (text.includes("디지털") || text.includes("플랫폼") || text.includes("비대면")) {
      return "채널 경쟁 방향 비교에 참고할 만합니다.";
    }
    if (text.includes("금리") || text.includes("예금") || text.includes("대출")) {
      return "금리·수신 경쟁 흐름 비교에 참고할 만합니다.";
    }
    return "타 금융권 동향 비교용 기사입니다.";
  }

  if (text.includes("기준금리") || text.includes("금리") || text.includes("통화정책")) {
    return "금리 환경 변화와 함께 볼 필요가 있습니다.";
  }
  if (text.includes("가계대출") || text.includes("부동산")) {
    return "대출 수요와 건전성 흐름에 참고할 만합니다.";
  }
  if (text.includes("경기") || text.includes("소비") || text.includes("내수")) {
    return "지역금융 수요 변화와 함께 볼 수 있습니다.";
  }

  return "";
}

function shouldShowInsight(insight) {
  const text = String(insight || "").trim();
  if (!text) return false;

  const blocked = [
    "비교해볼 수 있습니다",
    "참고할 가치가 있습니다",
    "영향을 함께 볼 필요가 있습니다",
    "관련 흐름",
    "참고할 수 있습니다"
  ];

  if (text.length < 10) return false;
  if (blocked.some((bad) => text.includes(bad))) return false;

  return true;
}

function normalizeNewsItem(item) {
  const section = classifyArticle(item);

  const rawTermWord = item?.term?.word || "";
  const rawTermMeaning = item?.term?.meaning || "";
  const fallbackTerm = FALLBACK_TERMS[rawTermWord];

  const showTerm = isMeaningfulTerm(
    rawTermWord,
    rawTermMeaning || fallbackTerm?.description || ""
  );

  const term = showTerm
    ? {
        word: rawTermWord,
        meaning:
          rawTermMeaning ||
          fallbackTerm?.description ||
          "관련 흐름을 이해하는 데 필요한 개념입니다.",
        detail: fallbackTerm?.detail || ""
      }
    : null;

  let insight = buildShortInsight(item, section.key);
  if (!shouldShowInsight(insight)) {
    insight = "";
  }

  return {
    title: item.title || "제목 없음",
    link: item.link || "#",
    source: item.source || "출처 미상",
    pubDate: item.pubDate || item.date || item.publishedAt || "",
    summary: stripHtml(item.summary || item.description || ""),
    section,
    term,
    insight
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

function renderNewsCard(news) {
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
          news.insight
            ? `
              <div class="divider"></div>
              <div class="chip-row">
                <span class="chip chip-imp">MG 시사점: ${escapeHtml(news.insight)}</span>
              </div>
            `
            : ""
        }
      </div>
    </a>
  `;
}

function renderGroupedNews(newsItems) {
  if (!Array.isArray(newsItems) || newsItems.length === 0) {
    ui.newsContainer.innerHTML = `<div class="empty">표시할 뉴스가 없습니다.</div>`;
    return;
  }

  const groups = [
    {
      key: "mg",
      title: "새마을금고 직접 관련",
      description: "새마을금고 및 MG 관련 이슈를 우선적으로 보여줍니다."
    },
    {
      key: "other-finance",
      title: "타 금융권·협동조합",
      description: "농협·신협·은행 등 비교 관점에서 볼 만한 기사입니다."
    },
    {
      key: "macro",
      title: "경제·금융 환경",
      description: "금리·경기·가계대출 등 배경 환경을 읽는 기사입니다."
    }
  ];

  const groupedHtml = groups
    .map((group) => {
      const items = newsItems.filter((item) => item.section.key === group.key);
      if (items.length === 0) return "";

      return `
        <section style="margin-bottom: 18px;">
          <div class="section-head" style="margin-top: 6px;">
            <div>
              <h2 style="font-size: 22px;">${escapeHtml(group.title)}</h2>
              <p>${escapeHtml(group.description)}</p>
            </div>
          </div>
          <div class="news-list">
            ${items.map(renderNewsCard).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  ui.newsContainer.innerHTML = groupedHtml || `<div class="empty">표시할 뉴스가 없습니다.</div>`;
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
    const flatNews = flattenNewsData(payload)
      .map(normalizeNewsItem)
      .filter((item) => item.title && item.link);

    const todayTerm = pickTodayTerm(flatNews);

    renderTodayTerm(todayTerm);
    renderGroupedNews(flatNews);
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
