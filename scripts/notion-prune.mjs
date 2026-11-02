#!/usr/bin/env node
/**
 * 清理「Notion 里已删除、但本地 md 还在」的孤儿文件。
 *
 * 背景：Elog 的 sync 只做「新增 / 更新」，从来不删本地文件。
 * 在 Notion 删掉一篇之后，src/posts 里那份 md 会一直留着，站上也就一直在。
 *
 * 做法：查 Notion 数据库当前所有 page id（以及各自的 urlname 属性值），
 * 扫 md 的 frontmatter urlname，两者都不匹配的就删掉。
 *
 * 安全边界：没有 urlname 的 md（比如手写的文章）一律不碰。
 *
 * 用法：
 *   node scripts/notion-prune.mjs --dry-run   # 只看会删哪些
 *   node scripts/notion-prune.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIRS = ['src/posts', 'src/chatters'];
const DRY = process.argv.includes('--dry-run');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const TOKEN = process.env.NOTION_TOKEN;
const DB = process.env.NOTION_DATABASE_ID;

async function notion(pathname, body) {
  for (let i = 1; i <= 5; i++) {
    try {
      const res = await fetch(`https://api.notion.com/v1/${pathname}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      return await res.json();
    } catch (e) {
      if (i === 5) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function collectLiveKeys() {
  const keys = new Set();
  let cursor;
  for (let page = 0; page < 10; page++) {
    const json = await notion(`databases/${DB}/query`, {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const row of json.results || []) {
      keys.add(String(row.id).toLowerCase());
      // 兼容以后加 urlname 列（自定义英文 slug）的情况
      const urlnameProp = row.properties?.urlname;
      if (urlnameProp) {
        const v =
          urlnameProp.rich_text?.map((t) => t.plain_text).join('') ||
          urlnameProp.title?.map((t) => t.plain_text).join('') ||
          urlnameProp.url ||
          '';
        if (v) keys.add(String(v).trim().toLowerCase());
      }
    }
    if (!json.has_more) break;
    cursor = json.next_cursor;
  }
  return keys;
}

const live = await collectLiveKeys();
console.log(`Notion 现有 ${live.size} 个标识（page id + urlname）`);

let removed = 0;
let kept = 0;
let skipped = 0;

for (const dir of DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;

  for (const file of fs.readdirSync(abs).filter((f) => f.endsWith('.md'))) {
    const full = path.join(abs, file);
    const text = fs.readFileSync(full, 'utf8');
    const match = text.match(/^urlname:\s*['"]?([^'"\n]+)['"]?\s*$/m);

    if (!match) {
      skipped++; // 手写的，不是 Notion 来的，永远不动
      continue;
    }

    const key = match[1].trim().toLowerCase();
    if (live.has(key)) {
      kept++;
    } else {
      if (DRY) console.log(`  [dry-run] 会删除 ${dir}/${file}`);
      else {
        fs.unlinkSync(full);
        console.log(`  - 删除 ${dir}/${file}（Notion 里已不存在）`);
      }
      removed++;
    }
  }
}

console.log(
  `完成：保留 ${kept} 篇，删除 ${removed} 篇，跳过手写 ${skipped} 篇${DRY ? '（dry-run，未落盘）' : ''}`
);
