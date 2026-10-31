// teste de sincronia entre duas janelas, exportar/importar e mudança de dados ao vivo
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 900, height: 560 }, acceptDownloads: true });
  const logs = [];
  const tv = await ctx.newPage(), dono = await ctx.newPage();
  [tv, dono].forEach((p, i) => { p.on('pageerror', (e) => logs.push('ERR' + i + ' ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') logs.push('console.error' + i + ' ' + m.text()); }); });
  await tv.goto(url + '#campeonato', { waitUntil: 'domcontentloaded' }); await dono.goto(url + '#ambiente', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await tv.waitForTimeout(4000); await dono.waitForTimeout(4000);
  logs.push('modo tv=' + await tv.evaluate(() => ABT_DEBUG.ui.mode) + ' dono=' + await dono.evaluate(() => ABT_DEBUG.ui.mode));
  // dono carrega exemplo e simula sábado 15:30; a janela da TV deve atualizar sozinha
  await dono.evaluate(() => { const d = ABT.Sample.proximoSabado(new Date()); d.setHours(15, 30, 0, 0); ABT.Data.loadSample(new Date()); ABT.Clock.setSim(d); });
  await tv.waitForTimeout(3500);
  logs.push('TV recebeu dados: pessoas=' + await tv.evaluate(() => ABT.Data.get().pessoas.length) + ' relogioSim=' + await tv.evaluate(() => ABT.Clock.isSim()));
  logs.push('TV painel tem Copa: ' + await tv.evaluate(() => document.getElementById('campPanel').textContent.includes('Copa da Arena')));
  logs.push('TV quadra1 tipo: ' + await tv.evaluate(() => ABT_DEBUG.sim.info.courts[0].type));
  // edita um placar no dono e vê na TV (sem reconstruir a cena)
  await dono.evaluate(() => ABT.Data.update((s) => { const j = s.campeonatos[0].jogos.find((x) => x.fase === 'grupo' && x.rodada === 2); j.sets = [[6, 4], [6, 5]]; }));
  await tv.waitForTimeout(7000); logs.push('dados TV rodada2 sets=' + JSON.stringify(await tv.evaluate(() => ABT.Data.get().campeonatos[0].jogos.find((x) => x.fase === 'grupo' && x.rodada === 2).sets)));
  logs.push('Placar na TV mudou: ' + await tv.evaluate(() => document.getElementById('campPanel').textContent.includes('6–5')));
  logs.push('Banner/side na TV: ' + await tv.evaluate(() => ABT_DEBUG.sim.info.courts[0].line2));
  await tv.screenshot({ path: '/tmp/claude-0/sync_tv.png' });
  // exportar
  await dono.evaluate(() => document.getElementById('demoToggle').click());
  const [dl] = await Promise.all([dono.waitForEvent('download'), dono.evaluate(() => document.getElementById('btnExport').click())]);
  const fp = '/tmp/claude-0/backup_teste.json'; await dl.saveAs(fp);
  logs.push('arquivo exportado: ' + dl.suggestedFilename());
  const fs = require('fs'); const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  logs.push('json: app=' + j.app + ' versao=' + j.versao + ' pessoas=' + j.pessoas.length + ' ultimoBackup=' + !!j.ultimoBackup);
  // apagar (2 cliques) e importar
  await dono.evaluate(() => document.getElementById('btnClear').click()); await dono.evaluate(() => document.getElementById('btnClear').click());
  await dono.waitForTimeout(500);
  logs.push('após apagar vazio=' + await dono.evaluate(() => ABT.Data.isEmpty()) + ' | TV vazio=' + await tv.evaluate(() => ABT.Data.isEmpty()));
  await dono.setInputFiles('#fileImport', fp); await dono.waitForTimeout(800);
  logs.push('após importar pessoas=' + await dono.evaluate(() => ABT.Data.get().pessoas.length) + ' | msg: ' + await dono.evaluate(() => document.getElementById('dataMsg').textContent));
  fs.writeFileSync('/tmp/claude-0/ruim.json', '{"app":"outro"}');
  await dono.setInputFiles('#fileImport', '/tmp/claude-0/ruim.json'); await dono.waitForTimeout(500);
  logs.push('arquivo ruim: ' + await dono.evaluate(() => document.getElementById('dataMsg').textContent) + ' | dados mantidos=' + await dono.evaluate(() => ABT.Data.get().pessoas.length));
  await dono.screenshot({ path: '/tmp/claude-0/sync_dono.png' });
  console.log(logs.join('\n'));
  await b.close();
})();
