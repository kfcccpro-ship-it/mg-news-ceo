import fs from 'node:fs/promises';
import Parser from 'rss-parser';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || '';
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || '';
const HAS_NAVER_API = Boolean(NAVER_CLIENT_ID && NAVER_CLIENT_SECRET);
const OUTPUT_PATH = './data/news.json';

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; MGNewsBot/1.0)'
  }
});


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

const categories = [
  {
    key: 'saemaeul',
    naverQuery: '새마을금고',
    rssQueries: ['새마을금고', '새마을금고 중앙회']
  },
  {
    key: 'nonghyup',
    naverQuery: '농협 금융',
    rssQueries: ['농협 금융', '신협 금융']
  },
  {
    key: 'bank',
    naverQuery: '은행 금융',
    rssQueries: ['은행 금융', '기준금리 은행', '가계대출 금융']
  }
];

function clean(text = '') {
  return String(text)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}


function normalizeText(text = '') {
  return clean(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

function isBlockedNewsItem(item) {
  const text = normalizeText([item.title, item.description].join(' '));
  return BLOCKED_NEWS_KEYWORDS.some((keyword) => text.includes(normalizeText(keyword)));
}

function toMillis(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const title = clean(item.title).toLowerCase();
    const link = String(item.link || '').trim();
    const key = `${title}::${link}`;
    if (!title || !link || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildGoogleNewsUrl(query) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
}

async function fetchNaverNews(query) {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=12&sort=date`;
  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
    }
  });

  if (!response.ok) {
    throw new Error(`Naver API ${response.status}`);
  }

  const data = await response.json();
  return (data.items || []).map((item) => ({
    title: clean(item.title || '제목 없음'),
    link: item.link || item.originallink || '#',
    source: '네이버뉴스',
    pubDate: item.pubDate || '',
    description: clean(item.description || '')
  }));
}

async function fetchRssNews(query) {
  const feed = await parser.parseURL(buildGoogleNewsUrl(query));
  return (feed.items || []).map((item) => ({
    title: clean(item.title || '제목 없음'),
    link: item.link || '#',
    source: clean(feed.title || 'Google News'),
    pubDate: item.isoDate || item.pubDate || '',
    description: clean(item.contentSnippet || item.content || item.summary || '')
  }));
}

async function fetchCategoryItems(category) {
  const collected = [];

  if (HAS_NAVER_API) {
    try {
      return await fetchNaverNews(category.naverQuery);
    } catch (error) {
      console.warn(`[generate-news] Naver fetch failed for ${category.key}: ${error.message}`);
    }
  }

  for (const query of category.rssQueries) {
    try {
      const items = await fetchRssNews(query);
      collected.push(...items);
    } catch (error) {
      console.warn(`[generate-news] RSS fetch failed for ${category.key}/${query}: ${error.message}`);
    }
  }

  return collected;
}

async function readExistingJson() {
  try {
    const raw = await fs.readFile(OUTPUT_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const result = {
    updatedAt: new Date().toISOString(),
    collector: HAS_NAVER_API ? 'naver' : 'rss',
    categories: {}
  };

  let totalCount = 0;

  for (const category of categories) {
    const items = await fetchCategoryItems(category);
    const normalized = dedupe(items)
      .filter((item) => !isBlockedNewsItem(item))
      .sort((a, b) => toMillis(b.pubDate) - toMillis(a.pubDate))
      .slice(0, 12);

    result.categories[category.key] = normalized;
    totalCount += normalized.length;
  }

  if (totalCount === 0) {
    const existing = await readExistingJson();
    if (existing) {
      console.warn('[generate-news] no fresh items collected, keeping existing data/news.json');
      return;
    }
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf8');
  console.log(`[generate-news] wrote ${OUTPUT_PATH} (${totalCount} items, ${result.collector})`);
}

main().catch((error) => {
  console.error('[generate-news] failed:', error);
  process.exit(1);
});
