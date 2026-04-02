import fs from 'node:fs/promises';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  throw new Error('네이버 API 키가 없습니다');
}

const categories = [
  { key: 'saemaeul', query: '새마을금고' },
  { key: 'nonghyup', query: '농협' },
  { key: 'bank', query: '은행 금융' }
];

const guides = [
  {
    keywords: ['금리'],
    summary: '금리 변화는 금융회사의 수익성과 자금운용에 영향을 줍니다.',
    term: { word: '금리', meaning: '자금을 빌리거나 맡길 때 적용되는 비율입니다.' },
    importance: '금고 수익성과 대출 수요에 영향을 줍니다.',
    insight: '금리 환경 변화에 맞춘 자산·부채 관리 점검이 필요합니다.'
  },
  {
    keywords: ['건전성', '연체'],
    summary: '건전성과 연체 관리는 금융회사의 안정성에 핵심입니다.',
    term: { word: '건전성', meaning: '자산이 부실화되지 않도록 유지하는 상태입니다.' },
    importance: '연체율과 손실 가능성에 영향을 줍니다.',
    insight: '대출자산과 연체 흐름을 함께 점검할 필요가 있습니다.'
  },
  {
    keywords: ['디지털', '플랫폼'],
    summary: '디지털 전환은 금융 경쟁력의 핵심 요소입니다.',
    term: { word: '비대면', meaning: '대면 없이 모바일·온라인으로 서비스를 제공하는 방식입니다.' },
    importance: '고객 접근성과 채널 경쟁력에 영향을 줍니다.',
    insight: '모바일 채널 경쟁력 점검이 필요합니다.'
  }
];

function getGuide(title = '') {
  for (const guide of guides) {
    if (guide.keywords.some(k => title.includes(k))) {
      return guide;
    }
  }

  return {
    summary: '금융환경 변화와 시장 흐름을 이해하는 데 참고할 수 있습니다.',
    term: { word: '금융환경', meaning: '금리·경기 등 금융기관에 영향을 주는 외부 조건입니다.' },
    importance: '경영 판단에 참고가 될 수 있습니다.',
    insight: '관련 흐름을 지속적으로 점검할 필요가 있습니다.'
  };
}

async function fetchNews(query) {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=10&sort=date`;

  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
    }
  });

  const data = await res.json();
  return data.items || [];
}

function clean(text = '') {
  return text.replace(/<[^>]+>/g, '');
}

async function main() {
  const result = {
    updatedAt: new Date().toISOString(),
    headline: '',
    categories: {
      saemaeul: [],
      nonghyup: [],
      bank: []
    }
  };

  let allItems = [];

  for (const category of categories) {
    const items = await fetchNews(category.query);

    const mapped = items.map(item => {
      const title = clean(item.title);
      const guide = getGuide(title);

      return {
        title,
        link: item.link,
        source: '네이버뉴스',
        pubDate: item.pubDate,
        summary: guide.summary,
        term: guide.term,
        importance: guide.importance,
        insight: guide.insight
      };
    });

    result.categories[category.key] = mapped;
    allItems.push(...mapped);
  }

  result.headline = allItems.length
    ? '금융환경 변화에 따른 주요 이슈를 점검할 필요가 있습니다.'
    : '오늘의 주요 금융 이슈를 정리해 제공합니다.';

  await fs.writeFile('./data/news.json', JSON.stringify(result, null, 2));
}

main();
