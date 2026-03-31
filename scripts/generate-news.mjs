import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import Parser from 'rss-parser';

const parser = new Parser({ timeout: 20000 });
const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const outputPath = path.join(dataDir, 'news.json');

const FEEDS = [
  {
    key: 'saemaeul',
    name: '새마을금고',
    urls: [
      'https://news.google.com/rss/search?q=%EC%83%88%EB%A7%88%EC%9D%84%EA%B8%88%EA%B3%A0&hl=ko&gl=KR&ceid=KR:ko'
    ]
  },
  {
    key: 'nonghyup',
    name: '농협',
    urls: [
      'https://news.google.com/rss/search?q=%EB%86%8D%ED%98%91+%EA%B8%88%EC%9C%B5&hl=ko&gl=KR&ceid=KR:ko'
    ]
  },
  {
    key: 'bank',
    name: '은행',
    urls: [
      'https://news.google.com/rss/search?q=%EC%9D%80%ED%96%89+%EA%B8%88%EC%9C%B5&hl=ko&gl=KR&ceid=KR:ko'
    ]
  }
];

function cleanText(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.link}::${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchSection(section) {
  const collected = [];

  for (const url of section.urls) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items ?? []) {
        collected.push({
          title: cleanText(item.title || '제목 없음'),
          link: item.link || '#',
          description: cleanText(item.contentSnippet || item.content || item.summary || ''),
          source: cleanText(item.creator || item.author || feed.title || '출처 미상'),
          pubDate: formatDate(item.isoDate || item.pubDate || ''),
          category: section.key,
          sortValue: new Date(item.isoDate || item.pubDate || 0).getTime() || 0
        });
      }
    } catch (error) {
      console.error(`[WARN] ${section.key} feed fetch failed:`, error.message);
    }
  }

  const normalized = dedupe(collected)
    .sort((a, b) => b.sortValue - a.sortValue)
    .slice(0, 12)
    .map(({ sortValue, ...rest }) => rest);

  return normalized;
}

async function main() {
  const categories = {};

  for (const section of FEEDS) {
    categories[section.key] = await fetchSection(section);
  }

  const allItems = Object.values(categories).flat();
  const topStories = [...allItems].slice(0, 3);
  const payload = {
    updatedAt: new Date().toISOString(),
    totalCount: allItems.length,
    topStories,
    categories
  };

  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[OK] wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
