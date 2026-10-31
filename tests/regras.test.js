// Testes das regras do modo Organização. Uso: node tests/regras.test.js
global.window = undefined;
['data', 'torneio', 'sample', 'agenda', 'regras'].forEach((f) => require('../src/' + f + '.js'));
const ABT = globalThis.ABT, R = ABT.Regras, A = ABT.Agenda;
let ok = 0, bad = 0;
const eq = (a, b, m) => { const X = JSON.stringify(a), Y = JSON.stringify(b); if (X === Y) ok++; else { bad++; console.log('FALHOU:', m, '\n  obtido  ', X, '\n  esperado', Y); } };
const sim = (v, m) => eq(!!v, true, m);
const nao = (v, m) => eq(!!v, false, m);
const at = (y, m, d, h, mi) => new Date(y, m - 1, d, h, mi || 0);

const base = at(2026, 10, 28, 12, 0); // quarta
function novo() { ABT.Data.init(); ABT.Data.loadSample(base); return ABT.Data.get(); }
let S = novo();

/* ---------- PIN ---------- */
nao(R.temPin(S), 'sem PIN no começo');
eq(R.definirPin(S, '12').ok, false, 'PIN curto recusado');
eq(R.definirPin(S, 'abcd').ok, false, 'PIN com letras recusado');
eq(R.definirPin(S, '4821').ok, true, 'PIN válido');
sim(R.temPin(S), 'PIN definido');
sim(R.verificarPin(S, '4821'), 'PIN certo abre');
nao(R.verificarPin(S, '4822'), 'PIN errado não abre');
sim(!JSON.stringify(S.config).includes('4821'), 'PIN não fica guardado em texto');
R.removerPin(S); sim(R.verificarPin(S, 'qualquer'), 'sem PIN = livre');

/* ---------- preços ---------- */
eq(R.tipoDia(S, '2026-10-28'), 'util', 'quarta é dia útil');
eq(R.tipoDia(S, '2026-10-31'), 'fimsemana', 'sábado');
R.salvarFeriado(S, '2026-11-02', 'Finados');
eq(R.tipoDia(S, '2026-11-02'), 'feriado', 'feriado vence dia útil');
eq(R.salvarFeriado(S, '2026-11-02', 'x').ok, false, 'feriado repetido');
eq(R.faixaDe(S, 7).id, 'manha', 'faixa manhã'); eq(R.faixaDe(S, 12).id, 'tarde', '12h é tarde'); eq(R.faixaDe(S, 18.5).id, 'noite', 'noite');
eq(R.precoSugerido(S, '2026-10-28', '18:00', '19:00'), null, 'tabela vazia = sem sugestão');
R.salvarPreco(S, 'noite', 'util', 1, '80,50'); R.salvarPreco(S, 'noite', 'util', 2, 150);
eq(R.precoSugerido(S, '2026-10-28', '18:00', '19:00'), 80.5, 'preço 1h');
eq(R.precoSugerido(S, '2026-10-28', '18:00', '20:00'), 150, 'preço 2h (linha própria)');
eq(R.precoSugerido(S, '2026-10-28', '18:00', '19:30'), 120.75, '1h30 proporcional à hora');
eq(R.precoSugerido(S, '2026-10-31', '18:00', '19:00'), null, 'fim de semana sem preço');
eq(R.salvarPreco(S, 'noite', 'util', 1, 'abc').ok, false, 'valor inválido');
R.salvarPreco(S, 'noite', 'util', 2, ''); eq(R.valorTabela(S, 'noite', 'util', 2), '', 'valor vazio apaga a linha');
eq(R.salvarValorDayUse(S, '25').ok, true, 'valor do day use'); eq(S.config.valorDayUse, 25, 'guardado'); R.salvarValorDayUse(S, 20);

/* ---------- horários avulsos e conflitos ---------- */
S = novo();
let r = R.salvarHorario(S, { quadra: 1, data: '2026-10-29', inicio: '18:30', fim: '19:30', pessoas: ['p_bia'] });
eq(r.ok, false, 'conflita com aluguel das 18h na Q1'); sim(/ocupada/.test(r.erro), 'mensagem de ocupada');
r = R.salvarHorario(S, { quadra: 1, data: '2026-10-29', inicio: '20:00', fim: '21:00', pessoas: ['p_bia', 'p_leo'] });
eq(r.ok, true, 'horário livre aceito');
const hid = r.id; eq(S.horarios.find((h) => h.id === hid).preco, null, 'sem tabela = preço vazio');
R.salvarPreco(S, 'noite', 'util', 1, 90);
r = R.salvarHorario(S, { quadra: 2, data: '2026-10-29', inicio: '20:00', fim: '21:00', pessoas: ['p_bia'] });
eq(S.horarios.find((h) => h.id === r.id).preco, 90, 'preço sugerido aplicado');
eq(R.salvarHorario(S, { quadra: 1, data: '2026-10-29', inicio: '21:30', fim: '22:30' }).ok, false, 'passa do fechamento (22h)');
eq(R.salvarHorario(S, { quadra: 1, data: '2026-10-31', inicio: '21:00', fim: '21:30' }).ok, false, 'sábado fecha às 21');
eq(R.salvarHorario(S, { quadra: 1, data: '2026-10-29', inicio: '10:00', fim: '09:00' }).ok, false, 'fim antes do início');
eq(R.salvarHorario(S, { quadra: 9, data: '2026-10-29', inicio: '10:00', fim: '11:00' }).ok, false, 'quadra inexistente');
eq(R.salvarHorario(S, { quadra: 1, data: '2026-10-29', inicio: '10:00', fim: '11:00', pessoas: ['a', 'b', 'c', 'd', 'e'] }).ok, false, 'aluguel com 5');
// editar o próprio horário não conflita consigo mesmo
eq(R.salvarHorario(S, { id: hid, quadra: 1, data: '2026-10-29', inicio: '20:00', fim: '21:30', pessoas: ['p_bia'] }).ok, true, 'editar não conflita consigo');
// cancelar libera a quadra
R.cancelarHorario(S, hid);
eq(R.conflitos(S, { quadra: 1, data: '2026-10-29', inicio: '20:00', fim: '21:00' }).length, 0, 'cancelado não ocupa');
// bloqueio
eq(R.salvarHorario(S, { tipo: 'bloqueio', quadra: 4, data: '2026-10-29', inicio: '10:00', fim: '12:00', obs: 'Troca de areia' }).ok, true, 'bloqueio');
eq(A.quadraAgora(S, at(2026, 10, 29, 11, 0), 4).type, 'bloqueado', 'bloqueio aparece na quadra');
// aula avulsa
eq(R.salvarHorario(S, { tipo: 'aula', quadra: 3, data: '2026-10-29', inicio: '10:00', fim: '11:00', pessoas: [] }).ok, false, 'aula sem professor');
eq(R.salvarHorario(S, { tipo: 'aula', quadra: 3, data: '2026-10-29', inicio: '10:00', fim: '11:00', professorId: 'p_marcos', pessoas: [] }).ok, false, 'aula sem aluno');
eq(R.salvarHorario(S, { tipo: 'aula', quadra: 3, data: '2026-10-29', inicio: '10:00', fim: '11:00', professorId: 'p_marcos', pessoas: ['p_ana'] }).ok, true, 'aula particular com 1 aluno (D34)');
eq(R.salvarHorario(S, { tipo: 'aula', quadra: 3, data: '2026-10-29', inicio: '12:00', fim: '13:00', professorId: 'p_marcos', pessoas: ['1', '2', '3', '4', '5', '6', '7'] }).ok, false, 'aula com 7 alunos');
// aviso de day use (sexta)
r = R.salvarHorario(S, { quadra: 4, data: '2026-10-30', inicio: '17:00', fim: '18:00', pessoas: ['p_bia'] });
eq(r.ok, true, 'reserva na sexta'); sim(/day use/i.test(r.aviso), 'avisa que há day use');
// repetir
S = novo(); r = R.salvarHorario(S, { quadra: 2, data: '2026-10-29', inicio: '20:00', fim: '21:00', pessoas: ['p_bia'] });
const rep = R.repetirHorario(S, r.id, 3); eq(rep.criados, 3, 'repetiu 3 semanas');
eq(R.repetirHorario(S, r.id, 3).criados, 0, 'repetir de novo: tudo já ocupado'); eq(R.repetirHorario(S, r.id, 3).pulados.length, 3, 'pulou as datas ocupadas');

/* ---------- turmas ---------- */
S = novo();
const turma = { nome: 'Turma Nova', professorId: 'p_marcos', alunos: ['p_ana', 'p_bruno'], diasSemana: [2], inicio: '10:00', fim: '11:00', quadra: 1 };
r = R.salvarTurma(S, turma, base); eq(r.ok, true, 'turma nova'); const tid = r.id;
eq(A.quadraAgora(S, at(2026, 11, 3, 10, 30), 1).type, 'aula', 'turma aparece na terça');
eq(R.salvarTurma(S, Object.assign({}, turma, { id: undefined, quadra: 1 }), base).ok, false, 'mesma turma de novo: conflito');
eq(R.salvarTurma(S, Object.assign({}, turma, { id: tid, alunos: [] }), base).ok, false, 'turma sem aluno');
eq(R.salvarTurma(S, Object.assign({}, turma, { id: tid, alunos: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }), base).ok, false, 'turma com 7 alunos');
eq(R.salvarTurma(S, Object.assign({}, turma, { id: tid, diasSemana: [] }), base).ok, false, 'sem dias');
eq(R.salvarTurma(S, Object.assign({}, turma, { id: tid, diasSemana: [6], inicio: '06:00', fim: '07:00' }), base).ok, false, 'sábado só abre às 07');
eq(R.salvarTurma(S, Object.assign({}, turma, { id: tid, professorId: null }), base).ok, false, 'sem professor');
eq(R.salvarTurma(S, Object.assign({}, turma, { id: tid, quadra: 2, inicio: '18:00', fim: '19:00', diasSemana: [1] }), base).ok, false, 'conflita com turma iniciantes (seg 18h, Q2)');
eq(R.salvarTurma(S, Object.assign({}, turma, { id: tid, nome: 'Renomeada' }), base).ok, true, 'editar a própria turma');
eq(S.turmas.find((t) => t.id === tid).nome, 'Renomeada', 'nome atualizado');
// exceção no dia
eq(R.cancelarTurmaNoDia(S, tid, '2026-11-03').ok, true, 'cancelar no dia');
eq(A.quadraAgora(S, at(2026, 11, 3, 10, 30), 1).type, 'livre', 'dia cancelado fica livre');
eq(A.quadraAgora(S, at(2026, 11, 10, 10, 30), 1).type, 'aula', 'semana seguinte continua');
eq(R.cancelarTurmaNoDia(S, tid, '2026-11-04').ok, false, 'quarta não é dia da turma');
R.restaurarTurmaNoDia(S, tid, '2026-11-03'); eq(A.quadraAgora(S, at(2026, 11, 3, 10, 30), 1).type, 'aula', 'restaurada');
eq(R.moverTurmaNoDia(S, tid, '2026-11-03', { inicio: '15:00', fim: '16:00', quadra: 4 }).ok, true, 'mover no dia');
eq(A.quadraAgora(S, at(2026, 11, 3, 10, 30), 1).type, 'livre', 'horário antigo livre'); eq(A.quadraAgora(S, at(2026, 11, 3, 15, 30), 4).type, 'aula', 'novo horário na Q4');
eq(A.quadraAgora(S, at(2026, 11, 3, 15, 30), 4).teacher, 'Marcos', 'professor mantido');
R.excluirTurma(S, tid); eq(S.horarios.some((h) => h.turmaId === tid), false, 'exceções removidas com a turma');

/* ---------- pessoas e alunos ---------- */
S = novo();
eq(R.salvarPessoa(S, { nome: '', tipo: 'aluno' }).ok, false, 'sem nome');
eq(R.salvarPessoa(S, { nome: 'Zé', tipo: 'x' }).ok, false, 'tipo inválido');
eq(R.salvarPessoa(S, { nome: 'Zé', tipo: 'aluno', nascimento: '31/02/2000' }).ok, false, 'nascimento inválido');
r = R.salvarPessoa(S, { nome: 'Rafaela Souza', tipo: 'aluno' });
eq(r.ok, true, 'aluno novo'); eq(S.pessoas.find((p) => p.id === r.id).apelido, 'Rafaela', 'apelido = primeiro nome (D09)');
eq(S.alunos.some((a) => a.pessoaId === r.id), true, 'linha de aluno criada'); eq(S.pessoas.find((p) => p.id === r.id).nascimento, '', 'nascimento é opcional (D44)');
eq(R.salvarAluno(S, r.id, { pagamento: 'atrasado' }).ok, true, 'pagamento'); eq(R.salvarAluno(S, r.id, { pagamento: 'xx' }).ok, false, 'pagamento inválido');
eq(R.salvarAluno(S, r.id, { contrato: 'meucontrato' }).ok, false, 'contrato sem http'); eq(R.salvarAluno(S, r.id, { contrato: 'https://drive.google.com/x' }).ok, true, 'contrato com link');
eq(R.salvarBoneco(S, r.id, { shirt: 3, hair: 1 }).ok, true, 'boneco'); eq(S.pessoas.find((p) => p.id === r.id).boneco.shirt, 3, 'boneco guardado');
eq(R.removerPessoa(S, 'p_ana').ok, false, 'Ana está em turma: não apaga'); sim(/turma/.test(R.removerPessoa(S, 'p_ana').erro), 'diz onde está usada');
eq(R.removerPessoa(S, r.id).ok, true, 'sem uso: apaga'); eq(S.alunos.some((a) => a.pessoaId === r.id), false, 'linha de aluno some junto');

/* ---------- day use e placar ---------- */
S = novo();
const sx = at(2026, 10, 30, 18, 30), sexta = '2026-10-30';
const ses = R.sessaoDoDia(S, sexta); sim(ses, 'sessão de sexta existe');
const antes = S.vendas.length;
eq(R.chegouDayUse(S, ses.id, 'p_nando', 3, {}, sx).ok, false, 'sem forma de pagamento');
r = R.chegouDayUse(S, ses.id, 'p_nando', 3, { forma: 'pix' }, sx);
eq(r.ok, true, 'chegou'); eq(r.status, 'fila', 'quadra cheia: vai para a fila'); eq(S.vendas.length, antes + 1, 'venda registrada'); eq(S.vendas[S.vendas.length - 1].total, 20, 'R$ 20');
eq(R.chegouDayUse(S, ses.id, 'p_nando', 3, { forma: 'pix' }, sx).ok, false, 'já está no day use');
eq(R.chegouDayUse(S, ses.id, 'p_olivia', 4, { forma: 'dinheiro' }, sx).status, 'quadra', 'Q4 vazia: entra direto'); // 1 pessoa só
let q3 = R.situacaoDayUse(S, ses.id)[2];
eq(q3.jogam.map((x) => x.nome), ['Gabi', 'Hugo', 'Íris', 'João'], 'jogam'); eq(q3.fila.map((x) => x.nome), ['Kelly', 'Lucas', 'Mari', 'Nando'], 'fila com Nando no fim');
// subir na fila
R.moverNaFila(S, q3.fila[3].id, -1); eq(R.situacaoDayUse(S, ses.id)[2].fila.map((x) => x.nome), ['Kelly', 'Lucas', 'Nando', 'Mari'], 'Nando sobe');
// fim de partida: Gabi sai, Hugo fica, Íris e João continuam (fim da fila)
const dec = { p_gabi: 'saiu', p_hugo: 'fica', p_iris: 'continua', p_joao: 'continua' };
r = R.fimDePartida(S, ses.id, 3, dec); eq(r.ok, true, 'fim de partida');
q3 = R.situacaoDayUse(S, ses.id)[2];
eq(q3.jogam.map((x) => x.nome), ['Hugo', 'Kelly', 'Lucas', 'Nando'], 'quadra: Hugo ficou e a fila entrou');
eq(q3.fila.map((x) => x.nome), ['Mari', 'Íris', 'João'], 'fila: Mari e depois quem continuou');
eq(R.fimDePartida(S, ses.id, 4, {}).ok, false, 'Q4 só tem 1 pessoa: não encerra');
// sair avulso
R.sairDayUse(S, q3.fila[0].id); eq(R.situacaoDayUse(S, ses.id)[2].fila.map((x) => x.nome), ['Íris', 'João'], 'saiu e a fila renumerou');
// mover para outra quadra
R.moverDayUse(S, R.situacaoDayUse(S, ses.id)[2].fila[0].id, 4); eq(R.situacaoDayUse(S, ses.id)[3].jogam.map((x) => x.nome), ['Olívia', 'Íris'], 'Íris foi para a Q4');
eq(R.abrirSessaoDayUse(S, { data: sexta }).ok, false, 'sessão repetida'); eq(R.abrirSessaoDayUse(S, { data: '2026-11-06', inicio: '17:00', fim: '23:00' }).ok, false, 'fora do horário');
eq(R.abrirSessaoDayUse(S, { data: '2026-11-04', inicio: '17:00', fim: '21:00' }).ok, true, 'nova sessão (valor padrão)'); eq(S.dayuse_sessoes.find((x) => x.data === '2026-11-04').valor, 20, 'valor padrão');

// placar manual (D46 = A)
S = novo();
let qa = A.quadraAgora(S, sx, 1);
eq(qa.fixed.texto, 'Em jogo', 'aluguel começa com "Em jogo"'); eq(qa.fixed.placar, null, 'sem placar inventado');
R.placarMais(S, 1, qa.fixed.chave, 'a', 1); R.placarMais(S, 1, qa.fixed.chave, 'a', 1); R.placarMais(S, 1, qa.fixed.chave, 'b', 1);
eq(A.quadraAgora(S, sx, 1).fixed.texto, '2 × 1', 'placar digitado aparece');
R.placarMais(S, 1, qa.fixed.chave, 'b', -5); eq(A.quadraAgora(S, sx, 1).fixed.texto, '2 × 0', 'não passa de zero');
eq(A.quadraAgora(S, at(2026, 10, 30, 19, 30), 1).fixed.texto, 'Em jogo', 'outro horário não herda o placar');
R.placarZerar(S, 1, qa.fixed.chave); eq(A.quadraAgora(S, sx, 1).fixed.texto, 'Em jogo', 'zerar volta para "Em jogo"');
let qd = A.quadraAgora(S, sx, 3); eq(qd.type, 'dayuse', 'day use'); eq(qd.fixed.texto, 'Em jogo', 'day use também');
R.placarMais(S, 3, qd.fixed.chave, 'a', 1); eq(A.quadraAgora(S, sx, 3).fixed.texto, '1 × 0', 'placar do day use');
R.fimDePartida(S, R.sessaoDoDia(S, sexta).id, 3, { p_gabi: 'saiu', p_hugo: 'saiu', p_iris: 'saiu', p_joao: 'saiu' });
eq((S.placares || []).length, 0, 'fim de partida apaga o placar do day use');
S.config.placarIlustrativo = true; eq(A.quadraAgora(S, sx, 1).fixed, undefined, 'modo ilustrativo: sem placar fixo');

/* ---------- vendas e estoque ---------- */
S = novo(); const agora = at(2026, 10, 30, 15, 10);
eq(R.registrarVenda(S, { tipo: 'lojinha', itemId: 'pr_1', qtd: 2 }, agora).ok, false, 'sem forma de pagamento');
r = R.registrarVenda(S, { tipo: 'lojinha', itemId: 'pr_1', qtd: 2, forma: 'pix' }, agora);
eq(r.ok, true, 'venda lojinha'); eq(r.total, 12, 'total 2 x 6'); eq(S.produtos[0].estoque, 18, 'baixa no estoque');
eq(R.registrarVenda(S, { tipo: 'lojinha', itemId: 'pr_1', qtd: 99, forma: 'pix' }, agora).ok, false, 'estoque insuficiente');
R.registrarVenda(S, { tipo: 'lanchonete', itemId: 'c_2', qtd: 1, forma: 'dinheiro' }, agora);
R.registrarVenda(S, { tipo: 'outro', nome: 'Aluguel de raquete', preco: '5,5', forma: 'cartao' }, agora);
let rs = R.resumoVendas(S, '2026-10-30'); eq(rs.total, 26.5, 'total do dia'); eq(rs.qtd, 3, '3 vendas'); eq(rs.porForma, { pix: 12, dinheiro: 9, cartao: 5.5 }, 'por forma');
eq(R.resumoVendas(S, '2026-10-29').total, 0, 'outro dia zerado');
R.estornarVenda(S, r.id); eq(S.produtos[0].estoque, 20, 'estorno devolve ao estoque'); eq(R.resumoVendas(S, '2026-10-30').qtd, 2, 'venda removida');
R.alternarDisponivel(S, 'produtos', 'pr_1'); eq(R.registrarVenda(S, { tipo: 'lojinha', itemId: 'pr_1', qtd: 1, forma: 'pix' }, agora).ok, false, 'indisponível não vende');
eq(R.salvarProduto(S, { nome: 'Boné', preco: '49,9', estoque: 5, minimo: 6 }).ok, true, 'produto novo'); eq(R.salvarProduto(S, { nome: 'x', preco: '' }).ok, false, 'preço obrigatório');
eq(R.estoqueBaixo(S).map((x) => x.nome).sort(), ['Bolinhas', 'Boné'], 'estoque baixo: bolinhas e boné');
R.ajustarEstoque(S, 'equip', 'e_bol', 10); eq(R.estoqueBaixo(S).map((x) => x.nome), ['Boné'], 'repor bolinhas tira o alerta');
eq(R.ajustarEstoque(S, 'equip', 'e_bol', -999).valor, 0, 'estoque não fica negativo');
eq(R.salvarCardapio(S, { nome: 'Água de coco', preco: 8, categoria: 'Bebidas' }).ok, true, 'cardápio novo');

/* ---------- limpeza ---------- */
S = novo(); // última limpeza: 27/10 08:15
nao(R.limpezaAtrasada(S, at(2026, 10, 28, 7, 0)).atrasada, 'menos de 1 dia');
sim(R.limpezaAtrasada(S, at(2026, 10, 28, 12, 0)).atrasada, 'mais de 1 dia: atrasada (D43)');
eq(R.registrarLimpeza(S, { responsavel: '' }, base).ok, false, 'precisa do responsável');
eq(R.registrarLimpeza(S, { responsavel: 'Rita', link: 'foto' }, base).ok, false, 'link inválido');
eq(R.registrarLimpeza(S, { responsavel: 'Rita', link: 'https://drive.google.com/foto' }, base).ok, true, 'limpeza registrada');
nao(R.limpezaAtrasada(S, base).atrasada, 'depois de limpar não está atrasada');
eq(R.registrarManutencao(S, { descricao: 'Troca da lâmpada' }, base).ok, true, 'manutenção');

/* ---------- avisos e patrocinadores ---------- */
S = novo();
eq(R.salvarAviso(S, { texto: '' }).ok, false, 'aviso vazio'); eq(R.salvarAviso(S, { texto: 'x'.repeat(141) }).ok, false, 'aviso longo');
eq(R.salvarAviso(S, { texto: 'Hoje tem torneio', inicio: '2026-10-30', fim: '2026-10-29' }).ok, false, 'datas invertidas');
eq(R.salvarAviso(S, { texto: 'Hoje tem torneio', inicio: '2026-10-30', fim: '2026-10-30' }).ok, true, 'aviso ok');
eq(R.salvarPatrocinador(S, { nome: 'Loja X', imagem: 'banner.png' }).ok, false, 'imagem sem http'); eq(R.salvarPatrocinador(S, { nome: 'Loja X', imagem: 'https://exemplo.com/a.png' }).ok, true, 'patrocinador ok');

/* ---------- campeonato ---------- */
S = novo(); S.campeonatos = [];
const duplas = (n) => Array.from({ length: n }, (_, i) => ({ p1: S.pessoas.filter((p) => p.tipo === 'aluno')[2 * i].id, p2: S.pessoas.filter((p) => p.tipo === 'aluno')[2 * i + 1].id }));
eq(R.criarCampeonato(S, { nome: 'Torneio X', duplas: duplas(2), data: '2026-11-07' }).ok, false, 'poucas duplas');
eq(R.criarCampeonato(S, { nome: 'Torneio X', duplas: [{ p1: 'p_ana', p2: 'p_ana' }, ...duplas(3)], data: '2026-11-07' }).ok, false, 'dupla com a mesma pessoa');
eq(R.criarCampeonato(S, { nome: 'Torneio X', duplas: [{ p1: 'p_ana', p2: 'p_bruno' }, { p1: 'p_ana', p2: 'p_carla' }, { p1: 'p_diego', p2: 'p_elisa' }], data: '2026-11-07' }).ok, false, 'pessoa em duas duplas');
r = R.criarCampeonato(S, { nome: 'Torneio X', duplas: duplas(8), data: '2026-11-07', inicio: '14:00', seed: 3 });
eq(r.ok, true, '8 duplas'); const camp = S.campeonatos[0];
eq(camp.jogos.filter((j) => j.fase === 'grupo').length, 12, '2 grupos de 4 = 12 jogos'); eq(camp.jogos.filter((j) => j.fase === 'semi').length, 2, '2 semis'); eq(camp.jogos.filter((j) => j.fase === 'final').length, 1, 'final'); eq(camp.jogos.filter((j) => j.fase === 'terceiro').length, 1, '3º lugar');
sim(camp.jogos.every((j) => j.data && j.quadra && j.inicio), 'todos os jogos têm data, quadra e hora');
// nenhuma dupla joga duas vezes ao mesmo tempo e nenhuma quadra é usada duas vezes
const chv = {}, dup = {}; let choque = 0, choqueDupla = 0;
camp.jogos.forEach((j) => { const k = j.data + '|' + j.inicio + '|' + j.quadra; if (chv[k]) choque++; chv[k] = 1; [j.a, j.b].filter(Boolean).forEach((d) => { const kk = j.data + '|' + j.inicio + '|' + d; if (dup[kk]) choqueDupla++; dup[kk] = 1; }); });
eq(choque, 0, 'sem choque de quadra'); eq(choqueDupla, 0, 'dupla não joga 2x ao mesmo tempo');
const ult = (f) => camp.jogos.filter((j) => j.fase === f).map((j) => j.data + j.inicio);
sim(Math.min(...ult('semi')) > Math.max(...ult('grupo').map((x) => x)) || ult('semi').every((x) => x > ult('grupo').slice().sort().pop()), 'semi depois dos grupos');
sim(ult('final')[0] > ult('semi').slice().sort().pop(), 'final depois das semis');
eq(camp.jogos.every((j) => R.conflitos(S, { quadra: j.quadra, data: j.data, inicio: j.inicio, fim: j.fim, ignorar: { jogoId: j.id } }).length === 0), true, 'jogos não batem entre si nem com a agenda');
// respeita o que já existe na agenda: bloqueia Q1..Q4 no sábado à tarde
S = novo(); S.campeonatos = [];
[1, 2, 3, 4].forEach((q) => R.salvarHorario(S, { tipo: 'bloqueio', quadra: q, data: '2026-11-07', inicio: '14:00', fim: '15:00', obs: 'Evento' }));
R.criarCampeonato(S, { nome: 'T', duplas: duplas(4), data: '2026-11-07', inicio: '14:00', seed: 1 });
sim(S.campeonatos[0].jogos.every((j) => !(j.data === '2026-11-07' && j.inicio === '14:00')), 'pula o horário bloqueado');
// jogo único: o último dia cabe no horário de funcionamento
sim(S.campeonatos[0].jogos.every((j) => R.dentroDoHorario(S, j.data, ABT.parseHM(j.inicio), ABT.parseHM(j.fim))), 'tudo dentro do funcionamento');
// resultado
S = novo(); const c0 = S.campeonatos[0], gj = c0.jogos.find((j) => j.fase === 'grupo' && !j.encerrado);
eq(R.salvarPlacarJogo(S, c0.id, gj.id, [[6, 3]], true).ok, false, 'falta set para ter vencedor');
eq(R.salvarPlacarJogo(S, c0.id, gj.id, [[6, 6], [6, 3]], true).ok, false, 'set empatado');
eq(R.salvarPlacarJogo(S, c0.id, gj.id, [[6, 3], [6, 2], [10, 5]], true).ok, false, 'set depois do vencedor');
eq(R.salvarPlacarJogo(S, c0.id, gj.id, [[6, 3], [6.5, 2]], true).ok, false, 'número quebrado');
eq(R.salvarPlacarJogo(S, c0.id, gj.id, [[6, 3], [6, 2]], true).ok, true, 'resultado válido'); eq(gj.encerrado, true, 'encerrado');
eq(R.salvarPlacarJogo(S, c0.id, gj.id, [[6, 3]], false).ok, true, 'reabrir como parcial'); eq(!!gj.encerrado, false, 'reaberto');
const semi = c0.jogos.find((j) => j.fase === 'semi'); eq(R.salvarPlacarJogo(S, c0.id, semi.id, [[6, 3], [6, 2]], true).ok, false, 'semi sem duplas definidas');
eq(R.salvarPlacarJogo(S, 'nada', 'x', [], false).ok, false, 'campeonato inexistente');
// terminar tudo: status do campeonato
S = novo(); const cc = S.campeonatos[0];
for (const j of cc.jogos.filter((x) => x.fase === 'grupo')) R.salvarPlacarJogo(S, cc.id, j.id, [[6, 2], [6, 3]], true);
const ko = ['semi', 'final', 'terceiro'];
for (const f of ko) for (const j of cc.jogos.filter((x) => x.fase === f)) { const rr = R.salvarPlacarJogo(S, cc.id, j.id, [[6, 2], [6, 3]], true); eq(rr.ok, true, `lançou ${f} ${j.id}`); }
eq(cc.status, 'encerrado', 'campeonato encerrado quando a final termina');
// mudar horário do jogo
S = novo(); const c1 = S.campeonatos[0], g1 = c1.jogos[0];
eq(R.salvarHorarioJogo(S, c1.id, g1.id, { quadra: 1, data: g1.data, inicio: '20:00', fim: '21:00' }).ok, true, 'jogo da Q1 sábado 20h livre');
eq(R.salvarHorarioJogo(S, c1.id, g1.id, { quadra: 1, data: '2026-10-29', inicio: '18:00', fim: '19:00' }).ok, false, 'quinta 18h Q1 tem aluguel');

/* ---------- configurações ---------- */
S = novo();
eq(R.salvarConfig(S, { nomeArena: 'X', diasAvisoBackup: 0, diasLimpezaAtrasada: 1, anuncioSegundos: 8 }).ok, false, 'backup 0 dias');
eq(R.salvarConfig(S, { nomeArena: '', diasAvisoBackup: 7, diasLimpezaAtrasada: 1, anuncioSegundos: 8 }).ok, false, 'sem nome');
eq(R.salvarConfig(S, { nomeArena: 'Arena Sol', diasAvisoBackup: '5', diasLimpezaAtrasada: '2', anuncioSegundos: '10', placarIlustrativo: true }).ok, true, 'config ok');
eq([S.config.nomeArena, S.config.diasAvisoBackup, S.config.diasLimpezaAtrasada, S.config.anuncioSegundos, S.config.placarIlustrativo], ['Arena Sol', 5, 2, 10, true], 'config guardada');

/* ---------- alertas ---------- */
S = novo(); S.ultimoBackup = null;
let al = R.alertas(S, at(2026, 10, 30, 12, 0)); eq(al.map((a) => a.id).includes('backup'), true, 'alerta de backup (nunca)');
S.ultimoBackup = at(2026, 10, 29, 9, 0).toISOString(); eq(R.alertas(S, at(2026, 10, 30, 12, 0)).some((a) => a.id === 'backup'), false, 'backup recente');
S.ultimoBackup = at(2026, 10, 20, 9, 0).toISOString(); eq(R.alertas(S, at(2026, 10, 30, 12, 0)).some((a) => a.id === 'backup'), true, 'backup com 10 dias');
al = R.alertas(S, at(2026, 10, 30, 12, 0));
sim(al.some((a) => a.id === 'estoque_e_bol'), 'bolinhas abaixo do mínimo'); sim(al.some((a) => a.id === 'pagamento'), 'pagamento atrasado'); sim(al.some((a) => a.id === 'limpeza'), 'limpeza atrasada');
S = novo(); sim(R.alertas(S, at(2026, 11, 8, 12, 0)).some((a) => a.id === 'placar'), 'jogo do campeonato sem resultado depois da hora');
ABT.Data.init(); ABT.Data.clear(); eq(R.alertas(ABT.Data.get(), base), [], 'dados vazios: nenhum alerta');
eq(R.resumoDoDia(novo(), at(2026, 10, 30, 12, 0)).dayuse, 7, 'resumo do dia: 7 no day use');

console.log(bad ? `${bad} falharam, ${ok} passaram` : `todos os ${ok} testes passaram`);
process.exit(bad ? 1 : 0);
