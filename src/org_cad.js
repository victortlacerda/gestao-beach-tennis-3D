/* ============================================================
   Organização: Escritório (pessoas e alunos), editor de boneco com prévia 3D,
   Lojinha, Lanchonete, Estoque e Vestiário.
   ============================================================ */
(function () {
  const ABT = window.ABT, Org = ABT.Org, R = ABT.Regras, A = ABT.Agenda, D = ABT.Data;
  const { esc, money, dm, dmy, pagChip } = Org.h;
  const safeLink = (l) => (/^https?:\/\//i.test(l || '') ? esc(l) : '');
  const link = (l, txt) => (safeLink(l) ? `<a href="${safeLink(l)}" target="_blank" rel="noopener noreferrer">${txt}</a>` : '');
  const num = (v) => String(v).replace('.', ',');

  /* =========================================================
     Escritório: pessoas e alunos (D10, D12, D14, D44)
     ========================================================= */
  Org.views.pessoas = {
    title: 'Escritório · Pessoas',
    render(o, S) {
      const p = o.p, filtro = p.filtro || 'todos', q = (p.q || '').trim().toLowerCase(), pag = p.pag || '';
      if (p.boneco) return bonecoHtml(o, S);
      let lista = S.pessoas.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      const contagem = (t) => S.pessoas.filter((x) => t === 'todos' || x.tipo === t).length;
      if (filtro !== 'todos') lista = lista.filter((x) => x.tipo === filtro);
      if (q) lista = lista.filter((x) => (x.nome + ' ' + (x.apelido || '')).toLowerCase().includes(q));
      const al = (id) => S.alunos.find((a) => a.pessoaId === id);
      if (pag) lista = lista.filter((x) => (al(x.id) || {}).pagamento === pag);
      const out = [];
      out.push(`<div class="chips2">${['todos'].concat(Object.keys(R.TIPOS_PESSOA)).map((t) => `<button type="button" class="${t === filtro ? 'on' : ''}" data-act="pFiltro" data-v="${t}">${t === 'todos' ? 'Todos' : R.TIPOS_PESSOA[t] + 's'} <b>${contagem(t)}</b></button>`).join('')}</div>`);
      out.push(`<div class="filterbar"><input type="search" placeholder="Buscar por nome ou apelido" value="${esc(p.q || '')}" data-act="pBusca" aria-label="Buscar" data-keepfocus="1">
        ${Org.sel('pag', [{ v: '', t: 'Pagamento: todos' }, { v: 'em_dia', t: 'Em dia' }, { v: 'pendente', t: 'Pendente' }, { v: 'atrasado', t: 'Atrasado' }], pag, 'data-act="pPag" aria-label="Filtrar por pagamento"')}
        <button class="btn pri" type="button" data-act="pNova">+ Nova pessoa</button></div>`);
      if (p.edit) out.push(pessoaForm(S, p.edit === 'novo' ? { tipo: filtro !== 'todos' ? filtro : 'aluno' } : S.pessoas.find((x) => x.id === p.edit) || {}, al));
      if (!lista.length) out.push('<p class="org-empty">Ninguém por aqui' + (S.pessoas.length ? ' com esses filtros.' : '. Toque em "+ Nova pessoa" para começar.') + '</p>');
      else out.push('<div class="plist2">' + lista.map((x) => {
        const a = al(x.id), tipo = R.TIPOS_PESSOA[x.tipo];
        return `<div class="prow"><div class="pn"><b>${esc(x.nome)}</b><small>TV: ${esc(x.apelido || x.nome.split(' ')[0])} · ${esc(tipo)}${x.contato ? ' · ' + esc(x.contato) : ''}${x.nascimento ? ' · 🎂 ' + dm(x.nascimento) : ''}</small></div>
          <div class="pa">${a ? `${link(a.contrato, '📄 contrato')}${Org.sel('pagamento', Object.keys(R.PAGAMENTO).map((k) => ({ v: k, t: R.PAGAMENTO[k] })), a.pagamento, `data-act="pPagSet" data-id="${x.id}" aria-label="Pagamento de ${esc(x.nome)}" class="pg ${a.pagamento}"`)}` : ''}
          <button class="btn sm" type="button" data-act="pEditar" data-id="${x.id}">Editar</button><button class="btn sm" type="button" data-act="pBoneco" data-id="${x.id}">🧍 Boneco</button></div></div>`;
      }).join('') + '</div>');
      out.push('<p class="org-note">🔒 Este arquivo tem dados pessoais. O backup .json deve ficar em local seguro. Contratos ficam no Drive: aqui só o link.</p>');
      return out.join('');
    },
  };
  function pessoaForm(S, e, al) {
    const a = (e.id && al(e.id)) || {};
    return `<form class="org-card form" data-form="pessoa" data-id="${e.id || ''}" data-recalc="pessoa"><h3>${e.id ? 'Editar pessoa' : 'Nova pessoa'}</h3>
      <div class="g2">${Org.fld('Nome', `<input type="text" name="nome" value="${esc(e.nome || '')}" maxlength="60" required>`)}${Org.fld('Apelido na TV', `<input type="text" name="apelido" value="${esc(e.apelido || '')}" maxlength="14" placeholder="padrão: primeiro nome">`)}</div>
      <div class="g2">${Org.fld('Tipo', Org.sel('tipo', Object.keys(R.TIPOS_PESSOA).map((k) => ({ v: k, t: R.TIPOS_PESSOA[k] })), e.tipo || 'aluno'))}${Org.fld('Contato', `<input type="text" name="contato" value="${esc(e.contato || '')}" maxlength="40" placeholder="telefone ou e-mail">`)}</div>
      ${Org.fld('Nascimento (opcional, para aniversário na TV)', `<input type="date" name="nascimento" value="${esc(e.nascimento || '')}">`)}
      <div data-only="aluno" ${(e.tipo || 'aluno') === 'aluno' ? '' : 'hidden'}>
        <div class="g2">${Org.fld('Plano', `<input type="text" name="plano" value="${esc(a.plano || '')}" maxlength="40" placeholder="Ex.: Mensal">`)}${Org.fld('Link do contrato (Drive)', `<input type="url" name="contrato" value="${esc(a.contrato || '')}" placeholder="https://…">`)}</div>
        ${Org.fld('Pagamento', Org.seg('pagamento', Object.keys(R.PAGAMENTO).map((k) => ({ v: k, t: R.PAGAMENTO[k] })), a.pagamento || 'em_dia'))}
        ${Org.fld('Observações', `<input type="text" name="obs" value="${esc(a.obs || '')}" maxlength="120">`)}</div>
      <div class="btnrow"><button class="btn pri" type="submit">Salvar</button><button class="btn" type="button" data-act="pFechar">Cancelar</button>
        ${e.id ? `<button class="btn bad" type="button" data-act="pApagar" data-id="${e.id}" data-confirm="Apagar esta pessoa?">Apagar</button>` : ''}</div></form>`;
  }
  Org.recalcs.pessoa = function (f) { const t = f.elements.tipo.value; f.querySelectorAll('[data-only]').forEach((x) => { x.hidden = x.dataset.only !== t; }); };
  Org.acts.pFiltro = function (b) { this.p.filtro = b.dataset.v; this.render(); };
  Org.acts.pNova = function () { this.p.edit = 'novo'; this.render(); const f = this.el.querySelector('form.form'); if (f) { f.scrollIntoView({ block: 'nearest' }); f.elements.nome.focus(); } };
  Org.acts.pEditar = function (b) { this.p.edit = b.dataset.id; this.render(); const f = this.el.querySelector('form.form'); if (f) f.scrollIntoView({ block: 'nearest' }); };
  Org.acts.pFechar = function () { this.p.edit = null; this.formDirty = false; this.render(); };
  Org.acts.pApagar = function (b) { this.p.edit = null; this.run((s) => R.removerPessoa(s, b.dataset.id), 'Pessoa apagada.'); };
  Org.acts.pBusca = function () { /* via input */ };
  Org.acts.pPag = function () { /* via change */ };
  Org.acts.pPagSet = function () { /* via change */ };
  Org.forms.pessoa = function (f, fd) {
    const id = f.dataset.id, tipo = fd.get('tipo');
    this.p.edit = null;
    const r = this.run((s) => {
      const x = R.salvarPessoa(s, { id: id || undefined, nome: fd.get('nome'), apelido: fd.get('apelido'), tipo, contato: fd.get('contato'), nascimento: fd.get('nascimento') });
      if (!x.ok) return x;
      if (tipo === 'aluno') return R.salvarAluno(s, x.id, { plano: fd.get('plano'), contrato: fd.get('contrato'), pagamento: fd.get('pagamento'), obs: fd.get('obs') }) || x;
      return x;
    }, 'Pessoa salva.');
    if (!r.ok) this.p.edit = id || 'novo';
  };
  // busca e pagamento: reagem enquanto a pessoa digita (sem perder o foco)
  document.addEventListener('input', (e) => {
    const t = e.target; if (!t.dataset || t.dataset.act !== 'pBusca' || !Org.el || !Org.el.contains(t)) return;
    Org.p.q = t.value; const pos = t.selectionStart; Org.render();
    const n = Org.el.querySelector('[data-act=pBusca]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { /* ok */ } }
  });
  document.addEventListener('change', (e) => {
    const t = e.target; if (!t.dataset || !Org.el || !Org.el.contains(t)) return;
    if (t.dataset.act === 'pPag') { Org.p.pag = t.value; Org.render(); }
    else if (t.dataset.act === 'pPagSet') Org.run((s) => R.salvarAluno(s, t.dataset.id, { pagamento: t.value }), 'Pagamento atualizado.');
  });

  /* ---------- editor de boneco com prévia 3D (D22, D39, D45) ---------- */
  const OPCOES = [
    { k: 'skin', t: 'Tom de pele', n: ['Claro', 'Médio claro', 'Médio escuro', 'Escuro'], c: () => ABT.Look.SKIN },
    { k: 'hair', t: 'Cabelo', n: () => ABT.Look.hairStyles },
    { k: 'hairColor', t: 'Cor do cabelo', n: ['Preto', 'Castanho', 'Loiro', 'Ruivo'], c: () => ABT.Look.HAIR_COLOR },
    { k: 'shirt', t: 'Camisa', n: ['Turquesa', 'Coral', 'Amarela', 'Branca'], c: () => ABT.Look.SHIRT, naoProf: true },
    { k: 'shorts', t: 'Shorts', n: ['Azul-marinho', 'Preto', 'Cinza', 'Verde'], c: () => ABT.Look.SHORTS },
    { k: 'acc', t: 'Acessório', n: () => ABT.Look.accessories },
    { k: 'racket', t: 'Raquete', n: ['Coral', 'Turquesa', 'Azul', 'Amarela'], c: () => [0xFF6B57, 0x1FB5B0, 0x12355B, 0xF4C531] },
  ];
  const hexc = (n) => '#' + n.toString(16).padStart(6, '0');
  function bonecoHtml(o, S) {
    const pe = S.pessoas.find((x) => x.id === o.p.boneco); if (!pe) { o.p.boneco = null; return ''; }
    if (!o._look || o._lookId !== pe.id) { o._lookId = pe.id; o._look = Object.assign(ABT.Look.fromName(A.nomeTV(pe)), pe.boneco || {}); o._auto = !pe.boneco; }
    const L = o._look, prof = pe.tipo === 'professor';
    return `<div class="org-card boneco"><div class="rowb"><h3>Boneco de ${esc(pe.nome)}</h3><button class="btn sm" type="button" data-act="bonVoltar">← Voltar</button></div>
      <p class="org-sub">${o._auto ? 'Este boneco ainda é o automático (sorteado pelo nome).' : 'Aparência personalizada.'} O aluno escolhe com a recepção (D45). ${prof ? 'Professor tem camisa roxa exclusiva e destaque dourado.' : ''}</p>
      <div class="bon-grid"><div class="bon-prev"><canvas id="bonCanvas" width="240" height="320" aria-label="Prévia 3D do boneco"></canvas><small class="dim">Arraste para girar</small><div class="btnrow"><button class="btn sm" type="button" data-act="bonSortear">🎲 Sortear</button></div></div>
      <div class="bon-opts">${OPCOES.filter((x) => !(prof && x.naoProf)).map((op) => {
        const n = typeof op.n === 'function' ? op.n() : op.n, cs = op.c ? op.c() : null;
        return `<div class="optrow"><b>${op.t}</b><div class="opts">${n.map((nm, i) => `<button type="button" class="${L[op.k] === i ? 'on' : ''}" data-act="bonOpt" data-k="${op.k}" data-i="${i}" title="${esc(nm)}">${cs ? `<i class="sw" style="background:${hexc(cs[i])}"></i>` : ''}${esc(nm)}</button>`).join('')}</div></div>`;
      }).join('')}
      <div class="optrow"><b>Presets prontos</b><div class="opts presets">${ABT.Look.presets.map((pr, i) => `<button type="button" data-act="bonPreset" data-i="${i}" title="Preset ${i + 1}"><i class="sw" style="background:${hexc(ABT.Look.SHIRT[pr.shirt])}"></i><i class="sw" style="background:${hexc(ABT.Look.SKIN[pr.skin])}"></i>${i + 1}</button>`).join('')}</div></div></div></div>
      <div class="btnrow"><button class="btn pri" type="button" data-act="bonSalvar" data-id="${pe.id}">Salvar boneco</button><button class="btn" type="button" data-act="bonAuto" data-id="${pe.id}">Voltar ao automático</button></div></div>`;
  }
  Org.acts.pBoneco = function (b) { this.p.boneco = b.dataset.id; this._lookId = null; this.render(true); };
  Org.acts.bonVoltar = function () { Preview.stop(); this.p.boneco = null; this._lookId = null; this.formDirty = false; this.render(); };
  Org.acts.bonOpt = function (b) {
    this._look[b.dataset.k] = parseInt(b.dataset.i, 10); this._auto = false;
    b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); Preview.set(this._look);
  };
  Org.acts.bonPreset = function (b) { Object.assign(this._look, ABT.Look.presets[parseInt(b.dataset.i, 10)]); this._auto = false; this.render(); };
  Org.acts.bonSortear = function () {
    const rnd = (n) => Math.floor(Math.random() * n); const L = this._look;
    Object.assign(L, { skin: rnd(4), hair: rnd(4), hairColor: rnd(4), shirt: rnd(4), shorts: rnd(4), acc: rnd(4), racket: rnd(4) }); this._auto = false; this.render();
  };
  Org.acts.bonSalvar = function (b) { const look = Object.assign({}, this._look); Preview.stop(); this.p.boneco = null; this._lookId = null; this.run((s) => R.salvarBoneco(s, b.dataset.id, look), 'Boneco salvo. Ele já aparece na TV.'); };
  Org.acts.bonAuto = function (b) { Preview.stop(); this.p.boneco = null; this._lookId = null; this.run((s) => R.salvarBoneco(s, b.dataset.id, null), 'Boneco voltou ao automático.'); };

  /* prévia 3D: um segundo renderizador pequeno, só enquanto o editor está aberto */
  const Preview = {
    r: null, raf: 0,
    start(canvas, look, teacher) {
      this.stop();
      try {
        const T = THREE, r = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
        r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.setSize(canvas.width, canvas.height, false);
        const sc = new T.Scene(), cam = new T.PerspectiveCamera(30, canvas.width / canvas.height, 0.1, 30);
        cam.position.set(0, 1.05, 4.2); cam.lookAt(0, 0.92, 0);
        sc.add(new T.HemisphereLight(0xFFF4DD, 0x6A8CA8, 0.95));
        const sun = new T.DirectionalLight(0xFFFFFF, 1.0); sun.position.set(2.5, 4, 3); sc.add(sun);
        const ground = new T.Mesh(new T.CircleGeometry(0.9, 24), new T.MeshBasicMaterial({ color: 0xF2D8A7 })); ground.rotation.x = -Math.PI / 2; ground.position.y = 0.001; sc.add(ground);
        this.r = r; this.sc = sc; this.cam = cam; this.teacher = teacher; this.yaw = 0.5; this.vel = 0.5; this.canvas = canvas; this.drag = null;
        this.build(look);
        canvas.addEventListener('pointerdown', (e) => { this.drag = { x: e.clientX, y: this.yaw }; canvas.setPointerCapture(e.pointerId); });
        canvas.addEventListener('pointermove', (e) => { if (this.drag) { this.yaw = this.drag.y + (e.clientX - this.drag.x) * 0.01; this.vel = 0; } });
        canvas.addEventListener('pointerup', () => { this.drag = null; this.vel = 0.5; });
        let last = performance.now();
        const loop = (t) => {
          if (!this.r || !canvas.isConnected) { this.stop(); return; }
          const dt = Math.min(0.05, (t - last) / 1000); last = t;
          this.yaw += this.vel * dt; if (this.b) { this.b.root.rotation.y = this.yaw; this.b.update(dt, t / 1000); }
          this.r.render(this.sc, this.cam); this.raf = requestAnimationFrame(loop);
        };
        this.raf = requestAnimationFrame(loop);
      } catch (e) { this.r = null; const p = canvas.parentNode; if (p) p.insertAdjacentHTML('afterbegin', '<p class="dim">A prévia 3D não funcionou neste navegador. As opções continuam valendo.</p>'); canvas.remove(); }
    },
    build(look) {
      if (this.b) { this.sc.remove(this.b.root); this.b = null; }
      const b = new ABT.Boneco(look, { name: '', teacher: this.teacher }); b.root.position.set(0, 0, 0); b.setMode('stand');
      this.b = b; this.sc.add(b.root);
    },
    set(look) { if (this.r) this.build(look); },
    stop() { cancelAnimationFrame(this.raf); this.raf = 0; if (this.r) { try { this.r.dispose(); this.r.forceContextLoss && this.r.forceContextLoss(); } catch (e) { /* ok */ } } this.r = null; this.b = null; },
  };
  Org.Preview = Preview;
  Org.views.pessoas.after = function (o) {
    if (o.p.boneco) { const c = $('bonCanvas'), pe = o.pessoa(o.p.boneco); if (c && pe) Preview.start(c, o._look, pe.tipo === 'professor'); }
    else Preview.stop();
  };
  function $(id) { return document.getElementById(id); }

  /* =========================================================
     Vendas: Lojinha e Lanchonete (D13, D27)
     ========================================================= */
  function vendaView(tipo) {
    const ehLoja = tipo === 'lojinha';
    return {
      title: ehLoja ? 'Lojinha' : 'Lanchonete',
      render(o, S) {
        const itens = ehLoja ? S.produtos : S.cardapio, cart = (o.p.cart && o.p.cart.tipo === tipo ? o.p.cart.itens : []);
        const out = [];
        out.push(`<p class="org-sub">Venda registrada à mão: item, quantidade e forma de pagamento. Não há maquininha nem banco aqui. O cardápio ${ehLoja ? 'e os preços aparecem' : 'aparece'} na TV (só leitura).</p>`);
        // vitrine
        const cats = ehLoja ? [''] : Array.from(new Set(itens.map((i) => i.categoria || 'Outros')));
        out.push('<section class="org-sec"><h2>Vender</h2>');
        if (!itens.length) out.push('<p class="org-empty">Nenhum item cadastrado ainda. Adicione abaixo em "Itens e preços".</p>');
        cats.forEach((cat) => {
          if (!ehLoja) out.push(`<h4 class="cat">${esc(cat)}</h4>`);
          out.push('<div class="vit">' + itens.filter((i) => ehLoja || (i.categoria || 'Outros') === cat).map((i) => {
            const sem = i.disponivel === false || (ehLoja && i.estoque != null && i.estoque <= 0), noCart = cart.find((c) => c.id === i.id);
            return `<button type="button" class="prod${sem ? ' off' : ''}${noCart ? ' sel' : ''}" data-act="cartAdd" data-id="${i.id}" ${sem ? 'disabled' : ''}><b>${esc(i.nome)}</b><span class="pr">${money(i.preco)}</span>${sem ? Org.chip('✖ Acabou', 'bad') : (ehLoja && i.estoque != null ? `<small>${i.estoque} em estoque</small>` : Org.chip('✔ Disponível', 'ok'))}${noCart ? `<em>× ${noCart.qtd}</em>` : ''}</button>`;
          }).join('') + '</div>');
        });
        if (cart.length) {
          const total = cart.reduce((a, c) => { const it = itens.find((x) => x.id === c.id); return a + (it ? it.preco * c.qtd : 0); }, 0);
          out.push(`<form class="org-card form" data-form="cartFechar" data-nokeep="1"><h3>Venda atual</h3><table class="tbl">${cart.map((c) => { const it = itens.find((x) => x.id === c.id); return it ? `<tr><td>${esc(it.nome)}</td><td class="n"><button type="button" class="btn sm" data-act="cartQtd" data-id="${c.id}" data-d="-1">−</button> <b>${c.qtd}</b> <button type="button" class="btn sm" data-act="cartQtd" data-id="${c.id}" data-d="1">+</button></td><td class="n">${money(it.preco * c.qtd)}</td></tr>` : ''; }).join('')}<tr class="tot"><th>Total</th><th></th><th class="n">${money(total)}</th></tr></table>
            ${Org.fld('Forma de pagamento', Org.seg('forma', Object.keys(R.FORMAS).map((k) => ({ v: k, t: R.FORMAS[k] })), o.p.forma || 'pix'))}
            <div class="btnrow"><button class="btn pri" type="submit">Registrar venda · ${money(total)}</button><button class="btn" type="button" data-act="cartLimpar">Limpar</button></div></form>`);
        }
        out.push('</section>');
        // vendas do dia
        const dk = o.today(), rs = R.resumoVendas(S, dk), lista = rs.lista.filter((v) => ehLoja ? v.tipo === 'lojinha' : v.tipo === 'lanchonete');
        out.push(`<section class="org-sec"><h2>Vendas de hoje</h2><div class="org-card sm"><b>${money(lista.reduce((a, v) => a + v.total, 0))}</b> nesta área · total geral do dia ${money(rs.total)}${Object.keys(rs.porForma).length ? `<div class="chips">${Object.keys(rs.porForma).map((f) => Org.chip(`${R.FORMAS[f]} ${money(rs.porForma[f])}`)).join('')}</div>` : ''}</div>
          ${lista.length ? `<table class="tbl">${lista.map((v) => `<tr><td>${esc(v.quando.slice(11))}</td><td>${esc(v.nome)} × ${v.qtd}</td><td>${esc(R.FORMAS[v.forma])}</td><td class="n">${money(v.total)}</td><td class="n"><button class="btn sm bad" type="button" data-act="vendaEstorno" data-id="${v.id}" data-confirm="Desfazer?">Desfazer</button></td></tr>`).join('')}</table>` : '<p class="dim">Nenhuma venda registrada hoje nesta área.</p>'}</section>`);
        if (ehLoja) out.push(`<section class="org-sec"><h2>Venda avulsa</h2><form class="org-card form inline-form" data-form="vendaAvulsa" data-nokeep="1"><input type="text" name="nome" placeholder="Descrição (ex.: aluguel de raquete)" maxlength="50" required><input type="text" inputmode="decimal" name="preco" placeholder="R$" style="width:90px" required>${Org.sel('forma', Object.keys(R.FORMAS).map((k) => ({ v: k, t: R.FORMAS[k] })), 'pix')}<button class="btn sm" type="submit">Registrar</button></form></section>`);
        // catálogo
        const e = o.p.edit === 'novo' ? {} : (o.p.edit ? itens.find((i) => i.id === o.p.edit) : null);
        out.push(`<section class="org-sec"><h2>Itens e preços</h2>${itens.length ? `<table class="tbl cat-t">${itens.map((i) => `<tr><td><b>${esc(i.nome)}</b>${ehLoja ? '' : `<small>${esc(i.categoria || '')}</small>`}</td><td class="n">${money(i.preco)}</td><td>${ehLoja ? `<small>${i.estoque == null ? 'sem controle' : i.estoque + ' un.'}</small>` : ''}</td><td><button class="btn sm" type="button" data-act="catDisp" data-id="${i.id}">${i.disponivel === false ? '✖ Indisponível' : '✔ Disponível'}</button></td><td class="n"><button class="btn sm" type="button" data-act="catEditar" data-id="${i.id}">Editar</button></td></tr>`).join('')}</table>` : ''}
          ${e ? `<form class="org-card form" data-form="catItem" data-id="${e.id || ''}"><h3>${e.id ? 'Editar item' : 'Novo item'}</h3><div class="g2">${Org.fld('Nome', `<input type="text" name="nome" value="${esc(e.nome || '')}" maxlength="40" required>`)}${Org.fld('Preço (R$)', `<input type="text" inputmode="decimal" name="preco" value="${e.preco != null ? num(e.preco) : ''}" required>`)}</div>
            ${ehLoja ? `<div class="g2">${Org.fld('Estoque (vazio = sem controle)', `<input type="number" name="estoque" min="0" value="${e.estoque != null ? e.estoque : ''}">`)}${Org.fld('Avisar quando abaixo de', `<input type="number" name="minimo" min="0" value="${e.minimo != null ? e.minimo : ''}">`)}</div>` : Org.fld('Categoria', `<input type="text" name="categoria" list="dlcat" value="${esc(e.categoria || '')}" maxlength="24" placeholder="Lanches, Bebidas, Churrasquinho…"><datalist id="dlcat">${['Lanches', 'Bebidas', 'Churrasquinho'].concat(cats).filter((x, i, a) => x && a.indexOf(x) === i).map((c) => `<option value="${esc(c)}">`).join('')}</datalist>`)}
            <label class="chk"><input type="checkbox" name="disponivel" ${e.disponivel === false ? '' : 'checked'}> Disponível</label>
            <div class="btnrow"><button class="btn pri" type="submit">Salvar</button><button class="btn" type="button" data-act="catFechar">Cancelar</button>${e.id ? `<button class="btn bad" type="button" data-act="catApagar" data-id="${e.id}" data-confirm="Apagar este item?">Apagar</button>` : ''}</div></form>` : '<div class="btnrow"><button class="btn" type="button" data-act="catNovo">+ Novo item</button></div>'}</section>`);
        return out.join('');
      },
    };
  }
  Org.views.lojinha = vendaView('lojinha');
  Org.views.lanchonete = vendaView('lanchonete');
  const catColl = (o, s) => (o.view === 'lojinha' ? s.produtos : s.cardapio);
  Org.acts.cartAdd = function (b) {
    const c = this.p.cart && this.p.cart.tipo === this.view ? this.p.cart : (this.p.cart = { tipo: this.view, itens: [] });
    const it = c.itens.find((x) => x.id === b.dataset.id); if (it) it.qtd++; else c.itens.push({ id: b.dataset.id, qtd: 1 });
    this.render();
  };
  Org.acts.cartQtd = function (b) { const c = this.p.cart; if (!c) return; const it = c.itens.find((x) => x.id === b.dataset.id); if (!it) return; it.qtd += parseInt(b.dataset.d, 10); if (it.qtd <= 0) c.itens = c.itens.filter((x) => x !== it); this.render(); };
  Org.acts.cartLimpar = function () { this.p.cart = null; this.render(); };
  Org.forms.cartFechar = function (f, fd) {
    const c = this.p.cart; if (!c || !c.itens.length) return;
    const forma = fd.get('forma'); this.p.forma = forma; const tipo = c.tipo; let total = 0;
    const r = this.run((s) => {
      const antes = JSON.stringify(s.produtos); const nv = s.vendas.length;
      for (const it of c.itens) {
        const x = R.registrarVenda(s, { tipo, itemId: it.id, qtd: it.qtd, forma }, this.now());
        if (!x.ok) { s.produtos = JSON.parse(antes); s.vendas.length = nv; return x; } // tudo ou nada
        total += x.total;
      }
      return { ok: true };
    }, null);
    if (r.ok) { this.p.cart = null; this.render(); this.flash(`Venda registrada: ${money(total)} (${R.FORMAS[forma]}).`); }
  };
  Org.acts.vendaEstorno = function (b) { this.run((s) => R.estornarVenda(s, b.dataset.id), 'Venda desfeita.'); };
  Org.forms.vendaAvulsa = function (f, fd) { this.run((s) => R.registrarVenda(s, { tipo: 'outro', nome: fd.get('nome'), preco: fd.get('preco'), forma: fd.get('forma') }, this.now()), 'Venda registrada.'); };
  Org.acts.catNovo = function () { this.p.edit = 'novo'; this.render(); };
  Org.acts.catEditar = function (b) { this.p.edit = b.dataset.id; this.render(); };
  Org.acts.catFechar = function () { this.p.edit = null; this.formDirty = false; this.render(); };
  Org.acts.catDisp = function (b) { this.run((s) => R.alternarDisponivel(s, this.view === 'lojinha' ? 'produtos' : 'cardapio', b.dataset.id)); };
  Org.acts.catApagar = function (b) { this.p.edit = null; this.run((s) => (this.view === 'lojinha' ? R.removerProduto(s, b.dataset.id) : R.removerCardapio(s, b.dataset.id)), 'Item apagado.'); };
  Org.forms.catItem = function (f, fd) {
    const id = f.dataset.id, lj = this.view === 'lojinha';
    const o = { id: id || undefined, nome: fd.get('nome'), preco: fd.get('preco'), disponivel: !!fd.get('disponivel') };
    if (lj) { o.estoque = fd.get('estoque'); o.minimo = fd.get('minimo'); } else o.categoria = fd.get('categoria');
    this.p.edit = null;
    const r = this.run((s) => (lj ? R.salvarProduto(s, o) : R.salvarCardapio(s, o)), 'Item salvo.');
    if (!r.ok) this.p.edit = id || 'novo';
  };

  /* =========================================================
     Estoque (bolinhas e raquetes em destaque)
     ========================================================= */
  Org.views.estoque = {
    title: 'Estoque',
    render(o, S) {
      const eq = S.equipamentos, dest = (e) => /bolinha|raquete/i.test(e.nome), baixos = new Set(R.estoqueBaixo(S).map((x) => x.id));
      const card = (e) => { const baixo = baixos.has(e.id); return `<div class="org-card sm eq${baixo ? ' low' : ''}"><div class="rowb"><b>${esc(e.nome)}</b>${baixo ? Org.chip('▲ Baixo', 'bad') : Org.chip('✔ OK', 'ok')}</div><div class="big">${e.quantidade}</div><small>mínimo ${e.minimo}</small>
        <div class="btnrow"><button class="btn sm" type="button" data-act="eqAj" data-id="${e.id}" data-d="-1">− 1</button><button class="btn sm" type="button" data-act="eqAj" data-id="${e.id}" data-d="1">+ 1</button><button class="btn sm" type="button" data-act="eqAj" data-id="${e.id}" data-d="10">+ 10</button><button class="btn sm" type="button" data-act="eqEditar" data-id="${e.id}">Editar</button></div></div>`; };
      const out = [];
      out.push('<p class="org-sub">Quando algum item fica abaixo do mínimo, aparece um alerta no Resumo. Isso só é visto na Organização.</p>');
      const alertas = R.estoqueBaixo(S); if (alertas.length) out.push(`<div class="org-flash bad">${alertas.map((a) => `${esc(a.nome)}: ${a.atual} (mínimo ${a.minimo})`).join(' · ')}</div>`);
      if (!eq.length) out.push(`<p class="org-empty">Nenhum equipamento cadastrado.</p><div class="btnrow"><button class="btn pri" type="button" data-act="eqBase">Criar Bolinhas e Raquetes</button></div>`);
      out.push('<div class="g2">' + eq.filter(dest).map(card).join('') + '</div>');
      const outros = eq.filter((e) => !dest(e));
      if (outros.length) out.push('<h4 class="cat">Outros equipamentos</h4><div class="g2">' + outros.map(card).join('') + '</div>');
      const e = o.p.edit === 'novo' ? {} : (o.p.edit ? eq.find((x) => x.id === o.p.edit) : null);
      if (e) out.push(`<form class="org-card form" data-form="equip" data-id="${e.id || ''}"><h3>${e.id ? 'Editar item' : 'Novo item'}</h3><div class="g3">${Org.fld('Nome', `<input type="text" name="nome" value="${esc(e.nome || '')}" maxlength="30" required>`)}${Org.fld('Quantidade', `<input type="number" name="quantidade" min="0" value="${e.quantidade != null ? e.quantidade : 0}">`)}${Org.fld('Mínimo', `<input type="number" name="minimo" min="0" value="${e.minimo != null ? e.minimo : 0}">`)}</div>
        <div class="btnrow"><button class="btn pri" type="submit">Salvar</button><button class="btn" type="button" data-act="eqFechar">Cancelar</button>${e.id ? `<button class="btn bad" type="button" data-act="eqApagar" data-id="${e.id}" data-confirm="Apagar este item?">Apagar</button>` : ''}</div></form>`);
      else out.push('<div class="btnrow"><button class="btn" type="button" data-act="eqNovo">+ Novo equipamento</button></div>');
      const comEst = S.produtos.filter((p) => p.estoque != null);
      if (comEst.length) out.push(`<h4 class="cat">Produtos da lojinha</h4><table class="tbl">${comEst.map((p) => `<tr><td>${esc(p.nome)}</td><td class="n">${p.estoque} un.</td><td class="n"><button class="btn sm" type="button" data-act="prAj" data-id="${p.id}" data-d="-1">− 1</button> <button class="btn sm" type="button" data-act="prAj" data-id="${p.id}" data-d="1">+ 1</button> <button class="btn sm" type="button" data-act="prAj" data-id="${p.id}" data-d="10">+ 10</button></td></tr>`).join('')}</table>`);
      return out.join('');
    },
  };
  Org.acts.eqAj = function (b) { this.run((s) => R.ajustarEstoque(s, 'equip', b.dataset.id, parseInt(b.dataset.d, 10))); };
  Org.acts.prAj = function (b) { this.run((s) => R.ajustarEstoque(s, 'produto', b.dataset.id, parseInt(b.dataset.d, 10))); };
  Org.acts.eqNovo = function () { this.p.edit = 'novo'; this.render(); };
  Org.acts.eqEditar = function (b) { this.p.edit = b.dataset.id; this.render(); };
  Org.acts.eqFechar = function () { this.p.edit = null; this.formDirty = false; this.render(); };
  Org.acts.eqApagar = function (b) { this.p.edit = null; this.run((s) => R.removerEquipamento(s, b.dataset.id), 'Item apagado.'); };
  Org.acts.eqBase = function () { this.run((s) => { R.salvarEquipamento(s, { nome: 'Raquetes', quantidade: 0, minimo: 10 }); return R.salvarEquipamento(s, { nome: 'Bolinhas', quantidade: 0, minimo: 40 }); }, 'Criados. Ajuste as quantidades.'); };
  Org.forms.equip = function (f, fd) {
    const id = f.dataset.id; this.p.edit = null;
    const r = this.run((s) => R.salvarEquipamento(s, { id: id || undefined, nome: fd.get('nome'), quantidade: fd.get('quantidade'), minimo: fd.get('minimo') }), 'Item salvo.');
    if (!r.ok) this.p.edit = id || 'novo';
  };

  /* =========================================================
     Vestiário: limpeza e manutenção (D43). Nunca aparece na TV.
     ========================================================= */
  Org.views.vestiario = {
    title: 'Vestiário',
    render(o, S) {
      const now = o.now(), l = R.limpezaAtrasada(S, now), u = l.ultima;
      const man = S.manutencoes.slice().sort((a, b) => b.quando.localeCompare(a.quando))[0];
      const quando = (t) => (t ? `${dm(t.slice(0, 10))}${t.length > 10 ? ' · ' + t.slice(11) : ''}` : '—');
      const out = [];
      out.push(l.atrasada ? `<div class="org-flash bad">${l.nunca ? 'Nenhuma limpeza registrada ainda.' : `Limpeza atrasada: a última foi há ${l.horas >= 48 ? Math.floor(l.horas / 24) + ' dias' : l.horas + ' horas'} (o lembrete dispara após ${S.config.diasLimpezaAtrasada} dia(s)).`}</div>` : `<div class="org-flash ok">Limpeza em dia (última há ${l.horas} h).</div>`);
      out.push(`<div class="g2"><div class="org-card"><h4>Última limpeza</h4><div class="big sm">${quando(u && u.quando)}</div>${u ? `<p>Por: ${esc(u.responsavel)} ${link(u.link, '· foto/checklist no Drive')}</p>` : ''}</div>
        <div class="org-card"><h4>Última manutenção</h4><div class="big sm">${man ? dm(man.quando.slice(0, 10)) : '—'}</div>${man ? `<p>${esc(man.descricao)}${man.responsavel ? ' · ' + esc(man.responsavel) : ''} ${link(man.link, '· nota no Drive')}</p>` : ''}</div></div>`);
      out.push(`<div class="g2"><form class="org-card form" data-form="limpeza" data-nokeep="1"><h3>Registrar limpeza agora</h3>${Org.fld('Quem limpou', `<input type="text" name="responsavel" maxlength="40" required>`)}${Org.fld('Link da foto ou checklist (Drive, opcional)', `<input type="url" name="link" placeholder="https://…">`)}<div class="btnrow"><button class="btn pri" type="submit">Registrar limpeza</button></div></form>
        <form class="org-card form" data-form="manut" data-nokeep="1"><h3>Registrar manutenção</h3>${Org.fld('O que foi feito', `<input type="text" name="descricao" maxlength="80" required>`)}<div class="g2">${Org.fld('Quem', `<input type="text" name="responsavel" maxlength="40">`)}${Org.fld('Data', `<input type="date" name="quando" value="${o.today()}">`)}</div>${Org.fld('Link (Drive, opcional)', `<input type="url" name="link" placeholder="https://…">`)}<div class="btnrow"><button class="btn" type="submit">Registrar manutenção</button></div></form></div>`);
      const hist = S.limpezas.map((x) => ({ q: x.quando, t: 'Limpeza', d: x.responsavel, l: x.link })).concat(S.manutencoes.map((x) => ({ q: x.quando, t: 'Manutenção', d: x.descricao + (x.responsavel ? ' · ' + x.responsavel : ''), l: x.link }))).sort((a, b) => b.q.localeCompare(a.q)).slice(0, 15);
      out.push(`<section class="org-sec"><h2>Histórico</h2>${hist.length ? `<table class="tbl">${hist.map((h) => `<tr><td>${quando(h.q)}</td><td>${h.t}</td><td>${esc(h.d)}</td><td>${link(h.l, '📎')}</td></tr>`).join('')}</table>` : '<p class="dim">Nada registrado.</p>'}</section>`);
      out.push('<p class="org-note">Fotos e notas ficam no Drive: aqui só o link. O vestiário nunca aparece na TV.</p>');
      return out.join('');
    },
  };
  Org.forms.limpeza = function (f, fd) { this.run((s) => R.registrarLimpeza(s, { responsavel: fd.get('responsavel'), link: fd.get('link') }, this.now()), 'Limpeza registrada.'); };
  Org.forms.manut = function (f, fd) { this.run((s) => R.registrarManutencao(s, { descricao: fd.get('descricao'), responsavel: fd.get('responsavel'), quando: fd.get('quando') || undefined, link: fd.get('link') }, this.now()), 'Manutenção registrada.'); };
})();
