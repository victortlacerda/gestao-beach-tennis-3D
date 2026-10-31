/* ============================================================
   Regras de negócio (Fase 3): o que o modo Organização pode fazer com os dados.
   Cada função recebe o objeto de dados (state) e o altera; chame dentro de ABT.Data.update(...).
   Devolvem { ok:true, ... } ou { ok:false, erro:'texto em português' }.
   Não dependem do 3D nem do navegador (testáveis em Node).
   ============================================================ */
(function (root) {
  const ABT = root.ABT = root.ABT || {};
  const A = ABT.Agenda, T = ABT.Torneio;

  const ok = (extra) => Object.assign({ ok: true }, extra || {});
  const erro = (texto) => ({ ok: false, erro: texto });
  const p2 = (n) => String(n).padStart(2, '0');
  const stamp = (now) => `${ABT.dk(now)}T${p2(now.getHours())}:${p2(now.getMinutes())}`;
  const uid = (pre) => (ABT.Data ? ABT.Data.uid(pre) : pre + '_' + Math.random().toString(36).slice(2, 9));
  const num = (v) => (v === '' || v == null ? NaN : Number(String(v).replace(',', '.')));
  const money = (v) => Math.round(v * 100) / 100;
  const ehData = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(ABT.parseDK(s).getTime());
  const ehHora = (s) => /^\d{1,2}:\d{2}$/.test(s || '');

  const TIPOS_PESSOA = { professor: 'Professor', aluno: 'Aluno', locatario: 'Locatário', dayuse: 'Day use', visitante: 'Visitante', funcionario: 'Equipe' };
  const PAGAMENTO = { em_dia: 'Em dia', pendente: 'Pendente', atrasado: 'Atrasado' };
  const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', cartao: 'Cartão' };
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const sobrepoe = (a1, a2, b1, b2) => a1 < b2 - 1e-9 && b1 < a2 - 1e-9;

  const R = ABT.Regras = { TIPOS_PESSOA, PAGAMENTO, FORMAS, DIAS };

  /* =====================================================
     PIN do modo Organização (D11): trava de tela, não é segurança forte
     ===================================================== */
  R.hash = (texto) => { // cyrb53
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < texto.length; i++) { const c = texto.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };
  R.temPin = (s) => !!s.config.pinHash;
  R.definirPin = (s, pin) => {
    if (!/^\d{4,8}$/.test(String(pin || ''))) return erro('O PIN precisa ter de 4 a 8 números.');
    const salt = Math.random().toString(36).slice(2, 10);
    s.config.pinSalt = salt; s.config.pinHash = R.hash(salt + ':' + pin);
    return ok();
  };
  R.verificarPin = (s, pin) => !s.config.pinHash || R.hash(s.config.pinSalt + ':' + String(pin)) === s.config.pinHash;
  R.removerPin = (s) => { s.config.pinHash = null; s.config.pinSalt = ''; return ok(); };

  /** Configurações simples (Dados e configurações). */
  R.salvarConfig = (s, o) => {
    const int = (v, a, b, nome) => { const n = parseInt(v, 10); return isNaN(n) || n < a || n > b ? `${nome}: digite um número de ${a} a ${b}.` : null; };
    const e = int(o.diasAvisoBackup, 1, 60, 'Dias para avisar o backup') || int(o.diasLimpezaAtrasada, 1, 30, 'Dias para limpeza atrasada') || int(o.anuncioSegundos, 3, 60, 'Segundos por aviso');
    if (e) return erro(e);
    const nome = (o.nomeArena || '').trim(); if (!nome) return erro('Dê um nome para a arena.');
    Object.assign(s.config, { nomeArena: nome, diasAvisoBackup: parseInt(o.diasAvisoBackup, 10), diasLimpezaAtrasada: parseInt(o.diasLimpezaAtrasada, 10), anuncioSegundos: parseInt(o.anuncioSegundos, 10), placarIlustrativo: !!o.placarIlustrativo });
    return ok();
  };

  /* =====================================================
     Preços do aluguel (D35): faixa × tipo de dia × duração; feriados; day use
     ===================================================== */
  R.tipoDia = (s, data) => {
    const dk = typeof data === 'string' ? data : ABT.dk(data);
    if ((s.feriados || []).some((f) => f.data === dk)) return 'feriado';
    const w = ABT.parseDK(dk).getDay();
    return w === 0 || w === 6 ? 'fimsemana' : 'util';
  };
  R.TIPOS_DIA = { util: 'Dia útil', fimsemana: 'Fim de semana', feriado: 'Feriado' };
  R.DURACOES = [1, 1.5, 2];
  R.faixaDe = (s, hora) => (s.config.faixas || []).find((f) => hora >= f.de && hora < f.ate) || null;
  /** Preço sugerido para um aluguel. null se a tabela não tiver o valor (a tabela começa vazia). */
  R.precoSugerido = (s, data, inicio, fim) => {
    const ini = ABT.parseHM(inicio), dur = ABT.parseHM(fim) - ini;
    const faixa = R.faixaDe(s, ini); if (!faixa || dur <= 0) return null;
    const dia = R.tipoDia(s, data);
    const linhas = (s.tabela_precos || []).filter((x) => x.faixa === faixa.id && x.tipoDia === dia && x.valor != null && x.valor !== '');
    const exata = linhas.find((x) => Math.abs(x.duracao - dur) < 1e-9);
    if (exata) return money(Number(exata.valor));
    const hora = linhas.find((x) => x.duracao === 1);
    return hora ? money(Number(hora.valor) * dur) : null;
  };
  R.salvarPreco = (s, faixa, tipoDia, duracao, valor) => {
    s.tabela_precos = s.tabela_precos || [];
    const i = s.tabela_precos.findIndex((x) => x.faixa === faixa && x.tipoDia === tipoDia && x.duracao === duracao);
    const v = num(valor);
    if (valor === '' || valor == null) { if (i >= 0) s.tabela_precos.splice(i, 1); return ok(); }
    if (isNaN(v) || v < 0) return erro('Digite um valor em reais, por exemplo 80 ou 80,50.');
    if (i >= 0) s.tabela_precos[i].valor = money(v); else s.tabela_precos.push({ faixa, tipoDia, duracao, valor: money(v) });
    return ok();
  };
  R.valorTabela = (s, faixa, tipoDia, duracao) => { const x = (s.tabela_precos || []).find((q) => q.faixa === faixa && q.tipoDia === tipoDia && q.duracao === duracao); return x ? x.valor : ''; };
  R.salvarFeriado = (s, data, nome) => {
    if (!ehData(data)) return erro('Data inválida.');
    s.feriados = s.feriados || [];
    if (s.feriados.some((f) => f.data === data)) return erro('Esse feriado já está na lista.');
    s.feriados.push({ id: uid('fe'), data, nome: (nome || '').trim() || 'Feriado' });
    s.feriados.sort((a, b) => a.data.localeCompare(b.data));
    return ok();
  };
  R.removerFeriado = (s, id) => { s.feriados = (s.feriados || []).filter((f) => f.id !== id); return ok(); };
  R.salvarValorDayUse = (s, valor) => { const v = num(valor); if (isNaN(v) || v < 0) return erro('Valor inválido.'); s.config.valorDayUse = money(v); return ok(); };

  /* =====================================================
     Agenda: conflitos, horários avulsos, turmas
     ===================================================== */
  R.dentroDoHorario = (s, data, ini, fim) => {
    const [abre, fecha] = A.hoursFor(s, ABT.parseDK(data));
    return ini >= abre && fim <= fecha;
  };

  /** Blocos que ocupam a quadra no mesmo horário. ignorar: { horarioId, turmaId, jogoId }. */
  R.conflitos = (s, o) => {
    const ini = ABT.parseHM(o.inicio), fim = ABT.parseHM(o.fim), ig = o.ignorar || {};
    const date = ABT.parseDK(o.data), out = [];
    A.slotsDaQuadra(s, date, o.quadra).forEach((sl) => {
      if (ig.horarioId && sl.fonte === 'horario' && sl.ref.id === ig.horarioId) return;
      if (ig.turmaId && sl.fonte === 'turma' && sl.ref.id === ig.turmaId) return;
      if (ig.jogoId && sl.fonte === 'jogo' && sl.ref.id === ig.jogoId) return;
      if (sl.fonte === 'horario' && ig.turmaId && sl.ref.turmaId === ig.turmaId) return;
      if (!sobrepoe(ini, fim, sl.ini, sl.fim)) return;
      const quem = (sl.ref.pessoas || []).map((id) => { const p = s.pessoas.find((x) => x.id === id); return p ? (p.apelido || p.nome) : ''; }).filter(Boolean).join(', ');
      const nome = sl.fonte === 'turma' ? sl.ref.nome : sl.fonte === 'jogo' ? `${sl.camp.nome} · ${T.rotuloJogo(sl.ref)}` : (sl.tipo === 'bloqueio' ? (sl.ref.obs || '') : quem);
      out.push({ fonte: sl.fonte, tipo: sl.tipo, id: sl.ref.id, texto: `${A.NOME_TIPO[sl.tipo]}${nome ? ' (' + nome + ')' : ''} ${ABT.fmtHM(sl.ini)}–${ABT.fmtHM(sl.fim)}` });
    });
    return out;
  };
  /** Aviso (não bloqueia): o horário cai dentro de uma sessão de day use. */
  R.avisoDayUse = (s, data, inicio, fim) => {
    const ini = ABT.parseHM(inicio), fim2 = ABT.parseHM(fim);
    const ses = (s.dayuse_sessoes || []).find((x) => x.data === data && sobrepoe(ini, fim2, ABT.parseHM(x.inicio), ABT.parseHM(x.fim)));
    return ses ? 'Neste horário há day use. A quadra deixa de receber day use enquanto durar a reserva.' : null;
  };

  function validarHorarioBase(s, o) {
    if (![1, 2, 3, 4].includes(Number(o.quadra))) return 'Escolha a quadra (1 a 4).';
    if (!ehData(o.data)) return 'Data inválida.';
    if (!ehHora(o.inicio) || !ehHora(o.fim)) return 'Informe o horário de início e de fim.';
    const ini = ABT.parseHM(o.inicio), fim = ABT.parseHM(o.fim);
    if (fim <= ini) return 'O horário de fim precisa ser depois do início.';
    if (!R.dentroDoHorario(s, o.data, ini, fim)) {
      const [a, f] = A.hoursFor(s, ABT.parseDK(o.data));
      return `Fora do funcionamento: nesse dia a arena abre das ${ABT.fmtHM(a)} às ${ABT.fmtHM(f)}.`;
    }
    return null;
  }

  /** Cria ou altera um horário avulso (aluguel, aula avulsa ou bloqueio). */
  R.salvarHorario = (s, o) => {
    const tipo = o.tipo || 'aluguel';
    if (!['aluguel', 'aula', 'bloqueio'].includes(tipo)) return erro('Tipo de horário inválido.');
    const e = validarHorarioBase(s, o); if (e) return erro(e);
    const pessoas = (o.pessoas || []).filter(Boolean);
    if (tipo === 'aluguel' && pessoas.length > 4) return erro('Um aluguel tem no máximo 4 jogadores.');
    if (tipo === 'aula') {
      if (!o.professorId || !s.pessoas.find((p) => p.id === o.professorId)) return erro('Escolha o professor da aula.');
      const min = s.config.aulaMin || 1, max = s.config.aulaMax || 6;
      if (pessoas.length < min) return erro(`A aula precisa de pelo menos ${min} aluno${min > 1 ? 's' : ''}.`);
      if (pessoas.length > max) return erro(`A aula aceita no máximo ${max} alunos.`);
    }
    const c = R.conflitos(s, { quadra: Number(o.quadra), data: o.data, inicio: o.inicio, fim: o.fim, ignorar: { horarioId: o.id } });
    if (c.length) return erro('Essa quadra já está ocupada nesse horário: ' + c.map((x) => x.texto).join('; ') + '.');
    let h = o.id && s.horarios.find((x) => x.id === o.id);
    if (o.id && !h) return erro('Horário não encontrado.');
    if (!h) { h = { id: uid('h') }; s.horarios.push(h); }
    let preco = o.preco === undefined || o.preco === '' ? null : num(o.preco);
    if (preco != null && (isNaN(preco) || preco < 0)) return erro('Valor inválido.');
    if (tipo === 'aluguel' && preco == null && o.preco === undefined) preco = R.precoSugerido(s, o.data, o.inicio, o.fim);
    Object.assign(h, { quadra: Number(o.quadra), data: o.data, inicio: ABT.fmtHM(ABT.parseHM(o.inicio)), fim: ABT.fmtHM(ABT.parseHM(o.fim)), tipo,
      pessoas, preco: tipo === 'aluguel' ? preco : null, obs: (o.obs || '').trim(), pago: tipo === 'aluguel' ? !!o.pago : false });
    if (tipo === 'aula') h.professorId = o.professorId; else delete h.professorId;
    delete h.cancelado;
    return ok({ id: h.id, aviso: R.avisoDayUse(s, o.data, o.inicio, o.fim) });
  };
  R.cancelarHorario = (s, id) => {
    const h = s.horarios.find((x) => x.id === id); if (!h) return erro('Horário não encontrado.');
    if (h.turmaId) { h.cancelado = true; return ok(); }
    h.cancelado = true; return ok();
  };
  R.excluirHorario = (s, id) => { const n = s.horarios.length; s.horarios = s.horarios.filter((x) => x.id !== id); return n === s.horarios.length ? erro('Horário não encontrado.') : ok(); };
  /** Repete um horário avulso nas próximas semanas, pulando datas em conflito. */
  R.repetirHorario = (s, id, semanas) => {
    const h = s.horarios.find((x) => x.id === id); if (!h) return erro('Horário não encontrado.');
    const n = Math.max(1, Math.min(26, parseInt(semanas, 10) || 0));
    let criados = 0; const pulados = [];
    for (let i = 1; i <= n; i++) {
      const data = ABT.dk(ABT.addDays(ABT.parseDK(h.data), 7 * i));
      const r = R.salvarHorario(s, { tipo: h.tipo, quadra: h.quadra, data, inicio: h.inicio, fim: h.fim, pessoas: h.pessoas, professorId: h.professorId, obs: h.obs });
      if (r.ok) criados++; else pulados.push(data);
    }
    return ok({ criados, pulados });
  };

  /** Turma que se repete toda semana (D04). */
  R.salvarTurma = (s, t, now) => {
    const nome = (t.nome || '').trim(); if (!nome) return erro('Dê um nome para a turma.');
    if (!t.professorId || !s.pessoas.find((p) => p.id === t.professorId)) return erro('Escolha o professor.');
    const alunos = (t.alunos || []).filter(Boolean), min = s.config.aulaMin || 1, max = s.config.aulaMax || 6;
    if (alunos.length < min) return erro(`A turma precisa de pelo menos ${min} aluno${min > 1 ? 's' : ''}.`);
    if (alunos.length > max) return erro(`A turma aceita no máximo ${max} alunos.`);
    const dias = (t.diasSemana || []).map(Number).filter((d) => d >= 0 && d <= 6);
    if (!dias.length) return erro('Marque pelo menos um dia da semana.');
    if (![1, 2, 3, 4].includes(Number(t.quadra))) return erro('Escolha a quadra (1 a 4).');
    if (!ehHora(t.inicio) || !ehHora(t.fim) || ABT.parseHM(t.fim) <= ABT.parseHM(t.inicio)) return erro('Horário inválido: o fim precisa ser depois do início.');
    const ini = ABT.parseHM(t.inicio), fim = ABT.parseHM(t.fim);
    for (const d of dias) { // cabe no funcionamento daquele dia da semana?
      const [a, f] = (d === 0 || d === 6) ? s.config.horario.fimSemana : s.config.horario.semana;
      if (ini < a || fim > f) return erro(`${DIAS[d]}: a arena abre das ${ABT.fmtHM(a)} às ${ABT.fmtHM(f)}.`);
    }
    const base = now || new Date(); const ruins = [];
    for (let i = 0; i < 56; i++) { // próximas 8 semanas
      const d = ABT.addDays(base, i); if (!dias.includes(d.getDay())) continue;
      const c = R.conflitos(s, { quadra: Number(t.quadra), data: ABT.dk(d), inicio: t.inicio, fim: t.fim, ignorar: { turmaId: t.id } });
      if (c.length) { ruins.push(`${DIAS[d.getDay()]} ${ABT.dk(d).slice(8)}/${ABT.dk(d).slice(5, 7)}: ${c[0].texto}`); if (ruins.length >= 3) break; }
    }
    if (ruins.length) return erro('Conflito de quadra: ' + ruins.join('; ') + '.');
    let x = t.id && s.turmas.find((q) => q.id === t.id);
    if (t.id && !x) return erro('Turma não encontrada.');
    if (!x) { x = { id: uid('t') }; s.turmas.push(x); }
    Object.assign(x, { nome, professorId: t.professorId, alunos, diasSemana: dias.sort(), inicio: ABT.fmtHM(ini), fim: ABT.fmtHM(fim), quadra: Number(t.quadra), ativa: t.ativa !== false });
    delete x.diaSemana;
    return ok({ id: x.id });
  };
  R.excluirTurma = (s, id) => { const n = s.turmas.length; s.turmas = s.turmas.filter((x) => x.id !== id); s.horarios = s.horarios.filter((h) => h.turmaId !== id); return n === s.turmas.length ? erro('Turma não encontrada.') : ok(); };
  /** Cancela a aula da turma só num dia (feriado, professor ausente). */
  R.cancelarTurmaNoDia = (s, turmaId, data) => {
    const t = s.turmas.find((x) => x.id === turmaId); if (!t) return erro('Turma não encontrada.');
    if (!(t.diasSemana || []).includes(ABT.parseDK(data).getDay())) return erro('A turma não tem aula nesse dia.');
    const ex = s.horarios.find((h) => h.turmaId === turmaId && h.data === data);
    if (ex) { ex.cancelado = true; return ok(); }
    s.horarios.push({ id: uid('h'), turmaId, quadra: t.quadra, data, inicio: t.inicio, fim: t.fim, tipo: 'aula', professorId: t.professorId, pessoas: t.alunos.slice(), preco: null, obs: 'Aula cancelada', cancelado: true });
    return ok();
  };
  R.restaurarTurmaNoDia = (s, turmaId, data) => { s.horarios = s.horarios.filter((h) => !(h.turmaId === turmaId && h.data === data)); return ok(); };
  /** Muda a aula da turma só num dia (outro horário ou outra quadra). */
  R.moverTurmaNoDia = (s, turmaId, data, o) => {
    const t = s.turmas.find((x) => x.id === turmaId); if (!t) return erro('Turma não encontrada.');
    const base = { quadra: Number(o.quadra || t.quadra), data, inicio: o.inicio || t.inicio, fim: o.fim || t.fim };
    const e = validarHorarioBase(s, base); if (e) return erro(e);
    const c = R.conflitos(s, Object.assign({ ignorar: { turmaId } }, base));
    if (c.length) return erro('Essa quadra já está ocupada nesse horário: ' + c.map((x) => x.texto).join('; ') + '.');
    s.horarios = s.horarios.filter((h) => !(h.turmaId === turmaId && h.data === data));
    s.horarios.push(Object.assign({ id: uid('h'), turmaId, tipo: 'aula', professorId: t.professorId, pessoas: t.alunos.slice(), preco: null, obs: '' }, base));
    return ok();
  };

  /* =====================================================
     Pessoas e alunos
     ===================================================== */
  R.salvarPessoa = (s, p) => {
    const nome = (p.nome || '').trim(); if (!nome) return erro('Digite o nome.');
    if (!TIPOS_PESSOA[p.tipo]) return erro('Escolha o tipo da pessoa.');
    const nasc = (p.nascimento || '').trim();
    if (nasc && !ehData(nasc)) return erro('Data de nascimento inválida.'); // D44: opcional
    let x = p.id && s.pessoas.find((q) => q.id === p.id);
    if (p.id && !x) return erro('Pessoa não encontrada.');
    if (!x) { x = { id: uid('p'), boneco: null }; s.pessoas.push(x); }
    Object.assign(x, { nome, apelido: (p.apelido || '').trim() || nome.split(' ')[0], tipo: p.tipo, contato: (p.contato || '').trim(), nascimento: nasc });
    if (p.boneco !== undefined) x.boneco = p.boneco;
    if (x.tipo === 'aluno' && !s.alunos.find((a) => a.pessoaId === x.id)) s.alunos.push({ pessoaId: x.id, plano: '', contrato: '', pagamento: 'em_dia', obs: '' });
    return ok({ id: x.id });
  };
  R.salvarAluno = (s, pessoaId, d) => {
    const pe = s.pessoas.find((x) => x.id === pessoaId); if (!pe) return erro('Pessoa não encontrada.');
    let a = s.alunos.find((x) => x.pessoaId === pessoaId); if (!a) { a = { pessoaId, plano: '', contrato: '', pagamento: 'em_dia', obs: '' }; s.alunos.push(a); }
    if (d.pagamento !== undefined) { if (!PAGAMENTO[d.pagamento]) return erro('Situação de pagamento inválida.'); a.pagamento = d.pagamento; }
    if (d.plano !== undefined) a.plano = String(d.plano).trim();
    if (d.obs !== undefined) a.obs = String(d.obs).trim();
    if (d.contrato !== undefined) { // contrato fica no Drive: só guardamos o link (D14)
      const l = String(d.contrato).trim();
      if (l && !/^https?:\/\//i.test(l)) return erro('O link do contrato precisa começar com http:// ou https://');
      a.contrato = l;
    }
    return ok();
  };
  R.salvarBoneco = (s, pessoaId, look) => { const p = s.pessoas.find((x) => x.id === pessoaId); if (!p) return erro('Pessoa não encontrada.'); p.boneco = look || null; return ok(); };
  R.usosDaPessoa = (s, id) => {
    const u = [];
    const h = s.horarios.filter((x) => !x.cancelado && ((x.pessoas || []).includes(id) || x.professorId === id)).length; if (h) u.push(`${h} horário${h > 1 ? 's' : ''}`);
    const t = s.turmas.filter((x) => x.professorId === id || (x.alunos || []).includes(id)).length; if (t) u.push(`${t} turma${t > 1 ? 's' : ''}`);
    const c = s.campeonatos.filter((x) => x.duplas.some((d) => d.p1 === id || d.p2 === id)).length; if (c) u.push(`${c} campeonato${c > 1 ? 's' : ''}`);
    const d = s.dayuse_presencas.filter((x) => x.pessoaId === id && x.status !== 'saiu').length; if (d) u.push('day use de hoje');
    return u;
  };
  R.removerPessoa = (s, id) => {
    const u = R.usosDaPessoa(s, id);
    if (u.length) return erro('Não dá para apagar: essa pessoa está em ' + u.join(', ') + '. Tire dali primeiro.');
    s.pessoas = s.pessoas.filter((p) => p.id !== id); s.alunos = s.alunos.filter((a) => a.pessoaId !== id);
    s.dayuse_presencas = s.dayuse_presencas.filter((x) => x.pessoaId !== id);
    return ok();
  };

  /* =====================================================
     Placar manual (D46 = A): a recepção digita; nada de placar inventado
     ===================================================== */
  R.chaveAluguel = (quadra, data, inicio) => `a|${quadra}|${data}|${inicio}`;
  R.chaveDayUse = (sessaoId, quadra, jogadores) => `d|${sessaoId}|${quadra}|${jogadores.join(',')}`;
  R.placar = (s, quadra, chave) => (s.placares || []).find((x) => x.quadra === quadra && x.chave === chave) || null;
  R.placarMais = (s, quadra, chave, lado, delta) => {
    s.placares = s.placares || [];
    let x = R.placar(s, quadra, chave);
    if (!x) { x = { id: uid('pl'), quadra, chave, a: 0, b: 0 }; s.placares.push(x); }
    const k = lado === 'b' ? 'b' : 'a';
    x[k] = Math.max(0, Math.min(99, x[k] + (delta || 1)));
    return ok({ a: x.a, b: x.b });
  };
  R.placarZerar = (s, quadra, chave) => { s.placares = (s.placares || []).filter((x) => !(x.quadra === quadra && x.chave === chave)); return ok(); };
  R.limparPlacaresAntigos = (s, now) => {
    const lim = ABT.dk(ABT.addDays(now, -2)); // placar de aluguel/day use só vale no dia
    s.placares = (s.placares || []).filter((x) => { const m = x.chave.split('|'); const d = x.chave[0] === 'a' ? m[2] : null; return !d || d >= lim; });
  };

  /* =====================================================
     Day use manual (D07, D28): uma fila por quadra, a recepção faz a fila andar
     ===================================================== */
  R.sessaoDoDia = (s, data) => s.dayuse_sessoes.find((x) => x.data === data) || null;
  R.abrirSessaoDayUse = (s, o) => {
    if (!ehData(o.data)) return erro('Data inválida.');
    if (R.sessaoDoDia(s, o.data)) return erro('Já existe uma sessão de day use nesse dia.');
    const inicio = o.inicio || '17:00', fim = o.fim || '21:00';
    if (ABT.parseHM(fim) <= ABT.parseHM(inicio)) return erro('O fim precisa ser depois do início.');
    if (!R.dentroDoHorario(s, o.data, ABT.parseHM(inicio), ABT.parseHM(fim))) return erro('Fora do horário de funcionamento da arena.');
    const id = uid('du');
    s.dayuse_sessoes.push({ id, data: o.data, inicio, fim, valor: o.valor != null ? money(num(o.valor)) : s.config.valorDayUse });
    return ok({ id });
  };
  R.fimDaSessao = (s, id) => { s.dayuse_presencas.filter((x) => x.sessaoId === id && x.status !== 'saiu').forEach((x) => { x.status = 'saiu'; }); return ok(); };

  const presDaQuadra = (s, sessaoId, quadra) => s.dayuse_presencas.filter((x) => x.sessaoId === sessaoId && x.quadra === quadra && x.status !== 'saiu');
  /** Deixa a fila da quadra em ordem 1..n e completa a quadra com quem está esperando. */
  R.renumerar = (s, sessaoId, quadra) => {
    const pres = presDaQuadra(s, sessaoId, quadra);
    const ord = (st) => pres.filter((x) => x.status === st).sort((a, b) => (a.posicao || 0) - (b.posicao || 0));
    const jogam = ord('quadra'), fila = ord('fila');
    while (jogam.length < 4 && fila.length) { const x = fila.shift(); x.status = 'quadra'; jogam.push(x); }
    jogam.forEach((x, i) => { x.posicao = i + 1; }); fila.forEach((x, i) => { x.posicao = i + 1; });
  };
  /** Chegou alguém: entra no fim da fila da quadra e (por padrão) paga o day use (D36). */
  R.chegouDayUse = (s, sessaoId, pessoaId, quadra, o, now) => {
    const ses = s.dayuse_sessoes.find((x) => x.id === sessaoId); if (!ses) return erro('Sessão de day use não encontrada.');
    const pe = s.pessoas.find((x) => x.id === pessoaId); if (!pe) return erro('Escolha a pessoa.');
    if (![1, 2, 3, 4].includes(Number(quadra))) return erro('Escolha a quadra (1 a 4).');
    if (s.dayuse_presencas.some((x) => x.sessaoId === sessaoId && x.pessoaId === pessoaId && x.status !== 'saiu')) return erro(`${pe.apelido || pe.nome} já está no day use.`);
    const opt = o || {};
    if (opt.cobrar !== false && !FORMAS[opt.forma]) return erro('Escolha a forma de pagamento (dinheiro, Pix ou cartão).');
    const q = Number(quadra), pres = presDaQuadra(s, sessaoId, q);
    const st = pres.filter((x) => x.status === 'quadra').length < 4 && !pres.some((x) => x.status === 'fila') ? 'quadra' : 'fila';
    const pos = pres.filter((x) => x.status === st).length + 1;
    const id = uid('pr');
    s.dayuse_presencas.push({ id, sessaoId, pessoaId, status: st, quadra: q, posicao: pos });
    if (opt.cobrar !== false) s.vendas.push({ id: uid('v'), quando: stamp(now), tipo: 'dayuse', itemId: null, nome: `Day use · ${pe.apelido || pe.nome}`, qtd: 1, preco: ses.valor, total: ses.valor, forma: opt.forma, obs: '' });
    R.renumerar(s, sessaoId, q);
    return ok({ id, status: s.dayuse_presencas.find((x) => x.id === id).status });
  };
  R.sairDayUse = (s, presencaId) => {
    const x = s.dayuse_presencas.find((q) => q.id === presencaId); if (!x) return erro('Presença não encontrada.');
    x.status = 'saiu'; R.renumerar(s, x.sessaoId, x.quadra); return ok();
  };
  R.moverDayUse = (s, presencaId, quadraDestino) => {
    const x = s.dayuse_presencas.find((q) => q.id === presencaId); if (!x || x.status === 'saiu') return erro('Presença não encontrada.');
    const q = Number(quadraDestino); if (![1, 2, 3, 4].includes(q)) return erro('Quadra inválida.');
    if (q === x.quadra) return ok();
    const de = x.quadra; x.quadra = q; x.status = 'fila'; x.posicao = 999;
    R.renumerar(s, x.sessaoId, de); R.renumerar(s, x.sessaoId, q); return ok();
  };
  /** Fila: sobe/desce uma posição. */
  R.moverNaFila = (s, presencaId, delta) => {
    const x = s.dayuse_presencas.find((q) => q.id === presencaId); if (!x || x.status !== 'fila') return erro('Só quem está na fila pode mudar de posição.');
    const fila = presDaQuadra(s, x.sessaoId, x.quadra).filter((q) => q.status === 'fila').sort((a, b) => a.posicao - b.posicao);
    const i = fila.indexOf(x), j = i + delta; if (j < 0 || j >= fila.length) return ok();
    [fila[i].posicao, fila[j].posicao] = [fila[j].posicao, fila[i].posicao]; return ok();
  };
  /** Terminou a partida: para cada um dos jogadores, 'saiu', 'continua' (vai para o fim da fila) ou 'fica' (segue na quadra). */
  R.fimDePartida = (s, sessaoId, quadra, decisoes) => {
    const q = Number(quadra), pres = presDaQuadra(s, sessaoId, q);
    const jogam = pres.filter((x) => x.status === 'quadra').sort((a, b) => a.posicao - b.posicao);
    if (jogam.length < 4) return erro('Só dá para encerrar a partida com 4 jogadores na quadra.');
    let fim = Math.max(0, ...pres.filter((x) => x.status === 'fila').map((x) => x.posicao));
    const d = decisoes || {};
    jogam.forEach((x) => {
      const dec = d[x.pessoaId] || d[x.id] || 'continua';
      if (dec === 'saiu') { x.status = 'saiu'; }
      else if (dec === 'continua') { x.status = 'fila'; x.posicao = ++fim; }
    });
    s.placares = (s.placares || []).filter((p) => !(p.quadra === q && p.chave.startsWith('d|' + sessaoId + '|')));
    R.renumerar(s, sessaoId, q);
    return ok();
  };
  R.situacaoDayUse = (s, sessaoId) => [1, 2, 3, 4].map((q) => {
    const pres = presDaQuadra(s, sessaoId, q), pe = (x) => s.pessoas.find((p) => p.id === x.pessoaId);
    const ord = (st) => pres.filter((x) => x.status === st).sort((a, b) => a.posicao - b.posicao);
    return { quadra: q, jogam: ord('quadra').map((x) => ({ id: x.id, pessoaId: x.pessoaId, nome: A.nomeTV(pe(x)) })), fila: ord('fila').map((x) => ({ id: x.id, pessoaId: x.pessoaId, nome: A.nomeTV(pe(x)) })) };
  });

  /* =====================================================
     Vendas (D27): registro manual, lojinha e lanchonete
     ===================================================== */
  R.registrarVenda = (s, o, now) => {
    const forma = o.forma; if (!FORMAS[forma]) return erro('Escolha a forma de pagamento.');
    const qtd = Math.max(1, parseInt(o.qtd, 10) || 1);
    let nome, preco, itemId = o.itemId || null;
    if (o.tipo === 'lojinha') {
      const p = s.produtos.find((x) => x.id === itemId); if (!p) return erro('Produto não encontrado.');
      if (p.disponivel === false) return erro(`${p.nome} está marcado como indisponível.`);
      if (p.estoque != null && p.estoque < qtd) return erro(`Só restam ${p.estoque} de ${p.nome} no estoque.`);
      nome = p.nome; preco = p.preco; if (p.estoque != null) p.estoque -= qtd;
    } else if (o.tipo === 'lanchonete') {
      const c = s.cardapio.find((x) => x.id === itemId); if (!c) return erro('Item não encontrado.');
      if (c.disponivel === false) return erro(`${c.nome} está indisponível.`);
      nome = c.nome; preco = c.preco;
    } else {
      nome = (o.nome || '').trim(); preco = num(o.preco);
      if (!nome) return erro('Descreva a venda.');
      if (isNaN(preco) || preco < 0) return erro('Valor inválido.');
      itemId = null;
    }
    const v = { id: uid('v'), quando: stamp(now), tipo: o.tipo || 'outro', itemId, nome, qtd, preco: money(preco), total: money(preco * qtd), forma, obs: (o.obs || '').trim() };
    s.vendas.push(v);
    return ok({ id: v.id, total: v.total });
  };
  R.estornarVenda = (s, id) => {
    const v = s.vendas.find((x) => x.id === id); if (!v) return erro('Venda não encontrada.');
    if (v.tipo === 'lojinha') { const p = s.produtos.find((x) => x.id === v.itemId); if (p && p.estoque != null) p.estoque += v.qtd; }
    s.vendas = s.vendas.filter((x) => x.id !== id); return ok();
  };
  R.resumoVendas = (s, dk) => {
    const lista = s.vendas.filter((v) => (v.quando || '').slice(0, 10) === dk);
    const r = { dk, qtd: lista.length, total: 0, porForma: {}, porTipo: {}, itens: [], lista: lista.slice().sort((a, b) => b.quando.localeCompare(a.quando)) };
    const mapa = {};
    lista.forEach((v) => {
      r.total += v.total; r.porForma[v.forma] = money((r.porForma[v.forma] || 0) + v.total); r.porTipo[v.tipo] = money((r.porTipo[v.tipo] || 0) + v.total);
      const k = v.tipo + '|' + v.nome; mapa[k] = mapa[k] || { nome: v.nome, tipo: v.tipo, qtd: 0, total: 0 }; mapa[k].qtd += v.qtd; mapa[k].total += v.total;
    });
    r.total = money(r.total); r.itens = Object.values(mapa).sort((a, b) => b.total - a.total);
    return r;
  };

  /* produtos, cardápio e equipamentos */
  const nomePrecoOk = (o) => {
    const nome = (o.nome || '').trim(); if (!nome) return { e: 'Digite o nome.' };
    const preco = num(o.preco); if (isNaN(preco) || preco < 0) return { e: 'Digite o preço em reais, por exemplo 6 ou 6,50.' };
    return { nome, preco: money(preco) };
  };
  R.salvarProduto = (s, o) => {
    const v = nomePrecoOk(o); if (v.e) return erro(v.e);
    const est = o.estoque === '' || o.estoque == null ? null : parseInt(o.estoque, 10);
    if (est != null && (isNaN(est) || est < 0)) return erro('Estoque inválido.');
    let x = o.id && s.produtos.find((q) => q.id === o.id); if (o.id && !x) return erro('Produto não encontrado.');
    if (!x) { x = { id: uid('pr') }; s.produtos.push(x); }
    Object.assign(x, { nome: v.nome, preco: v.preco, estoque: est, disponivel: o.disponivel !== false });
    if (o.minimo !== undefined) { const m = o.minimo === '' || o.minimo == null ? null : parseInt(o.minimo, 10); x.minimo = isNaN(m) ? null : m; }
    return ok({ id: x.id });
  };
  R.salvarCardapio = (s, o) => {
    const v = nomePrecoOk(o); if (v.e) return erro(v.e);
    let x = o.id && s.cardapio.find((q) => q.id === o.id); if (o.id && !x) return erro('Item não encontrado.');
    if (!x) { x = { id: uid('c') }; s.cardapio.push(x); }
    Object.assign(x, { nome: v.nome, preco: v.preco, categoria: (o.categoria || '').trim() || 'Outros', disponivel: o.disponivel !== false });
    return ok({ id: x.id });
  };
  R.removerProduto = (s, id) => { s.produtos = s.produtos.filter((x) => x.id !== id); return ok(); };
  R.removerCardapio = (s, id) => { s.cardapio = s.cardapio.filter((x) => x.id !== id); return ok(); };
  R.alternarDisponivel = (s, colecao, id) => { const x = (colecao === 'cardapio' ? s.cardapio : s.produtos).find((q) => q.id === id); if (!x) return erro('Item não encontrado.'); x.disponivel = x.disponivel === false; return ok({ disponivel: x.disponivel }); };
  R.ajustarEstoque = (s, colecao, id, delta) => {
    const x = (colecao === 'equip' ? s.equipamentos : s.produtos).find((q) => q.id === id); if (!x) return erro('Item não encontrado.');
    const k = colecao === 'equip' ? 'quantidade' : 'estoque';
    x[k] = Math.max(0, (x[k] || 0) + delta); return ok({ valor: x[k] });
  };
  R.salvarEquipamento = (s, o) => {
    const nome = (o.nome || '').trim(); if (!nome) return erro('Digite o nome.');
    const q = parseInt(o.quantidade, 10), m = parseInt(o.minimo, 10);
    if (isNaN(q) || q < 0) return erro('Quantidade inválida.'); if (isNaN(m) || m < 0) return erro('Mínimo inválido.');
    let x = o.id && s.equipamentos.find((e) => e.id === o.id); if (o.id && !x) return erro('Item não encontrado.');
    if (!x) { x = { id: uid('e') }; s.equipamentos.push(x); }
    Object.assign(x, { nome, quantidade: q, minimo: m }); return ok({ id: x.id });
  };
  R.removerEquipamento = (s, id) => { s.equipamentos = s.equipamentos.filter((x) => x.id !== id); return ok(); };
  /** Itens com estoque abaixo do mínimo (bolinhas, raquetes e produtos com mínimo). */
  R.estoqueBaixo = (s) => {
    const out = [];
    s.equipamentos.forEach((e) => { if (e.quantidade < e.minimo) out.push({ tipo: 'equip', id: e.id, nome: e.nome, atual: e.quantidade, minimo: e.minimo }); });
    s.produtos.forEach((p) => { if (p.minimo != null && p.estoque != null && p.estoque < p.minimo) out.push({ tipo: 'produto', id: p.id, nome: p.nome, atual: p.estoque, minimo: p.minimo }); });
    return out;
  };

  /* =====================================================
     Vestiário: limpeza e manutenção (D43)
     ===================================================== */
  const parseStamp = (t) => { const [d, h] = String(t).split('T'); const x = ABT.parseDK(d.slice(0, 10)); if (h) { const [hh, mm] = h.split(':').map(Number); x.setHours(hh || 0, mm || 0, 0, 0); } return x; };
  R.ultimaLimpeza = (s, local) => s.limpezas.filter((l) => l.local === (local || 'Vestiário')).sort((a, b) => b.quando.localeCompare(a.quando))[0] || null;
  /** Atrasada quando passou mais que diasLimpezaAtrasada (padrão 1 dia) desde a última limpeza. */
  R.limpezaAtrasada = (s, now, local) => {
    const u = R.ultimaLimpeza(s, local), lim = (s.config.diasLimpezaAtrasada || 1) * 86400000;
    if (!u) return { atrasada: true, nunca: true, ultima: null, horas: null };
    const dif = now.getTime() - parseStamp(u.quando).getTime();
    return { atrasada: dif > lim, nunca: false, ultima: u, horas: Math.floor(dif / 3600000) };
  };
  R.registrarLimpeza = (s, o, now) => {
    const resp = (o.responsavel || '').trim(); if (!resp) return erro('Diga quem fez a limpeza.');
    const l = (o.link || '').trim(); if (l && !/^https?:\/\//i.test(l)) return erro('O link da foto ou do checklist precisa começar com http:// ou https://');
    s.limpezas.push({ id: uid('l'), local: o.local || 'Vestiário', quando: stamp(now), responsavel: resp, link: l }); return ok();
  };
  R.registrarManutencao = (s, o, now) => {
    const d = (o.descricao || '').trim(); if (!d) return erro('Descreva o serviço feito.');
    const l = (o.link || '').trim(); if (l && !/^https?:\/\//i.test(l)) return erro('O link precisa começar com http:// ou https://');
    s.manutencoes.push({ id: uid('m'), local: o.local || 'Vestiário', quando: o.quando || ABT.dk(now), descricao: d, responsavel: (o.responsavel || '').trim(), link: l }); return ok();
  };

  /* =====================================================
     Avisos e patrocinadores (D41)
     ===================================================== */
  const linkOk = (l) => !l || /^https?:\/\//i.test(l);
  R.salvarAviso = (s, o) => {
    const texto = (o.texto || '').trim(); if (!texto) return erro('Escreva o aviso.');
    if (texto.length > 140) return erro('Aviso muito longo para a TV (máximo 140 letras).');
    if ((o.inicio && !ehData(o.inicio)) || (o.fim && !ehData(o.fim))) return erro('Data inválida.');
    if (o.inicio && o.fim && o.fim < o.inicio) return erro('A data final precisa ser depois da inicial.');
    let x = o.id && s.avisos.find((q) => q.id === o.id); if (o.id && !x) return erro('Aviso não encontrado.');
    if (!x) { x = { id: uid('av') }; s.avisos.push(x); }
    Object.assign(x, { texto, inicio: o.inicio || '', fim: o.fim || '', ativo: o.ativo !== false }); return ok({ id: x.id });
  };
  R.removerAviso = (s, id) => { s.avisos = s.avisos.filter((x) => x.id !== id); return ok(); };
  R.salvarPatrocinador = (s, o) => {
    const nome = (o.nome || '').trim(); if (!nome) return erro('Digite o nome do patrocinador.');
    const img = (o.imagem || '').trim(); if (!linkOk(img)) return erro('O link da imagem precisa começar com http:// ou https:// (link direto da imagem).');
    if ((o.inicio && !ehData(o.inicio)) || (o.fim && !ehData(o.fim))) return erro('Data inválida.');
    let x = o.id && s.patrocinadores.find((q) => q.id === o.id); if (o.id && !x) return erro('Patrocinador não encontrado.');
    if (!x) { x = { id: uid('pa') }; s.patrocinadores.push(x); }
    Object.assign(x, { nome, imagem: img, inicio: o.inicio || '', fim: o.fim || '', ativo: o.ativo !== false }); return ok({ id: x.id });
  };
  R.removerPatrocinador = (s, id) => { s.patrocinadores = s.patrocinadores.filter((x) => x.id !== id); return ok(); };

  /* =====================================================
     Campeonato: criar, agendar sem conflito, lançar resultado
     ===================================================== */
  const fasesOrdem = ['grupo', 'oitavas', 'quartas', 'semi', 'final', 'terceiro'];
  const pessoasDaDupla = (camp, id) => { const d = camp.duplas.find((x) => x.id === id); return d ? [d.p1, d.p2] : []; };

  /**
   * Distribui jogos em horários e quadras sem bater com nada que já existe na agenda
   * e sem pôr a mesma dupla em dois jogos ao mesmo tempo. Cada fase só começa depois da anterior.
   */
  R.agendarJogos = (s, camp, o) => {
    const dur = o.duracao || 1, quadras = o.quadras && o.quadras.length ? o.quadras : [1, 2, 3, 4];
    let dia = ABT.parseDK(o.data), slot = ABT.parseHM(o.inicio);
    const ocupados = {}; // "data|hora" -> Set(pessoaId) das duplas já escritas neste torneio
    const usadas = {};   // "data|hora|quadra" -> true
    const jogos = camp.jogos.slice().sort((a, b) => fasesOrdem.indexOf(a.fase) - fasesOrdem.indexOf(b.fase));
    let minimo = { dk: ABT.dk(dia), h: slot }; let limite = 0;
    for (const fase of fasesOrdem) {
      const doFase = jogos.filter((j) => j.fase === fase); if (!doFase.length) continue;
      let ultimoFim = null;
      for (const j of doFase) {
        let colocado = false;
        let d = ABT.parseDK(minimo.dk), h = minimo.h;
        for (let guarda = 0; guarda < 2000 && !colocado; guarda++) {
          const dk = ABT.dk(d), [abre, fecha] = A.hoursFor(s, d);
          if (h < abre) h = abre;
          if (h + dur > fecha + 1e-9) { d = ABT.addDays(d, 1); h = ABT.parseHM(o.inicio); if (++limite > 60) break; continue; }
          const chave = dk + '|' + h;
          const pes = (j.a ? pessoasDaDupla(camp, j.a) : []).concat(j.b ? pessoasDaDupla(camp, j.b) : []);
          const busy = ocupados[chave] || (ocupados[chave] = new Set());
          if (pes.some((p) => busy.has(p))) { h += dur; continue; }
          const q = quadras.find((qq) => !usadas[chave + '|' + qq] && !R.conflitos(s, { quadra: qq, data: dk, inicio: ABT.fmtHM(h), fim: ABT.fmtHM(h + dur), ignorar: { jogoId: j.id } }).length);
          if (q == null) { h += dur; continue; }
          usadas[chave + '|' + q] = true; pes.forEach((p) => busy.add(p));
          j.data = dk; j.quadra = q; j.inicio = ABT.fmtHM(h); j.fim = ABT.fmtHM(h + dur);
          ultimoFim = { dk, h: h + dur }; colocado = true;
        }
        if (!colocado) return erro('Não encontrei horários livres suficientes nos próximos dias. Escolha outra data ou menos jogos por dia.');
      }
      if (ultimoFim) minimo = ultimoFim; // próxima fase começa depois do último jogo desta
    }
    return ok();
  };

  /** duplas: [{ p1, p2 }] (ids de pessoas). */
  R.criarCampeonato = (s, o) => {
    const nome = (o.nome || '').trim(); if (!nome) return erro('Dê um nome ao campeonato.');
    const duplas = (o.duplas || []).filter((d) => d.p1 && d.p2);
    if (duplas.length < 3) return erro('Cadastre pelo menos 3 duplas.');
    const usados = new Set();
    for (const d of duplas) {
      if (d.p1 === d.p2) return erro('Uma dupla precisa ter duas pessoas diferentes.');
      for (const id of [d.p1, d.p2]) { if (usados.has(id)) { const p = s.pessoas.find((x) => x.id === id); return erro(`${p ? p.nome : 'Uma pessoa'} está em mais de uma dupla.`); } usados.add(id); }
    }
    if (!ehData(o.data)) return erro('Escolha a data do primeiro jogo.');
    const fmt = Object.assign({}, T.FORMATO, o.formato || {});
    const ng = Math.max(1, Math.min(8, parseInt(o.nGrupos, 10) || T.nGruposSugerido(duplas.length)));
    if (Math.floor(duplas.length / ng) < 2) return erro('Muitos grupos para poucas duplas: cada grupo precisa de pelo menos 2 duplas.');
    if (fmt.classificam > Math.floor(duplas.length / ng)) fmt.classificam = Math.floor(duplas.length / ng);
    const nm = (id) => { const p = s.pessoas.find((x) => x.id === id); return A.nomeTV(p); };
    const camp = { id: uid('c'), nome, status: 'em_andamento', formato: fmt, duplas: [], jogos: [] };
    const grupos = T.sortearGrupos(duplas.map((_, i) => 'd' + (i + 1)), ng, o.seed || Math.floor(Math.random() * 1e6));
    duplas.forEach((d, i) => camp.duplas.push({ id: 'd' + (i + 1), nome: d.nome || `${nm(d.p1)}/${nm(d.p2)}`, p1: d.p1, p2: d.p2, grupo: grupos['d' + (i + 1)] }));
    const letras = Array.from(new Set(camp.duplas.map((d) => d.grupo))).sort();
    const porRodada = [];
    letras.forEach((g) => {
      T.rodadasGrupo(camp.duplas.filter((d) => d.grupo === g).map((d) => d.id)).forEach((par, r) => {
        porRodada[r] = porRodada[r] || [];
        par.forEach(([a, b]) => porRodada[r].push({ id: `g${g}${r + 1}${porRodada[r].length}`, fase: 'grupo', grupo: g, rodada: r + 1, a, b, sets: [] }));
      });
    });
    porRodada.flat().forEach((j) => camp.jogos.push(j));
    if (letras.length > 1 || fmt.classificam < camp.duplas.length) {
      T.gerarMataMata(letras, fmt.classificam, !!fmt.terceiro).jogos.forEach((j) => { j.sets = []; camp.jogos.push(j); });
    }
    const ag = R.agendarJogos(s, camp, { data: o.data, inicio: o.inicio || '14:00', duracao: o.duracao || 1, quadras: o.quadras });
    if (!ag.ok) return ag;
    s.campeonatos.push(camp);
    return ok({ id: camp.id, jogos: camp.jogos.length });
  };
  R.excluirCampeonato = (s, id) => { const n = s.campeonatos.length; s.campeonatos = s.campeonatos.filter((c) => c.id !== id); return n === s.campeonatos.length ? erro('Campeonato não encontrado.') : ok(); };

  const acharJogo = (s, campId, jogoId) => { const c = s.campeonatos.find((x) => x.id === campId); return c ? { c, j: c.jogos.find((x) => x.id === jogoId) } : {}; };
  /** Lança o resultado: sets = [[6,3],[4,6],[10,7]]; encerrado = marcar como final do jogo. */
  R.salvarPlacarJogo = (s, campId, jogoId, sets, encerrado) => {
    const { c, j } = acharJogo(s, campId, jogoId); if (!j) return erro('Jogo não encontrado.');
    const fmt = T.formatoDe(c), limpo = [];
    for (const st of sets || []) {
      const a = Number(st[0]), b = Number(st[1]);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 99 || b > 99) return erro('Os placares precisam ser números inteiros.');
      limpo.push([a, b]);
    }
    if (limpo.length > fmt.melhorDe) return erro(`O jogo tem no máximo ${fmt.melhorDe} sets.`);
    if (encerrado) {
      const pt = T.participantes(c, j); if (!pt.a.id || !pt.b.id) return erro('Esse jogo ainda não tem as duas duplas definidas.');
      const need = Math.floor(fmt.melhorDe / 2) + 1; let sa = 0, sb = 0;
      for (let i = 0; i < limpo.length; i++) {
        const w = T.vencedorSet(limpo[i], i, fmt);
        if (w === -1) return erro(`O set ${i + 1} está empatado. Um set precisa ter vencedor.`);
        if (sa >= need || sb >= need) return erro('Há sets depois de a partida já ter vencedor.');
        if (w === 0) sa++; else sb++;
      }
      if (sa < need && sb < need) return erro(`Ainda não há vencedor: é preciso vencer ${need} sets.`);
    }
    j.sets = limpo; if (encerrado) j.encerrado = true; else delete j.encerrado;
    // situação do campeonato
    const final = c.jogos.find((x) => x.fase === 'final');
    c.status = final ? (final.encerrado ? 'encerrado' : 'em_andamento') : (c.jogos.every((x) => x.encerrado) ? 'encerrado' : 'em_andamento');
    return ok();
  };
  R.salvarHorarioJogo = (s, campId, jogoId, o) => {
    const { j } = acharJogo(s, campId, jogoId); if (!j) return erro('Jogo não encontrado.');
    const e = validarHorarioBase(s, o); if (e) return erro(e);
    const c = R.conflitos(s, { quadra: Number(o.quadra), data: o.data, inicio: o.inicio, fim: o.fim, ignorar: { jogoId } });
    if (c.length) return erro('Essa quadra já está ocupada nesse horário: ' + c.map((x) => x.texto).join('; ') + '.');
    Object.assign(j, { quadra: Number(o.quadra), data: o.data, inicio: ABT.fmtHM(ABT.parseHM(o.inicio)), fim: ABT.fmtHM(ABT.parseHM(o.fim)) });
    return ok();
  };

  /* =====================================================
     Resumo e alertas do modo Organização
     ===================================================== */
  R.alertas = (s, now) => {
    const out = [];
    const dias = s.config.diasAvisoBackup || 7;
    const vazio = ABT.Data ? ABT.Data.COLLECTIONS.every((c) => !(s[c] || []).length) : false;
    if (!vazio) {
      if (!s.ultimoBackup) out.push({ id: 'backup', nivel: 'alto', area: 'dados', texto: 'Você ainda não fez backup dos dados.' });
      else { const d = Math.floor((now.getTime() - new Date(s.ultimoBackup).getTime()) / 86400000); if (d >= dias) out.push({ id: 'backup', nivel: 'alto', area: 'dados', texto: `Faz ${d} dias que você não faz backup (limite: ${dias}).` }); }
    }
    R.estoqueBaixo(s).forEach((x) => out.push({ id: 'estoque_' + x.id, nivel: 'medio', area: 'estoque', texto: `${x.nome}: ${x.atual} em estoque (mínimo ${x.minimo}).` }));
    if (!vazio) {
      const l = R.limpezaAtrasada(s, now);
      if (l.atrasada) out.push({ id: 'limpeza', nivel: 'medio', area: 'vestiario', texto: l.nunca ? 'Nenhuma limpeza do vestiário registrada.' : `Limpeza do vestiário atrasada (última há ${l.horas >= 48 ? Math.floor(l.horas / 24) + ' dias' : l.horas + ' h'}).` });
    }
    const atras = s.alunos.filter((a) => a.pagamento === 'atrasado').length;
    if (atras) out.push({ id: 'pagamento', nivel: 'medio', area: 'escritorio', texto: `${atras} aluno${atras > 1 ? 's' : ''} com pagamento atrasado.` });
    const sem = [];
    s.campeonatos.forEach((c) => c.jogos.forEach((j) => { if (!j.encerrado && T.statusDe(j, now) === 'aguardando') sem.push(j); }));
    if (sem.length) out.push({ id: 'placar', nivel: 'alto', area: 'campeonato', texto: `${sem.length} jogo${sem.length > 1 ? 's' : ''} do campeonato sem resultado lançado.` });
    return out;
  };
  R.resumoDoDia = (s, now) => {
    const dk = ABT.dk(now), v = R.resumoVendas(s, dk);
    const ses = R.sessaoDoDia(s, dk);
    return { vendas: v, dayuse: ses ? s.dayuse_presencas.filter((x) => x.sessaoId === ses.id).length : 0, sessao: ses, alertas: R.alertas(s, now) };
  };
})(typeof window !== 'undefined' ? window : globalThis);
