const sab = `(function(){var d=ABT.Sample.proximoSabado(new Date());d.setHours(15,30,0,0);ABT.Data.loadSample(new Date());ABT.Clock.setSim(d);document.getElementById('demoToggle').click();return 'ok'})()`;
module.exports = { page: 'dist/arena-beach-tennis.html', w: 1500, h: 850, steps: [
  { js: sab + `;ABT_DEBUG.ui.setMode('campeonato')`, wait: 6000, out: '/tmp/claude-0/fin_camp.png' },
  { js: `ABT_DEBUG.ui.setMode('ambiente'); ABT.Clock.setReal(); ABT_DEBUG.ui.dirty = true; 'real'`, wait: 4000, out: '/tmp/claude-0/fin_amb.png' },
] };
