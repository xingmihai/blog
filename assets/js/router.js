import { renderHome, renderArchive, renderAbout, renderFriends, renderFriendDetail, renderPost, render404 } from './renderer.js';

const routes = {
  '/': renderHome,
  '/archive': renderArchive,
  '/about': renderAbout,
  '/friends': renderFriends,
  '/friend/:name': renderFriendDetail,
  '/post/:slug': renderPost,
};

export function parseRoute(hash) {
  const path = hash.replace('#', '') || '/';
  const [cleanPath, queryStr] = path.split('?');
  const params = {};
  if (queryStr) {
    queryStr.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k && v) params[k] = decodeURIComponent(v);
    });
  }

  for (const [pat, handler] of Object.entries(routes)) {
    if (pat.includes(':')) {
      const re = new RegExp('^' + pat.replace(/:\w+/g, '([^/]+)') + '$');
      const m = cleanPath.match(re);
      if (m) {
        const keys = pat.match(/:\w+/g) || [];
        keys.forEach((k, i) => params[k.slice(1)] = m[i + 1]);
        return { handler, params };
      }
    } else if (cleanPath === pat) {
      return { handler, params };
    }
  }
  return { handler: render404, params: {} };
}
