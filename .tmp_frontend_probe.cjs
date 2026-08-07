const { chromium } = require('C:/Users/太太乐/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  page.on('pageerror', error => errors.push(`pageerror:${error.message}`));
  const response = await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`status=${response ? response.status() : 'none'}`);
  console.log(`title=${await page.title()}`);
  console.log(`appTextLength=${(await page.locator('#app').innerText()).length}`);
  console.log(`errors=${errors.join(' | ')}`);
  await browser.close();
})();
