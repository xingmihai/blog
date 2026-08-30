-- Cloudflare D1 建表语句
-- 用法（把 blog-stats 换成你的数据库名）：
--   npx wrangler d1 create blog-stats
--   npx wrangler d1 execute blog-stats --file=schema.sql
-- 然后把返回的 database_id 填进 wrangler.toml

CREATE TABLE IF NOT EXISTS pageviews (
  page       TEXT PRIMARY KEY,
  views      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS daily_stats (
  date       TEXT PRIMARY KEY,
  views      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);

-- 说明：
-- pageviews.page = 'global' 是整站累计访问量，其余为每个页面/文章的独立计数。
-- daily_stats.date 由 stats.js 以 Asia/Shanghai（UTC+8）口径写入，
-- 因此直接按日期字符串比较即可，无需在 SQL 里再做时区换算。
