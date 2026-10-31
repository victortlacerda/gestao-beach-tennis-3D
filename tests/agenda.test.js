// Testes da agenda e dos dados de exemplo. Uso: node tests/agenda.test.js
global.window = undefined;
['data', 'torneio', 'sample', 'agenda'].forEach((f) => require('../src/' + f + '.js'));
const ABT = globalThis.ABT;
let ok = 0, bad = 0;
const eq = (a, b, m) => { const A = JSON.stringify(a), B = JSON.stringify(b); if (A === B) ok++; else { bad++; console.log('FALHOU:', m, '\n  obtido  ', A, '\n  esperado', B); } };

// base: quarta-feira 28/10/2026
const base = new Date(2026, 9, 28, 12, 0);
ABT.Data.init(); ABT.Data.loadSample(base);
const S = ABT.Data.get();
const at = (y, m, d, h, mi) => new Date(y, m - 1, d, h, mi || 0);

// sexta 30/10 18:30: Q1 aluguel, Q2 aula, Q3 day use, Q4 livre
let c = ABT.Agenda.cena(S, at(2026, 10, 30, 18, 30));
eq(c.quadras.map((q) => q.type), ['aluguel', 'aula', 'dayuse', 'livre'], 'sexta 18:30');
eq(c.quadras[1].teacher, 'Marcos', 'professor');
eq(c.quadras[1].students.length, 6, '6 alunos');
eq(c.quadras[2].players, ['Gabi', 'Hugo', 'Íris', 'João'], 'day use jogam');
eq(c.quadras[2].queue, ['Kelly', 'Lucas', 'Mari'], 'fila');
eq(c.quadras[3].next, 'Day use: pode entrar', 'Q4 livre durante o day use');
eq(c.quadras[0].next, 'Próximo: 19:00 · Aluguel', 'próximo da Q1');
eq(c.aberto, true, 'aberto');

// fechado de madrugada e depois das 22
c = ABT.Agenda.cena(S, at(2026, 10, 30, 5, 0));
eq(c.quadras.every((q) => q.closed), true, '05:00 fechado');
eq(c.walkers, 0, 'sem figurantes fechado');
c = ABT.Agenda.cena(S, at(2026, 10, 30, 22, 0));
eq(c.quadras[0].closed, true, '22:00 já fechou (seg a sex)');
// sábado abre às 7
eq(ABT.Agenda.cena(S, at(2026, 10, 31, 6, 30)).aberto, false, 'sábado 06:30 fechado');
eq(ABT.Agenda.cena(S, at(2026, 10, 31, 7, 0)).aberto, true, 'sábado 07:00 aberto');

// sábado 15:30: campeonato nas 4 quadras (rodada 2 em andamento)
c = ABT.Agenda.cena(S, at(2026, 10, 31, 15, 30));
eq(c.quadras.map((q) => q.type), ['campeonato', 'campeonato', 'campeonato', 'campeonato'], 'sábado 15:30');
eq(c.quadras[0].time.startsWith('Grupo A · Rodada 2'), true, 'rótulo do jogo');
eq(c.quadras[0].teams.every((t) => t.length === 2), true, 'duplas');
eq(Array.isArray(c.quadras[0].fixed.sets), true, 'placar vindo dos dados');
// sábado 14:30: rodada 1 em andamento, encerrada => status "encerrado" não ocupa a quadra
c = ABT.Agenda.cena(S, at(2026, 10, 31, 14, 30));
eq(c.quadras.every((q) => q.type === 'livre'), true, 'sábado 14:30: jogos já encerrados nos dados, quadras livres');
// semifinais ainda sem duplas
c = ABT.Agenda.cena(S, at(2026, 10, 31, 17, 30));
eq(c.quadras[0].type, 'livre', 'semi 17:30 sem duplas definidas: quadra livre');
eq(c.quadras[0].next, 'Semifinal: aguardando definição das duplas', 'aviso de duplas a definir');

// quarta 09:30 bloqueio; segunda 07:00 sem aula; terça 07:30 turma da manhã
c = ABT.Agenda.cena(S, at(2026, 10, 28, 9, 30));
eq(c.quadras[3].type, 'bloqueado', 'manutenção da rede');
c = ABT.Agenda.cena(S, at(2026, 10, 27, 7, 30));
eq(c.quadras[1].type, 'aula', 'terça 07:30 aula da manhã');
eq(c.quadras[1].students.length, 3, '3 alunos');
// aula particular no sábado de manhã: 1 aluno (D34), no sábado seguinte ao campeonato
c = ABT.Agenda.cena(S, at(2026, 10, 31, 9, 30));
eq(c.quadras[2].type, 'aula', 'sábado 09:30 aula particular');
eq(c.quadras[2].turma, 'Aula particular', 'texto de aula particular');
eq(c.quadras[2].students, ['Diego'], '1 aluno');

// avisos: aniversário e patrocinador
const av = ABT.Agenda.avisos(S, base);
eq(av.some((a) => a.tipo === 'aniversario' && a.texto.includes('Carla')), true, 'aniversário da Carla');
eq(av.some((a) => a.tipo === 'patrocinio'), true, 'patrocinador ativo');
eq(ABT.Agenda.avisos(S, ABT.addDays(base, 40)).some((a) => a.tipo === 'patrocinio'), false, 'patrocínio vencido some');

// day use com menos de 4: não vira jogo, vira espera
const S2 = JSON.parse(JSON.stringify(S));
S2.dayuse_presencas = S2.dayuse_presencas.filter((p) => p.pessoaId !== 'p_joao' && p.pessoaId !== 'p_iris');
c = ABT.Agenda.cena(S2, at(2026, 10, 30, 20, 0));
eq(c.quadras[2].type, 'livre', 'day use sem quórum não joga');
eq(c.quadras[2].waiting.length, 5, '5 esperando (2 da quadra + 3 da fila)');
// 'saiu' não aparece
S2.dayuse_presencas.forEach((p) => { if (p.pessoaId === 'p_gabi') p.status = 'saiu'; });
c = ABT.Agenda.cena(S2, at(2026, 10, 30, 20, 0));
eq(c.quadras[2].waiting.includes('Gabi'), false, 'quem saiu some');

// TV mostra só apelido ou primeiro nome (D09)
S2.pessoas.find((p) => p.id === 'p_bia').apelido = ''; S2.pessoas.find((p) => p.id === 'p_bia').nome = 'Beatriz Souza Lima';
c = ABT.Agenda.cena(S2, at(2026, 10, 30, 18, 30));
eq(c.quadras[0].teams[0][0], 'Beatriz', 'sem apelido usa primeiro nome');

// assinatura só muda quando a quadra muda
const a1 = ABT.Agenda.assinatura(ABT.Agenda.quadraAgora(S, at(2026, 10, 30, 18, 10), 1));
const a2 = ABT.Agenda.assinatura(ABT.Agenda.quadraAgora(S, at(2026, 10, 30, 18, 50), 1));
const a3 = ABT.Agenda.assinatura(ABT.Agenda.quadraAgora(S, at(2026, 10, 30, 19, 10), 1));
eq(a1 === a2, true, 'mesma hora, mesma assinatura');
eq(a1 === a3, false, 'virou a hora, assinatura nova');

// relógio simulado
ABT.Clock.setSim(at(2026, 10, 30, 18, 30));
eq(Math.abs(ABT.Clock.now().getTime() - at(2026, 10, 30, 18, 30).getTime()) < 2000, true, 'relógio simulado corre a partir da hora escolhida');
ABT.Clock.setReal();
eq(ABT.Clock.isSim(), false, 'volta ao real');

// agenda pública: sem nomes de pessoas, com buracos livres
const ap = ABT.Agenda.agendaPublica(S, at(2026, 10, 30, 12, 0), 2);
eq(ap.every((r) => !/Marcos|Ana|Bruno/.test(r.texto)), true, 'agenda pública sem nomes');
eq(ap.map((r) => r.tipo).includes('livre') && ap.map((r) => r.tipo).includes('aula'), true, 'agenda pública tem livre e aula');
eq(ap[0].ini, 6, 'começa na abertura'); eq(ap[ap.length - 1].fim, 22, 'termina no fechamento');
console.log(bad ? `\n${bad} falha(s), ${ok} ok` : `todos os ${ok} testes passaram`);
process.exit(bad ? 1 : 0);
