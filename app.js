const CATEGORY_META = {
  saemaeul: { label: '새마을금고', icon: '🏦' },
  nonghyup: { label: '농협', icon: '🌾' },
  bank: { label: '은행', icon: '💳' }
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function normalizeItem(item, categoryKey) {
  return {
    title: item.title || '제목 없음',
    link: item.link || '#',
    description: item.description || '',
    source: item.source || '출처 미상',
    pubDate: item.pubDate || '',
    category: categoryKey
  };
}

function normalizeData(data) {
  if (data && data.categories) {
    const categories = {
      saemaeul: (data.categories.saemaeul || []).map((item) => normalizeItem(item, 'saemaeul')),
      nonghyup: (data.categories.nonghyup || []).map((item) => normalizeItem(item, 'nonghyup')),
      bank: (data.categories.bank || []).map((item) => normalizeItem(item, 'bank'))
    };
    const allItems = [...categories.saemaeul, ...categories.nonghyup, ...categories.bank];
    return {
      updatedAt: data.updatedAt,
      categories,
      totalCount: data.totalCount ?? allItems.length,
      topStories: (data.topStories || allItems.slice(0, 3)).map((item) => normalizeItem(item, item.category || 'bank'))
    };
  }

  const sections = Array.isArray(data?.sections) ? data.sections : [];
  const categories = {
    saemaeul: (sections.find((s) => s.key === 'saemaeul')?.items || []).map((item) => normalizeItem(item, 'saemaeul')),
    nonghyup: (sections.find((s) => s.key === 'nonghyup')?.items || []).map((item) => normalizeItem(item, 'nonghyup')),
    bank: (sections.find((s) => s.key === 'bank')?.items || []).map((item) => normalizeItem(item, 'bank'))
  };

  const allItems = [...categories.saemaeul, ...categories.nonghyup, ...categories.bank];

  return {
    updatedAt: data?.updatedAt,
    categories,
    totalCount: allItems.length,
    topStories: allItems.slice(0, 3)
  };
}

function renderTopStories(items) {
  const container = document.getElementById('topStories');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<div class="empty-state">표시할 주요 기사가 없습니다.</div>';
    return;
  }

  container.innerHTML = items.map((item, index) => {
    const meta = CATEGORY_META[item.category] || { label: '기타', icon: '📰' };
    return `
      <article class="top-story-card">
        <div class="rank">${index + 1}</div>
        <div class="meta-row">
          <span class="badge">${meta.icon} ${escapeHtml(meta.label)}</span>
          <span>${escapeHtml(item.source)}</span>
          <span>${escapeHtml(item.pubDate)}</span>
        </div>
        <h3 class="top-story-title">
          <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
        </h3>
        <p class="top-story-desc">${escapeHtml(item.description)}</p>
      </article>
    `;
  }).join('');
}

function renderList(id, items) {
  const container = document.getElementById(id);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<div class="empty-state">기사 없음</div>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="news-item">
      <h3 class="news-title">
        <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
      </h3>
      <p class="news-desc">${escapeHtml(item.description)}</p>
      <div class="news-meta">
        <span>${escapeHtml(item.source)}</span>
        <span>${escapeHtml(item.pubDate)}</span>
      </div>
    </article>
  `).join('');
}

function renderCounts(categories) {
  const mapping = {
    'count-saemaeul': categories.saemaeul.length,
    'count-nonghyup': categories.nonghyup.length,
    'count-bank': categories.bank.length
  };

  Object.entries(mapping).forEach(([id, count]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${count}건`;
  });
}

async function loadNews() {
  const updatedAtEl = document.getElementById('updatedAt');
  const articleCountEl = document.getElementById('articleCount');

  try {
    const response = await fetch('./data/news.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rawData = await response.json();
    const data = normalizeData(rawData);

    if (updatedAtEl) updatedAtEl.textContent = formatDateTime(data.updatedAt);
    if (articleCountEl) articleCountEl.textContent = `${data.totalCount}건`;

    renderTopStories(data.topStories);
    renderList('list-saemaeul', data.categories.saemaeul);
    renderList('list-nonghyup', data.categories.nonghyup);
    renderList('list-bank', data.categories.bank);
    renderCounts(data.categories);
  } catch (error) {
    console.error('뉴스 로드 실패:', error);
    if (updatedAtEl) updatedAtEl.textContent = '불러오기 실패';
    if (articleCountEl) articleCountEl.textContent = '0건';

    const emptyCategories = { saemaeul: [], nonghyup: [], bank: [] };
    renderTopStories([]);
    renderList('list-saemaeul', []);
    renderList('list-nonghyup', []);
    renderList('list-bank', []);
    renderCounts(emptyCategories);
  }
}

document.addEventListener('DOMContentLoaded', loadNews);
