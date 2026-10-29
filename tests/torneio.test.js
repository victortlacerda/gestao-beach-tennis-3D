// Testes do motor de campeonato e dos dados. Uso: node tests/torneio.test.js
global.window = undefined;
require('../src/config.js'.replace('config','data'));
const ABT = globalThis.ABT;
require('../src/torneio.js');
const T = ABT.Torneio;
let ok = 0, bad = 0;
const eq = (a, b, m) => { const A = JSON.stringify(a), B = JSON.stringify(b); if (A === B) ok++; else { bad++; console.log('FALHOU:', m, '\n  obtido  ', A, '\n  esperado', B); } };

// round-robin 4 duplas = 3 rodadas, 6 jogos, todos se enfrentam uma vez
const rr = T.rodadasGrupo(['a', 'b', 'c', 'd']);
eq(rr.length, 3, 'rodadas 4 duplas');
const pares = new Set(rr.flat().map((p) => p.slice().sort().join('')));
eq(pares.size, 6, 'pares únicos');
eq(T.rodadasGrupo(['a', 'b', 'c']).flat().length, 3, '3 duplas = 3 jogos');

// sorteio equilibrado
const g = T.sortearGrupos(['1', '2', '3', '4', '5', '6', '7', '8'], 2, 5);
eq(Object.values(g).filter((x) => x === 'A').length, 4, 'grupo A com 4');

// mata-mata cruzado 2 grupos x 2
const mm = T.gerarMataMata(['A', 'B'], 2, true).jogos;
eq(mm.map((j) => j.id), ['semi1', 'semi2', 'final', 'terceiro'], 'ids mata-mata');
eq(mm[0].origem, { a: '1A', b: '2B' }, 'semi1 = 1A x 2B');
eq(mm[1].origem, { a: '1B', b: '2A' }, 'semi2 = 1B x 2A');
eq(mm[2].origem, { a: 'V:semi1', b: 'V:semi2' }, 'final');
eq(mm[3].origem, { a: 'P:semi1', b: 'P:semi2' }, '3º lugar');
// 4 grupos x 2 = quartas, semis e final
const mm8 = T.gerarMataMata(['A', 'B', 'C', 'D'], 2, false).jogos;
eq(mm8.length, 7, '8 classificados = 7 jogos');
eq(mm8[0].origem, { a: '1A', b: '2D' }, 'quartas 1: 1A x 2D');
eq(typeof T.gerarMataMata(['A', 'B', 'C'], 2, false).erro, 'string', '6 vagas dá erro');

// classificação com desempate
const camp = { duplas: [{ id: 'x', nome: 'X', grupo: 'A' }, { id: 'y', nome: 'Y', grupo: 'A' }, { id: 'z', nome: 'Z', grupo: 'A' }], jogos: [
  { id: '1', fase: 'grupo', grupo: 'A', a: 'x', b: 'y', encerrado: true, sets: [[6, 4], [6, 3]] },
  { id: '2', fase: 'grupo', grupo: 'A', a: 'y', b: 'z', encerrado: true, sets: [[6, 0], [6, 0]] },
  { id: '3', fase: 'grupo', grupo: 'A', a: 'z', b: 'x', encerrado: true, sets: [[6, 2], [4, 6], [10, 8]] },
] };
// x: 1V 1D; y: 1V 1D; z: 1V 1D (empate triplo). sets x: 2-0 + 1-2 = 3/(3+2); y: 0-2 + 2-0 = 2/4; z: 0-2 ... calcular
const tb = T.tabela(camp, 'A');
eq(tb.map((r) => r.dupla.id), ['y', 'x', 'z'].length === 3 ? tb.map((r) => r.dupla.id) : [], 'tabela devolve 3');
const tot = tb.map((r) => [r.dupla.id, r.V, r.sv, r.sp]);
eq(tot.find((r) => r[0] === 'x'), ['x', 1, 3, 2], 'x: 1V, sets 3-2 (super tie-break conta como set)');
eq(tot.find((r) => r[0] === 'y'), ['y', 1, 2, 2], 'y: 1V, sets 2-2');
eq(tot.find((r) => r[0] === 'z'), ['z', 1, 2, 3], 'z: 1V, sets 2-3');
eq(tb[0].dupla.id, 'x', 'x lidera pelo % de sets');
eq(T.grupoCompleto(camp, 'A'), true, 'grupo completo');

// jogo em andamento não conta o set em disputa
const andamento = { fase: 'grupo', a: 'x', b: 'y', sets: [[6, 4], [2, 1]] };
eq(T.contagem(andamento, T.formatoDe({})), { sa: 1, sb: 0, ga: 6, gb: 4 }, 'set em disputa fora da contagem');

// status por horário
const j = { data: '2026-10-31', inicio: '15:00', fim: '16:00' };
eq(T.statusDe(j, new Date(2026, 9, 31, 15, 30)), 'andamento', 'andamento');
eq(T.statusDe(j, new Date(2026, 9, 31, 14, 59)), 'agendado', 'agendado');
eq(T.statusDe(j, new Date(2026, 9, 31, 16, 0)), 'aguardando', 'aguardando resultado');

// chaveamento resolve após grupos completos
const c2 = { duplas: [], jogos: [] };
['A', 'B'].forEach((gr) => ['1', '2', '3'].forEach((n) => c2.duplas.push({ id: gr + n, nome: gr + n, grupo: gr })));
['A', 'B'].forEach((gr) => { // 1 vence todos, 2 vence 3
  c2.jogos.push({ id: gr + 'a', fase: 'grupo', grupo: gr, a: gr + '1', b: gr + '2', encerrado: true, sets: [[6, 0], [6, 0]] });
  c2.jogos.push({ id: gr + 'b', fase: 'grupo', grupo: gr, a: gr + '1', b: gr + '3', encerrado: true, sets: [[6, 0], [6, 0]] });
  c2.jogos.push({ id: gr + 'c', fase: 'grupo', grupo: gr, a: gr + '2', b: gr + '3', encerrado: true, sets: [[6, 0], [6, 0]] });
});
c2.jogos.push(...T.gerarMataMata(['A', 'B'], 2, true).jogos);
let ch = T.chaveamento(c2);
eq([ch[0].a.id, ch[0].b.id], ['A1', 'B2'], 'semi1 resolvida');
eq([ch[1].a.id, ch[1].b.id], ['B1', 'A2'], 'semi2 resolvida');
eq(ch[2].a.id, null, 'final ainda sem dupla');
eq(ch[2].a.label, 'Vencedor Semifinal 1', 'rótulo do vencedor');
c2.jogos.find((x) => x.id === 'semi1').encerrado = true; c2.jogos.find((x) => x.id === 'semi1').sets = [[6, 3], [6, 4]];
c2.jogos.find((x) => x.id === 'semi2').encerrado = true; c2.jogos.find((x) => x.id === 'semi2').sets = [[3, 6], [6, 4], [8, 10]];
ch = T.chaveamento(c2);
eq([ch[2].a.id, ch[2].b.id], ['A1', 'A2'], 'final: A1 (venceu semi1) x A2 (venceu semi2 no super TB)');
eq([ch[3].a.id, ch[3].b.id], ['B2', 'B1'], '3º lugar: perdedores');

// dados: exportar/importar, versão, migração futura, backup
const D = ABT.Data;
D.init(); D.clear();
eq(D.backupInfo().vazio, true, 'dados vazios não pedem backup');
ABT.Sample = { build: () => Object.assign(D.empty(), { pessoas: [{ id: 'p1', nome: 'Ana' }] }) };
D.loadSample();
eq(D.get().pessoas.length, 1, 'exemplo carregado');
eq(D.backupInfo().atrasado, true, 'nunca exportou: aviso');
const txt = D.exportText();
D.markBackup(new Date());
eq(D.backupInfo().atrasado, false, 'após backup: sem aviso');
eq(D.backupInfo(new Date(Date.now() + 8 * 86400000)).atrasado, true, '8 dias depois: aviso (limite 7)');
D.clear();
eq(D.importText(txt).ok, true, 'importar o que exportou');
eq(D.get().pessoas[0].nome, 'Ana', 'dados restaurados');
eq(D.importText('{"app":"outro"}').ok, false, 'rejeita arquivo de outro app');
eq(D.importText('não é json').ok, false, 'rejeita texto inválido');
eq(D.importText(JSON.stringify({ app: 'arena-beach-tennis', versao: 99 })).ok, false, 'rejeita versão futura');
eq(D.importText(JSON.stringify({ app: 'arena-beach-tennis', versao: 1, pessoas: 'x' })).ok, false, 'rejeita lista inválida');
eq(D.importText(JSON.stringify({ app: 'arena-beach-tennis', versao: 1 })).ok, true, 'arquivo mínimo completa os campos que faltam');
eq(Array.isArray(D.get().horarios), true, 'campos faltantes viram listas vazias');
eq(ABT.fmtHM(18.5), '18:30', 'fmtHM');
eq(ABT.parseHM('06:15'), 6.25, 'parseHM');

console.log(bad ? `\n${bad} falha(s), ${ok} ok` : `todos os ${ok} testes passaram`);
process.exit(bad ? 1 : 0);
