// Testes de backup e restauração. Uso: node tests/dados.test.js
global.window = undefined;
['data', 'torneio', 'sample', 'agenda', 'regras'].forEach((f) => require('../src/' + f + '.js'));
const ABT = globalThis.ABT, D = ABT.Data, R = ABT.Regras;
let ok = 0, bad = 0;
const eq = (a, b, m) => { const X = JSON.stringify(a), Y = JSON.stringify(b); if (X === Y) ok++; else { bad++; console.log('FALHOU:', m, '\n  obtido  ', X, '\n  esperado', Y); } };
const base = new Date(2026, 9, 28, 12, 0);

// 1) ciclo completo: exportar, apagar, importar
D.init(); D.loadSample(base);
R.definirPin(D.get(), '4821'); R.salvarBoneco(D.get(), 'p_ana', { skin: 1, hair: 2, hairColor: 0, shirt: 3, shorts: 1, acc: 0, racket: 2 });
R.placarMais(D.get(), 1, 'a|1|2026-10-30|18:00', 'a', 1);
R.registrarVenda(D.get(), { tipo: 'lojinha', itemId: 'pr_1', qtd: 2, forma: 'pix' }, base);
D.markBackup(base);
const texto = D.exportText(), antes = JSON.parse(texto);
D.clear(); eq(D.isEmpty(), true, 'apagou tudo');
const r = D.importText(texto);
eq(r.ok, true, 'importou'); eq(JSON.parse(D.exportText()), antes, 'dados idênticos depois de restaurar');
eq(R.verificarPin(D.get(), '4821'), true, 'PIN restaurado'); eq(D.get().pessoas.find((p) => p.id === 'p_ana').boneco.shirt, 3, 'boneco restaurado');
eq(D.get().produtos[0].estoque, 18, 'estoque restaurado'); eq(D.get().placares.length, 1, 'placar restaurado');

// 2) nome do arquivo e data do backup
eq(D.exportFileName(new Date(2026, 10, 1, 9, 5)), 'arena-beach-tennis-backup-2026-11-01-0905.json', 'nome do arquivo');
D.get().ultimoBackup = null; eq(D.backupInfo(base).atrasado, true, 'nunca exportou: avisa');
D.markBackup(base); eq(D.backupInfo(new Date(2026, 9, 30)).atrasado, false, '2 dias: ok'); eq(D.backupInfo(new Date(2026, 10, 5)).atrasado, true, '8 dias: avisa');

// 3) arquivos ruins são recusados e NÃO apagam os dados atuais
const atual = D.exportText();
const ruins = [['isto não é json', 'texto'], ['{"app":"outra","versao":1}', 'outro app'], ['{"app":"arena-beach-tennis"}', 'sem versão'], ['{"app":"arena-beach-tennis","versao":99}', 'versão futura'],
  ['{"app":"arena-beach-tennis","versao":2,"pessoas":"x"}', 'lista inválida'], ['[]', 'lista no topo'], ['null', 'null'], ['', 'vazio']];
ruins.forEach(([t, nome]) => { const x = D.importText(t); eq(x.ok, false, 'recusa: ' + nome); eq(typeof x.erro, 'string', 'explica: ' + nome); });
eq(D.exportText(), atual, 'dados atuais intactos depois de importar arquivos ruins');

// 4) arquivo antigo (versão 1) abre e é atualizado
const v1 = { app: 'arena-beach-tennis', versao: 1, criadoEm: '2026-10-29T10:00:00.000Z', ultimoBackup: null, config: { nomeArena: 'Antiga', valorDayUse: 20 },
  pessoas: [{ id: 'p1', nome: 'Zé', apelido: 'Zé', tipo: 'aluno' }], alunos: [], horarios: [], turmas: [] };
const m = D.importText(JSON.stringify(v1));
eq(m.ok, true, 'versão 1 abre'); eq(D.get().versao, D.VERSION, 'atualizada para a versão atual'); eq(D.get().config.placarIlustrativo, false, 'migração: placar de enfeite desligado');
eq(D.get().config.nomeArena, 'Antiga', 'config antiga preservada'); eq(Array.isArray(D.get().placares), true, 'coleções novas criadas'); eq(D.get().config.diasAvisoBackup, 7, 'padrões novos preenchidos');

// 5) arquivo com campos extras desconhecidos não quebra
const extra = JSON.parse(D.exportText()); extra.campoFuturo = { a: 1 }; extra.pessoas[0].novoCampo = 'x';
eq(D.importText(JSON.stringify(extra)).ok, true, 'campos extras toleram');

// 6) exemplo grande: tamanho razoável para o armazenamento do navegador (~5 MB)
D.loadSample(base); const kb = D.exportText().length / 1024;
eq(kb < 400, true, 'exemplo ocupa ' + Math.round(kb) + ' KB (limite do navegador ~5000 KB)');

console.log(bad ? `${bad} falharam, ${ok} passaram` : `todos os ${ok} testes passaram`);
process.exit(bad ? 1 : 0);
