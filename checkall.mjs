import puppeteer from 'puppeteer-core';

const routes = [
  ['/', 'home'],
  ['/timeline', 'timeline'],
  ['/music', 'music'],
  ['/photowall', 'photowall'],
  ['/moments', 'moments'],
  ['/chatter', 'chatter'],
  ['/projects', 'projects'],
  ['/friends', 'friends'],
  ['/tree', 'tree'],
  ['/about', 'about'],
  ['/posts/first', 'post'],
];

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
});

const results = [];

for (const [route, name] of routes) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 160));
  });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 160)));

  const url = `http://localhost:4321${route}${route.includes('?') ? '&' : '?'}nosplash=1`;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 2500));
  } catch (e) {
    errors.push('GOTO: ' + e.message.slice(0, 120));
  }

  const info = await page.evaluate(() => {
    const glass = document.querySelectorAll('[class*="backdrop-blur"]').length;
    return {
      h: document.body.scrollHeight,
      glass,
      textLen: document.body.innerText.trim().length,
      visible: getComputedStyle(document.getElementById('app-mount-root') || document.body).opacity,
    };
  });

  await page.screenshot({ path: `shots/${name}.png`, fullPage: true });
  results.push({ route, ...info, errCount: errors.length, errors: [...new Set(errors)].slice(0, 3) });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
