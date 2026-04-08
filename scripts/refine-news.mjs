import fs from "fs/promises";

const NEWS_PATH = "data/news.json";

const TERM_RULES = [
  {
    word: "NIM",
    meaning: "금리 변화가 금융기관 수익성에 미치는 영향을 보여주는 핵심 지표",
    keywords: ["nim", "순이자마진", "예대마진", "마진", "조달금리", "예금금리", "대출금리"]
  },
  {
    word: "CET1",
    meaning: "손실흡수력을 보여주는 대표적인 자본적정성 지표",
    keywords: ["cet1", "보통주자본", "자본적정성", "자본비율", "bis", "자기자본"]
  },
  {
    word: "LCR",
    meaning: "단기 유동성 충격 대응 능력을 보여주는 지표",
    keywords: ["lcr", "유동성", "예금이탈", "자금조달", "런", "단기자금", "유동성커버리지비율"]
  },
  {
    word: "Forward Guidance",
    meaning: "중앙은행이 향후 정책 방향에 대해 시장에 주는 신호",
    keywords: ["forward guidance", "포워드 가이던스", "통화정책", "기준금리", "연준", "fomc"]
  },
  {
    word: "Terminal Rate",
    meaning: "기준금리 인상 사이클의 최종 수준에 대한 시장 기대",
    keywords: ["terminal rate", "최종금리", "금리인상", "기준금리", "긴축"]
  },
  {
    word: "Delinquency",
    meaning: "연체 흐름을 통해 자산건전성 악화 가능성을 읽는 지표",
    keywords: ["연체", "연체율", "부실", "고정이하여신", "npl", "충당금"]
  },
  {
    word: "Cost of Risk",
    meaning: "신용위험이 비용으로 얼마나 반영되는지를 보여주는 지표",
    keywords: ["대손", "대손비용", "충당금", "위험비용", "신용비용"]
  },
  {
    word: "Deposit Beta",
    meaning: "시장금리 변화가 예금금리에 얼마나 빠르게 반영되는지를 보여주는 개념",
    keywords: ["수신경쟁", "예금금리", "조달비용", "수신", "예금", "금리경쟁"]
  }
];

const MG_KEYWORDS = [
  "새마을금고",
  "mg새마을금고",
  "중앙회",
  "금고"
];

const OTHER_FINANCE_KEYWORDS = [
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
  "핀테크",
  "인터넷은행"
];

const MACRO_KEYWORDS = [
  "기준금리",
  "금리",
  "환율",
  "물가",
  "경기",
  "통화정책",
  "가계대출",
  "부동산",
  "pf",
  "연체",
  "유동성",
  "수출",
  "내수",
  "소비",
  "금융당국",
  "한국은행",
  "금융위",
  "금감원"
];

const FINANCE_CORE_KEYWORDS = [
  ...MG_KEYWORDS,
  ...OTHER_FINANCE_KEYWORDS,
  ...MACRO_KEYWORDS,
  "예금",
  "대출",
  "수신",
  "여신",
  "건전성",
  "자본비율",
  "부실",
  "충당금",
  "조달",
  "수익성"
];

const NOISE_KEYWORDS = [
  "축제",
  "공연",
  "전시",
  "문화",
  "체육",
  "봉사",
  "행사",
  "개최",
  "선정",
  "포럼",
  "출범식",
  "기념식",
  "개관",
  "원불교",
  "군종",
  "마사회",
  "사찰",
  "사찰음식",
  "박람회",
  "관광",
  "맛집",
  "도로",
  "교통",
  "화재",
  "사고",
  "공원",
  "농촌 만들기",
  "우승기원",
  "할인 혜택 제공",
  "브랜드평판",
  "예장",
  "지역논란",
  "허위 거래"
];


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
  "금리 변화는 금융회사의 수익성과 자금운용에 영향을 줍니다",
  "시장 흐름을 이해하는 데 참고할 수 있습니다",
  "경영 판단에 참고가 될 수 있습니다",
  "관련 흐름을 지속적으로 점검할 필요가 있습니다"
];

function decodeHtmlEntities(text) {
  return String(text || "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function cleanText(text) {
  return decodeHtmlEntities(String(text || ""))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(text) {
  return cleanText(text)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function countMatches(text, keywords, weight = 1) {
  return keywords.reduce((sum, keyword) => {
    return sum + (text.includes(normalizeText(keyword)) ? weight : 0);
  }, 0);
}

function flattenNews(payload) {
  if (!payload?.categories || typeof payload.categories !== "object") {
    return [];
  }

  return Object.entries(payload.categories).flatMap(([category, items]) => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => ({
      ...item,
      _rawCategory: category
    }));
  });
}


function isBlockedArticle(article) {
  const text = normalizeText([article.title, article.summary, article.description].join(" "));
  return hasAny(text, BLOCKED_NEWS_KEYWORDS);
}

function isRelevantFinanceArticle(article) {
  const text = normalizeText(
    [
      article.title,
      article.summary,
      article.source,
      article._rawCategory
    ].join(" ")
  );

  const financeScore = countMatches(text, FINANCE_CORE_KEYWORDS, 1);
  const noiseScore = countMatches(text, NOISE_KEYWORDS, 1);

  if (hasAny(text, MG_KEYWORDS)) return true;
  if (hasAny(text, OTHER_FINANCE_KEYWORDS)) return true;

  if (noiseScore >= 2) return false;
  if (financeScore >= 2) return true;
  if (financeScore >= 1 && noiseScore === 0) return true;

  return false;
}

function classifyArticle(article) {
  const text = normalizeText(
    [
      article.title,
      article.summary,
      article.source,
      article._rawCategory
    ].join(" ")
  );

  const mgScore = countMatches(text, MG_KEYWORDS, 3);
  const otherScore = countMatches(text, OTHER_FINANCE_KEYWORDS, 2);

  if (mgScore >= 3) {
    return { key: "mg", label: "새마을금고 직접 관련" };
  }

  if (otherScore >= 2) {
    return { key: "otherFinance", label: "타 금융권·협동조합" };
  }

  return { key: "macro", label: "경제·금융 환경" };
}

function pickTerm(article) {
  const text = normalizeText([article.title, article.summary].join(" "));

  let bestRule = null;
  let bestScore = 0;

  for (const rule of TERM_RULES) {
    const score = countMatches(text, rule.keywords, 1);
    if (score > bestScore) {
      bestRule = rule;
      bestScore = score;
    }
  }

  if (!bestRule || bestScore < 1) return null;

  return {
    word: bestRule.word,
    meaning: bestRule.meaning
  };
}

function isLowQualitySummary(text) {
  const normalized = normalizeText(text);
  if (!normalized) return true;
  if (normalized.length < 18) return true;

  return LOW_QUALITY_SUMMARIES.some((bad) =>
    normalized.includes(normalizeText(bad))
  );
}

function shortenSummary(text, maxLength = 90) {
  const cleaned = cleanText(text);
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trim()}…`;
}

function buildSummary(article, sectionKey) {
  const rawSummary = cleanText(article.summary || "");
  const title = cleanText(article.title || "");
  const text = normalizeText([title, rawSummary].join(" "));

  if (rawSummary && !isLowQualitySummary(rawSummary)) {
    return shortenSummary(rawSummary, 110);
  }

  if (sectionKey === "mg") {
    if (hasAny(text, ["회장", "중앙회", "혁신", "조직"])) {
      return "새마을금고 조직 운영과 향후 대응 방향을 볼 때 참고할 만한 기사입니다.";
    }
    if (hasAny(text, ["예금", "대출", "수신", "여신"])) {
      return "새마을금고의 수신·여신 운영 흐름과 연결해서 볼 수 있는 기사입니다.";
    }
    if (hasAny(text, ["건전성", "연체", "부실"])) {
      return "새마을금고 건전성 관리 흐름과 연결해 볼 수 있는 기사입니다.";
    }
    return "";
  }

  if (sectionKey === "otherFinance") {
    if (hasAny(text, ["금리", "예금", "대출", "수신"])) {
      return "타 금융권의 수신·여신 전략 변화를 비교 관점에서 볼 수 있는 기사입니다.";
    }
    if (hasAny(text, ["디지털", "플랫폼", "비대면", "앱"])) {
      return "타 금융권의 채널 전략 변화를 비교해서 볼 수 있는 기사입니다.";
    }
    return "";
  }

  if (hasAny(text, ["기준금리", "금리", "통화정책"])) {
    return "금리 환경 변화가 금융권 전반에 미치는 영향을 함께 볼 수 있는 기사입니다.";
  }
  if (hasAny(text, ["가계대출", "부동산", "pf"])) {
    return "가계대출과 부동산 흐름을 함께 볼 때 참고할 만한 기사입니다.";
  }
  if (hasAny(text, ["경기", "소비", "내수"])) {
    return "경기 흐름 변화가 지역 금융 수요에 미치는 영향을 볼 때 참고할 만합니다.";
  }

  return "";
}

function dedupeByTitle(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = normalizeText(item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) => {
    const da = new Date(a.pubDate || 0).getTime();
    const db = new Date(b.pubDate || 0).getTime();
    return db - da;
  });
}

function buildHeadline(groups) {
  const mgTop = groups.mg?.[0];
  const otherTop = groups.otherFinance?.[0];
  const macroTop = groups.macro?.[0];

  if (mgTop) {
    return `${mgTop.title} 등 새마을금고 관련 이슈를 우선 확인할 필요가 있습니다.`;
  }
  if (otherTop) {
    return `${otherTop.title} 등 타 금융권 동향을 비교해볼 필요가 있습니다.`;
  }
  if (macroTop) {
    return `${macroTop.title} 등 금융환경 변화를 확인할 필요가 있습니다.`;
  }

  return "오늘의 금융 이슈를 점검할 필요가 있습니다.";
}

async function main() {
  const raw = await fs.readFile(NEWS_PATH, "utf8");
  const payload = JSON.parse(raw);

  const flat = flattenNews(payload)
    .filter((article) => !isBlockedArticle(article))
    .filter(isRelevantFinanceArticle)
    .map((article) => {
      const section = classifyArticle(article);
      const term = pickTerm(article);
      const summary = buildSummary(article, section.key);

      return {
        title: cleanText(article.title || "제목 없음"),
        link: article.link || "#",
        source: cleanText(article.source || "네이버뉴스"),
        pubDate: article.pubDate || "",
        summary,
        term,
        _sectionKey: section.key
      };
    })
    .filter((item) => item.title && item.link);

  const deduped = dedupeByTitle(flat);

  const groups = {
    mg: sortByDateDesc(deduped.filter((item) => item._sectionKey === "mg")).slice(0, 8),
    otherFinance: sortByDateDesc(deduped.filter((item) => item._sectionKey === "otherFinance")).slice(0, 8),
    macro: sortByDateDesc(deduped.filter((item) => item._sectionKey === "macro")).slice(0, 10)
  };

  const cleaned = {
    updatedAt: new Date().toISOString(),
    headline: buildHeadline(groups),
    categories: {
      mg: groups.mg.map(({ _sectionKey, ...item }) => item),
      otherFinance: groups.otherFinance.map(({ _sectionKey, ...item }) => item),
      macro: groups.macro.map(({ _sectionKey, ...item }) => item)
    }
  };

  await fs.writeFile(NEWS_PATH, JSON.stringify(cleaned, null, 2), "utf8");

  console.log(
    `[refine-news] done: mg=${cleaned.categories.mg.length}, otherFinance=${cleaned.categories.otherFinance.length}, macro=${cleaned.categories.macro.length}`
  );
}

main().catch((error) => {
  console.error("[refine-news] failed:", error);
  process.exit(1);
});
