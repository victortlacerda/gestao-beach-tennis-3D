const sab = `(function(){var d=ABT.Sample.proximoSabado(new Date());d.setHours(15,30,0,0);ABT.Data.loadSample(new Date());ABT.Clock.setSim(d);return ABT.dk(d)})()`;
const sex = `(function(){var t=new Date(),d=ABT.addDays(t,(5-t.getDay()+7)%7);d.setHours(18,30,0,0);ABT.Clock.setSim(d);return ABT.dk(d)})()`;
module.exports = { w: 1500, h: 850, steps: [
  { js: `typeof ABT_DEBUG + ' vazio=' + ABT.Data.isEmpty()`, wait: 3000, out: '/tmp/claude-0/p2_vazio.png' },
  { js: sex.replace('ABT.Clock.setSim', 'ABT.Data.loadSample(new Date());ABT.Clock.setSim'), wait: 5000, out: '/tmp/claude-0/p2_sex.png' },
  { js: sab, wait: 5000, out: '/tmp/claude-0/p2_sab.png' },
  { js: `ABT_DEBUG.ui.setMode('campeonato')`, wait: 5000, out: '/tmp/claude-0/p2_camp.png' },
] };
