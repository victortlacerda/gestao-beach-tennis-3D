/* ============================================================
   Organização: Resumo, Agenda das quadras, Aulas e turmas, Preços e Day use.
   ============================================================ */
(function () {
  const ABT = window.ABT, Org = ABT.Org, R = ABT.Regras, A = ABT.Agenda, D = ABT.Data;
  const { esc, money, dm, dmy, diaSemana } = Org.h;
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  const ST = (tipo) => ABT.C.status[tipo] || ABT.C.status.livre;
  const stChip = (tipo, txt) => { const s = ST(tipo); return `<span class="chp st" style="background:${hex(s.color)};color:${ABT.inkFor(hex(s.color))}">${s.icon} ${esc(txt || s.label)}</span>`; };
  const pagChip = (p) => ({ em_dia: Org.chip('✔ Em dia', 'ok'), pendente: Org.chip('● Pendente', 'pend'), atrasado: Org.chip('▲ Atrasado', 'bad') }[p] || '');
  Org.h.stChip = stChip; Org.h.pagChip = pagChip;
  const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  /* =========================================================
     Resumo
     ========================================================= */
  Org.views.resumo = {
    title: 'Resumo de hoje',
    render(o, S) {
      const now = o.now(), c = A.cena(S, now), dk = ABT.dk(now), res = R.resumoDoDia(S, now);
      const out = [];
      out.push(`<p class="org-sub">${esc(ABT.dayNames[now.getDay()])}, ${dmy(dk)} · ${A.situacao(S, now).aberto ? 'arena aberta' : 'arena fechada'}${ABT.Clock.isSim() ? ' · <b class="warn">horário simulado</b>' : ''}</p>`);
      if (D.isEmpty()) {
        out.push(`<div class="org-card"><h3>Comece por aqui</h3><p>Ainda não há dados. Você pode cadastrar tudo do zero (comece pelas pessoas em <b>Escritório</b> e pelos preços em <b>Preços</b>) ou carregar um exemplo para conhecer.</p>
          <div class="btnrow"><button class="btn pri" type="button" data-act="carregarExemplo">Carregar exemplo</button><button class="btn" type="button" data-go="pessoas">Cadastrar pessoas</button><button class="btn" type="button" data-go="config">Importar backup</button></div></div>`);
      }
      if (D.storageOk === false) out.push('<div class="org-flash bad">⚠ O navegador não está guardando os dados (modo privado, armazenamento cheio ou bloqueado). Exporte um backup agora: ao fechar a janela, o que foi digitado se perde.</div>');
      out.push('<section class="org-sec"><h2>Alertas</h2>');
      if (!res.alertas.length) out.push('<p class="org-ok">✔ Nada pendente agora.</p>');
      else out.push('<ul class="alerts">' + res.alertas.map((a) => `<li class="${a.nivel}"><span>${a.nivel === 'alto' ? '▲' : '●'} ${esc(a.texto)}</span><button class="btn sm" type="button" data-go="${({ dados: 'config', estoque: 'estoque', vestiario: 'vestiario', escritorio: 'pessoas', campeonato: 'campeonato' })[a.area]}">Abrir</button></li>`).join('') + '</ul>');
      out.push('</section>');
      out.push('<section class="org-sec"><h2>Agora nas quadras</h2><div class="g2">');
      c.quadras.forEach((q, i) => {
        const tipo = q.closed ? 'bloqueado' : q.type, rot = q.closed ? 'Fechada' : null;
        let linha = '';
        if (q.type === 'aluguel' || q.type === 'campeonato') linha = `${esc(q.teams[0].join('/'))} × ${esc(q.teams[1].join('/'))}`;
        else if (q.type === 'aula') linha = `Prof. ${esc(q.teacher)} · ${esc(q.students.length)} aluno(s)`;
        else if (q.type === 'dayuse') linha = `${esc(q.players.join(', '))}${q.queue.length ? ` · fila: ${q.queue.length}` : ''}`;
        else linha = esc(q.next || '');
        out.push(`<div class="org-card sm"><div class="rowb"><b>Quadra ${i + 1}</b>${stChip(tipo, rot)}</div>${q.time ? `<small>${esc(q.time)}</small>` : ''}<p>${linha}</p>
          <div class="btnrow"><button class="btn sm" type="button" data-go="agenda" data-p='{"court":${i + 1}}'>Agenda</button>${q.type === 'dayuse' || (q.type === 'livre' && (q.waiting || q.next === 'Day use: pode entrar')) ? '<button class="btn sm" type="button" data-go="dayuse">Day use</button>' : ''}</div></div>`);
      });
      out.push('</div></section>');
      const v = res.vendas;
      out.push(`<section class="org-sec"><h2>Vendas de hoje</h2><div class="org-card"><div class="big">${money(v.total)}</div><small>${v.qtd} venda(s) registrada(s)</small>
        ${Object.keys(v.porForma).length ? `<div class="chips">${Object.keys(v.porForma).map((f) => Org.chip(`${R.FORMAS[f]} ${money(v.porForma[f])}`)).join('')}</div>` : ''}
        <div class="btnrow"><button class="btn sm" type="button" data-go="lojinha">Lojinha</button><button class="btn sm" type="button" data-go="lanchonete">Lanchonete</button></div></div>
        ${res.sessao ? `<div class="org-card sm"><b>Day use hoje</b> ${esc(res.sessao.inicio)}–${esc(res.sessao.fim)} · ${res.dayuse} pessoa(s) · ${money(res.sessao.valor)} cada <button class="btn sm" type="button" data-go="dayuse">Abrir</button></div>` : ''}</section>`);
      const camp = A.campeonatoAtual(S);
      if (camp && camp.status !== 'encerrado') {
        const prox = camp.jogos.filter((j) => !j.encerrado && j.data && (j.data + j.inicio) >= (dk + ABT.fmtHM(ABT.hourOf(now)))).sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))[0];
        if (prox) out.push(`<section class="org-sec"><h2>Campeonato</h2><div class="org-card sm"><b>${esc(camp.nome)}</b> · próximo jogo ${dm(prox.data)} às ${esc(prox.inicio)} (Quadra ${prox.quadra}) · ${esc(ABT.Torneio.rotuloJogo(prox))} <button class="btn sm" type="button" data-go="campeonato">Abrir</button></div></section>`);
      }
      return out.join('');
    },
  };
  Org.acts.carregarExemplo = function () { D.loadSample(new Date()); this.render(); this.flash('Exemplo carregado. Use o relógio simulado (painel Dados e demonstração) para ver a arena cheia.'); };

  /* =========================================================
     Agenda de uma quadra
     ========================================================= */
  function linhasDoDia(S, date, court) {
    const [abre, fecha] = A.hoursFor(S, date), dk = ABT.dk(date);
    const slots = A.slotsDaQuadra(S, date, court);
    const rows = [], cancel = S.horarios.filter((h) => h.turmaId && h.data === dk && h.cancelado && h.quadra === court);
    slots.forEach((s) => rows.push(s));
    cancel.forEach((h) => rows.push({ fonte: 'cancelada', tipo: 'aula', ini: ABT.parseHM(h.inicio), fim: ABT.parseHM(h.fim), ref: h }));
    // buracos livres
    const ocup = slots.slice().sort((a, b) => a.ini - b.ini); let cur = abre;
    ocup.forEach((s) => { if (s.ini - cur >= 0.5 - 1e-9) rows.push({ fonte: 'livre', tipo: 'livre', ini: cur, fim: Math.min(s.ini, fecha) }); cur = Math.max(cur, s.fim); });
    if (fecha - cur >= 0.5 - 1e-9) rows.push({ fonte: 'livre', tipo: 'livre', ini: cur, fim: fecha });
    return { rows: rows.sort((a, b) => a.ini - b.ini || (a.fonte === 'livre') - (b.fonte === 'livre')), abre, fecha };
  }

  Org.views.agenda = {
    title: 'Agenda das quadras',
    render(o, S) {
      const court = o.p.court || 1, date = o.p.date || o.today();
      o.p.court = court; o.p.date = date;
      const d = ABT.parseDK(date), { rows, abre, fecha } = linhasDoDia(S, d, court);
      const tipoDia = R.tipoDia(S, date);
      const out = [];
      out.push(`<div class="tabs">${[1, 2, 3, 4].map((q) => `<button type="button" class="${q === court ? 'on' : ''}" data-go="agenda" data-p='{"court":${q},"date":"${date}"}'>Quadra ${q}</button>`).join('')}</div>`);
      out.push(`<div class="datebar"><button class="btn sm" type="button" data-act="agDia" data-d="-1" aria-label="Dia anterior">←</button>
        <input type="date" value="${date}" data-act="agData" aria-label="Data"><button class="btn sm" type="button" data-act="agDia" data-d="1" aria-label="Próximo dia">→</button>
        <button class="btn sm" type="button" data-act="agHoje">Hoje</button>
        <span class="dim">${esc(diaSemana(date))} · ${esc(R.TIPOS_DIA[tipoDia])} · abre ${ABT.fmtHM(abre)}–${ABT.fmtHM(fecha)}</span></div>`);
      const ses = R.sessaoDoDia(S, date);
      if (ses) out.push(`<p class="org-note">🔁 Day use neste dia, ${esc(ses.inicio)}–${esc(ses.fim)}: acontece nos horários em que a quadra está livre.</p>`);
      // agora (placar manual)
      if (date === o.today()) out.push(agoraBox(S, court, o.now()));
      out.push('<div class="agenda">');
      rows.forEach((r) => out.push(rowHtml(S, r, court, date)));
      out.push('</div>');
      if (o.p.edit) out.push(horarioForm(S, o.p, court, date, abre, fecha));
      else out.push(`<div class="btnrow"><button class="btn pri" type="button" data-act="agNovo">+ Novo horário</button></div>`);
      return out.join('');
    },
  };

  function agoraBox(S, court, now) {
    const q = A.quadraAgora(S, now, court);
    if (!q.fixed || q.fixed.texto == null) return '';
    const f = q.fixed, chave = f.chave, a = f.placar ? f.placar[0] : 0, b = f.placar ? f.placar[1] : 0;
    const t1 = (q.teams ? q.teams[0] : q.players.slice(0, 2)).join('/'), t2 = (q.teams ? q.teams[1] : q.players.slice(2, 4)).join('/');
    return `<div class="org-card agora"><div class="rowb"><b>Agora · ${esc(q.type === 'dayuse' ? 'Day use' : 'Aluguel')}</b><small>${esc(q.time)}</small></div>
      <p class="dim">A TV mostra "Em jogo" até você digitar o placar.</p>
      <div class="placar"><div><span>${esc(t1)}</span><div class="stp"><button class="btn sm" type="button" data-act="placar" data-q="${court}" data-k="${esc(chave)}" data-l="a" data-d="-1">−</button><b>${a}</b><button class="btn sm pri" type="button" data-act="placar" data-q="${court}" data-k="${esc(chave)}" data-l="a" data-d="1">+1</button></div></div>
      <i>×</i><div><span>${esc(t2)}</span><div class="stp"><button class="btn sm" type="button" data-act="placar" data-q="${court}" data-k="${esc(chave)}" data-l="b" data-d="-1">−</button><b>${b}</b><button class="btn sm pri" type="button" data-act="placar" data-q="${court}" data-k="${esc(chave)}" data-l="b" data-d="1">+1</button></div></div></div>
      ${f.placar ? `<button class="lnk" type="button" data-act="placarZerar" data-q="${court}" data-k="${esc(chave)}">Voltar para "Em jogo"</button>` : ''}</div>`;
  }
  Org.acts.placar = function (b) { this.run((s) => R.placarMais(s, parseInt(b.dataset.q, 10), b.dataset.k, b.dataset.l, parseInt(b.dataset.d, 10))); };
  Org.acts.placarZerar = function (b) { this.run((s) => R.placarZerar(s, parseInt(b.dataset.q, 10), b.dataset.k)); };

  function rowHtml(S, r, court, date) {
    const hora = `${ABT.fmtHM(r.ini)}–${ABT.fmtHM(r.fim)}`, P = (id) => Org.nome(id);
    if (r.fonte === 'livre') return `<div class="ag-row livre"><span class="ag-h">${hora}</span><div class="ag-b">${stChip('livre')} <small>${(r.fim - r.ini)} h livre</small></div><div class="ag-a"><button class="btn sm" type="button" data-act="agNovo" data-i="${ABT.fmtHM(r.ini)}" data-f="${ABT.fmtHM(Math.min(r.fim, r.ini + 1))}">Marcar</button></div></div>`;
    if (r.fonte === 'cancelada') return `<div class="ag-row cancel"><span class="ag-h">${hora}</span><div class="ag-b"><s>${esc(S.turmas.find((t) => t.id === r.ref.turmaId)?.nome || 'Aula')}</s> <small>cancelada neste dia</small></div><div class="ag-a"><button class="btn sm" type="button" data-act="turmaRestaurar" data-t="${esc(r.ref.turmaId)}" data-d="${date}">Restaurar</button></div></div>`;
    const tipo = r.tipo === 'jogo' ? 'campeonato' : r.tipo;
    if (r.fonte === 'jogo') {
      const pt = ABT.Torneio.participantes(r.camp, r.ref), nm = (x) => { const dd = x.id && r.camp.duplas.find((q) => q.id === x.id); return dd ? dd.nome : (x.label || 'A definir'); };
      return `<div class="ag-row t-campeonato"><span class="ag-h">${hora}</span><div class="ag-b">${stChip('campeonato')} <b>${esc(r.camp.nome)}</b> <small>${esc(ABT.Torneio.rotuloJogo(r.ref))} · ${esc(nm(pt.a))} × ${esc(nm(pt.b))}</small></div><div class="ag-a"><button class="btn sm" type="button" data-go="campeonato">Abrir</button></div></div>`;
    }
    if (r.fonte === 'turma') {
      const t = r.ref;
      return `<div class="ag-row t-aula"><span class="ag-h">${hora}</span><div class="ag-b">${stChip('aula', t.alunos.length === 1 ? 'Aula particular' : 'Aula')} <b>${esc(t.nome)}</b> <small>Prof. ${esc(P(t.professorId))} · ${t.alunos.map(P).map(esc).join(', ')}</small></div>
        <div class="ag-a"><button class="btn sm" type="button" data-act="turmaCancelarDia" data-t="${esc(t.id)}" data-d="${date}" data-confirm="Cancelar só hoje?">Cancelar neste dia</button><button class="btn sm" type="button" data-go="turmas" data-p='{"edit":"${esc(t.id)}"}'>Editar turma</button></div></div>`;
    }
    const h = r.ref;
    if (h.tipo === 'bloqueio') return `<div class="ag-row t-bloqueado"><span class="ag-h">${hora}</span><div class="ag-b">${stChip('bloqueado')} <b>${esc(h.obs || 'Manutenção')}</b></div><div class="ag-a"><button class="btn sm" type="button" data-act="agEditar" data-id="${h.id}">Editar</button></div></div>`;
    if (h.tipo === 'aula') return `<div class="ag-row t-aula"><span class="ag-h">${hora}</span><div class="ag-b">${stChip('aula', (h.pessoas || []).length === 1 ? 'Aula particular' : 'Aula')} <b>Prof. ${esc(P(h.professorId))}</b> <small>${(h.pessoas || []).map(P).map(esc).join(', ')}${h.turmaId ? ' · mudou só neste dia' : ''}</small></div><div class="ag-a"><button class="btn sm" type="button" data-act="agEditar" data-id="${h.id}">Editar</button></div></div>`;
    return `<div class="ag-row t-aluguel"><span class="ag-h">${hora}</span><div class="ag-b">${stChip('aluguel')} <b>${(h.pessoas || []).map(P).map(esc).join(', ') || 'Sem nome'}</b> <small>${h.preco != null ? money(h.preco) : 'sem valor'} ${h.pago ? '· ✔ pago' : '· a receber'}${h.obs ? ' · ' + esc(h.obs) : ''}</small></div><div class="ag-a"><button class="btn sm" type="button" data-act="agEditar" data-id="${h.id}">Editar</button></div></div>`;
  }

  function horarioForm(S, p, court, date, abre, fecha) {
    const e = p.edit === 'novo' ? null : S.horarios.find((h) => h.id === p.edit);
    const v = e || { tipo: p.tipo || 'aluguel', inicio: p.ini || ABT.fmtHM(abre), fim: p.fim || ABT.fmtHM(Math.min(fecha, abre + 1)), pessoas: [], obs: '', preco: null, pago: false };
    const horas = Org.timeOpts(abre, fecha), sug = R.precoSugerido(S, date, v.inicio, v.fim);
    const profs = S.pessoas.filter((x) => x.tipo === 'professor').map((x) => ({ v: x.id, t: x.nome }));
    return `<form class="org-card form" data-form="horario" data-recalc="horario" data-id="${e ? e.id : ''}">
      <h3>${e ? 'Editar horário' : 'Novo horário'} · Quadra ${court} · ${dm(date)}</h3>
      <input type="hidden" name="quadra" value="${court}"><input type="hidden" name="data" value="${date}">
      ${Org.fld('Tipo', Org.seg('tipo', [{ v: 'aluguel', t: '🎾 Aluguel' }, { v: 'aula', t: '🎓 Aula' }, { v: 'bloqueio', t: '🛠 Manutenção' }], v.tipo))}
      <div class="g2">${Org.fld('Início', Org.sel('inicio', horas, v.inicio))}${Org.fld('Fim', Org.sel('fim', horas, v.fim))}</div>
      <div data-only="aula" ${v.tipo === 'aula' ? '' : 'hidden'}>${Org.fld('Professor', profs.length ? Org.sel('professorId', [{ v: '', t: 'Escolha…' }].concat(profs), v.professorId || '') : '<small class="dim">Nenhum professor cadastrado. Cadastre em Escritório.</small>')}</div>
      <div data-only="aluguel,aula" ${v.tipo === 'bloqueio' ? 'hidden' : ''}>${Org.fld(v.tipo === 'aula' ? 'Alunos (1 a ' + (S.config.aulaMax || 6) + ')' : 'Jogadores (até 4)', Org.picker('pessoas', v.pessoas, { max: v.tipo === 'aula' ? (S.config.aulaMax || 6) : 4, tipos: v.tipo === 'aula' ? ['aluno'] : null, novo: v.tipo === 'aula' ? 'aluno' : 'locatario' }))}</div>
      <div class="g2" data-only="aluguel" ${v.tipo === 'aluguel' ? '' : 'hidden'}>
        ${Org.fld('Valor (R$)', `<input type="text" inputmode="decimal" name="preco" value="${v.preco != null ? String(v.preco).replace('.', ',') : (sug != null ? String(sug).replace('.', ',') : '')}" placeholder="${sug != null ? '' : 'preencha à mão'}" ${v.preco != null ? 'data-touched="1"' : ''}>` + `<small class="dim" id="sugestao">${sug != null ? 'Sugerido pela tabela: ' + money(sug) : 'A tabela de preços não tem este caso. Preencha em Preços ou digite aqui.'}</small>`)}
        <label class="chk"><input type="checkbox" name="pago" ${v.pago ? 'checked' : ''}> Já foi pago</label></div>
      ${Org.fld(v.tipo === 'bloqueio' ? 'Motivo' : 'Observação', `<input type="text" name="obs" value="${esc(v.obs || '')}" maxlength="80" placeholder="${v.tipo === 'bloqueio' ? 'Ex.: troca da rede' : 'opcional'}">`)}
      ${e ? '' : Org.fld('Repetir toda semana por mais', `<input type="number" name="repetir" min="0" max="26" value="0" style="width:90px"> <small class="dim">semanas (0 = só este dia)</small>`)}
      <div class="btnrow"><button class="btn pri" type="submit">Salvar</button><button class="btn" type="button" data-act="agFechar">Cancelar</button>
        ${e ? `<button class="btn bad" type="button" data-act="agExcluir" data-id="${e.id}" data-confirm="Apagar este horário?">Apagar</button>` : ''}</div></form>`;
  }

  Org.recalcs.horario = function (f, alvo) {
    const tipo = (f.querySelector('input[name=tipo]:checked') || {}).value || 'aluguel';
    f.querySelectorAll('[data-only]').forEach((x) => { x.hidden = !x.dataset.only.split(',').includes(tipo); });
    const ini = f.elements.inicio, fim = f.elements.fim;
    if (alvo && alvo.name === 'inicio') { // empurra o fim para 1 h depois, se ficou antes
      if (ABT.parseHM(fim.value) <= ABT.parseHM(ini.value)) { const n = ABT.fmtHM(ABT.parseHM(ini.value) + 1); const op = [...fim.options].find((x) => x.value === n); fim.value = op ? n : fim.options[fim.options.length - 1].value; }
    }
    const pr = f.elements.preco;
    if (pr && tipo === 'aluguel') {
      const sug = R.precoSugerido(D.get(), f.elements.data.value, ini.value, fim.value);
      if (!pr.dataset.touched && alvo && ['inicio', 'fim', 'tipo'].includes(alvo.name)) pr.value = sug != null ? String(sug).replace('.', ',') : '';
      const el = f.querySelector('#sugestao'); if (el) el.textContent = sug != null ? 'Sugerido pela tabela: ' + money(sug) : 'A tabela de preços não tem este caso. Preencha em Preços ou digite aqui.';
    }
    if (alvo && alvo.name === 'preco') pr.dataset.touched = '1';
    const pk = f.querySelector('.pick'); if (pk) { pk.dataset.max = tipo === 'aula' ? (D.get().config.aulaMax || 6) : 4; }
  };

  Org.acts.agNovo = function (b) { this.p.edit = 'novo'; this.p.ini = b.dataset.i; this.p.fim = b.dataset.f; this.p.tipo = null; this.render(); const f = this.el.querySelector('form.form'); if (f) f.scrollIntoView({ block: 'nearest' }); };
  Org.acts.agEditar = function (b) { this.p.edit = b.dataset.id; this.render(); const f = this.el.querySelector('form.form'); if (f) f.scrollIntoView({ block: 'nearest' }); };
  Org.acts.agFechar = function () { this.p.edit = null; this.formDirty = false; this.render(); };
  Org.acts.agDia = function (b) { this.p.date = ABT.dk(ABT.addDays(ABT.parseDK(this.p.date || this.today()), parseInt(b.dataset.d, 10))); this.p.edit = null; this.render(); };
  Org.acts.agHoje = function () { this.p.date = this.today(); this.p.edit = null; this.render(); };
  Org.acts.agData = function () { /* tratado em change abaixo */ };
  document.addEventListener('change', (e) => { const t = e.target; if (t && t.dataset && t.dataset.act === 'agData' && Org.el && Org.el.contains(t) && t.value) { Org.p.date = t.value; Org.p.edit = null; Org.render(); } });
  Org.acts.agExcluir = function (b) { this.p.edit = null; this.run((s) => R.excluirHorario(s, b.dataset.id), 'Horário apagado.'); };
  Org.acts.turmaCancelarDia = function (b) { this.run((s) => R.cancelarTurmaNoDia(s, b.dataset.t, b.dataset.d), 'Aula cancelada só neste dia.'); };
  Org.acts.turmaRestaurar = function (b) { this.run((s) => R.restaurarTurmaNoDia(s, b.dataset.t, b.dataset.d), 'Aula restaurada.'); };
  Org.forms.horario = function (f, fd) {
    const edit = f.dataset.id, o = { id: edit || undefined, tipo: fd.get('tipo'), quadra: fd.get('quadra'), data: fd.get('data'), inicio: fd.get('inicio'), fim: fd.get('fim'), pessoas: fd.getAll('pessoas'), professorId: fd.get('professorId') || null, obs: fd.get('obs') || '', pago: !!fd.get('pago') };
    if (o.tipo === 'aluguel') o.preco = String(fd.get('preco') || '').trim();
    const rep = parseInt(fd.get('repetir'), 10) || 0;
    let aviso = null, nota = '';
    this.p.edit = null;
    const r = this.run((s) => {
      const x = R.salvarHorario(s, o); if (!x.ok) return x;
      aviso = x.aviso;
      if (rep > 0) { const y = R.repetirHorario(s, x.id, rep); nota = ` Repetido por mais ${y.criados} semana(s)${y.pulados.length ? ` (pulei ${y.pulados.length} dia(s) ocupado(s))` : ''}.`; }
      return x;
    }, null);
    if (!r.ok) { this.p.edit = edit || 'novo'; return; }
    this.flash('Horário salvo.' + nota, false, aviso);
  };

  /* =========================================================
     Aulas e turmas (D04, D05, D34)
     ========================================================= */
  Org.views.turmas = {
    title: 'Aulas e turmas',
    render(o, S) {
      const out = [];
      const e = o.p.edit === 'novo' ? {} : (o.p.edit ? S.turmas.find((t) => t.id === o.p.edit) : null);
      out.push(`<p class="org-sub">Turmas se repetem toda semana. Aula tem de 1 a ${S.config.aulaMax || 6} alunos (1 aluno = aula particular). Para mudar uma aula só em um dia, use a Agenda da quadra.</p>`);
      const profNome = (id) => Org.nome(id);
      if (!S.turmas.length) out.push('<p class="org-empty">Nenhuma turma cadastrada.</p>');
      else out.push('<div class="list">' + S.turmas.map((t) => `<div class="org-card sm${t.ativa === false ? ' off' : ''}"><div class="rowb"><b>${esc(t.nome)}</b>${stChip('aula', t.alunos.length === 1 ? 'Aula particular' : 'Aula')}${t.ativa === false ? Org.chip('pausada') : ''}</div>
        <small>Prof. ${esc(profNome(t.professorId))} · Quadra ${t.quadra} · ${(t.diasSemana || []).map((d) => NOMES_DIA[d]).join(', ')} · ${esc(t.inicio)}–${esc(t.fim)}</small>
        <p>${t.alunos.map((a) => esc(Org.nome(a))).join(', ')}</p>
        <div class="btnrow"><button class="btn sm" type="button" data-act="turmaEditar" data-id="${t.id}">Editar</button><button class="btn sm" type="button" data-act="turmaPausar" data-id="${t.id}">${t.ativa === false ? 'Reativar' : 'Pausar'}</button><button class="btn sm bad" type="button" data-act="turmaExcluir" data-id="${t.id}" data-confirm="Apagar a turma?">Apagar</button></div></div>`).join('') + '</div>');
      if (e) {
        const profs = S.pessoas.filter((x) => x.tipo === 'professor').map((x) => ({ v: x.id, t: x.nome }));
        const [abre] = S.config.horario.semana, fecha = S.config.horario.semana[1], horas = Org.timeOpts(Math.min(abre, S.config.horario.fimSemana[0]), Math.max(fecha, S.config.horario.fimSemana[1]));
        out.push(`<form class="org-card form" data-form="turma" data-id="${e.id || ''}"><h3>${e.id ? 'Editar turma' : 'Nova turma'}</h3>
          ${Org.fld('Nome', `<input type="text" name="nome" value="${esc(e.nome || '')}" maxlength="40" placeholder="Ex.: Turma Iniciantes" required>`)}
          ${Org.fld('Professor', profs.length ? Org.sel('professorId', [{ v: '', t: 'Escolha…' }].concat(profs), e.professorId || '') : '<small class="dim">Cadastre um professor em Escritório primeiro.</small>')}
          ${Org.fld('Dias da semana', `<div class="dias">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label><input type="checkbox" name="dias" value="${d}"${(e.diasSemana || []).includes(d) ? ' checked' : ''}><span>${NOMES_DIA[d]}</span></label>`).join('')}</div>`)}
          <div class="g3">${Org.fld('Início', Org.sel('inicio', horas, e.inicio || '18:00'))}${Org.fld('Fim', Org.sel('fim', horas, e.fim || '19:00'))}${Org.fld('Quadra', Org.sel('quadra', [1, 2, 3, 4].map((q) => ({ v: q, t: 'Quadra ' + q })), e.quadra || 1))}</div>
          ${Org.fld('Alunos (1 a ' + (S.config.aulaMax || 6) + ')', Org.picker('alunos', e.alunos || [], { max: S.config.aulaMax || 6, tipos: ['aluno'], novo: 'aluno' }))}
          <div class="btnrow"><button class="btn pri" type="submit">Salvar turma</button><button class="btn" type="button" data-act="turmaFechar">Cancelar</button></div></form>`);
      } else out.push('<div class="btnrow"><button class="btn pri" type="button" data-act="turmaNova">+ Nova turma</button></div>');
      return out.join('');
    },
  };
  Org.acts.turmaNova = function () { this.p.edit = 'novo'; this.render(); };
  Org.acts.turmaEditar = function (b) { this.p.edit = b.dataset.id; this.render(); };
  Org.acts.turmaFechar = function () { this.p.edit = null; this.formDirty = false; this.render(); };
  Org.acts.turmaExcluir = function (b) { this.run((s) => R.excluirTurma(s, b.dataset.id), 'Turma apagada.'); };
  Org.acts.turmaPausar = function (b) { this.run((s) => { const t = s.turmas.find((x) => x.id === b.dataset.id); if (!t) return { ok: false, erro: 'Turma não encontrada.' }; t.ativa = t.ativa === false; return { ok: true }; }); };
  Org.forms.turma = function (f, fd) {
    const id = f.dataset.id, t = { id: id || undefined, nome: fd.get('nome'), professorId: fd.get('professorId') || null, diasSemana: fd.getAll('dias'), inicio: fd.get('inicio'), fim: fd.get('fim'), quadra: fd.get('quadra'), alunos: fd.getAll('alunos') };
    const old = id && D.get().turmas.find((x) => x.id === id); if (old) t.ativa = old.ativa;
    this.p.edit = null;
    const r = this.run((s) => R.salvarTurma(s, t, this.now()), 'Turma salva.');
    if (!r.ok) this.p.edit = id || 'novo';
  };
  Org.views.turmas.after = function (o) { if (o.p.edit) { const f = o.el.querySelector('form.form'); if (f && o.p.edit !== 'novo' && !o._turmaScrolled) f.scrollIntoView({ block: 'nearest' }); } };

  /* =========================================================
     Preços do aluguel (D35, D36, D42)
     ========================================================= */
  Org.views.precos = {
    title: 'Preços do aluguel',
    render(o, S) {
      const dias = [['util', 'Dia útil'], ['fimsemana', 'Fim de semana'], ['feriado', 'Feriado']];
      const durs = [[1, '1 h'], [1.5, '1 h 30'], [2, '2 h']];
      const rows = [];
      (S.config.faixas || []).forEach((fx) => durs.forEach(([dur, dn], i) => rows.push(`<tr>${i === 0 ? `<th rowspan="${durs.length}" scope="rowgroup">${esc(fx.nome)}<small>${String(fx.de).padStart(2, '0')}h–${String(fx.ate).padStart(2, '0')}h</small></th>` : ''}<td>${dn}</td>${dias.map(([k]) => `<td><input type="text" inputmode="decimal" class="pr-in" name="p|${fx.id}|${k}|${dur}" value="${R.valorTabela(S, fx.id, k, dur) === '' ? '' : String(R.valorTabela(S, fx.id, k, dur)).replace('.', ',')}" placeholder="—" aria-label="${esc(fx.nome)}, ${dn}, ${k}"></td>`).join('')}</tr>`)));
      return `<p class="org-sub">A tabela começa vazia: preencha os valores em reais. Ao marcar um aluguel, o sistema sugere o valor pela faixa do horário, tipo de dia (feriado vale mais que fim de semana e dia útil) e duração. Você pode trocar o valor em cada reserva.</p>
        <form class="org-card form" data-form="precos"><div class="tbl-wrap"><table class="tbl pr"><thead><tr><th>Faixa</th><th>Duração</th>${dias.map(([, t]) => `<th>${t}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>
        <div class="btnrow"><button class="btn pri" type="submit">Salvar tabela</button></div></form>
        <div class="g2"><section class="org-card"><h3>Feriados</h3>${(S.feriados || []).length ? `<table class="tbl">${S.feriados.map((f) => `<tr><td>${dmy(f.data)}</td><td>${esc(f.nome)}</td><td class="n"><button class="btn sm bad" type="button" data-act="feriadoDel" data-id="${f.id}">Tirar</button></td></tr>`).join('')}</table>` : '<p class="dim">Nenhum feriado cadastrado.</p>'}
          <form class="inline" data-form="feriado" data-nokeep="1"><input type="date" name="data" required aria-label="Data do feriado"><input type="text" name="nome" placeholder="Nome (opcional)" maxlength="40"><button class="btn sm" type="submit">+ Adicionar</button></form></section>
        <section class="org-card"><h3>Day use</h3><form class="inline" data-form="dayuseValor" data-nokeep="1"><span>R$</span><input type="text" inputmode="decimal" name="valor" value="${String(S.config.valorDayUse).replace('.', ',')}" style="width:90px" aria-label="Valor do day use"><button class="btn sm" type="submit">Salvar</button></form><p class="dim">Por pessoa, vale o horário todo. Cada chegada é registrada como venda.</p></section></div>`;
    },
  };
  Org.forms.precos = function (f, fd) {
    this.run((s) => {
      for (const [k, v] of fd.entries()) {
        if (!k.startsWith('p|')) continue; const [, fx, dia, dur] = k.split('|');
        const r = R.salvarPreco(s, fx, dia, parseFloat(dur), String(v).trim()); if (!r.ok) return r;
      }
      return { ok: true };
    }, 'Tabela de preços salva.');
  };
  Org.forms.feriado = function (f, fd) { this.run((s) => R.salvarFeriado(s, fd.get('data'), fd.get('nome')), 'Feriado adicionado.'); };
  Org.acts.feriadoDel = function (b) { this.run((s) => R.removerFeriado(s, b.dataset.id)); };
  Org.forms.dayuseValor = function (f, fd) { this.run((s) => R.salvarValorDayUse(s, fd.get('valor')), 'Valor do day use salvo.'); };

  /* =========================================================
     Day use manual (D07, D28, D36)
     ========================================================= */
  Org.views.dayuse = {
    title: 'Day use',
    render(o, S) {
      const now = o.now(), dk = ABT.dk(now), ses = R.sessaoDoDia(S, dk), out = [];
      if (!ses) {
        const [abre, fecha] = A.hoursFor(S, now), w = now.getDay(), sug = (w === 0 || w === 6) ? ['15:00', ABT.fmtHM(fecha)] : ['17:00', ABT.fmtHM(Math.min(21, fecha))];
        return `<p class="org-sub">Sem sessão de day use hoje (${dmy(dk)}). Normalmente é de sexta a domingo.</p>
          <form class="org-card form" data-form="sessao"><h3>Abrir day use de hoje</h3><div class="g3">${Org.fld('Início', Org.sel('inicio', Org.timeOpts(abre, fecha), sug[0]))}${Org.fld('Fim', Org.sel('fim', Org.timeOpts(abre, fecha), sug[1]))}${Org.fld('Valor (R$)', `<input type="text" inputmode="decimal" name="valor" value="${String(S.config.valorDayUse).replace('.', ',')}">`)}</div>
          <div class="btnrow"><button class="btn pri" type="submit">Abrir sessão</button></div></form>`;
      }
      const sit = R.situacaoDayUse(S, ses.id), total = sit.reduce((a, q) => a + q.jogam.length + q.fila.length, 0);
      const emSessao = ABT.hourOf(now) >= ABT.parseHM(ses.inicio) && ABT.hourOf(now) < ABT.parseHM(ses.fim);
      out.push(`<p class="org-sub">Sessão de hoje: <b>${esc(ses.inicio)}–${esc(ses.fim)}</b> · ${total} pessoa(s) · ${money(ses.valor)} por pessoa${emSessao ? '' : ' · <b class="warn">fora do horário da sessão: a TV não mostra o day use</b>'}. Nada anda sozinho: você faz a fila andar.</p>`);
      // chegou alguém
      const livres = sit.map((q) => { const t = A.quadraAgora(S, now, q.quadra).type; return { q: q.quadra, ocupada: ['aluguel', 'aula', 'campeonato', 'bloqueado'].includes(t), n: q.jogam.length + q.fila.length }; });
      const melhor = (livres.filter((x) => !x.ocupada).sort((a, b) => a.n - b.n)[0] || livres[0]).q;
      const dp = Org.pessoas().filter((p) => ['dayuse', 'visitante', 'locatario', 'aluno', 'funcionario'].includes(p.tipo));
      out.push(`<form class="org-card form" data-form="chegou" data-sessao="${ses.id}"><h3>+ Chegou alguém</h3>
        ${Org.fld('Pessoa (digite o nome; se for novo, é cadastrado)', Org.picker('pessoa', [], { max: 1, novo: 'dayuse', placeholder: 'Nome da pessoa' }))}
        <div class="g2">${Org.fld('Quadra', Org.sel('quadra', [1, 2, 3, 4].map((q) => ({ v: q, t: 'Quadra ' + q + (livres[q - 1].ocupada ? ' (ocupada agora)' : ` (${livres[q - 1].n} aguardando)`) })), melhor))}
        ${Org.fld('Forma de pagamento (' + money(ses.valor) + ')', Org.seg('forma', Object.keys(R.FORMAS).map((k) => ({ v: k, t: R.FORMAS[k] })), 'pix'))}</div>
        <label class="chk"><input type="checkbox" name="jaPagou"> Já pagou antes (não registrar venda de novo)</label>
        <div class="btnrow"><button class="btn pri" type="submit">Registrar chegada</button></div></form>`);
      out.push('<div class="g2">');
      sit.forEach((q) => out.push(courtBox(S, now, ses, q)));
      out.push('</div>');
      out.push(`<div class="btnrow"><button class="btn bad" type="button" data-act="fimSessao" data-id="${ses.id}" data-confirm="Encerrar o day use de hoje? Todos saem.">Encerrar day use de hoje</button></div>`);
      return out.join('');
    },
  };
  function courtBox(S, now, ses, q) {
    const spec = A.quadraAgora(S, now, q.quadra);
    const bloq = ['aluguel', 'aula', 'campeonato', 'bloqueado'].includes(spec.type);
    const head = `<div class="rowb"><b>Quadra ${q.quadra}</b>${bloq ? stChip(spec.type) : stChip(q.jogam.length >= 4 ? 'dayuse' : 'livre', q.jogam.length >= 4 ? 'Day use' : 'Livre')}</div>`;
    if (bloq && !q.jogam.length && !q.fila.length) return `<div class="org-card sm">${head}<small>Agora a quadra é de ${esc(ABT.C.status[spec.type].label.toLowerCase())} (${esc(spec.time || '')}). Day use só entra quando ela estiver livre.</small></div>`;
    const quadras = [1, 2, 3, 4].filter((x) => x !== q.quadra).map((x) => ({ v: x, t: 'Q' + x }));
    let h = `<div class="org-card sm">${head}${bloq ? `<small class="warn">Quadra ocupada agora por ${esc(ABT.C.status[spec.type].label.toLowerCase())}; day use espera.</small>` : ''}`;
    h += `<b class="lbl">Na quadra</b>`;
    if (!q.jogam.length) h += '<p class="dim">Ninguém. Quem chegar entra direto.</p>';
    else {
      h += `<form data-form="fimPartida" data-sessao="${ses.id}" data-quadra="${q.quadra}" data-nokeep="1"><ul class="plist">${q.jogam.map((x) => `<li><span>${esc(x.nome)}</span>${q.jogam.length >= 4 ? `<div class="seg2 sm"><label><input type="radio" name="d_${x.pessoaId}" value="saiu"><span>Saiu</span></label><label><input type="radio" name="d_${x.pessoaId}" value="continua" checked><span>Continua</span></label><label><input type="radio" name="d_${x.pessoaId}" value="fica"><span>Fica</span></label></div>` : `<button class="btn sm" type="button" data-act="duSair" data-id="${x.id}">Saiu</button>`}</li>`).join('')}</ul>
        ${q.jogam.length >= 4 ? '<p class="dim">Continua = vai para o fim da fila. Fica = segue na quadra. Quem estiver na fila entra no lugar de quem sair.</p><button class="btn pri sm" type="submit">Terminou a partida</button>' : `<p class="dim">Faltam ${4 - q.jogam.length} para começar.</p>`}</form>`;
    }
    if (q.jogam.length >= 4 && !bloq) { // placar
      const qa = spec; if (qa.fixed) {
        const a = qa.fixed.placar ? qa.fixed.placar[0] : 0, b = qa.fixed.placar ? qa.fixed.placar[1] : 0, k = esc(qa.fixed.chave);
        h += `<div class="placar sm"><span>${esc(qa.players.slice(0, 2).join('/'))}</span><div class="stp"><button class="btn sm" type="button" data-act="placar" data-q="${q.quadra}" data-k="${k}" data-l="a" data-d="-1">−</button><b>${a}</b><button class="btn sm pri" type="button" data-act="placar" data-q="${q.quadra}" data-k="${k}" data-l="a" data-d="1">+1</button></div><i>×</i><div class="stp"><button class="btn sm" type="button" data-act="placar" data-q="${q.quadra}" data-k="${k}" data-l="b" data-d="-1">−</button><b>${b}</b><button class="btn sm pri" type="button" data-act="placar" data-q="${q.quadra}" data-k="${k}" data-l="b" data-d="1">+1</button></div><span>${esc(qa.players.slice(2, 4).join('/'))}</span></div>`;
      }
    }
    h += `<b class="lbl">Fila</b>`;
    if (!q.fila.length) h += '<p class="dim">Fila vazia.</p>';
    else h += `<ul class="plist">${q.fila.map((x, i) => `<li><span>${i + 1}º ${esc(x.nome)}</span><div class="btnrow tight"><button class="btn sm" type="button" data-act="duSobe" data-id="${x.id}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button class="btn sm" type="button" data-act="duDesce" data-id="${x.id}" ${i === q.fila.length - 1 ? 'disabled' : ''} aria-label="Descer">↓</button>
      <select data-act="duMover" data-id="${x.id}" aria-label="Mudar de quadra"><option value="">Mover…</option>${quadras.map((z) => `<option value="${z.v}">${z.t}</option>`).join('')}</select><button class="btn sm" type="button" data-act="duSair" data-id="${x.id}">Saiu</button></div></li>`).join('')}</ul>`;
    return h + '</div>';
  }
  Org.acts.duSair = function (b) { this.run((s) => R.sairDayUse(s, b.dataset.id)); };
  Org.acts.duSobe = function (b) { this.run((s) => R.moverNaFila(s, b.dataset.id, -1)); };
  Org.acts.duDesce = function (b) { this.run((s) => R.moverNaFila(s, b.dataset.id, 1)); };
  Org.acts.fimSessao = function (b) { this.run((s) => R.fimDaSessao(s, b.dataset.id), 'Day use encerrado.'); };
  document.addEventListener('change', (e) => { const t = e.target; if (t && t.dataset && t.dataset.act === 'duMover' && Org.el && Org.el.contains(t) && t.value) Org.run((s) => R.moverDayUse(s, t.dataset.id, t.value), 'Movido para a quadra ' + t.value + '.'); });
  Org.forms.sessao = function (f, fd) { this.run((s) => R.abrirSessaoDayUse(s, { data: this.today(), inicio: fd.get('inicio'), fim: fd.get('fim'), valor: String(fd.get('valor')).replace(',', '.') }), 'Day use aberto.'); };
  Org.forms.chegou = function (f, fd) {
    const pid = fd.get('pessoa'); if (!pid) { this.flash('Escolha a pessoa (digite o nome e tecle Enter).', true); return; }
    const sid = f.dataset.sessao, q = fd.get('quadra'), forma = fd.get('forma'), cobrar = !fd.get('jaPagou');
    const r = this.run((s) => R.chegouDayUse(s, sid, pid, q, { forma, cobrar }, this.now()), null);
    if (r.ok) this.flash(`${Org.nome(pid)} entrou ${r.status === 'quadra' ? 'na quadra' : 'na fila'} ${q}.${cobrar ? ' Venda registrada.' : ''}`);
  };
  Org.forms.fimPartida = function (f, fd) {
    const dec = {}; for (const [k, v] of fd.entries()) if (k.startsWith('d_')) dec[k.slice(2)] = v;
    const sid = f.dataset.sessao, q = f.dataset.quadra;
    this.run((s) => R.fimDePartida(s, sid, q, dec), 'Partida encerrada. A fila andou.');
  };
})();
