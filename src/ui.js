/* ============================================================
   Interface (HUD): lista lateral do modo Ambiente, painel de demonstração,
   cartão da área clicada, tooltip e atalhos de teclado.
   ============================================================ */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtHour = (h) => {
    const hh = Math.floor(h) % 24, mm = Math.floor((h - Math.floor(h)) * 60);
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  };

  ABT.UI = class {
    constructor(app) {
      this.app = app; // { sim, rig, env, interaction, state }
      this.state = app.state;
      this.lastKey = ''; this.lastStat = 0; this.toastT = 0;
      this.mode = 'ambiente'; this.source = 'dados'; this.dirty = true; this.minuteKey = ''; this.tkIdx = 0; this.tkT = 0; this.tkItems = [];
      this._buildScenarioSeg();
      this._bindDemo();
      this._bindKeys();
      this._bindModes();
      this._bindData();
      this._bindClock();
      this.renderSide();
    }

    _buildScenarioSeg() {
      const seg = $('segScenario');
      const mk = (id, txt, on) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = id; b.textContent = txt; if (on) b.className = 'on'; seg.appendChild(b); };
      mk('dados', 'Dados da arena', true);
      Object.keys(ABT.SCENARIOS).forEach((id) => mk(id, 'Demo: ' + ABT.SCENARIOS[id].label, false));
    }

    _seg(id, cb) {
      const seg = $(id);
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        [...seg.children].forEach((x) => x.classList.toggle('on', x === b));
        cb(b.dataset.v);
      });
    }
    setSeg(id, v) { [...$(id).children].forEach((x) => x.classList.toggle('on', x.dataset.v === v)); }

    _bindDemo() {
      const a = this.app;
      this._seg('segScenario', (v) => {
        this.closeCard();
        if (v === 'dados') { this.source = 'dados'; this.refreshCena(true); }
        else { this.source = 'demo'; a.sim.loadScenario(v); this.renderSide(true); this.renderTicker(true); }
        $('btnRotate').style.display = this.source === 'demo' ? '' : 'none';
      });
      $('btnRotate').style.display = 'none';
      this._seg('segCam', (v) => this.setCamera(v));
      this._seg('segNames', (v) => { ABT.labelMode = v; a.sim.applyLabels(); });
      $('demoToggle').addEventListener('click', () => {
        const d = $('demo'); d.classList.toggle('closed');
        $('demoToggle').setAttribute('aria-expanded', String(!d.classList.contains('closed')));
      });
      const range = $('hourRange');
      range.addEventListener('input', () => { this.state.lapse = false; this.state.followClock = false; $('chkLapse').checked = false; a.env.setHour(parseFloat(range.value)); });
      $('btnNow').addEventListener('click', () => { this.state.lapse = false; this.state.followClock = true; $('chkLapse').checked = false; });
      $('btnNoon').addEventListener('click', () => this.setHour(14.5));
      $('btnDusk').addEventListener('click', () => this.setHour(17.6));
      $('btnNight').addEventListener('click', () => this.setHour(20.5));
      $('chkLapse').addEventListener('change', (e) => { this.state.lapse = e.target.checked; if (e.target.checked) this.state.followClock = false; });
      $('btnRotate').addEventListener('click', () => a.sim.forceMatchEnd(3));
      $('btnSide').addEventListener('click', () => { $('side').classList.toggle('hidden'); window.dispatchEvent(new Event('resize')); });
      $('areaCard').addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) this.closeCard();
        const o = e.target.closest('[data-org]');
        if (o) { const area = this.app.world.areas.find((x) => x.id === o.dataset.org); this.setMode('organizacao'); if (area) ABT.Org.openForArea(area); }
      });
    }

    setHour(h) { this.state.lapse = false; this.state.followClock = false; $('chkLapse').checked = false; this.app.env.setHour(h); $('hourRange').value = h; }

    setCamera(v) {
      this.app.rig.setMode(v);
      this.setSeg('segCam', v);
    }

    _bindKeys() {
      const a = this.app;
      window.addEventListener('keydown', (e) => {
        if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'checkbox' && e.target.type !== 'radio') return;
        const k = e.key.toLowerCase();
        if (k >= '1' && k <= '4') this.openArea('quadra' + k);
        else if (k === '0') { this.closeCard(); a.rig.goOverview(); }
        else if (k === 'c') this.setCamera(a.rig.mode === 'auto' ? 'livre' : 'auto');
        else if (k === 'n') {
          const order = ['courts', 'all', 'off'];
          ABT.labelMode = order[(order.indexOf(ABT.labelMode) + 1) % 3]; a.sim.applyLabels(); this.setSeg('segNames', ABT.labelMode);
        } else if (k === 'f') {
          if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
        } else if (k === 'escape') { this.closeCard(); }
      });
    }

    openArea(id) {
      const area = this.app.world.areas.find((x) => x.id === id);
      if (area) this.selectArea(area);
    }

    /* ---------- tooltip ---------- */
    hover(area, e) {
      const t = $('tooltip');
      if (!area) { t.classList.remove('on'); return; }
      t.innerHTML = esc(area.name) + `<small>${esc(this._areaOneLine(area))}</small>`;
      t.classList.add('on');
      this.moveTip(e);
    }
    moveTip(e) {
      if (!e) return;
      const t = $('tooltip'), r = $('stage').getBoundingClientRect();
      t.style.left = (e.clientX - r.left) + 'px'; t.style.top = (e.clientY - r.top) + 'px';
    }
    _areaOneLine(area) {
      if (area.kind === 'court') { const i = this.app.sim.info.courts[area.courtId - 1]; return i ? i.status + (i.time ? ' · ' + i.time : '') : ''; }
      if (area.kind === 'stand') return this.app.sim.info.spectators + ' pessoa(s) assistindo';
      return area.restricted ? '🔒 Somente Organização' : 'Clique para ver';
    }

    /* ---------- cartão ---------- */
    selectArea(area) {
      if (this.mode === 'organizacao' && ABT.Org) { ABT.Org.openForArea(area); return; }
      this.app.interaction.select(area);
      this.app.rig.focusArea(area);
      this.renderCard(area);
    }
    closeCard() {
      $('areaCard').hidden = true;
      this.app.interaction.select(null);
      if (this.app.rig.focus) this.app.rig.clearFocus();
      this.card = null;
    }
    renderCard(area) {
      this.card = area;
      const el = $('areaCard'); el.hidden = false;
      const sim = this.app.sim;
      let crumb = 'Arena', chip = '', rows = [], extra = '';
      if (area.kind === 'court') {
        const i = sim.info.courts[area.courtId - 1];
        crumb = 'Quadra · 16 × 8 m';
        const dark = i.type === 'campeonato' || i.type === 'dayuse';
        chip = `<span class="chip" style="background:${i.color};color:${ABT.inkFor(i.color)}">${i.icon} ${esc(i.status)}</span>`;
        if (i.time) rows.push(['Horário', i.time]);
        if (i.type === 'aula') { rows.push(['Professor', esc(i.who[0].replace(' (prof.)', ''))]); rows.push(['Turma', esc(i.turma)]); rows.push(['Alunos', esc(i.who.slice(1).join(', '))]); }
        else if (i.type === 'livre') { rows.push(['Agora', 'Livre para jogar']); if (i.line2) rows.push(['Depois', esc(i.line2.replace('Próximo: ', ''))]); }
        else {
          rows.push(['Duplas', `${esc(i.team1 || '')} × ${esc(i.team2 || '')}`]);
          if (i.scoreText) rows.push(['Placar', esc(i.scoreText)]);
          if (i.type === 'dayuse') rows.push(['Fila', i.queue.length ? esc(i.queue.map((n, k) => `${k + 1}º ${n}`).join(' · ')) : 'Ninguém na fila']);
        }
        const st = ABT.Data.get(), d = ABT.Clock.now(), hh = ABT.hourOf(d);
        const ag = ABT.Agenda.agendaPublica(st, d, area.courtId);
        extra = `<div class="ag-pub"><h3>Hoje na quadra ${area.courtId}</h3>${ag.map((r) => { const s2 = ABT.C.status[r.tipo] || ABT.C.status.livre, agora = hh >= r.ini && hh < r.fim; return `<div class="agp${agora ? ' now' : ''}" style="--c:#${s2.color.toString(16).padStart(6, '0')}"><span>${ABT.fmtHM(r.ini)}–${ABT.fmtHM(r.fim)}</span><b>${s2.icon} ${esc(r.texto)}</b></div>`; }).join('') || '<p class="dim">Fechada hoje.</p>'}</div>`;
      } else if (area.kind === 'stand') {
        crumb = 'Área de convivência';
        rows.push(['Assistindo agora', sim.info.spectators + ' pessoa(s)']);
      } else if (area.id === 'lojinha' || area.id === 'lanchonete') {
        const st = ABT.Data.get(), loja = area.id === 'lojinha';
        crumb = 'Área de convivência';
        const itens = loja ? st.produtos : st.cardapio, brl = (n) => 'R$ ' + Number(n).toFixed(2).replace('.', ',');
        const livre = (x) => x.disponivel !== false && !(loja && x.estoque != null && x.estoque <= 0);
        const cats = loja ? [''] : Array.from(new Set(itens.map((i) => i.categoria || 'Outros')));
        extra = itens.length ? `<div class="menu-pub">${cats.map((c) => `${c ? `<h3>${esc(c)}</h3>` : ''}${itens.filter((i) => loja || (i.categoria || 'Outros') === c).map((i) => `<div class="mi${livre(i) ? '' : ' off'}"><span>${esc(i.nome)}</span><b>${brl(i.preco)}</b><em>${livre(i) ? '✔ Disponível' : '✖ Acabou'}</em></div>`).join('')}`).join('')}</div>` : `<p class="dim">${loja ? 'Produtos' : 'Cardápio'} ainda não cadastrado.</p>`;
      } else {
        const txt = { recepcao: 'Escritório', vestiario: 'Vestiário', estoque: 'Estoque' }[area.id];
        crumb = 'Somente Organização';
        chip = '<span class="chip lock">🔒 Somente modo Organização</span>';
        extra = `<p class="dim">Esta área é da equipe: ${area.id === 'recepcao' ? 'alunos, contratos e pagamentos' : area.id === 'vestiario' ? 'limpeza e manutenção' : 'bolinhas, raquetes e equipamentos'}.</p><button class="btn pri" type="button" data-org="${area.id}">Entrar na Organização</button>`;
      }
      el.innerHTML = `
        <header><div><div class="crumb">${esc(crumb)}</div><h2>${esc(area.name)}</h2>${chip}</div>
        <button class="x" data-close aria-label="Fechar">×</button></header>
        <ul class="kv">${rows.map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`).join('')}</ul>
        ${extra}
        <button class="back" data-close type="button">← Voltar à visão geral</button>`;
    }

    toast(msg) {
      const t = $('toast'); t.textContent = msg; t.classList.add('on');
      clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('on'), 4200);
    }

    /* ---------- lista lateral ---------- */
    renderSide(force) {
      const sim = this.app.sim;
      const key = JSON.stringify(sim.info.courts.map((c) => [c.status, c.time, c.line1, c.line2, c.queue, c.who.length, c.scoreText])) + sim.info.spectators + this.source + ABT.Data.isEmpty();
      if (!force && key === this.lastKey) return;
      this.lastKey = key;
      const d = ABT.Clock.now();
      const [o, c] = ABT.Agenda.hoursFor(ABT.Data.get(), d);
      const fonte = this.source === 'demo' ? 'Demonstração' : (ABT.Data.isEmpty() ? 'Sem dados (veja o painel Dados)' : 'Dados da arena');
      const html = [`<div class="side-h"><h1>AGORA NAS QUADRAS</h1><span>${ABT.dayNames[d.getDay()]}</span></div><div class="cards">`];
      sim.info.courts.forEach((i, idx) => {
        const dark = i.type === 'campeonato' || i.type === 'dayuse';
        let body = '';
        if (i.type === 'aluguel' || i.type === 'campeonato') {
          body = `<div class="ln">${esc(i.team1)}<br>${esc(i.team2)}</div><div class="sc">${esc(i.line2 || '')}</div>`;
        } else if (i.type === 'aula') {
          body = `<div class="ln">Prof. ${esc(i.who[0].replace(' (prof.)', ''))} · ${esc(i.turma)}</div><div class="sub">${esc(i.who.slice(1).join(', '))}</div>`;
        } else if (i.type === 'dayuse') {
          body = `<div class="ln">${esc(i.team1)} × ${esc(i.team2)}</div><div class="sc">${esc(i.line2 || '')}</div>` +
            `<div class="queue">${i.queue.length ? i.queue.map((n, k) => `<span><b>${k + 1}º</b>${esc(n)}</span>`).join('') : '<span>Fila vazia</span>'}</div>`;
        } else {
          body = `<div class="ln">${esc(i.line1)}</div><div class="sub">${esc(i.line2 || '')}</div>`;
        }
        html.push(`<button class="card${i.type === 'livre' ? ' free' : ''}" data-court="${idx + 1}" style="--c:${i.color}" type="button">
          <div class="top"><span class="nm">${esc(i.title)}</span><span class="chip" style="background:${i.color};color:${ABT.inkFor(i.color)}">${i.icon} ${esc(i.status)}</span></div>
          ${i.time ? `<div class="tm">${esc(i.time)}</div>` : ''}${body}</button>`);
      });
      html.push(`<div class="card" style="--c:#8A8F98"><div class="top"><span class="nm">Arquibancada</span></div><div class="ln">${sim.info.spectators} pessoa(s) assistindo</div></div>`);
      html.push(`</div><div class="side-f"><span>Hoje: <b>${String(o).padStart(2, '0')}:00–${String(c).padStart(2, '0')}:00</b></span><span>${fonte}</span></div>`);
      const side = $('side');
      side.innerHTML = html.join('');
      side.querySelectorAll('[data-court]').forEach((b) => b.addEventListener('click', () => this.openArea('quadra' + b.dataset.court)));
    }

    /* ---------- relógio e estado de funcionamento ---------- */
    updateClock() {
      const now = ABT.Clock.now(), st = ABT.Data.get();
      const sit = ABT.Agenda.situacao(st, now);
      $('clockTime').textContent = fmtHour(sit.h);
      $('hourVal').textContent = fmtHour(this.app.env.hour);
      const p = (n) => String(n).padStart(2, '0');
      $('openState').innerHTML = `<em class="dot${sit.aberto ? '' : ' off'}"></em>${sit.aberto ? `Aberto · fecha às ${p(sit.fecha)}:00` : `Fechado · abre às ${p(sit.abre)}:00`}`;
      if (document.activeElement !== $('hourRange')) $('hourRange').value = this.app.env.hour;
    }

    update(dt, time, renderer) {
      this.tick(dt);
      this.updateClock();
      if (Math.floor(time * 4) !== this.lastStat) {
        this.lastStat = Math.floor(time * 4);
        this.renderSide(false);
        if (this.card && this.card.kind === 'court') this._refreshCardMaybe();
      }
      if (time - (this._fpsT || 0) > 0.5) {
        const fps = Math.round(1 / Math.max(dt, 0.001));
        this._fpsAcc = (this._fpsAcc || fps) * 0.6 + fps * 0.4;
        this._fpsT = time;
        const info = renderer.info.render;
        $('stats').textContent = `${Math.round(this._fpsAcc)} quadros/s · ${info.calls} desenhos · ${Math.round(info.triangles / 1000)} mil triângulos`;
      }
    }
    _refreshCardMaybe() {
      const i = this.app.sim.info.courts[this.card.courtId - 1];
      const k = JSON.stringify([i.scoreText, i.queue, i.line2]);
      if (k !== this._cardKey) { this._cardKey = k; this.renderCard(this.card); }
    }

    /* ============================================================
       Fase 2: modos, dados, relógio e faixa de avisos
       ============================================================ */

    /* ---------- modos (Ambiente / Campeonato) ---------- */
    _bindModes() {
      document.querySelectorAll('.modes [data-mode]').forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset.mode)));
      window.addEventListener('hashchange', () => { const m = location.hash.replace('#', ''); if (m === 'ambiente' || m === 'campeonato' || m === 'organizacao') this.setMode(m, true); });
      const m0 = location.hash.replace('#', '');
      if (m0 === 'campeonato' || m0 === 'organizacao') this.setMode(m0, true);
    }
    setMode(m, fromHash) {
      this.mode = m;
      document.body.dataset.mode = m;
      document.querySelectorAll('.modes [data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
      $('side').style.display = m === 'ambiente' ? '' : 'none';
      $('campPanel').hidden = m !== 'campeonato';
      $('orgPanel').hidden = m !== 'organizacao';
      if (ABT.Org && ABT.Org.el) { if (m === 'organizacao') ABT.Org.enter(); else ABT.Org.leave(); }
      if (!fromHash) { try { history.replaceState(null, '', '#' + m); } catch (e) { location.hash = m; } }
      this.closeCard();
      window.dispatchEvent(new Event('resize'));
      this.renderCamp(true); this.renderSide(true);
    }

    /* ---------- relógio da arena (real ou simulado) ---------- */
    _bindClock() {
      const sel = $('selDay'), today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = ABT.addDays(today, i), o = document.createElement('option');
        o.value = ABT.dk(d); o.textContent = `${ABT.dayNames[d.getDay()].slice(0, 3)} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}${i === 0 ? ' (hoje)' : ''}`;
        sel.appendChild(o);
      }
      const setSim = (date) => { ABT.Clock.setSim(date); this.dirty = true; this.updateClockCtl(); };
      $('btnSimSet').addEventListener('click', () => {
        const d = ABT.parseDK(sel.value), h = ABT.parseHM($('inpTime').value || '18:30');
        d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0); setSim(d);
      });
      $('btnPreset1').addEventListener('click', () => { const t = new Date(), d = ABT.addDays(t, (5 - t.getDay() + 7) % 7); d.setHours(18, 30, 0, 0); setSim(d); });
      $('btnPreset2').addEventListener('click', () => { const d = ABT.Sample.proximoSabado(new Date()); d.setHours(15, 30, 0, 0); setSim(d); });
      $('btnReal').addEventListener('click', () => { ABT.Clock.setReal(); this.state.followClock = true; this.dirty = true; this.updateClockCtl(); });
      ABT.Clock.onChange = () => { this.dirty = true; this.updateClockCtl(); };
      this.updateClockCtl();
    }
    updateClockCtl() {
      const sim = ABT.Clock.isSim();
      $('clockMode').textContent = sim ? 'simulado' : 'hora real';
      $('clockSim').hidden = !sim;
      if (sim) this.state.followClock = true;
    }

    /* ---------- dados: exemplo, apagar, exportar, importar ---------- */
    _bindData() {
      const D = ABT.Data, msg = (t, bad) => { const el = $('dataMsg'); el.textContent = t; el.classList.toggle('bad', !!bad); };
      const armed = (btn, label, fn) => {
        if (btn.dataset.armed) { clearTimeout(this['_arm' + btn.id]); delete btn.dataset.armed; btn.classList.remove('armed'); btn.textContent = btn.dataset.label; fn(); return; }
        btn.dataset.label = btn.textContent; btn.dataset.armed = '1'; btn.classList.add('armed'); btn.textContent = label;
        this['_arm' + btn.id] = setTimeout(() => { delete btn.dataset.armed; btn.classList.remove('armed'); btn.textContent = btn.dataset.label; }, 4000);
      };
      D.init();
      if (D.loadError) msg('Os dados salvos estavam corrompidos e foram ignorados: ' + D.loadError, true);
      D.onChange(() => { this.dirty = true; this.updateDataInfo(); });
      $('btnSample').addEventListener('click', () => {
        const run = () => { D.loadSample(new Date()); msg('Exemplo carregado. Use "Sexta 18:30" ou "Sábado 15:30" no relógio para ver a arena cheia.'); };
        if (D.isEmpty()) run(); else armed($('btnSample'), 'Substituir dados atuais? Clique de novo', run);
      });
      $('btnClear').addEventListener('click', () => armed($('btnClear'), 'Tem certeza? Clique de novo', () => { D.clear(); msg('Todos os dados foram apagados deste navegador.'); }));
      $('btnExport').addEventListener('click', () => {
        if (D.isEmpty()) { msg('Não há dados para exportar.', true); return; }
        try { D.downloadBackup(new Date()); msg('Backup exportado: ' + D.exportFileName(new Date()) + '. Guarde no Drive.'); } catch (e) { msg('Não consegui gerar o arquivo neste navegador.', true); }
      });
      $('btnImport').addEventListener('click', () => $('fileImport').click());
      $('fileImport').addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          const res = D.importText(String(r.result));
          if (res.ok) msg(`Backup importado: ${res.resumo.pessoas} pessoas, ${res.resumo.horarios} horários, ${res.resumo.turmas} turmas, ${res.resumo.campeonatos} campeonato(s). Os dados anteriores foram substituídos.`);
          else msg('Não importei: ' + res.erro, true);
        };
        r.onerror = () => msg('Não consegui ler o arquivo.', true);
        r.readAsText(f); e.target.value = '';
      });
      this.updateDataInfo();
    }
    updateDataInfo() {
      const D = ABT.Data, b = D.backupInfo(new Date());
      if (D.isEmpty()) { $('dataInfo').textContent = 'Nenhum dado salvo. Carregue o exemplo ou importe um backup.'; $('dataBadge').textContent = 'sem dados'; $('dataCount').textContent = ''; return; }
      const r = D.summary();
      $('dataCount').textContent = `${r.pessoas} pessoas`;
      const bk = b.nunca ? 'Backup: nunca exportado.' : `Último backup: ${b.dias === 0 ? 'hoje' : 'há ' + b.dias + ' dia(s)'}.`;
      const el = $('dataInfo');
      el.textContent = `${r.horarios} horários · ${r.turmas} turmas · ${r.campeonatos} campeonato(s). ${bk}` + (b.atrasado ? ` ⚠ Exporte um backup (aviso a partir de ${b.limite} dias).` : '');
      el.classList.toggle('warn', !!b.atrasado);
      $('dataBadge').textContent = b.atrasado ? 'backup atrasado' : 'dados salvos';
    }

    /* ---------- ciclo da cena: relógio, dados, painéis ---------- */
    refreshCena(force) {
      const a = this.app, now = ABT.Clock.now(), st = ABT.Data.get();
      this.dirty = false; this.minuteKey = ABT.dk(now) + ' ' + now.getHours() + ':' + now.getMinutes();
      if (this.source === 'dados') {
        const c = ABT.Agenda.cena(st, now);
        a.sim.setCena({ id: 'dados', courts: c.quadras, spectators: c.espectadores, looks: c.looks, walkers: c.walkers, cafe: c.cafe, aberto: c.aberto, autoRotate: false }, !!force);
        a.sim.source = 'dados';
        if (this.card && this.card.kind === 'court') this.renderCard(this.card);
      }
      this.renderSide(true); this.renderCamp(true); this.renderTicker(true);
      if (this.mode === 'organizacao' && ABT.Org) ABT.Org.soft();
    }

    tick(dt) {
      const a = this.app;
      // céu acompanha o relógio da arena (hora real ou simulada), a menos que a demonstração mande
      if (this.state.followClock) {
        const h = ABT.hourOf(ABT.Clock.now());
        if (Math.abs(h - a.env.hour) > 0.002 || this._skyInit !== true) { a.env.setHour(h); this._skyInit = true; }
      }
      this._tk = (this._tk || 0) + dt;
      if (this.dirty) { this.refreshCena(false); }
      else if (this._tk >= 1) {
        this._tk = 0;
        const n = ABT.Clock.now(), k = ABT.dk(n) + ' ' + n.getHours() + ':' + n.getMinutes();
        if (k !== this.minuteKey) this.refreshCena(false);
      }
      this.tickTicker(dt);
    }

    /* ---------- painel do campeonato ---------- */
    renderCamp(force) {
      if (this.mode !== 'campeonato') return;
      const el = $('campPanel');
      const html = ABT.CampUI.render(ABT.Data.get(), ABT.Clock.now());
      if (!force && html === this._campHtml) return;
      this._campHtml = html;
      const top = el.scrollTop; el.innerHTML = html; el.scrollTop = top;
    }

    /* ---------- faixa de avisos (D41): troca a cada N segundos ---------- */
    renderTicker(force) {
      const st = ABT.Data.get(), now = ABT.Clock.now();
      const items = this.source === 'dados' ? ABT.Agenda.avisos(st, now) : [];
      this.app.sim.info.courts.forEach((c) => { if (c.type === 'dayuse' && c.queue.length) items.push({ tipo: 'fila', texto: `${c.title} · Próximos: ${c.queue.map((n, i) => `${i + 1}º ${n}`).join(', ')}` }); });
      const key = JSON.stringify(items);
      if (!force && key === this._tkKey) return;
      this._tkKey = key; this.tkItems = items; this.tkIdx = Math.min(this.tkIdx, Math.max(0, items.length - 1)); this.tkT = 0;
      this.showTicker();
    }
    showTicker() {
      const el = $('ticker'), items = this.tkItems;
      if (!items.length) { el.hidden = true; return; }
      el.hidden = false;
      const it = items[this.tkIdx % items.length];
      const tag = $('tkTag'), tx = $('tkText');
      const lab = { aviso: ['Aviso', ''], aniversario: ['Aniversário', 'aniv'], fila: ['Fila', 'fila'], patrocinio: ['Patrocínio', 'patro'] }[it.tipo];
      tag.textContent = lab[0]; tag.className = 'tk-tag ' + lab[1];
      tx.style.animation = 'none'; void tx.offsetWidth; tx.style.animation = '';
      tx.textContent = '';
      if (it.tipo === 'patrocinio' && it.imagem) {
        const img = document.createElement('img'); img.alt = ''; img.src = it.imagem; img.onerror = () => img.remove(); tx.appendChild(img);
      }
      tx.appendChild(document.createTextNode(it.texto));
      $('tkDots').innerHTML = items.length > 1 ? items.map((_, i) => `<i class="${i === this.tkIdx % items.length ? 'on' : ''}"></i>`).join('') : '';
    }
    tickTicker(dt) {
      if (this.tkItems.length < 2) { this.tkT = 0; return; }
      this.tkT += dt;
      const secs = (ABT.Data.get().config.anuncioSegundos || 8);
      if (this.tkT >= secs) { this.tkT = 0; this.tkIdx = (this.tkIdx + 1) % this.tkItems.length; this.showTicker(); }
    }
  };
})();
