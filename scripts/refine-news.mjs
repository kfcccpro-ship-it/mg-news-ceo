import fs from "fs/promises";

const NEWS_PATH = "data/news.json";

const TERM_RULES = [
  {
    word: "NIM",
    meaning: "금리 변화가 금융기관의 수익성에 어떤 영향을 주는지 보여주는 핵심 지표",
    keywords: ["nim", "순이자마진", "예대마진", "마진", "조달금리", "예금금리", "대출금리"]
  },
  {
    word: "CET1",
    meaning: "손실흡수력을 보여주는 대표적인 자본적정성 지표",
    keywords: ["cet1", "보통주자본", "자본적정성", "자본비율", "bis", "자기자본"]
  },
  {
    word: "LCR",
    meaning: "단기 유동성 충격에 대응할 수 있는 능력을 보여주는 지표",
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
  "mg",
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
  "살인",
  "절도",
  "공원"
];

function normalizeText(text) {
  return String(text || "")
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

function cleanSummary(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  return value.length > 90 ? `${value.slice(0, 90).trim()}…` : value;
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

function isRelevantFinanceArticle(article) {
  const text = normalizeText(
    [
      article.title,
      article.summary,
      article.source,
      article.importance,
      article.insight,
      article._rawCategory
    ].join(" ")
  );

  const financeScore = countMatches(text, FINANCE_CORE_KEYWORDS, 1);
  const noiseScore = countMatches(text, NOISE_KEYWORDS, 1);

  if (hasAny(text, MG_KEYWORDS)) return true;
  if (hasAny(text, OTHER_FINANCE_KEYWORDS)) return true;

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
      article.importance,
      article.insight,
      article._rawCategory
    ].join(" ")
  );

  const mgScore = countMatches(text, MG_KEYWORDS, 3);
  const otherScore = countMatches(text, OTHER_FINANCE_KEYWORDS, 2);
  const macroScore = countMatches(text, MACRO_KEYWORDS, 1);

  if (mgScore >= 3) {
    return {
      key: "mg",
      label: "새마을금고 직접 관련"
    };
  }

  if (otherScore >= 2) {
    return {
      key: "otherFinance",
      label: "타 금융권·협동조합"
    };
  }

  return {
    key: "macro",
    label: "경제·금융 환경"
  };
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

function buildImportance(article, sectionKey) {
  const text = normalizeText([article.title, article.summary].join(" "));

  if (sectionKey === "mg") {
    if (hasAny(text, ["연체", "부실", "충당금", "건전성"])) {
      return "새마을금고 건전성과 리스크 관리 관점에서 우선 점검할 필요가 있습니다.";
    }
    if (hasAny(text, ["예금", "대출", "수신", "금리"])) {
      return "새마을금고의 수신·여신 운영과 예대율 관리 측면에서 참고할 가치가 있습니다.";
    }
    return "새마을금고 운영과 직접 연결될 가능성이 높은 이슈입니다.";
  }

  if (sectionKey === "otherFinance") {
    if (hasAny(text, ["디지털", "앱", "플랫폼", "비대면"])) {
      return "타 금융권의 채널 전략 변화를 비교 관점에서 볼 수 있는 기사입니다.";
    }
    if (hasAny(text, ["예금", "대출", "금리", "수신"])) {
      return "타 금융권의 금리·수신 전략이 경쟁환경에 주는 영향을 살펴볼 수 있습니다.";
    }
    return "타 금융권의 움직임을 통해 대응 방향을 비교해볼 수 있는 기사입니다.";
  }

  if (hasAny(text, ["기준금리", "금리", "통화정책"])) {
    return "금리 변화가 수신 경쟁과 수익성에 미치는 영향을 함께 볼 필요가 있습니다.";
  }
  if (hasAny(text, ["가계대출", "부동산", "pf"])) {
    return "대출 수요와 건전성 관리에 영향을 줄 수 있는 배경 기사입니다.";
  }
  if (hasAny(text, ["경기", "소비", "내수"])) {
    return "지역 금융 수요와 차주 상환여력 변화와 연결해서 볼 필요가 있습니다.";
  }

  return "";
}

function buildInsight(article, sectionKey) {
  const text = normalizeText([article.title, article.summary].join(" "));

  if (sectionKey === "mg") {
    if (hasAny(text, ["연체", "부실", "건전성"])) {
      return "새마을금고의 건전성 점검과 리스크 대응 방향에 직접 연결해 볼 필요가 있습니다.";
    }
    if (hasAny(text, ["예금", "대출", "금리", "수신"])) {
      return "새마을금고의 수신 경쟁, 대출 운용, 예대율 관리에 미치는 영향을 함께 볼 필요가 있습니다.";
    }
    return "새마을금고 운영과 경영 판단에 직접 연결될 수 있어 우선적으로 볼 가치가 있습니다.";
  }

  if (sectionKey === "otherFinance") {
    if (hasAny(text, ["디지털", "앱", "비대면", "플랫폼"])) {
      return "타 금융권의 디지털 전략 변화가 새마을금고 경쟁환경에 주는 시사점을 볼 수 있습니다.";
    }
    if (hasAny(text, ["금리", "예금", "대출", "수신"])) {
      return "타 금융권의 금리·수신 전략 변화가 새마을금고에도 경쟁 압력으로 이어질 수 있습니다.";
    }
    return "타 금융권의 움직임을 통해 새마을금고의 대응 방향을 비교해볼 수 있습니다.";
  }

  if (hasAny(text, ["기준금리", "금리", "통화정책"])) {
    return "금리 환경 변화가 수신 경쟁, 대출 운용, 수익성에 어떤 영향을 줄지 함께 볼 필요가 있습니다.";
  }
  if (hasAny(text, ["가계대출", "부동산", "pf"])) {
    return "가계대출과 부동산 흐름은 대출 수요와 건전성 관리 측면에서 함께 볼 필요가 있습니다.";
  }
  if (hasAny(text, ["경기", "소비", "내수"])) {
    return "경기 흐름 변화가 지역금융 수요와 차주의 상환여력에 미치는 영향을 점검할 필요가 있습니다.";
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
    return `${mgTop.title} 등 새마을금고 관련 핵심 이슈를 점검할 필요가 있습니다.`;
  }
  if (otherTop) {
    return `${otherTop.title} 등 타 금융권 동향을 참고할 필요가 있습니다.`;
  }
  if (macroTop) {
    return `${macroTop.title} 등 금융환경 변화를 점검할 필요가 있습니다.`;
  }

  return "오늘의 금융 이슈를 점검할 필요가 있습니다.";
}

async function main() {
  const raw = await fs.readFile(NEWS_PATH, "utf8");
  const payload = JSON.parse(raw);

  const flat = flattenNews(payload)
    .filter(isRelevantFinanceArticle)
    .map((article) => {
      const section = classifyArticle(article);
      const term = pickTerm(article);

      return {
        title: article.title || "제목 없음",
        link: article.link || "#",
        source: article.source || "네이버뉴스",
        pubDate: article.pubDate || "",
        summary: cleanSummary(article.summary || ""),
        term,
        importance: buildImportance(article, section.key),
        insight: buildInsight(article, section.key),
        _sectionKey: section.key
      };
    });

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
