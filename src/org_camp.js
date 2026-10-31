/* ============================================================
   Organização: Campeonato (gestão), Avisos e patrocinadores, Dados e configurações.
   ============================================================ */
(function () {
  const ABT = window.ABT, Org = ABT.Org, R = ABT.Regras, A = ABT.Agenda, D = ABT.Data, T = ABT.Torneio;
  const { esc, money, dm, dmy } = Org.h;
  const $ = (id) => document.getElementById(id);

  /* =========================================================
     Campeonato (D37)
     ========================================================= */
  const ST_JOGO = { encerrado: ['✔ Encerrado', 'ok'], andamento: ['● Em andamento', 'pend'], aguardando: ['▲ Sem resultado', 'bad'], agendado: ['Agendado', ''] };
  const dnome = (camp, id, label) => { const d = id && camp.duplas.find((x) => x.id === id); return d ? d.nome : (label || 'A definir'); };

  Org.views.campeonato = {
    title: 'Campeonato',
    render(o, S) {
      const p = o.p, out = [];
      if (p.novo) return novoForm(o, S);
      const camp = p.camp ? S.campeonatos.find((c) => c.id === p.camp) : A.campeonatoAtual(S);
      if (!camp) return `<p class="org-sub">Nenhum campeonato ainda. O sistema monta os grupos (todos contra todos), o mata-mata cruzado e distribui os jogos nas quadras livres, sem bater com aulas e aluguéis.</p><div class="btnrow"><button class="btn pri" type="button" data-act="campNovo">+ Novo campeonato</button></div>`;
      p.camp = camp.id;
      const fmt = T.formatoDe(camp), now = o.now();
      if (S.campeonatos.length > 1) out.push(`<div class="tabs">${S.campeonatos.map((c) => `<button type="button" class="${c.id === camp.id ? 'on' : ''}" data-go="campeonato" data-p='{"camp":"${c.id}"}'>${esc(c.nome)}</button>`).join('')}</div>`);
      const jogos = camp.jogos.map((j) => Object.assign({}, j, { _st: T.statusDe(j, now) }));
      const feitos = jogos.filter((j) => j.encerrado).length;
      out.push(`<div class="org-card"><div class="rowb"><h3>${esc(camp.nome)}</h3>${Org.chip(camp.status === 'encerrado' ? '🏁 Encerrado' : '🏆 Em andamento', camp.status === 'encerrado' ? 'ok' : 'gold')}</div>
        <small>${camp.duplas.length} duplas · ${T.grupos(camp).length} grupo(s) · ${feitos} de ${jogos.length} jogos encerrados · sets até ${fmt.setAte} games${fmt.superTieBreak ? ' · 3º set é super tie-break de 10' : ''}${fmt.pontoDecisivo ? ' · ponto decisivo' : ''}</small>
        <div class="btnrow"><button class="btn sm" type="button" data-act="campNovo">+ Novo campeonato</button><button class="btn sm bad" type="button" data-act="campApagar" data-id="${camp.id}" data-confirm="Apagar este campeonato e todos os resultados?">Apagar</button></div></div>`);
      const sem = jogos.filter((j) => j._st === 'aguardando').length;
      if (sem) out.push(`<div class="org-flash bad">${sem} jogo(s) já passaram do horário e estão sem resultado. Lance o placar abaixo.</div>`);
      // tabela dos grupos
      out.push('<section class="org-sec"><h2>Grupos</h2><div class="g2">');
      T.grupos(camp).forEach((g) => {
        out.push(`<div class="org-card sm"><h4>Grupo ${g}${T.grupoCompleto(camp, g) ? ' ' + Org.chip('✔ completo', 'ok') : ''}</h4><table class="tbl cp"><tr><th>#</th><th>Dupla</th><th class="n">J</th><th class="n">V</th><th class="n">Sets</th><th class="n">Games</th></tr>${T.tabela(camp, g).map((r) => `<tr class="${r.pos <= fmt.classificam ? 'q' : ''}"><td>${r.pos}</td><td>${esc(r.dupla.nome)}</td><td class="n">${r.J}</td><td class="n">${r.V}</td><td class="n">${r.sv}–${r.sp}</td><td class="n">${r.gv}–${r.gp}</td></tr>`).join('')}</table></div>`);
      });
      out.push('</div></section>');
      // jogos
      const blocos = [['grupo', 'Fase de grupos'], ['oitavas', 'Oitavas'], ['quartas', 'Quartas'], ['semi', 'Semifinais'], ['final', 'Final'], ['terceiro', 'Disputa de 3º lugar']];
      blocos.forEach(([fase, nome]) => {
        const js = jogos.filter((j) => j.fase === fase); if (!js.length) return;
        out.push(`<section class="org-sec"><h2>${nome}</h2>`);
        js.forEach((j) => {
          const pt = T.participantes(camp, j), na = dnome(camp, pt.a.id, pt.a.label), nb = dnome(camp, pt.b.id, pt.b.label), st = ST_JOGO[j._st] || ST_JOGO.agendado, pronto = pt.a.id && pt.b.id;
          const w = T.vencedorJogo(j, fmt);
          out.push(`<div class="jogo${p.jogo === j.id ? ' open' : ''}"><div class="jh"><span class="jq">${j.data ? `${dm(j.data)} · ${esc(j.inicio)} · Q${j.quadra}` : 'sem horário'}</span><small>${esc(T.rotuloJogo(j))}</small>${Org.chip(st[0], st[1])}</div>
            <div class="jv"><b class="${w === 'a' ? 'w' : ''}">${esc(na)}</b><i>×</i><b class="${w === 'b' ? 'w' : ''}">${esc(nb)}</b><span class="js">${esc(T.placarTexto(j)) || '—'}</span></div>
            <div class="btnrow"><button class="btn sm${j._st === 'aguardando' ? ' pri' : ''}" type="button" data-act="jogoPlacar" data-id="${j.id}" ${pronto ? '' : 'disabled title="Aguardando as duplas serem definidas"'}>Lançar placar</button><button class="btn sm" type="button" data-act="jogoHorario" data-id="${j.id}">Horário</button></div>
            ${p.jogo === j.id ? (p.modo === 'horario' ? horarioJogoForm(S, camp, j) : placarForm(camp, j, fmt)) : ''}</div>`);
        });
        out.push('</section>');
      });
      return out.join('');
    },
  };
  function placarForm(camp, j, fmt) {
    const sets = j.sets || [], n = fmt.melhorDe;
    return `<form class="jf" data-form="jogoPlacar" data-camp="${camp.id}" data-id="${j.id}"><b>Placar por set</b> <small class="dim">(deixe em branco o set que não foi jogado${fmt.superTieBreak ? '; o 3º set é super tie-break: digite os pontos, ex.: 10 e 7' : ''})</small>
      <div class="sets">${Array.from({ length: n }, (_, i) => `<div class="set"><span>${i + 1}º set${i === 2 && fmt.superTieBreak ? ' (super tie-break)' : ''}</span><input type="number" min="0" max="99" name="a${i}" value="${sets[i] ? sets[i][0] : ''}" aria-label="Dupla A, set ${i + 1}"><i>×</i><input type="number" min="0" max="99" name="b${i}" value="${sets[i] ? sets[i][1] : ''}" aria-label="Dupla B, set ${i + 1}"></div>`).join('')}</div>
      <label class="chk"><input type="checkbox" name="encerrado" ${j.encerrado ? 'checked' : ''}> Partida encerrada (vale na tabela e no mata-mata)</label>
      <div class="btnrow"><button class="btn pri sm" type="submit">Salvar placar</button><button class="btn sm" type="button" data-act="jogoFechar">Fechar</button></div></form>`;
  }
  function horarioJogoForm(S, camp, j) {
    const d = j.data || Org.today(), [abre, fecha] = A.hoursFor(S, ABT.parseDK(d)), horas = Org.timeOpts(abre, fecha);
    return `<form class="jf" data-form="jogoHorario" data-camp="${camp.id}" data-id="${j.id}"><b>Mudar horário e quadra</b><div class="g3">${Org.fld('Data', `<input type="date" name="data" value="${d}" required>`)}${Org.fld('Início', Org.sel('inicio', horas, j.inicio || '14:00'))}${Org.fld('Fim', Org.sel('fim', horas, j.fim || '15:00'))}</div>
      ${Org.fld('Quadra', Org.sel('quadra', [1, 2, 3, 4].map((q) => ({ v: q, t: 'Quadra ' + q })), j.quadra || 1))}
      <div class="btnrow"><button class="btn pri sm" type="submit">Salvar horário</button><button class="btn sm" type="button" data-act="jogoFechar">Fechar</button></div></form>`;
  }
  Org.acts.jogoPlacar = function (b) { this.p.jogo = this.p.jogo === b.dataset.id && this.p.modo === 'placar' ? null : b.dataset.id; this.p.modo = 'placar'; this.render(); };
  Org.acts.jogoHorario = function (b) { this.p.jogo = this.p.jogo === b.dataset.id && this.p.modo === 'horario' ? null : b.dataset.id; this.p.modo = 'horario'; this.render(); };
  Org.acts.jogoFechar = function () { this.p.jogo = null; this.formDirty = false; this.render(); };
  Org.acts.campNovo = function () { this.p.novo = true; this.render(true); };
  Org.acts.campCancelar = function () { this.p.novo = false; this.formDirty = false; this.render(true); };
  Org.acts.campApagar = function (b) { this.p.camp = null; this.run((s) => R.excluirCampeonato(s, b.dataset.id), 'Campeonato apagado.'); };
  Org.forms.jogoPlacar = function (f, fd) {
    const sets = []; for (let i = 0; i < 3; i++) { const a = fd.get('a' + i), b = fd.get('b' + i); if (a === '' && b === '') continue; if (a === '' || b === '') { this.flash(`Complete os dois lados do ${i + 1}º set.`, true); return; } sets.push([Number(a), Number(b)]); }
    const keep = this.p.jogo;
    const r = this.run((s) => R.salvarPlacarJogo(s, f.dataset.camp, f.dataset.id, sets, !!fd.get('encerrado')), 'Placar salvo.');
    if (!r.ok) this.p.jogo = keep;
  };
  Org.forms.jogoHorario = function (f, fd) {
    const r = this.run((s) => R.salvarHorarioJogo(s, f.dataset.camp, f.dataset.id, { data: fd.get('data'), inicio: fd.get('inicio'), fim: fd.get('fim'), quadra: fd.get('quadra') }), 'Horário do jogo salvo.');
    if (r.ok) this.p.jogo = null;
  };

  function duplaRow(i) {
    return `<div class="dupla-row" data-i="${i}"><span class="dn">${i}</span><div>${Org.picker('d' + i + 'a', [], { max: 1, novo: 'aluno', placeholder: 'Jogador 1' })}</div><div>${Org.picker('d' + i + 'b', [], { max: 1, novo: 'aluno', placeholder: 'Jogador 2' })}</div></div>`;
  }
  function novoForm(o, S) {
    const [abre, fecha] = A.hoursFor(S, ABT.addDays(ABT.parseDK(o.today()), 7)), sab = ABT.dk(ABT.Sample.proximoSabado(o.now()));
    return `<form class="org-card form" data-form="campCriar" data-recalc="camp"><h3>Novo campeonato</h3>
      <p class="org-sub">Cadastre as duplas (digite os nomes; quem não existir é cadastrado). O sistema sorteia os grupos, monta todos contra todos e o mata-mata cruzado, e escolhe horários livres.</p>
      <div class="g2">${Org.fld('Nome do campeonato', `<input type="text" name="nome" maxlength="40" placeholder="Ex.: Copa da Arena" required>`)}${Org.fld('Data do primeiro jogo', `<input type="date" name="data" value="${sab}" required>`)}</div>
      <div class="g3">${Org.fld('Começa às', Org.sel('inicio', Org.timeOpts(7, 20), '14:00'))}${Org.fld('Duração de cada jogo', Org.sel('duracao', [{ v: 1, t: '1 hora' }, { v: 1.5, t: '1 h 30' }, { v: 2, t: '2 horas' }], 1))}${Org.fld('Grupos', Org.sel('nGrupos', [{ v: '', t: 'Automático' }, 1, 2, 3, 4, 6, 8].slice(0, 1).concat([1, 2, 3, 4, 6, 8].map((n) => ({ v: n, t: n + (n === 1 ? ' grupo' : ' grupos') }))), ''))}</div>
      ${Org.fld('Quadras usadas', `<div class="dias">${[1, 2, 3, 4].map((q) => `<label><input type="checkbox" name="quadras" value="${q}" checked><span>Q${q}</span></label>`).join('')}</div>`)}
      <label class="chk"><input type="checkbox" name="terceiro" checked> Disputa de 3º lugar</label>
      <h4 class="cat">Duplas (mínimo 3)</h4><div id="duplas">${[1, 2, 3, 4].map(duplaRow).join('')}</div>
      <div class="btnrow"><button class="btn sm" type="button" data-act="duplaAdd">+ Adicionar dupla</button></div>
      <div class="btnrow"><button class="btn pri" type="submit">Criar campeonato</button><button class="btn" type="button" data-act="campCancelar">Cancelar</button></div></form>`;
  }
  Org.acts.duplaAdd = function () { const box = $('duplas'), n = box.children.length + 1; if (n > 32) return; box.insertAdjacentHTML('beforeend', duplaRow(n)); };
  Org.forms.campCriar = function (f, fd) {
    const duplas = []; const n = f.querySelectorAll('.dupla-row').length;
    for (let i = 1; i <= n; i++) { const a = fd.get('d' + i + 'a'), b = fd.get('d' + i + 'b'); if (!a && !b) continue; if (!a || !b) { this.flash(`A dupla ${i} precisa de dois jogadores.`, true); return; } duplas.push({ p1: a, p2: b }); }
    const o = { nome: fd.get('nome'), duplas, data: fd.get('data'), inicio: fd.get('inicio'), duracao: parseFloat(fd.get('duracao')), nGrupos: fd.get('nGrupos'), quadras: fd.getAll('quadras').map(Number), formato: { terceiro: !!fd.get('terceiro') } };
    if (!o.quadras.length) { this.flash('Marque pelo menos uma quadra.', true); return; }
    this.p.novo = false;
    const r = this.run((s) => R.criarCampeonato(s, o), null);
    if (!r.ok) { this.p.novo = true; return; }
    this.p.camp = r.id; this.render(true); this.flash(`Campeonato criado com ${r.jogos} jogos, já distribuídos nas quadras livres.`);
  };

  /* =========================================================
     Avisos e patrocinadores (D41)
     ========================================================= */
  Org.views.avisos = {
    title: 'Avisos e patrocinadores',
    render(o, S) {
      const hoje = o.today(), ativoHoje = (x) => x.ativo !== false && (!x.inicio || x.inicio <= hoje) && (!x.fim || x.fim >= hoje);
      const periodo = (x) => (x.inicio || x.fim ? `${x.inicio ? dm(x.inicio) : '…'} a ${x.fim ? dm(x.fim) : '…'}` : 'sempre');
      const ea = o.p.ea === 'novo' ? {} : (o.p.ea ? S.avisos.find((x) => x.id === o.p.ea) : null);
      const ep = o.p.ep === 'novo' ? {} : (o.p.ep ? S.patrocinadores.find((x) => x.id === o.p.ep) : null);
      const out = [];
      out.push(`<p class="org-sub">A faixa da TV troca de item a cada ${S.config.anuncioSegundos || 8} segundos. Aniversários aparecem sozinhos pelo cadastro (data de nascimento, opcional). A fila do day use também aparece quando há fila.</p>`);
      out.push('<section class="org-sec"><h2>Avisos</h2>');
      out.push(S.avisos.length ? `<table class="tbl">${S.avisos.map((a) => `<tr><td>${esc(a.texto)}</td><td>${periodo(a)}</td><td>${ativoHoje(a) ? Org.chip('no ar', 'ok') : Org.chip(a.ativo === false ? 'desligado' : 'fora do período')}</td><td class="n"><button class="btn sm" type="button" data-act="avEditar" data-id="${a.id}">Editar</button></td></tr>`).join('')}</table>` : '<p class="dim">Nenhum aviso.</p>');
      if (ea) out.push(`<form class="org-card form" data-form="aviso" data-id="${ea.id || ''}"><h3>${ea.id ? 'Editar aviso' : 'Novo aviso'}</h3>${Org.fld('Texto (até 140 letras)', `<input type="text" name="texto" value="${esc(ea.texto || '')}" maxlength="140" required>`)}<div class="g2">${Org.fld('De', `<input type="date" name="inicio" value="${esc(ea.inicio || hoje)}">`)}${Org.fld('Até', `<input type="date" name="fim" value="${esc(ea.fim || '')}">`)}</div><label class="chk"><input type="checkbox" name="ativo" ${ea.ativo === false ? '' : 'checked'}> Ligado</label>
        <div class="btnrow"><button class="btn pri" type="submit">Salvar</button><button class="btn" type="button" data-act="avFechar">Cancelar</button>${ea.id ? `<button class="btn bad" type="button" data-act="avApagar" data-id="${ea.id}" data-confirm="Apagar o aviso?">Apagar</button>` : ''}</div></form>`);
      else out.push('<div class="btnrow"><button class="btn" type="button" data-act="avNovo">+ Novo aviso</button></div>');
      out.push('</section><section class="org-sec"><h2>Patrocinadores</h2>');
      out.push(S.patrocinadores.length ? `<table class="tbl">${S.patrocinadores.map((a) => `<tr><td>${/^https?:\/\//i.test(a.imagem || '') ? `<img class="thumb" src="${esc(a.imagem)}" alt="" onerror="this.remove()">` : ''}${esc(a.nome)}</td><td>${periodo(a)}</td><td>${ativoHoje(a) ? Org.chip('no ar', 'ok') : Org.chip(a.ativo === false ? 'desligado' : 'fora do período')}</td><td class="n"><button class="btn sm" type="button" data-act="paEditar" data-id="${a.id}">Editar</button></td></tr>`).join('')}</table>` : '<p class="dim">Nenhum patrocinador.</p>');
      if (ep) out.push(`<form class="org-card form" data-form="patroc" data-id="${ep.id || ''}"><h3>${ep.id ? 'Editar patrocinador' : 'Novo patrocinador'}</h3>${Org.fld('Nome', `<input type="text" name="nome" value="${esc(ep.nome || '')}" maxlength="60" required>`)}${Org.fld('Link direto da imagem (.png ou .jpg)', `<input type="url" name="imagem" value="${esc(ep.imagem || '')}" placeholder="https://…/logo.png">`)}<p class="org-note">Link de pasta do Drive não vira imagem na TV. Use o link direto da imagem; se falhar, a TV mostra só o nome.</p><div class="g2">${Org.fld('De', `<input type="date" name="inicio" value="${esc(ep.inicio || hoje)}">`)}${Org.fld('Até', `<input type="date" name="fim" value="${esc(ep.fim || '')}">`)}</div><label class="chk"><input type="checkbox" name="ativo" ${ep.ativo === false ? '' : 'checked'}> Ligado</label>
        <div class="btnrow"><button class="btn pri" type="submit">Salvar</button><button class="btn" type="button" data-act="paFechar">Cancelar</button>${ep.id ? `<button class="btn bad" type="button" data-act="paApagar" data-id="${ep.id}" data-confirm="Apagar o patrocinador?">Apagar</button>` : ''}</div></form>`);
      else out.push('<div class="btnrow"><button class="btn" type="button" data-act="paNovo">+ Novo patrocinador</button></div>');
      out.push('</section>');
      return out.join('');
    },
  };
  Org.acts.avNovo = function () { this.p.ea = 'novo'; this.render(); };
  Org.acts.avEditar = function (b) { this.p.ea = b.dataset.id; this.render(); };
  Org.acts.avFechar = function () { this.p.ea = null; this.formDirty = false; this.render(); };
  Org.acts.avApagar = function (b) { this.p.ea = null; this.run((s) => R.removerAviso(s, b.dataset.id), 'Aviso apagado.'); };
  Org.acts.paNovo = function () { this.p.ep = 'novo'; this.render(); };
  Org.acts.paEditar = function (b) { this.p.ep = b.dataset.id; this.render(); };
  Org.acts.paFechar = function () { this.p.ep = null; this.formDirty = false; this.render(); };
  Org.acts.paApagar = function (b) { this.p.ep = null; this.run((s) => R.removerPatrocinador(s, b.dataset.id), 'Patrocinador apagado.'); };
  Org.forms.aviso = function (f, fd) {
    const id = f.dataset.id; this.p.ea = null;
    const r = this.run((s) => R.salvarAviso(s, { id: id || undefined, texto: fd.get('texto'), inicio: fd.get('inicio'), fim: fd.get('fim'), ativo: !!fd.get('ativo') }), 'Aviso salvo.');
    if (!r.ok) this.p.ea = id || 'novo';
  };
  Org.forms.patroc = function (f, fd) {
    const id = f.dataset.id; this.p.ep = null;
    const r = this.run((s) => R.salvarPatrocinador(s, { id: id || undefined, nome: fd.get('nome'), imagem: fd.get('imagem'), inicio: fd.get('inicio'), fim: fd.get('fim'), ativo: !!fd.get('ativo') }), 'Patrocinador salvo.');
    if (!r.ok) this.p.ep = id || 'novo';
  };

  /* =========================================================
     Dados e configurações (D17, D31)
     ========================================================= */
  Org.views.config = {
    title: 'Dados e configurações',
    render(o, S) {
      const b = D.backupInfo(o.now()), r = D.summary(), vazio = D.isEmpty();
      const bk = vazio ? 'Sem dados ainda.' : (b.nunca ? 'Você nunca exportou um backup.' : `Último backup: ${b.dias === 0 ? 'hoje' : 'há ' + b.dias + ' dia(s)'}.`);
      return `<section class="org-card"><h3>Backup dos dados</h3>
          <div class="org-flash ${b.atrasado ? 'bad' : 'ok'}">${esc(bk)}${b.atrasado ? ` Exporte agora (aviso a partir de ${b.limite} dias).` : ''}</div>
          <p class="dim">${r.pessoas} pessoas · ${r.horarios} horários · ${r.turmas} turmas · ${r.campeonatos} campeonato(s). Os dados ficam só neste navegador: se alguém limpar os dados do Chrome, o que não foi exportado se perde. Guarde o arquivo .json no Drive.</p>
          <div class="btnrow"><button class="btn pri" type="button" data-act="cfgExportar">⬇ Exportar .json</button>
          <button class="btn" type="button" data-act="cfgImportar" ${vazio ? '' : 'data-confirm="Importar substitui os dados atuais. Continuar?"'}>⬆ Importar .json</button></div>
          <input type="file" id="orgFile" accept="application/json,.json" hidden></section>
        <form class="org-card form" data-form="config" data-nokeep="0"><h3>Configurações</h3>${Org.fld('Nome da arena', `<input type="text" name="nomeArena" value="${esc(S.config.nomeArena)}" maxlength="40">`)}
          <div class="g3">${Org.fld('Avisar backup após (dias)', `<input type="number" name="diasAvisoBackup" min="1" max="60" value="${S.config.diasAvisoBackup}">`)}${Org.fld('Limpeza atrasada após (dias)', `<input type="number" name="diasLimpezaAtrasada" min="1" max="30" value="${S.config.diasLimpezaAtrasada}">`)}${Org.fld('Segundos por aviso na TV', `<input type="number" name="anuncioSegundos" min="3" max="60" value="${S.config.anuncioSegundos}">`)}</div>
          <label class="chk"><input type="checkbox" name="placarIlustrativo" ${S.config.placarIlustrativo ? 'checked' : ''}> Mostrar placar de enfeite em aluguel e day use (não recomendado: o placar não é real)</label>
          <p class="dim">Funcionamento: segunda a sexta ${ABT.fmtHM(S.config.horario.semana[0])}–${ABT.fmtHM(S.config.horario.semana[1])} · sábado e domingo ${ABT.fmtHM(S.config.horario.fimSemana[0])}–${ABT.fmtHM(S.config.horario.fimSemana[1])}.</p>
          <div class="btnrow"><button class="btn pri" type="submit">Salvar configurações</button></div></form>
        <form class="org-card form" data-form="pinMudar" data-nokeep="1"><h3>PIN da Organização</h3><p class="dim">${R.temPin(S) ? 'PIN ativo. Você pode trocá-lo ou removê-lo.' : 'Sem PIN: qualquer pessoa na tela entra. Crie um.'}</p>
          <div class="g2">${Org.fld('Novo PIN (4 a 8 números)', `<input class="pin" type="password" name="pin" inputmode="numeric" maxlength="8" autocomplete="off">`)}${Org.fld('Repita o PIN', `<input class="pin" type="password" name="pin2" inputmode="numeric" maxlength="8" autocomplete="off">`)}</div>
          <div class="btnrow"><button class="btn pri" type="submit">${R.temPin(S) ? 'Trocar PIN' : 'Criar PIN'}</button>${R.temPin(S) ? '<button class="btn bad" type="button" data-act="pinRemover" data-confirm="Remover o PIN?">Remover PIN</button>' : ''}</div></form>
        <section class="org-card"><h3>Dados de exemplo</h3><p class="dim">Para conhecer o sistema. Carregar o exemplo substitui o que existe; apagar tudo remove inclusive o PIN.</p>
          <div class="btnrow"><button class="btn" type="button" data-act="cfgExemplo" ${vazio ? '' : 'data-confirm="Substituir os dados atuais pelo exemplo?"'}>Carregar exemplo</button><button class="btn bad" type="button" data-act="cfgApagar" data-confirm="Apagar TODOS os dados?">Apagar tudo</button></div></section>`;
    },
  };
  Org.acts.cfgExportar = function () {
    if (D.isEmpty()) { this.flash('Não há dados para exportar.', true); return; }
    try { D.downloadBackup(new Date()); this.render(); this.flash('Backup exportado: ' + D.exportFileName(new Date()) + '. Guarde no Drive.'); } catch (e) { this.flash('Não consegui gerar o arquivo neste navegador.', true); }
  };
  Org.acts.cfgImportar = function () { const f = $('orgFile'); if (f) f.click(); };
  document.addEventListener('change', (e) => {
    const t = e.target; if (!t || t.id !== 'orgFile' || !Org.el || !Org.el.contains(t)) return;
    const f = t.files && t.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const res = D.importText(String(rd.result));
      Org.render(); Org.flash(res.ok ? `Backup importado: ${res.resumo.pessoas} pessoas, ${res.resumo.horarios} horários, ${res.resumo.turmas} turmas, ${res.resumo.campeonatos} campeonato(s).` : 'Não importei: ' + res.erro, !res.ok);
    };
    rd.onerror = () => Org.flash('Não consegui ler o arquivo.', true);
    rd.readAsText(f); t.value = '';
  });
  Org.acts.cfgExemplo = function () { D.loadSample(new Date()); this.render(); this.flash('Exemplo carregado.'); };
  Org.acts.cfgApagar = function () { D.clear(); this.render(); this.flash('Todos os dados foram apagados deste navegador.'); };
  Org.acts.pinRemover = function () { this.run((s) => R.removerPin(s), 'PIN removido.'); };
  Org.forms.pinMudar = function (f, fd) {
    if (fd.get('pin') !== fd.get('pin2')) { this.flash('Os dois PINs precisam ser iguais.', true); return; }
    this.run((s) => R.definirPin(s, String(fd.get('pin'))), 'PIN salvo.');
  };
  Org.forms.config = function (f, fd) {
    this.run((s) => R.salvarConfig(s, { nomeArena: fd.get('nomeArena'), diasAvisoBackup: fd.get('diasAvisoBackup'), diasLimpezaAtrasada: fd.get('diasLimpezaAtrasada'), anuncioSegundos: fd.get('anuncioSegundos'), placarIlustrativo: !!fd.get('placarIlustrativo') }), 'Configurações salvas.');
  };
})();
