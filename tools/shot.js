// Uso: node tools/shot.js <url> <saida.png> [hora] [js-extra] [largura] [altura] [esperaMs]
const { chromium } = require('playwright');
(async () => {
  const [url, out, hour, extra, w, h, wait] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +(w || 1280), height: +(h || 720) } });
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await page.goto(url);
  await page.waitForTimeout(1500);
  if (hour && hour !== '-') await page.evaluate((hh) => ABT_DEBUG.env.setHour(+hh), hour);
  if (extra && extra !== '-') await page.evaluate(extra);
  await page.waitForTimeout(+(wait || 2500));
  await page.screenshot({ path: out });
  console.log(logs.join('\n') || 'sem logs');
  await browser.close();
})();
