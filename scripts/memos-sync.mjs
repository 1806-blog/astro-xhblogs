#!/usr/bin/env node
/**
 * Memos → Markdown 同步
 *
 * Memos 里发一条（手机上随时发）→ 这个脚本把内容拉成 src/moments/*.md，
 * 附件图片上传到 Nightcord Storage（SEKAI v2 直传），md 里只存最终外链。
 *
 * 用法：
 *   node scripts/memos-sync.mjs            # 正式同步
 *   node scripts/memos-sync.mjs --dry-run  # 只打印，不写文件、不上传
 *   node scripts/memos-sync.mjs --selftest # 只测图床上传通路（不需要 Memos）
 *
 * 环境变量：
 *   MEMOS_BASE_URL   Memos 实例地址，如 https://memos.xxx.workers.dev
 *   MEMOS_TOKEN      在 Memos 设置里生成的 Access Token
 *   STORAGE_API      图床 API（默认 https://storage.nightcord.de5.net）
 *   STORAGE_PUBLIC   图床公网域名（默认 https://r2.nightcord.de5.net）
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const MOMENTS_DIR = path.join(ROOT, 'src', 'moments');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SELFTEST = args.includes('--selftest');
const VERBOSE = args.includes('--verbose');

/* --------------------------------- 环境 ---------------------------------- */

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const v = m[2].replace(/^["']|["']$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv();

const MEMOS_BASE = (process.env.MEMOS_BASE_URL || '').replace(/\/+$/, '');
const MEMOS_TOKEN = process.env.MEMOS_TOKEN || '';
const STORAGE_API = (process.env.STORAGE_API || 'https://storage.nightcord.de5.net').replace(/\/+$/, '');
const STORAGE_PUBLIC = (process.env.STORAGE_PUBLIC || 'https://r2.nightcord.de5.net').replace(/\/+$/, '');

/* --------------------------------- 工具 ---------------------------------- */

// 这台机器 / 这个网络到 nightcord 的链路不稳，所有请求带重试
async function request(url, options = {}, times = 4) {
  let lastErr;
  for (let i = 1; i <= times; i++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(options.timeout || 30000) });
      return res;
    } catch (e) {
      lastErr = e;
      if (VERBOSE) console.log(`    重试 ${i}/${times}: ${e.cause?.code || e.message}`);
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
  throw lastErr;
}

function extOf(name, mime) {
  const fromName = (name || '').match(/\.([a-z0-9]{2,5})$/i);
  if (fromName) return fromName[1].toLowerCase();
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
  return map[mime] || 'bin';
}

/* ------------------------------- 图床上传 -------------------------------- */

/**
 * SEKAI v2 直传（已实测）：
 *   init → 拿到 upload.url + fields + complete_token
 *   把 fields 逐个塞进 FormData，文件最后放
 *   POST 到 upload.url（成功返回 204）
 *   complete 换回 /images/<uuid>
 *   最终公网地址 = STORAGE_PUBLIC + /images/<uuid>
 */
async function uploadToStorage(buffer, mime, filename) {
  const initRes = await request(`${STORAGE_API}/v2/upload/init`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: filename, type: mime, size: buffer.length, kind: 'image' }),
  });
  if (!initRes.ok) throw new Error(`init HTTP ${initRes.status}`);
  const init = await initRes.json();
  if (!init?.upload?.url) throw new Error('init 未返回 upload.url');

  const form = new FormData();
  for (const [k, v] of Object.entries(init.upload.fields || {})) form.append(k, v);
  form.append('file', new Blob([buffer], { type: mime }), filename);

  const upRes = await request(init.upload.url, {
    method: init.upload.method || 'POST',
    body: form,
    timeout: 120000,
  });
  // OSS 成功了就给 204（success_action_status 是这么设的）
  if (!upRes.ok && upRes.status !== 204) throw new Error(`直传 HTTP ${upRes.status}`);

  const doneRes = await request(`${STORAGE_API}/v2/upload/complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: init.complete_token }),
  });
  if (!doneRes.ok) throw new Error(`complete HTTP ${doneRes.status}`);
  const done = await doneRes.json();
  if (!done?.url) throw new Error('complete 未返回 url');

  return STORAGE_PUBLIC + done.url;
}

/* ------------------------------- Memos 拉取 ------------------------------ */

function normalizeMemos(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.memos || payload?.data || [];
}

async function listMemos() {
  const memos = [];
  let pageToken = '';
  for (let page = 0; page < 20; page++) {
    // 不同版本的路径不一样，v1 优先，失败退回 /api/memos
    const url =
      `${MEMOS_BASE}/api/v1/memos?pageSize=100` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    let res = await request(url, { headers: { Authorization: `Bearer ${MEMOS_TOKEN}` } });
    if (res.status === 404) {
      const legacy =
        `${MEMOS_BASE}/api/memos?pageSize=100` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
      res = await request(legacy, { headers: { Authorization: `Bearer ${MEMOS_TOKEN}` } });
    }
    if (!res.ok) throw new Error(`拉取 memos HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);

    const json = await res.json();
    const list = normalizeMemos(json);
    memos.push(...list);
    pageToken = json?.nextPageToken || json?.next_page_token || '';
    if (!pageToken || list.length === 0) break;
  }
  return memos;
}

/* -------------------------------- 转 md ---------------------------------- */

const safe = (s) => String(s || '').replace(/"/g, '\\"');

function toMarkdown(memo, images) {
  const uid = (memo.name || memo.id || '').split('/').pop();
  const date = memo.createTime || memo.create_time || new Date().toISOString();
  const updated = memo.updateTime || memo.update_time || date;
  const location = memo.location?.placeholder || '';

  const fm = [
    '---',
    `id: "mm-${uid}"`,
    `date: "${date}"`,
    `updated: "${updated}"`,
  ];
  if (location) fm.push(`location: "${safe(location)}"`);
  if (images.length) {
    fm.push('images:');
    images.forEach((u) => fm.push(`  - '${u}'`));
  }
  fm.push('---', '');

  // Memos 的 content 本身就是 Markdown；如果图片以 Markdown 形式内嵌在正文里，
  // 替换成我们上传后的地址，避免正文里再出现一遍原图链接。
  let body = String(memo.content || '').trim();
  if (memo.__imageMap) {
    for (const [from, to] of Object.entries(memo.__imageMap)) {
      body = body.split(from).join(to);
    }
  }

  return fm.join('\n') + body + '\n';
}

function readExisting(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    const id = text.match(/^id:\s*"?([^"\n]+)"?/m)?.[1];
    const updated = text.match(/^updated:\s*"?([^"\n]+)"?/m)?.[1];
    return { id, updated, text };
  } catch {
    return null;
  }
}

/* -------------------------------- 主流程 --------------------------------- */

async function selfTest() {
  console.log('【自检】只测图床上传通路\n');
  const buf = fs.readFileSync(path.join(ROOT, 'public', 'images', 'briefing-default.svg'));
  const url = await uploadToStorage(buf, 'image/svg+xml', 'memos-selftest.svg');
  console.log('上传成功 →', url);
  const head = await request(url, { method: 'HEAD' });
  console.log('公网可访问 →', head.status, head.headers.get('content-type'));
}

async function main() {
  if (SELFTEST) return selfTest();

  if (!MEMOS_BASE || !MEMOS_TOKEN) {
    console.error(
      [
        '缺少环境变量，请在 .env 或 GitHub Secrets 里配置：',
        '',
        '  MEMOS_BASE_URL=https://你的memos实例',
        '  MEMOS_TOKEN=在 Memos 设置里生成的 Access Token',
        '',
        '图床默认走 https://storage.nightcord.de5.net（可用 STORAGE_API / STORAGE_PUBLIC 覆盖）',
      ].join('\n')
    );
    process.exitCode = 1;
    return;
  }

  console.log(`→ 拉取 Memos：${MEMOS_BASE}`);
  const raw = await listMemos();
  console.log(`→ 共 ${raw.length} 条`);

  // 只处理公开可见、非评论、正常状态
  const memos = raw.filter((m) => {
    const vis = String(m.visibility || '').toUpperCase();
    if (vis && vis !== 'PUBLIC' && vis !== 'VISIBILITY_UNSPECIFIED') return false;
    if (m.parent) return false; // 评论
    const state = String(m.state || '').toUpperCase();
    if (state && state !== 'NORMAL' && state !== 'STATE_UNSPECIFIED') return false;
    return true;
  });
  console.log(`→ 可发布 ${memos.length} 条`);

  fs.mkdirSync(MOMENTS_DIR, { recursive: true });
  const remoteIds = new Set();
  let written = 0;
  let skipped = 0;
  let uploaded = 0;

  for (const memo of memos) {
    const uid = (memo.name || memo.id || '').split('/').pop();
    if (!uid) continue;
    remoteIds.add(`mm-${uid}`);

    const target = path.join(MOMENTS_DIR, `mm-${uid}.md`);
    const existing = readExisting(target);
    const remoteUpdated = memo.updateTime || memo.update_time || memo.createTime;

    if (existing && existing.updated && existing.updated === remoteUpdated) {
      skipped++;
      continue;
    }

    // 附件：优先 attachments，老版本叫 resources
    const atts = memo.attachments || memo.resources || [];
    const images = [];
    const imageMap = {};

    for (const att of atts) {
      const attName = att.filename || (att.name || '').split('/').pop() || 'image';
      const mime = att.type || 'image/jpeg';
      const source = att.externalLink || att.external_link;
      const attUrl = source || `${MEMOS_BASE}/file/${att.name || att.uid}`;

      if (DRY_RUN) {
        images.push(`<dry-run:${attName}>`);
        continue;
      }

      try {
        const dl = await request(attUrl, { headers: { Authorization: `Bearer ${MEMOS_TOKEN}` }, timeout: 60000 });
        if (!dl.ok) throw new Error(`HTTP ${dl.status}`);
        const buf = Buffer.from(await dl.arrayBuffer());
        if (buf.length === 0) throw new Error('空文件');

        // 文件名加哈希，避免重名互相覆盖
        const hash = crypto.createHash('sha1').update(String(uid) + attName).digest('hex').slice(0, 8);
        const filename = `${hash}.${extOf(attName, mime)}`;

        const pub = await uploadToStorage(buf, mime, filename);
        images.push(pub);
        uploaded++;
        if (source) imageMap[source] = pub;
        if (VERBOSE) console.log(`    ↑ ${attName} → ${pub}`);
      } catch (e) {
        console.warn(`  ! ${uid}: 图片 ${attName} 处理失败，跳过（${e.message}）`);
      }
    }

    memo.__imageMap = imageMap;
    const content = toMarkdown(memo, images);

    if (DRY_RUN) {
      console.log(`\n===== ${path.basename(target)} =====\n${content.slice(0, 600)}${content.length > 600 ? '\n…' : ''}`);
    } else {
      fs.writeFileSync(target, content, 'utf8');
      console.log(`  + mm-${uid}.md${images.length ? ` (${images.length} 图)` : ''}`);
    }
    written++;
  }

  // 删除同步：只清理本脚本生成的文件（id 以 mm- 开头）
  let removed = 0;
  if (!DRY_RUN) {
    for (const file of fs.readdirSync(MOMENTS_DIR).filter((f) => f.endsWith('.md'))) {
      const info = readExisting(path.join(MOMENTS_DIR, file));
      if (info?.id?.startsWith('mm-') && !remoteIds.has(info.id)) {
        fs.unlinkSync(path.join(MOMENTS_DIR, file));
        console.log(`  - ${file}（Memos 里已删除）`);
        removed++;
      }
    }
  }

  console.log(
    `\n完成：写入 ${written} 篇，无变化 ${skipped} 篇，上传图片 ${uploaded} 张，删除 ${removed} 篇${DRY_RUN ? '（dry-run，未落盘）' : ''}`
  );
}

main().catch((e) => {
  console.error('同步失败：', e.message || e);
  process.exitCode = 1;
});
