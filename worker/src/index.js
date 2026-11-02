/**
 * blog-sync-trigger
 *
 * 唯一职责：在 Cloudflare 的准点 cron 上，调 GitHub 的 workflow_dispatch，
 * 把同步工作流「按」下去。同步逻辑本身仍然跑在 GitHub Actions 里。
 *
 * 为什么不在这里直接同步：同步脚本用 Node 的 fs 读写 Markdown、还要下载附件，
 * Worker 里没有文件系统，重写一遍等于把已经验证过的逻辑推翻重来，没必要。
 *
 * 需要的密钥（wrangler secret put）：
 *   GITHUB_TOKEN  细粒度 PAT，只给 1806-blog/astro-xhblogs 的 Actions: Read and write
 *   MANUAL_KEY    可选，用于手动触发（浏览器访问 ?run=all&key=xxx 时校验）
 */

const API = 'https://api.github.com';

const WORKFLOWS = {
  memos: 'sync-memos.yml',
  notion: 'sync-notion.yml',
};

function ghHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    // GitHub API 强制要求 UA，Workers 的 fetch 默认不带，不写会 403
    'User-Agent': 'blog-sync-trigger',
    'Content-Type': 'application/json',
  };
}

async function dispatch(env, name) {
  const workflow = WORKFLOWS[name];
  if (!workflow) return { name, ok: false, error: 'unknown workflow' };

  const url = `${API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/${workflow}/dispatches`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: ghHeaders(env),
      body: JSON.stringify({ ref: env.GITHUB_REF || 'main' }),
      signal: AbortSignal.timeout(15000),
    });

    // 成功是 204 No Content
    if (res.status === 204) {
      console.log(`[dispatch] ${workflow} ok`);
      return { name, ok: true, status: 204 };
    }

    const body = (await res.text()).slice(0, 300);
    console.error(`[dispatch] ${workflow} failed ${res.status} ${body}`);
    return { name, ok: false, status: res.status, body };
  } catch (e) {
    console.error(`[dispatch] ${workflow} error ${e.message}`);
    return { name, ok: false, error: e.message };
  }
}

/**
 * memos 每 5 分钟一次，notion 每 10 分钟一次（在能被 10 整除的那一分钟一起发）。
 * 两个工作流都是幂等的：没有变化就写 0 篇、不提交、不触发 Vercel 重建。
 */
export default {
  async scheduled(controller, env, ctx) {
    const now = new Date(controller.scheduledTime ?? Date.now());
    const minute = now.getUTCMinutes();

    const jobs = [dispatch(env, 'memos')];
    if (minute % 10 === 0) jobs.push(dispatch(env, 'notion'));

    ctx.waitUntil(
      Promise.all(jobs).then((results) => {
        const failed = results.filter((r) => !r.ok);
        console.log(
          `[cron] ${now.toISOString()} 触发 ${results.length} 个，失败 ${failed.length} 个`
        );
      })
    );
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const run = url.searchParams.get('run');
    const key = url.searchParams.get('key');

    if (run) {
      if (env.MANUAL_KEY && key !== env.MANUAL_KEY) {
        return Response.json({ error: 'forbidden' }, { status: 403 });
      }
      const names = run === 'all' ? ['memos', 'notion'] : [run];
      const results = await Promise.all(names.map((n) => dispatch(env, n)));
      return Response.json({ results });
    }

    return Response.json({
      service: 'blog-sync-trigger',
      repo: `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
      workflows: WORKFLOWS,
      usage: '?run=memos | ?run=notion | ?run=all  （需要 MANUAL_KEY 时追加 &key=...）',
      hasToken: Boolean(env.GITHUB_TOKEN),
    });
  },
};
