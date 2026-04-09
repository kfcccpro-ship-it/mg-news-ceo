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

const BLOCKED_NEWS_KEYWORDS = [
  "[부고]",
  "부고",
  "별세",
  "부친상",
  "모친상",
  "장인상",
  "장모상",
  "빙부상",
  "빙모상",
  "시부상",
  "시모상",
  "조부상",
  "조모상",
  "발인",
  "빈소",
  "유족",
  "영면",
  "추모",
  "애도"
];

const LOW_QUALITY_SUMMARIES = [
  "금융환경 변화와 시장 흐름을 이해하는 데 참고할 수 있습니다",
  "금융환경 변화와 시장 흐름을 이해하는 데 참고 할수있습니다",
  "금융환경 변화와 시장 흐름을 이해하는 데 참고할 수 있습니다.",
  "금리 변화는 금융회사의 수익성과 자금운용에 영향을 줍니다",
  "금리 변화는 금융회사의 수익성과 자금운용에 영향을 줍니다.",
  "시장 흐름을 이해하는 데 참고할 수 있습니다",
  "경영 판단에 참고가 될 수 있습니다",
  "관련 흐름을 지속적으로 점검할 필요가 있습니다"
];

const ui = {
  newsContainer: document.getElementById("newsContainer"),
  todayTermBox: document.getElementById("todayTermBox"),
  refreshTermBtn: document.getElementById("refreshTermBtn"),
  todayLabelHero: document.getElementById("todayLabelHero"),
  todayLabelNews: document.getElementById("todayLabelNews")
};

function decodeHtmlEntities(text) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(text || "");
  return textarea.value;
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = String(html || "");
  return div.textContent || div.innerText || "";
}

function cleanText(text) {
  return decodeHtmlEntities(stripHtml(text))
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(text) {
  return cleanText(text)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitleForCompare(text) {
  return normalizeText(text)
    .replace(/["'`“”‘’·.,:;!?()[\]{}]/g, " ")
    .replace(/\b(네이버뉴스|포토뉴스|단독|종합|속보)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeTitle(text) {
  return normalizeTitleForCompare(text)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function areSimilarTitles(titleA, titleB) {
  const a = normalizeTitleForCompare(titleA);
  const b = normalizeTitleForCompare(titleB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const tokensA = tokenizeTitle(a);
  const tokensB = tokenizeTitle(b);
  const similarity = jaccardSimilarity(tokensA, tokensB);

  if (similarity >= 0.72) return true;

  const sharedCore = tokensA.filter((token) => tokensB.includes(token));
  return sharedCore.length >= 4;
}

function deduplicateNewsItems(newsItems) {
  const sorted = [...newsItems].sort((a, b) => {
    const aDate = new Date(a.pubDate).getTime() || 0;
    const bDate = new Date(b.pubDate).getTime() || 0;
    return bDate - aDate;
  });

  const unique = [];

  for (const item of sorted) {
    const duplicate = unique.some((kept) => {
      const sameSection = kept.section?.key === item.section?.key;
      if (!sameSection) return false;
      return areSimilarTitles(kept.title, item.title);
    });

    if (!duplicate) unique.push(item);
  }

  return unique;
}

function isBlockedNewsItem(item) {
  const text = normalizeText([item?.title, item?.summary, item?.description].join(" "));
  return BLOCKED_NEWS_KEYWORDS.some((keyword) => text.includes(normalizeText(keyword)));
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

function renderTodayLabels(latestDate) {
  if (ui.todayLabelHero) ui.todayLabelHero.textContent = "";
  if (ui.todayLabelNews) {
    ui.todayLabelNews.textContent = latestDate
      ? ` (${latestDate.getMonth() + 1}월 ${latestDate.getDate()}일 기준)`
      : "";
  }
}

function getLatestNewsDate(newsItems, payload) {
  const candidates = (Array.isArray(newsItems) ? newsItems : [])
    .map((item) => new Date(item.pubDate))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (candidates.length > 0) {
    return new Date(Math.max(...candidates.map((date) => date.getTime())));
  }

  const updatedAt = new Date(payload?.updatedAt || "");
  if (!Number.isNaN(updatedAt.getTime())) return updatedAt;

  return null;
}

function flattenNewsData(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.news)) return payload.news;

  if (payload.categories && typeof payload.categories === "object") {
    return Object.entries(payload.categories).flatMap(([category, items]) => {
      if (!Array.isArray(items)) return [];
      return items.map((item) => ({ ...item, rawCategory: category }));
    });
  }

  return [];
}

function isMeaningfulTerm(termWord, termMeaning) {
  const word = cleanText(termWord);
  const meaning = cleanText(termMeaning);
  if (!word) return false;
  if (LOW_QUALITY_TERMS.has(word)) return false;
  if (word.length <= 2) return false;
  if (!meaning) return false;
  if (meaning.length < 12) return false;
  return true;
}

function isLowQualitySummary(summary) {
  const normalized = normalizeText(summary);
  if (!normalized) return true;
  if (normalized.length < 20) return true;

  return LOW_QUALITY_SUMMARIES.some((bad) =>
    normalized.includes(normalizeText(bad))
  );
}

function buildFallbackSummary(item, sectionKey) {
  const text = normalizeText([item.title, item.summary].join(" "));

  if (sectionKey === "mg") {
    if (text.includes("회장") || text.includes("중앙회") || text.includes("조직") || text.includes("혁신")) {
      return "새마을금고 조직 운영과 대외 메시지 측면에서 볼 만한 기사입니다.";
    }
    if (text.includes("대출") || text.includes("예금") || text.includes("수신") || text.includes("여신") || text.includes("가계대출") || text.includes("보조금")) {
      return "새마을금고의 수신 기반 확대나 영업 흐름과 연결해서 볼 수 있습니다.";
    }
    if (text.includes("건전성") || text.includes("연체") || text.includes("부실") || text.includes("충당금")) {
      return "새마을금고 건전성 관리 흐름과 연결해 볼 수 있는 기사입니다.";
    }
    if (text.includes("금리") || text.includes("기준금리") || text.includes("유동성")) {
      return "금리와 자금운용 환경 변화가 금고 운영에 미치는 영향을 함께 볼 수 있습니다.";
    }
    return "금고 운영과 연결되는 흐름만 짧게 확인할 수 있도록 정리한 기사입니다.";
  }

  if (sectionKey === "other-finance") {
    if (text.includes("금리") || text.includes("예금") || text.includes("대출") || text.includes("수신")) {
      return "타 금융권의 수신·여신 전략 변화를 비교 관점에서 볼 수 있습니다.";
    }
    if (text.includes("디지털") || text.includes("플랫폼") || text.includes("비대면") || text.includes("앱")) {
      return "타 금융권의 채널 전략 변화를 비교해서 볼 수 있습니다.";
    }
    return "금융권 전반의 운영 흐름을 비교 관점에서 확인할 수 있는 기사입니다.";
  }

  if (text.includes("기준금리") || text.includes("금리") || text.includes("통화정책")) {
    return "금리 환경 변화가 금융권 전반에 미치는 영향을 함께 볼 수 있습니다.";
  }
  if (text.includes("가계대출") || text.includes("부동산") || text.includes("pf")) {
    return "대출 수요와 건전성 흐름을 함께 볼 때 참고할 만한 기사입니다.";
  }
  if (text.includes("경기") || text.includes("소비") || text.includes("내수")) {
    return "경기 흐름 변화가 지역 금융 수요에 미치는 영향을 볼 때 참고할 만합니다.";
  }

  return "경제·금융 환경을 이해할 때 같이 보면 좋은 기사입니다.";
}

function classifyArticle(item) {
  const text = normalizeText([
    item.title,
    item.summary,
    item.source,
    item.rawCategory,
    item.importance,
    item.insight
  ].join(" "));

  const directMgKeywords = ["새마을금고", "mg새마을금고", "중앙회", "금고"];
  const mgOperationalKeywords = [
    "예금", "대출", "수신", "여신", "가계대출", "예대율", "건전성", "연체", "부실", "충당금", "유동성", "자금조달", "금리", "기준금리", "보조금"
  ];
  const otherFinanceKeywords = ["농협", "신협", "수협", "산림조합", "은행", "저축은행", "보험", "증권", "카드", "캐피탈", "인터넷은행", "핀테크"];
  const macroKeywords = ["물가", "환율", "경기", "통화정책", "소비", "내수", "수출", "고용", "성장률", "부동산", "pf"];

  const directMgScore = directMgKeywords.reduce(
    (sum, keyword) => sum + (text.includes(normalizeText(keyword)) ? 3 : 0),
    0
  );
  const mgOperationalScore = mgOperationalKeywords.reduce(
    (sum, keyword) => sum + (text.includes(normalizeText(keyword)) ? 1 : 0),
    0
  );
  const otherFinanceScore = otherFinanceKeywords.reduce(
    (sum, keyword) => sum + (text.includes(normalizeText(keyword)) ? 1 : 0),
    0
  );
  const macroScore = macroKeywords.reduce(
    (sum, keyword) => sum + (text.includes(normalizeText(keyword)) ? 1 : 0),
    0
  );

  if (directMgScore >= 3 || mgOperationalScore >= 2) {
    return { key: "mg", label: "금고와 관련" };
  }
  if (otherFinanceScore >= 1) {
    return { key: "other-finance", label: "타 금융권·협동조합" };
  }
  if (macroScore >= 1) {
    return { key: "macro", label: "경제·금융 환경" };
  }
  return { key: "macro", label: "경제·금융 환경" };
}

function normalizeNewsItem(item) {
  if (isBlockedNewsItem(item)) return null;

  const section = classifyArticle(item);
  const rawTermWord = cleanText(item?.term?.word || "");
  const rawTermMeaning = cleanText(item?.term?.meaning || "");
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

  const rawSummary = cleanText(item.summary || item.description || "");
  const summary = isLowQualitySummary(rawSummary)
    ? buildFallbackSummary(item, section.key)
    : rawSummary;

  return {
    title: cleanText(item.title || "제목 없음"),
    link: item.link || "#",
    source: cleanText(item.source || "출처 미상"),
    pubDate: item.pubDate || item.date || item.publishedAt || "",
    summary: cleanText(summary),
    section,
    term
  };
}

function getDaySeed(date = new Date()) {
  return Number(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`);
}

function pickTodayTerm(newsItems, latestDate) {
  const termItems = newsItems.filter((item) => item.term && item.term.word);

  if (termItems.length > 0) {
    const seed = getDaySeed(latestDate || new Date());
    const picked = termItems[seed % termItems.length].term;
    return { word: picked.word, meaning: picked.meaning, detail: picked.detail };
  }

  const fallbackList = Object.entries(FALLBACK_TERMS).map(([word, value]) => ({
    word,
    meaning: value.description,
    detail: value.detail
  }));

  const manualOffset = Number(sessionStorage.getItem("mg-term-seed-offset") || 0);
  const baseSeed = getDaySeed(latestDate || new Date());
  return fallbackList[(baseSeed + manualOffset) % fallbackList.length];
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

function renderGroupIcon(groupKey) {
  if (groupKey === "mg") {
    return `
      <span class="section-main-icon" aria-hidden="true" style="padding:0; overflow:hidden; background:#fff; border-color:#cfe1ff;">
        <img
          src="./assets/mg-logo.png"
          alt=""
          style="width:48px; height:48px; object-fit:contain; display:block;"
        />
      </span>
    `;
  }

  if (groupKey === "other-finance") {
    return `
      <span class="section-main-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 10L12 5L20 10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6 10V18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M12 10V18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M18 10V18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M4 19H20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      </span>
    `;
  }

  return `
    <span class="section-main-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M5 17L10 12L13 15L19 9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19 9H15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M19 9V13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    </span>
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
      <h3 class="news-title">${escapeHtml(news.title)}</h3>
      ${news.summary ? `<p class="news-summary">${escapeHtml(news.summary)}</p>` : ""}
      ${news.term ? `
        <div class="news-bottom">
          <div class="chip-row">
            <span class="chip chip-term">연결 용어: ${escapeHtml(news.term.word)}</span>
          </div>
        </div>
      ` : ""}
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
      title: "금고와 관련",
      description: ""
    },
    {
      key: "other-finance",
      title: "타 금융권·협동조합",
      description: ""
    },
    {
      key: "macro",
      title: "경제·금융 환경",
      description: ""
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
              <div class="section-title-row">
                ${renderGroupIcon(group.key)}
                <h2>${escapeHtml(group.title)}</h2>
              </div>
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
    const flatNews = deduplicateNewsItems(
      flattenNewsData(payload)
        .map(normalizeNewsItem)
        .filter((item) => item && item.title && item.link)
    );

    const latestNewsDate = getLatestNewsDate(flatNews, payload);
    const todayTerm = pickTodayTerm(flatNews, latestNewsDate);

    renderTodayLabels(latestNewsDate);
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
  const current = Number(sessionStorage.getItem("mg-term-seed-offset") || 0);
  sessionStorage.setItem("mg-term-seed-offset", String(current + 1));
  init();
});

init();
