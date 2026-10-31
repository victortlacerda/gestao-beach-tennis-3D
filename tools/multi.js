// Uso: node tools/multi.js <arquivo-de-passos.js>
// O arquivo exporta { w, h, steps:[{ js, wait, out }] }
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const cfg = require(path.resolve(process.argv[2]));
  const url = 'file://' + path.resolve(__dirname, '..', cfg.page || 'index.html');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: cfg.w || 1500, height: cfg.h || 850 } });
  const logs = [];
  page.on('console', (m) => { if (!/deprecated/.test(m.text())) logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await page.goto(url);
  await page.waitForTimeout(1200);
  for (const s of cfg.steps) {
    if (s.js) { try { const r = await page.evaluate(s.js); if (r !== undefined) logs.push('=> ' + JSON.stringify(r)); } catch (e) { logs.push('EVALERR: ' + e.message); } }
    await page.waitForTimeout(s.wait || 800);
    if (s.out) await page.screenshot({ path: s.out });
  }
  console.log(logs.join('\n') || 'sem logs');
  await browser.close();
})();
