const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 760 } }); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + path.resolve('dist/arena-beach-tennis.html'), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.ABT_DEBUG, null, { timeout: 60000 });
  await pg.evaluate(() => { ABT.Data.loadSample(new Date()); const t = new Date(), d = ABT.addDays(t, (5 - t.getDay() + 7) % 7); d.setHours(18, 30, 0, 0); ABT.Clock.setSim(d); });
  for (const id of ['quadra2', 'lojinha', 'lanchonete', 'vestiario']) {
    const t = await pg.evaluate((id) => { const u = ABT_DEBUG.ui; u.openArea(id); return document.getElementById('areaCard').innerText; }, id);
    console.log('---', id, '\n', t.replace(/\n+/g, ' | ').slice(0, 400));
  }
  await pg.screenshot({ path: '/tmp/claude-0/card_vest.png' });
  await pg.evaluate(() => ABT_DEBUG.ui.openArea('quadra2')); await pg.waitForTimeout(1500);
  await pg.screenshot({ path: '/tmp/claude-0/card_q2.png' });
  console.log('ERROS:', errs.length ? errs.join('\n') : 'nenhum'); await b.close();
})().catch((e) => { console.error('FALHA', e); process.exit(1); });
