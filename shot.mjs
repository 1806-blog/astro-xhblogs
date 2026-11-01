import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://localhost:4321/?nosplash=1';
const out = process.argv[3] ?? 'shot.png';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars'],
  defaultViewport: { width: Number(process.env.W || 1440), height: Number(process.env.H || 1000), deviceScaleFactor: 2, isMobile: !!process.env.M, hasTouch: !!process.env.M },
});

const page = await browser.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('[console] ' + msg.text().slice(0, 300));
});
page.on('pageerror', (err) => errors.push('[pageerror] ' + String(err).slice(0, 300)));

await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch((e) => errors.push('[goto] ' + e.message));
await new Promise((r) => setTimeout(r, 4000));

const info = await page.evaluate(() => ({
  title: document.title,
  hasSplash: !!document.querySelector('.z-\\[100000\\]'),
  htmlClass: document.documentElement.className,
  bodyHeight: document.body.scrollHeight,
  cards: document.querySelectorAll('[class*="backdrop-blur"]').length,
  text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 400),
}));

await page.screenshot({ path: out, fullPage: true });
await browser.close();

console.log(JSON.stringify({ ...info, errors: errors.slice(0, 10) }, null, 2));
