// Gera os prints do README em docs/screenshots/ a partir de dist/arena-beach-tennis.html.
// Uso: npm run build && npm run prints   (usa dados de exemplo e um horário simulado)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARQ = path.resolve(__dirname, '..', 'dist', 'arena-beach-tennis.html');
const OUT = path.resolve(__dirname, '..', 'docs', 'screenshots');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erros = [];
  pg.on('pageerror', (e) => erros.push(e.message));
  await pg.goto('file://' + ARQ, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.ABT_DEBUG, null, { timeout: 90000 });
  const print = async (nome, espera = 4000) => {
    await pg.waitForTimeout(espera);
    await pg.screenshot({ path: path.join(OUT, nome + '.jpg'), type: 'jpeg', quality: 85 });
    console.log('ok', nome);
  };
  const sabado = (h) => pg.evaluate((h) => { const d = ABT.Sample.proximoSabado(new Date()); d.setHours(h, h === 15 ? 30 : 0, 0, 0); ABT.Clock.setSim(d); }, h);

  await pg.evaluate(() => ABT.Data.loadSample(new Date()));
  await sabado(15); await print('01-ambiente-dia', 7000);
  await sabado(20); await print('02-ambiente-noite', 6000);
  await sabado(15); await pg.evaluate(() => ABT_DEBUG.ui.openArea('quadra2')); await print('03-detalhe-quadra');
  await pg.evaluate(() => ABT_DEBUG.ui.setMode('campeonato')); await print('04-campeonato', 6000);

  await pg.evaluate(() => ABT_DEBUG.ui.setMode('organizacao')); await pg.waitForTimeout(800);
  await pg.fill('input[name=pin]', '1234'); await pg.fill('input[name=pin2]', '1234');
  await pg.click('.gate-card button[type=submit]'); await pg.waitForSelector('.org-nav');
  await print('05-organizacao-resumo', 1500);
  for (const [tela, nome] of [['agenda', '06-agenda'], ['turmas', '07-turmas'], ['estoque', '08-estoque']]) {
    await pg.click(`.org-nav [data-go=${tela}]`); await print(nome, 1200);
  }
  await b.close();
  if (erros.length) { console.error('Erros na página:\n' + erros.join('\n')); process.exit(1); }
})().catch((e) => { console.error('FALHA', e); process.exit(1); });
