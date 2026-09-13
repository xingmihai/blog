#!/usr/bin/env node
/**
 * 抓取友链 RSS → 生成 friends-rss.json（静态产物）
 *
 * 用于替代原来的 Cloudflare Pages Functions（functions/api/rss.js）：
 * 由 GitHub Actions 定时执行，把抓到的内容提交回仓库，
 * 站点直接读静态 JSON。因此：
 *   - 不需要 KV 绑定
 *   - 没有开放代理 / SSRF 风险（只在 CI 里跑，不对外提供 ?url= 入口）
 *   - 换任何平台部署都能用
 *
 * 用法：node scripts/fetch-friends-rss.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRSS } from './rss-parser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FRIENDS = path.join(ROOT, 'friends.json');
const OUTPUT = path.join(ROOT, 'friends-rss.json');

// 单源超时：CI 里不能让一个慢源拖垮整个任务
const TIMEOUT_MS = 15000;
// 响应体上限：RSS 一般几十 KB，超过 2MB 肯定不是正常订阅源
const MAX_BYTES = 2 * 1024 * 1024;

const UA = 'Mozilla/5.0 (compatible; BlogFriendRSSBot/1.0)';

async function fetchFeed(rssUrl) {
  try {
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    });

    if (!res.ok) {
      // 不回显底层细节：这份 JSON 会公开，错误信息也应保持克制
      return { ok: false, error: `源站返回 ${res.status}` };
    }

    const text = await res.text();
    if (text.length > MAX_BYTES) {
      return { ok: false, error: '响应过大，已跳过' };
    }

    const data = parseRSS(text, rssUrl);
    if (!data.items.length) {
      return { ok: false, error: '未解析到文章条目' };
    }

    return { ok: true, ...data };
  } catch (err) {
    // 统一文案，不暴露 DNS/IP 等内网信息
    return { ok: false, error: '抓取失败（超时或不可达）' };
  }
}

async function main() {
  const friends = JSON.parse(fs.readFileSync(FRIENDS, 'utf8'));
  const targets = friends.filter(f => f.rss);

  console.log(`友链 ${friends.length} 个，其中 ${targets.length} 个提供 RSS`);

  // 读取上一次结果：单个源失败时用它兜底，避免一次网络抖动就让友链文章消失
  let prev = { feeds: {} };
  if (fs.existsSync(OUTPUT)) {
    try {
      prev = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
    } catch { /* 旧文件损坏则忽略，当作没有历史 */ }
  }

  // 并发抓取，但整体不因单个失败而中断
  const results = await Promise.all(
    targets.map(async f => {
      const r = await fetchFeed(f.rss);
      if (r.ok) {
        console.log(`  ✅ ${f.name}（${r.items.length} 条）`);
        // 记录单源更新时间，失败兜底时能显示数据有多旧
        return [f.rss, { name: f.name, url: f.url, updatedAt: new Date().toISOString(), ...r }];
      }

      const stale = prev.feeds?.[f.rss];
      if (stale?.ok) {
        const when = stale.updatedAt ? new Date(stale.updatedAt).toLocaleDateString('zh-CN') : '上次';
        console.log(`  ⚠️  ${f.name} 本次失败（${r.error}），沿用 ${when} 的数据`);
        return [f.rss, { ...stale, name: f.name, url: f.url, stale: true, error: r.error }];
      }

      console.log(`  ❌ ${f.name}（${r.error}），且无历史数据`);
      return [f.rss, { name: f.name, url: f.url, ok: false, error: r.error }];
    })
  );

  const feeds = Object.fromEntries(results);
  const freshCount = results.filter(([, v]) => v.ok && !v.stale).length;

  // 一个都没抓到、且没有历史数据可沿用 → 不写文件，保留上一次结果
  if (freshCount === 0 && Object.keys(prev.feeds || {}).length > 0) {
    console.error('\n⚠️  本次全部失败，已保留上次数据，不覆盖 friends-rss.json');
    process.exit(1);
  }

  const payload = {
    // 记录生成时间，便于前端展示「更新于」
    updatedAt: new Date().toISOString(),
    feeds,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`\n✅ friends-rss.json 生成完成：${freshCount}/${targets.length} 个源本次更新成功`);
  console.log(`   体积 ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('❌ 抓取脚本异常:', err.message);
  process.exit(1);
});
