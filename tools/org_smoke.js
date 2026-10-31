const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = [];
  pg.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await pg.goto('file://' + path.resolve('dist/arena-beach-tennis.html'), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.ABT_DEBUG, null, { timeout: 60000 });
  const ev = (f) => pg.evaluate(f);
  const out = process.argv[2] || '/tmp/claude-0/org';
  // dados de exemplo, relógio sexta 18:30
  await ev(() => { ABT.Data.loadSample(new Date()); const t = new Date(), d = ABT.addDays(t, (5 - t.getDay() + 7) % 7); d.setHours(18, 30, 0, 0); ABT.Clock.setSim(d); });
  await ev(() => ABT_DEBUG.ui.setMode('organizacao'));
  await pg.waitForTimeout(800);
  const txt = (sel) => pg.evaluate((s) => (document.querySelector(s) || {}).innerText || '', sel);
  const log = (...a) => console.log(...a);
  log('gate:', (await txt('.gate-card h2')), '|', (await txt('.gate-card p')).slice(0, 40));
  // criar PIN
  await pg.fill('input[name=pin]', '1234'); await pg.fill('input[name=pin2]', '1234'); await pg.click('.gate-card button[type=submit]');
  await pg.waitForSelector('.org-nav');
  log('resumo ok:', (await txt('.org-head h1')));
  // percorre todas as telas
  for (const v of ['agenda', 'turmas', 'dayuse', 'precos', 'pessoas', 'lojinha', 'lanchonete', 'estoque', 'vestiario', 'campeonato', 'avisos', 'config', 'resumo']) {
    await pg.click(`.org-nav [data-go=${v}]`); await pg.waitForTimeout(150);
    const t = await txt('.org-main');
    log(v.padEnd(11), t.includes('Não consegui montar') ? 'ERRO: ' + t.slice(0, 200) : 'ok (' + t.length + ' chars)');
  }
  // preços
  await pg.click('.org-nav [data-go=precos]');
  await pg.fill('input[name="p|noite|util|1"]', '90'); await pg.fill('input[name="p|noite|fimsemana|1"]', '110'); await pg.click('form[data-form=precos] button[type=submit]');
  log('precos:', (await txt('.org-flash')));
  // agenda: marcar aluguel
  await pg.evaluate(() => { const t = new Date(); window.__d = ABT.dk(ABT.addDays(t, 3)); });
  await pg.click('.org-nav [data-go=agenda]');
  await pg.click('[data-act=agNovo]');
  await pg.fill('.pick-in', 'Bia'); await pg.click('[data-act=pickAdd]');
  await pg.fill('.pick-in', 'Pessoa Nova'); await pg.press('.pick-in', 'Enter');
  log('picker:', (await txt('#orgFlash')), '|', await pg.evaluate(() => document.querySelectorAll('.pchip').length));
  log('form', await pg.evaluate(() => JSON.stringify([...new FormData(document.querySelector('form[data-form=horario]')).entries()].filter(([k]) => k !== 'pessoas'))));
  await pg.screenshot({ path: out + '_agenda.png' });
  await pg.click('form[data-form=horario] button[type=submit]');
  log('salvar horario:', (await txt('#orgFlash')).replace(/\n/g, ' '));
  // conflito
  await pg.click('[data-act=agNovo]');
  await pg.selectOption('form[data-form=horario] select[name=inicio]', '18:00');
  await pg.click('form[data-form=horario] button[type=submit]');
  log('conflito:', (await txt('#orgFlash')).replace(/\n/g, ' ').slice(0, 160));
  await pg.click('[data-act=agFechar]');
  // day use
  await pg.click('.org-nav [data-go=dayuse]'); await pg.waitForTimeout(200);
  log('dayuse:', (await txt('.org-sub')).slice(0, 120));
  await pg.fill('form[data-form=chegou] .pick-in', 'Nando'); await pg.click('form[data-form=chegou] [data-act=pickAdd]');
  await pg.click('form[data-form=chegou] button[type=submit]');
  log('chegou:', (await txt('#orgFlash')).replace(/\n/g, ' '));
  await pg.screenshot({ path: out + '_dayuse.png' });
  await pg.click('form[data-form=fimPartida] button[type=submit]');
  log('fim partida:', (await txt('#orgFlash')).replace(/\n/g, ' '));
  // placar na agenda Q1 (aluguel agora)
  await pg.click('.org-nav [data-go=agenda]');
  await pg.click('[data-act=placar][data-l=a][data-d="1"]'); await pg.click('[data-act=placar][data-l=a][data-d="1"]'); await pg.click('[data-act=placar][data-l=b][data-d="1"]');
  log('placar:', (await ev(() => ABT_DEBUG.sim.info.courts[0].line2)), '|', await txt('.placar'));
  // lojinha: venda
  await pg.click('.org-nav [data-go=lojinha]');
  await pg.click('[data-act=cartAdd]'); await pg.click('[data-act=cartAdd]');
  await pg.click('form[data-form=cartFechar] button[type=submit]');
  log('venda:', (await txt('#orgFlash')).replace(/\n/g, ' '));
  // boneco
  await pg.click('.org-nav [data-go=pessoas]');
  await pg.click('[data-act=pBoneco]'); await pg.waitForTimeout(800);
  await pg.click('[data-act=bonOpt][data-k=shirt][data-i="1"]');
  await pg.screenshot({ path: out + '_boneco.png' });
  await pg.click('[data-act=bonSalvar]');
  log('boneco:', (await txt('#orgFlash')).replace(/\n/g, ' '));
  // campeonato novo
  await pg.click('.org-nav [data-go=campeonato]'); await pg.waitForTimeout(3000);
  await pg.click('[data-act=campNovo]');
  const nomes = ['Ana','Bruno','Carla','Diego','Elisa','Fábio'];
  for (let i = 0; i < 6; i++) { const row = (await pg.$$('.dupla-row'))[Math.floor(i / 2)]; const ins = await row.$$('.pick-in'); const k = i % 2; await ins[k].fill(nomes[i]); await (await row.$$('[data-act=pickAdd]'))[k].click(); }
  await pg.fill('input[name=nome]', 'Torneio Teste');
  await pg.click('form[data-form=campCriar] button[type=submit]');
  log('camp:', (await txt('#orgFlash')).replace(/\n/g, ' ').slice(0, 200));
  await pg.screenshot({ path: out + '_camp.png' });
  // lançar placar de um jogo
  await pg.click('[data-act=jogoPlacar]:not([disabled])');
  await pg.fill('input[name=a0]', '6'); await pg.fill('input[name=b0]', '3'); await pg.fill('input[name=a1]', '6'); await pg.fill('input[name=b1]', '4');
  await pg.check('input[name=encerrado]'); await pg.click('form[data-form=jogoPlacar] button[type=submit]');
  log('placar jogo:', (await txt('#orgFlash')).replace(/\n/g, ' '));
  // travar e entrar com PIN errado/certo
  await pg.click('[data-act=lock]'); await pg.fill('input[name=pin]', '0000'); await pg.press('input[name=pin]', 'Enter');
  log('pin errado:', (await txt('#orgFlash')));
  await pg.fill('input[name=pin]', '1234'); await pg.press('input[name=pin]', 'Enter'); await pg.waitForSelector('.org-nav');
  // clique em área 3D simulado
  await ev(() => ABT_DEBUG.ui.selectArea(ABT_DEBUG.world.areas.find((a) => a.id === 'quadra3')));
  log('quadra3 ->', (await txt('.org-head h1')), '|', (await txt('.tabs .on')));
  await ev(() => ABT_DEBUG.ui.selectArea(ABT_DEBUG.world.areas.find((a) => a.id === 'estoque')));
  log('estoque ->', (await txt('.org-head h1')));
  await pg.screenshot({ path: out + '_estoque.png' });
  log('ERROS:', errs.length ? errs.join('\n') : 'nenhum');
  await b.close();
})().catch((e) => { console.error('FALHA', e); process.exit(1); });
