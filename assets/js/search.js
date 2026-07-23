import { $, escapeHtml, formatDate, debounce } from './utils.js';

let fuse = null;
let postsCache = [];

/**
 * 加载文章数据
 * @returns {Promise<Array>}
 */
export async function loadPosts() {
  if (postsCache.length) return postsCache;
  const res = await fetch('/search.json');
  if (!res.ok) throw new Error(`search.json ${res.status}`);
  postsCache = await res.json();
  if (!Array.isArray(postsCache)) {
    throw new Error('search.json 不是数组');
  }
  postsCache.sort((a, b) => new Date(b.date) - new Date(a.date));
  return postsCache;
}

/**
 * 初始化搜索系统
 */
export async function initSearch() {
  if (typeof Fuse === 'undefined') {
    console.error('Fuse.js 未加载，搜索功能不可用');
    return;
  }

  try {
    await loadPosts();

    fuse = new Fuse(postsCache, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'content', weight: 0.3 },
        { name: 'tags', weight: 0.2 },
        { name: 'description', weight: 0.1 }
      ],
      threshold: 0.35,
      includeMatches: true,
    });

    const input = $('search-input');
    const dropdown = $('search-dropdown');
    const list = $('search-results');

    if (!input || !dropdown || !list) return;

    const doSearch = () => {
      const q = (input.value || '').trim();
      if (!q) { list.innerHTML = ''; dropdown.style.display = 'none'; return; }
      if (!fuse) return;

      const results = fuse.search(q).slice(0, 8);
      list.innerHTML = '';

      if (results.length === 0) {
        list.innerHTML = '<div class="search-no-result">无匹配文章</div>';
      } else {
        results.forEach(r => {
          const item = document.createElement('div');
          item.className = 'search-result-item';
          item.innerHTML = `
            <div class="search-result-title">${escapeHtml(r.item.title)}</div>
            <div class="search-result-desc">${escapeHtml(r.item.description || formatDate(r.item.date))}</div>
          `;
          item.addEventListener('click', () => {
            location.hash = `#/post/${r.item.slug}`;
            dropdown.style.display = 'none';
            input.value = '';
          });
          list.appendChild(item);
        });
      }
      dropdown.style.display = 'block';
    };

    const bindInput = () => {
      try {
        const nativeInput = input.shadowRoot && input.shadowRoot.querySelector('input');
        if (nativeInput) {
          nativeInput.addEventListener('input', debounce(doSearch, 150));
          return true;
        }
      } catch (e) {}
      return false;
    };

    if (!bindInput()) {
      customElements.whenDefined('mdui-text-field').then(() => {
        requestAnimationFrame(bindInput);
      });
    }

    input.addEventListener('keyup', debounce(doSearch, 150));
    input.addEventListener('focus', () => {
      if ((input.value || '').trim() && fuse) doSearch();
    });

    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    // 键盘快捷键：/ 聚焦搜索
    document.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        input.focus();
      }
      if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        input.blur();
      }
    });

  } catch (err) {
    console.error('搜索初始化失败:', err);
  }
}

export { postsCache };
