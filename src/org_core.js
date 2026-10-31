/* ============================================================
   Modo Organização (Fase 3): casca, PIN, navegação, mensagens e utilidades.
   As telas ficam em org_agenda.js, org_cad.js e org_camp.js e se registram em ABT.Org.views.
   Não há cobrança nem pagamento aqui: tudo é registro manual (D12, D27).
   ============================================================ */
(function () {
  const ABT = window.ABT, R = ABT.Regras, A = ABT.Agenda, D = ABT.Data;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => (n == null || n === '' || isNaN(Number(n)) ? '—' : 'R$ ' + Number(n).toFixed(2).replace('.', ','));
  const dm = (dk) => (dk ? `${dk.slice(8, 10)}/${dk.slice(5, 7)}` : '');
  const dmy = (dk) => (dk ? `${dk.slice(8, 10)}/${dk.slice(5, 7)}/${dk.slice(0, 4)}` : '');
  const diaSemana = (dk) => ABT.dayNames[ABT.parseDK(dk).getDay()];

  const NAV = [
    { id: 'resumo', t: 'Resumo', i: '📋' },
    { id: 'agenda', t: 'Quadras', i: '🎾' },
    { id: 'turmas', t: 'Aulas', i: '🎓' },
    { id: 'dayuse', t: 'Day use', i: '🔁' },
    { id: 'precos', t: 'Preços', i: '💲' },
    { id: 'pessoas', t: 'Escritório', i: '🗂' },
    { id: 'lojinha', t: 'Lojinha', i: '🛍' },
    { id: 'lanchonete', t: 'Lanchonete', i: '🥤' },
    { id: 'estoque', t: 'Estoque', i: '📦' },
    { id: 'vestiario', t: 'Vestiário', i: '🚿' },
    { id: 'campeonato', t: 'Campeonato', i: '🏆' },
    { id: 'avisos', t: 'Avisos', i: '📣' },
    { id: 'config', t: 'Dados', i: '⚙' },
  ];
  const AREA_VIEW = { recepcao: 'pessoas', lojinha: 'lojinha', lanchonete: 'lanchonete', vestiario: 'vestiario', estoque: 'estoque', arquibancada: 'resumo' };
  const ALERTA_VIEW = { dados: 'config', estoque: 'estoque', vestiario: 'vestiario', escritorio: 'pessoas', campeonato: 'campeonato' };

  const Org = ABT.Org = {
    views: {}, acts: {}, forms: {}, recalcs: {}, NAV,
    h: { esc, money, dm, dmy, diaSemana },
    view: 'resumo', p: {}, unlocked: false, el: null, active: false, formDirty: false,

    /* ---------- pequenos blocos de HTML usados pelas telas ---------- */
    fld(label, inner, cls) { return `<label class="fld ${cls || ''}"><span>${label}</span>${inner}</label>`; },
    sel(name, opts, val, extra) { return `<select name="${name}" ${extra || ''}>${opts.map((o) => `<option value="${esc(o.v)}"${String(o.v) === String(val) ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`; },
    seg(name, opts, val, extra) { return `<div class="seg2" ${extra || ''}>${opts.map((o, i) => `<label><input type="radio" name="${name}" value="${esc(o.v)}"${String(o.v) === String(val) ? ' checked' : ''}><span>${o.t}</span></label>`).join('')}</div>`; },
    chip(txt, cls) { return `<span class="chp ${cls || ''}">${txt}</span>`; },
    timeOpts(abre, fecha, passo) {
      const out = []; for (let h = abre; h <= fecha + 1e-9; h += (passo || 0.5)) out.push({ v: ABT.fmtHM(h), t: ABT.fmtHM(h) }); return out;
    },
    pessoas() { return D.get().pessoas; },
    pessoa(id) { return D.get().pessoas.find((p) => p.id === id); },
    nome(id) { const p = Org.pessoa(id); return p ? (p.apelido || p.nome) : '?'; },
    /** Escolha de pessoas por nome (com cadastro na hora). Os ids vão em campos escondidos. */
    picker(name, ids, o) {
      o = o || {};
      const tipos = o.tipos || null, S = D.get();
      const lista = S.pessoas.filter((p) => !tipos || tipos.includes(p.tipo));
      const dl = 'dl_' + name + Math.random().toString(36).slice(2, 5);
      return `<div class="pick" data-name="${name}" data-max="${o.max || 6}" data-newtype="${o.novo || 'visitante'}" data-tipos="${(tipos || []).join(',')}">
        <div class="pick-chips">${(ids || []).map((id) => Org.pickChip(name, id)).join('')}</div>
        <div class="pick-add"><input class="pick-in" type="text" aria-label="Nome da pessoa" list="${dl}" placeholder="${o.placeholder || 'Digite o nome e tecle Enter'}" autocomplete="off">
        <datalist id="${dl}">${lista.map((p) => `<option value="${esc(p.nome)}" label="${esc(R.TIPOS_PESSOA[p.tipo] || '')}"></option>`).join('')}</datalist>
        <button type="button" class="btn sm" data-act="pickAdd">Adicionar</button></div></div>`;
    },
    pickChip(name, id) { return `<span class="pchip" data-id="${esc(id)}">${esc(Org.nome(id))}<input type="hidden" name="${name}" value="${esc(id)}"><button type="button" data-act="pickDel" aria-label="Tirar">×</button></span>`; },

    /* ---------- execução com mensagem ---------- */
    run(fn, okmsg, quiet) {
      let res = { ok: false, erro: 'Algo deu errado.' };
      this._skip = true;
      try { D.update((s) => { res = fn(s); }); } catch (e) { res = { ok: false, erro: 'Erro inesperado: ' + e.message }; }
      this._skip = false;
      if (!res.ok) { this.flash(res.erro, true); return res; }
      if (!quiet) { this.formDirty = false; this.render(); }
      if (okmsg) this.flash(okmsg, false, res.aviso);
      return res;
    },
    flash(msg, bad, aviso) {
      this._flash = { msg, bad, aviso };
      const el = $('orgFlash'); if (!el) return;
      el.innerHTML = msg ? `<div class="org-flash ${bad ? 'bad' : 'ok'}" role="${bad ? 'alert' : 'status'}">${esc(msg)}${aviso ? `<small>${esc(aviso)}</small>` : ''}</div>` : '';
      if (bad && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    },

    /* ---------- navegação ---------- */
    open(view, p, keepFlash) {
      if (!this.views[view]) view = 'resumo';
      this.view = view; this.p = p || {}; this.formDirty = false;
      if (!keepFlash) this._flash = null;
      if (this.ui && this.ui.mode !== 'organizacao') this.ui.setMode('organizacao');
      this.render(true);
      if (view === 'agenda' && this.p.court) this.focus('quadra' + this.p.court);
    },
    openForArea(area) {
      let view = AREA_VIEW[area.id] || 'resumo', p = {};
      if (area.kind === 'court') { view = 'agenda'; p = { court: area.courtId }; }
      this.open(view, p);
      this.focus(area.id);
    },
    focus(areaId) {
      const a = this.app && this.app.world.areas.find((x) => x.id === areaId); if (!a) return;
      this.app.interaction.select(a); this.app.rig.focusArea(a);
    },
    now() { return ABT.Clock.now(); },
    today() { return ABT.dk(ABT.Clock.now()); },

    /* ---------- PIN ---------- */
    lock() { try { sessionStorage.removeItem('abt.org.ok'); } catch (e) { /* ok */ } this.unlocked = false; this.render(); },
    unlock() { try { sessionStorage.setItem('abt.org.ok', '1'); } catch (e) { /* ok */ } this.unlocked = true; this.view = 'resumo'; this.p = {}; this.render(true); },
    gateHtml() {
      const S = D.get(), tem = R.temPin(S);
      return `<div class="org-gate"><div class="gate-card">
        <div class="gate-ic">🔒</div><h2>Modo Organização</h2>
        ${tem ? `<p>Digite o PIN para entrar. Esta área tem dados de alunos, vendas e estoque.</p>
          <form data-form="pinEntrar" autocomplete="off"><input class="pin" type="password" name="pin" inputmode="numeric" maxlength="8" placeholder="PIN" aria-label="PIN" autofocus>
          <button class="btn pri" type="submit">Entrar</button></form>`
        : `<p>Crie um PIN de 4 a 8 números para proteger esta área. Ele só trava a tela do computador da arena; não é segurança forte.</p>
          <form data-form="pinCriar" autocomplete="off"><input class="pin" type="password" name="pin" inputmode="numeric" maxlength="8" placeholder="Novo PIN" aria-label="Novo PIN" autofocus>
          <input class="pin" type="password" name="pin2" inputmode="numeric" maxlength="8" placeholder="Repita o PIN" aria-label="Repita o PIN">
          <button class="btn pri" type="submit">Criar PIN e entrar</button></form>
          <button class="lnk" type="button" data-act="pinPular">Entrar sem PIN por enquanto</button>`}
        <div id="orgFlash">${this._flash ? `<div class="org-flash bad">${esc(this._flash.msg)}</div>` : ''}</div>
        <p class="gate-note">Esqueceu o PIN? Ele fica salvo junto com os dados deste navegador. Exporte um backup e, se precisar, apague os dados e importe de novo.</p>
      </div></div>`;
    },

    /* ---------- desenho ---------- */
    navHtml(alertas) {
      const cnt = {}; alertas.forEach((a) => { const v = ALERTA_VIEW[a.area]; if (v) cnt[v] = (cnt[v] || 0) + 1; });
      return `<nav class="org-nav" aria-label="Áreas">${NAV.map((n) => `<button type="button" class="${n.id === this.view ? 'on' : ''}" data-go="${n.id}"><i>${n.i}</i>${n.t}${cnt[n.id] ? `<b class="bdg" title="${cnt[n.id]} alerta(s)">${cnt[n.id]}</b>` : ''}</button>`).join('')}</nav>`;
    },
    render(resetScroll) {
      const el = this.el; if (!el) return;
      const scroller = el.querySelector('.org-main'), top = scroller && !resetScroll ? scroller.scrollTop : 0;
      let html;
      if (!this.unlocked) html = this.gateHtml();
      else {
        const S = D.get(), al = R.alertas(S, this.now());
        const v = this.views[this.view];
        let body; try { body = v.render(this, S); } catch (e) { body = `<div class="org-flash bad">Não consegui montar esta tela: ${esc(e.message)}</div>`; if (window.console) console.error(e); }
        html = `<header class="org-head"><div><div class="cp-k">ORGANIZAÇÃO</div><h1>${esc(v.title)}</h1></div>
          <div class="org-hd-r"><span class="org-clock" title="Horário da arena">${esc(ABT.fmtHM(ABT.hourOf(this.now())))}</span><button class="btn sm" type="button" data-act="lock" title="Travar a tela">🔒 Travar</button></div></header>
          ${this.navHtml(al)}<div class="org-main" tabindex="-1" role="region" aria-label="${esc(v.title)}"><div id="orgFlash"></div>${body}</div>`;
      }
      el.innerHTML = html;
      const sc = el.querySelector('.org-main'); if (sc) sc.scrollTop = top;
      if (this._flash) this.flash(this._flash.msg, this._flash.bad, this._flash.aviso);
      this.stale = false;
      const v = this.views[this.view]; if (this.unlocked && v && v.after) { try { v.after(this); } catch (e) { if (window.console) console.error(e); } }
    },
    /** Atualização leve (a cada minuto ou quando outra janela muda os dados): não apaga o que a pessoa está digitando. */
    soft() {
      if (!this.active || !this.el) return;
      const ae = document.activeElement;
      if (this.formDirty || (ae && this.el.contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName))) { this.stale = true; return; }
      this.render();
    },

    /* ---------- ligação com a tela ---------- */
    init(app) {
      this.app = app; this.ui = app.ui; this.el = $('orgPanel');
      try { this.unlocked = sessionStorage.getItem('abt.org.ok') === '1'; } catch (e) { this.unlocked = false; }
      const el = this.el;
      D.onChange(() => { if (!this.active || this._skip) return; this.soft(); });
      el.addEventListener('click', (e) => this._click(e));
      el.addEventListener('submit', (e) => {
        const f = e.target.closest('form[data-form]'); if (!f) return;
        e.preventDefault();
        const fn = this.forms[f.dataset.form]; if (fn) fn.call(this, f, new FormData(f));
      });
      el.addEventListener('input', (e) => { const f = e.target.closest('form'); if (f && !f.dataset.nokeep) this.formDirty = true; this._recalc(e); });
      el.addEventListener('change', (e) => { const f = e.target.closest('form'); if (f && !f.dataset.nokeep) this.formDirty = true; this._recalc(e); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('pick-in')) { e.preventDefault(); this.acts.pickAdd.call(this, e.target.closest('.pick').querySelector('[data-act=pickAdd]'), e); } });
      el.addEventListener('focusout', () => { setTimeout(() => { if (this.stale && !this.formDirty && !(document.activeElement && el.contains(document.activeElement) && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName))) this.render(); }, 60); });
    },
    enter() { this.active = true; this.render(true); },
    leave() { this.active = false; },

    _recalc(e) {
      const f = e.target.closest('form[data-recalc]'); if (!f) return;
      const fn = this.recalcs[f.dataset.recalc]; if (fn) fn.call(this, f, e.target);
    },
    _click(e) {
      const go = e.target.closest('[data-go]');
      if (go) { let p = {}; try { p = go.dataset.p ? JSON.parse(go.dataset.p) : {}; } catch (x) { p = {}; } this.open(go.dataset.go, p); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.confirm && !b.dataset.armed) {
        b.dataset.armed = '1'; b.dataset.label = b.innerHTML; b.classList.add('armed'); b.textContent = b.dataset.confirm;
        setTimeout(() => { if (b.isConnected && b.dataset.armed) { delete b.dataset.armed; b.classList.remove('armed'); b.innerHTML = b.dataset.label; } }, 4000);
        return;
      }
      const fn = this.acts[b.dataset.act]; if (fn) fn.call(this, b, e);
    },
  };

  /* ---------- ações comuns ---------- */
  Org.acts.lock = function () { this.lock(); };
  Org.acts.pinPular = function () { this.unlock(); };
  Org.forms.pinEntrar = function (f, fd) {
    if (R.verificarPin(D.get(), String(fd.get('pin') || ''))) { this._flash = null; this.unlock(); }
    else { this.flash('PIN incorreto.', true); f.reset(); }
  };
  Org.forms.pinCriar = function (f, fd) {
    if (fd.get('pin') !== fd.get('pin2')) { this.flash('Os dois PINs precisam ser iguais.', true); return; }
    const r = this.run((s) => R.definirPin(s, String(fd.get('pin'))), null, true);
    if (r.ok) { this._flash = null; this.unlock(); }
  };

  /* seletor de pessoas */
  Org.acts.pickAdd = function (btn) {
    const box = btn.closest('.pick'), inp = box.querySelector('.pick-in'), txt = inp.value.trim(); if (!txt) return;
    const chips = box.querySelector('.pick-chips'), max = parseInt(box.dataset.max, 10) || 6;
    if (chips.children.length >= max) { this.flash(`No máximo ${max} pessoas aqui.`, true); return; }
    const tipos = box.dataset.tipos ? box.dataset.tipos.split(',') : null, low = txt.toLowerCase();
    const S = D.get(); const ok = (p) => !tipos || tipos.includes(p.tipo);
    let p = S.pessoas.find((x) => ok(x) && x.nome.toLowerCase() === low) || S.pessoas.find((x) => ok(x) && (x.apelido || '').toLowerCase() === low);
    if (!p) { const outro = S.pessoas.find((x) => x.nome.toLowerCase() === low); if (outro && tipos) { this.flash(`${outro.nome} está cadastrado como ${R.TIPOS_PESSOA[outro.tipo]}. Aqui só entram: ${tipos.map((t) => R.TIPOS_PESSOA[t]).join(', ')}.`, true); return; } }
    if (!p) {
      const r = this.run((s) => R.salvarPessoa(s, { nome: txt, tipo: box.dataset.newtype || 'visitante' }), null, true);
      if (!r.ok) return;
      p = D.get().pessoas.find((x) => x.id === r.id);
      this.flash(`Cadastrei ${p.nome} como ${R.TIPOS_PESSOA[p.tipo]}. Complete os dados depois, em Escritório.`);
    }
    if ([...chips.querySelectorAll('input')].some((i) => i.value === p.id)) { inp.value = ''; return; }
    chips.insertAdjacentHTML('beforeend', Org.pickChip(box.dataset.name, p.id));
    inp.value = ''; this.formDirty = true; inp.focus();
    const f = btn.closest('form'); if (f && f.dataset.recalc) this._recalc({ target: inp });
  };
  Org.acts.pickDel = function (btn) { const f = btn.closest('form'); btn.closest('.pchip').remove(); this.formDirty = true; if (f && f.dataset.recalc) this._recalc({ target: f }); };
})();
