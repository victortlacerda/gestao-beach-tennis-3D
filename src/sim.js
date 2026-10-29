/* ============================================================
   Simulação de demonstração (dados de exemplo FIXOS no código — Fase 1).
   Controladores por quadra:
     • JogoCtl      jogo/rally com 2 duplas, placar e comemoração
     • AulaCtl      aula com professor destacado + 6 alunos em fila
     • DayUseCtl    jogo com fila de espera e rodízio (na vida real: manual)
     • (livre)      quadra vazia
   Mais: torcida na arquibancada, equipe, gente passeando e na lanchonete.
   ============================================================ */
(function () {
  const T = THREE;
  const C = ABT.C;
  const Boneco = ABT.Boneco;
  const rnd = ABT.rnd, clamp = ABT.clamp;

  class Timeline {
    constructor() { this.t = 0; this.q = []; }
    at(d, fn) { this.q.push({ t: this.t + d, fn }); }
    clear() { this.q.length = 0; }
    tick(dt) {
      this.t += dt;
      for (let i = 0; i < this.q.length;) {
        if (this.q[i].t <= this.t) { const e = this.q.splice(i, 1)[0]; e.fn(); } else i++;
      }
    }
  }

  /* ---------- bola ---------- */
  class Ball {
    constructor(scene, groundY) {
      this.g = groundY;
      this.mesh = new T.Mesh(new T.IcosahedronGeometry(0.14, 1), new T.MeshStandardMaterial({ color: 0xFF9F1C, emissive: 0xFF7A00, emissiveIntensity: 0.35, flatShading: true }));
      this.mesh.castShadow = true;
      this.blob = new T.Mesh(new T.CircleGeometry(0.2, 12), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
      this.blob.rotation.x = -Math.PI / 2;
      this.mesh.visible = this.blob.visible = false;
      scene.add(this.mesh, this.blob);
      this.f = null;
    }
    show() { this.mesh.visible = this.blob.visible = true; }
    hide() { this.mesh.visible = this.blob.visible = false; this.f = null; }
    setPos(p) { this.mesh.position.set(p.x, p.y, p.z); this._blob(); }
    _blob() {
      const p = this.mesh.position;
      this.blob.position.set(p.x, this.g + 0.012, p.z);
      const s = 1 / (1 + Math.max(0, p.y - this.g) * 0.35);
      this.blob.scale.setScalar(s); this.blob.material.opacity = 0.32 * s;
    }
    launch(from, to, dur, peak, onEnd) {
      this.show();
      this.f = { from: { x: from.x, y: from.y, z: from.z }, to: { x: to.x, y: to.y, z: to.z }, dur, peak: peak || 0, t: 0, onEnd };
      this.setPos(from);
    }
    update(dt) {
      const f = this.f;
      if (!f) return;
      f.t += dt;
      const u = Math.min(1, f.t / f.dur);
      this.mesh.position.set(
        f.from.x + (f.to.x - f.from.x) * u,
        f.from.y + (f.to.y - f.from.y) * u + 4 * f.peak * u * (1 - u),
        f.from.z + (f.to.z - f.from.z) * u);
      this.mesh.rotation.x += dt * 12;
      this._blob();
      if (u >= 1) { this.f = null; if (f.onEnd) f.onEnd(); }
    }
  }

  const ptsLabel = (p) => ['0', '15', '30', '40'][Math.min(p, 3)];

  /* ---------- jogo (2 duplas) ---------- */
  class JogoCtl {
    constructor(sim, court, teams, opts) {
      this.sim = sim; this.court = court; this.teams = teams; this.opts = opts || {};
      this.y = court.surface;
      this.ball = new Ball(sim.scene, this.y);
      this.tl = new Timeline();
      this.pts = [0, 0]; this.games = [0, 0]; this.sets = [0, 0];
      this.server = Math.random() < 0.5 ? 0 : 1; this.serverLane = 0;
      this.mode = this.opts.mode || 'games'; this.target = this.opts.target || 7;
      this.state = 'wait'; this.paused = false;
      this.alive = true;
      this.placeTeams(true);
      this.tl.at(1.0, () => this.startPoint());
      this.refresh();
    }
    side(t) { return t === 0 ? -1 : 1; }
    netYaw(t) { return t === 0 ? Math.PI / 2 : -Math.PI / 2; }
    home(t, lane) { return { x: this.court.cx + this.side(t) * 5.0, z: this.court.cz + (lane ? 1.9 : -1.9) }; }

    placeTeams(instant) {
      [0, 1].forEach((t) => this.teams[t].forEach((p, lane) => {
        const h = this.home(t, lane);
        if (instant) { p.setPos(h.x, this.y, h.z); p.setYaw(this.netYaw(t)); }
        else p.moveTo(h.x, h.z, 2.8, true, this.netYaw(t));
        p.setMode('stand');
      }));
    }
    setTeams(teams) { this.teams = teams; this.refresh(); }
    setFixed(f) { this.opts.fixed = f; this.refresh(); }

    startPoint() {
      if (!this.alive || this.paused) return;
      this.rally = 0; this.rallyLen = 3 + Math.floor(Math.random() * 6);
      const st = this.server, s = this.side(st);
      const srv = this.teams[st][this.serverLane];
      this.srv = srv;
      const sz = this.court.cz + (this.serverLane ? 1.6 : -1.6);
      srv.moveTo(this.court.cx + s * 8.5, sz, 2.6, true, this.netYaw(st));
      this.teams[1 - st].forEach((p) => p.setMode('ready'));
      this.teams[st].forEach((p) => { if (p !== srv) p.setMode('stand'); });
      this.state = 'toServe';
    }

    update(dt) {
      this.tl.tick(dt);
      this.ball.update(dt);
      if (this.state === 'toServe' && this.srv.arrived) {
        this.state = 'serving';
        this.tl.at(0.35, () => this.beginServe());
      }
    }

    beginServe() {
      const srv = this.srv, st = this.server;
      srv.face(this.netYaw(st));
      srv.playAction('serve');
      const p = srv.root.position;
      const hand = { x: p.x, y: this.y + 1.05, z: p.z };
      const top = { x: p.x, y: this.y + 2.35, z: p.z };
      this.ball.launch(hand, top, Boneco.CONTACT.serve, 0, null);
      this.tl.at(Boneco.CONTACT.serve, () => this.hitShot(srv, st, top, true));
    }

    // um golpe: lança a bola, escolhe quem rebate e agenda a próxima batida
    hitShot(hitter, team, from, isServe) {
      if (!this.alive) return;
      this.rally++;
      const c = this.court, opp = 1 - team, so = this.side(opp);
      const final = this.rally >= this.rallyLen;
      const outcome = final ? (Math.random() < 0.5 ? 'net' : 'winner') : 'in';
      const lx = c.cx + so * rnd(2.3, 7.0), lz = c.cz + rnd(-3.3, 3.3);
      const dist = Math.hypot(lx - from.x, lz - from.z);
      const dur = clamp(dist / 9.5, 0.75, 1.45);
      const peak = isServe ? rnd(1.4, 1.9) : rnd(1.7, 2.6);
      const after = () => { // quem bateu volta para casa
        const h = this.home(team, this.teams[team].indexOf(hitter));
        this.tl.at(0.35, () => { hitter.moveTo(h.x, h.z, 2.7, true, this.netYaw(team)); hitter.setMode('stand'); });
      };
      after();
      if (outcome === 'net') {
        const nz = clamp(from.z + rnd(-1.2, 1.2), c.cz - 3.2, c.cz + 3.2);
        const dn = Math.abs(c.cx - from.x);
        this.ball.launch(from, { x: c.cx, y: this.y + 1.25, z: nz }, clamp(dn / 9.5, 0.4, 0.9), 0.25, () => {
          this.ball.launch({ x: c.cx, y: this.y + 1.25, z: nz }, { x: c.cx + this.side(team) * 0.4, y: this.y + 0.14, z: nz }, 0.38, 0.05, () => {
            this.tl.at(0.5, () => this.ball.hide());
            this.pointEnd(opp);
          });
        });
        return;
      }
      this.ball.launch(from, { x: lx, y: this.y + 0.14, z: lz }, dur, peak, () => {
        const dirx = Math.sign(lx - from.x) || so;
        if (outcome === 'winner') {
          const ex = clamp(lx + dirx * rnd(2.5, 3.5), c.cx - 9.6, c.cx + 9.6);
          this.ball.launch({ x: lx, y: this.y + 0.14, z: lz }, { x: ex, y: this.y + 0.14, z: clamp(lz + rnd(-1.4, 1.4), c.cz - 5.5, c.cz + 5.5) }, 0.9, 0.55, () => {
            this.tl.at(0.4, () => this.ball.hide());
          });
          // a dupla adversária corre, mas não alcança
          const lane = Math.abs(lz - (c.cz - 1.9)) < Math.abs(lz - (c.cz + 1.9)) ? 0 : 1;
          const loser = this.teams[opp][lane];
          loser.moveTo(lx + dirx * 1.0, lz, 5, true, this.netYaw(opp));
          this.tl.at(0.9, () => this.pointEnd(team));
          return;
        }
        // quica e é rebatida
        const C2 = { x: clamp(lx + dirx * 0.9, c.cx - 9.4, c.cx + 9.4), y: this.y + 1.0, z: lz };
        this.ball.launch({ x: lx, y: this.y + 0.14, z: lz }, C2, 0.36, 0.4, () => this.hitShot(receiver, opp, C2, false));
      });
      // receptor: o mais próximo da linha de queda corre até o ponto de contato
      const lane = Math.abs(lz - (c.cz - 1.9)) < Math.abs(lz - (c.cz + 1.9)) ? 0 : 1;
      const receiver = this.teams[opp][lane];
      const partner = this.teams[opp][1 - lane];
      const dirx2 = Math.sign(lx - from.x) || so;
      const cx2 = clamp(lx + dirx2 * 0.9, c.cx - 9.4, c.cx + 9.4);
      const total = dur + 0.36;
      const d = Math.hypot(cx2 - receiver.root.position.x, lz - receiver.root.position.z);
      receiver.setMode('ready');
      receiver.moveTo(cx2, lz + 0.3, clamp(d / Math.max(0.4, total - 0.25), 1.6, 6.5), true, this.netYaw(opp));
      const ph = this.home(opp, 1 - lane);
      partner.moveTo(ph.x, clamp(c.cz + (lz - c.cz) * -0.5 + (lane ? -1.4 : 1.4), c.cz - 3.2, c.cz + 3.2), 2.4, true, this.netYaw(opp));
      if (outcome === 'in') this.tl.at(Math.max(0.05, total - Boneco.CONTACT.hit), () => receiver.playAction('hit'));
    }

    pointEnd(w) {
      if (!this.alive) return;
      this.sim.emit('point', this.court.id);
      if (this.opts.fixed) { // não mexe no placar dos dados
        this.teams[w].forEach((p) => { p.setMode('stand'); p.playAction('cheer'); });
        this.teams[1 - w].forEach((p) => p.setMode('stand'));
        this.state = 'celebrate';
        this.tl.at(2.4, () => this.startPoint());
        return;
      }
      this.pts[w]++;
      let gameWon = false;
      if (this.mode === 'points') {
        if (this.pts[w] >= this.target) return this._matchEnd(w);
      } else if (this.pts[w] >= 4) {
        gameWon = true;
        this.games[w]++; this.pts = [0, 0]; this.server = 1 - this.server; this.serverLane = 1 - this.serverLane;
        const g = this.games;
        if ((g[w] >= 6 && g[w] - g[1 - w] >= 2) || g[w] === 7) {
          this.sets[w]++; this.games = [0, 0];
          if (this.sets[w] >= 2) { this.sets = [0, 0]; }
        }
      }
      this.refresh();
      this.teams[w].forEach((p) => { p.setMode('stand'); p.playAction('cheer'); });
      this.teams[1 - w].forEach((p) => p.setMode('stand'));
      this.state = 'celebrate';
      this.tl.at(gameWon ? 3.2 : 2.4, () => this.startPoint());
    }

    _matchEnd(w) {
      this.refresh();
      this.teams[w].forEach((p) => { p.setMode('stand'); p.playAction('cheer'); });
      this.teams[1 - w].forEach((p) => p.setMode('stand'));
      this.state = 'ended'; this.paused = true;
      if (this.opts.onMatchEnd) this.tl.at(2.2, () => this.opts.onMatchEnd(w));
      else { this.paused = false; this.pts = [0, 0]; this.tl.at(3.0, () => { this.refresh(); this.startPoint(); }); }
    }
    forceEnd() {
      if (this.mode !== 'points') return;
      this.tl.clear(); this.ball.hide();
      const w = Math.random() < 0.5 ? 0 : 1;
      this.pts[w] = this.target; this.pts[1 - w] = Math.max(0, this.target - 3);
      this._matchEnd(w);
    }
    resume() {
      this.pts = [0, 0]; this.paused = false; this.server = 1 - this.server;
      this.refresh();
      this.tl.at(1.2, () => this.startPoint());
    }

    names(t) { return this.teams[t].map((p) => p.name).join('/'); }
    refresh() {
      const info = this.opts.info;
      info.line1 = this.names(0) + '  ×  ' + this.names(1);
      if (this.opts.fixed) { // placar vem dos dados (campeonato): as jogadas são só movimento
        const f = this.opts.fixed, sets = f.sets || [];
        if (f.texto != null) { // aluguel e day use (D46): "Em jogo" ou o placar que a recepção digitou
          info.line2 = f.texto; info.scoreText = f.placar ? 'Placar: ' + f.texto : 'Em jogo · placar não informado';
          info.team1 = this.names(0); info.team2 = this.names(1); info.dirty = true; return;
        }
        info.line2 = sets.length ? sets.map((x) => `${x[0]}–${x[1]}`).join(' · ') : '0–0';
        info.scoreText = (sets.length ? 'Sets: ' + info.line2 : 'Ainda sem placar');
        info.team1 = this.names(0); info.team2 = this.names(1); info.dirty = true;
        return;
      }
      if (this.mode === 'points') {
        info.line2 = `${this.pts[0]} × ${this.pts[1]}  (até ${this.target})`;
        info.scoreText = `${this.pts[0]} × ${this.pts[1]} · até ${this.target} pts`;
      } else {
        const g = this.games, p = this.pts;
        info.line2 = `${g[0]} × ${g[1]}   (${ptsLabel(p[0])}–${ptsLabel(p[1])})`;
        info.scoreText = `Games ${g[0]} × ${g[1]} · ${ptsLabel(p[0])}–${ptsLabel(p[1])}` + (this.sets[0] + this.sets[1] ? ` · Sets ${this.sets[0]}–${this.sets[1]}` : '');
      }
      info.team1 = this.names(0); info.team2 = this.names(1);
      info.dirty = true;
    }
    destroy() { this.alive = false; this.tl.clear(); this.ball.hide(); this.sim.scene.remove(this.ball.mesh, this.ball.blob); }
  }

  /* ---------- day use: jogo + fila + rodízio ---------- */
  class DayUseCtl {
    constructor(sim, court, players, queue, info, opts) {
      this.sim = sim; this.court = court; this.queue = queue.slice(); this.info = info; this.auto = !!(opts && opts.auto);
      this.tl = new Timeline(); this.alive = true;
      this.jogo = new JogoCtl(sim, court, [[players[0], players[1]], [players[2], players[3]]], {
        mode: 'points', target: 7, info, fixed: opts && opts.fixed, onMatchEnd: (w) => this.rotate(w),
      });
      this.queue.forEach((p, i) => { const s = this.slot(i); p.setPos(s.x, court.surface, s.z); p.setYaw(Math.PI); p.setMode('stand'); });
      this.relabel(); this.syncInfo();
    }
    slot(i) { return { x: this.court.cx - 2.6 + i * 1.15, z: this.court.cz + 5.0 }; }
    relabel() {
      this.queue.forEach((p, i) => { p.setLabel(`${i + 1}º ${p.name}`, 'queue'); p.labelRole = 'court'; p.applyLabelMode(); });
      this.jogo.teams.forEach((t) => t.forEach((p) => { p.setLabel(p.name, 'name'); }));
    }
    syncInfo() { this.info.queue = this.queue.map((p) => p.name); this.info.dirty = true; }
    rotate(winner) {
      const loser = 1 - winner, j = this.jogo;
      if (!this.auto) { this.tl.at(2.0, () => j.resume()); return; } // D07: a fila anda à mão, nada de rodízio automático
      const out = j.teams[loser].slice();
      const inc = this.queue.splice(0, 2);
      const teams = [j.teams[0].slice(), j.teams[1].slice()];
      teams[loser] = inc;
      this.queue.push(...out);
      // incoming entram na quadra; outgoing vão para o fim da fila
      inc.forEach((p, lane) => { const h = j.home(loser, lane); p.moveTo(h.x, h.z, 2.7, true, j.netYaw(loser)); p.setMode('stand'); });
      this.queue.forEach((p, i) => { const s = this.slot(i); p.moveTo(s.x, s.z, 2.4, true, Math.PI); });
      j.setTeams(teams);
      this.relabel(); this.syncInfo();
      this.sim.toast && this.sim.toast(`Quadra ${this.court.id}: fila andou — entram ${inc.map((p) => p.name).join(' e ')}`);
      this.tl.at(3.6, () => j.resume());
    }
    update(dt) { this.tl.tick(dt); this.jogo.update(dt); }
    forceEnd() { this.jogo.forceEnd(); }
    destroy() { this.alive = false; this.jogo.destroy(); }
  }

  /* ---------- day use sem quórum: gente esperando perto da quadra ---------- */
  class WaitCtl {
    constructor(sim, court, names, info) {
      this.sim = sim; info.queue = names.slice();
      names.forEach((n, i) => {
        const p = sim._person(n);
        p.setPos(court.cx - 2.6 + i * 1.15, court.surface, court.cz + 5.0); p.setYaw(Math.PI); p.setMode('stand');
        p.setLabel(`${i + 1}º ${n}`, 'queue'); p.labelRole = 'court'; p.applyLabelMode();
      });
    }
    update() {}
    destroy() {}
  }

  /* ---------- aula ---------- */
  class AulaCtl {
    constructor(sim, court, teacher, students, info) {
      this.sim = sim; this.court = court; this.teacher = teacher; this.info = info;
      this.y = court.surface; this.alive = true;
      this.ball = new Ball(sim.scene, this.y);
      this.tl = new Timeline();
      const c = court;
      this.spot = { x: c.cx - 4.8, z: c.cz + 0.2 };
      this.active = students[0]; this.queue = students.slice(1); this.count = 0;
      teacher.setPos(c.cx + 2.6, this.y, c.cz + 0.4); teacher.setYaw(-Math.PI / 2);
      this.students = students;
      students.forEach((s, i) => {
        const p = i === 0 ? this.spot : this.slot(i - 1);
        s.setPos(p.x, this.y, p.z); s.setYaw(Math.PI / 2); s.setMode(i === 0 ? 'ready' : 'stand');
      });
      this.tl.at(1.2, () => this.cycle());
      info.line1 = `Prof. ${teacher.name} · ${students.length} alunos`;
      info.line2 = info.turma || 'Turma';
      info.dirty = true;
    }
    slot(i) { return { x: this.court.cx - 8.0 + (i % 2) * 0.8, z: this.court.cz - 3.2 + i * 1.6 }; }
    cycle() {
      if (!this.alive) return;
      const c = this.court, t = this.teacher, A = this.active, S = this.spot;
      this.count++;
      t.face(-Math.PI / 2); t.playAction('hit');
      A.setMode('ready');
      this.tl.at(Boneco.CONTACT.hit, () => {
        const from = { x: t.root.position.x - 0.5, y: this.y + 1.1, z: t.root.position.z };
        const L = { x: S.x + 1.0, y: this.y + 0.14, z: S.z + rnd(-0.3, 0.3) };
        this.ball.launch(from, L, 1.0, 1.7, () => {
          const Cc = { x: S.x, y: this.y + 1.0, z: L.z };
          this.ball.launch(L, Cc, 0.36, 0.4, () => {
            const tx = c.cx + rnd(3.5, 7.0), tz = c.cz + rnd(-3, 3);
            this.ball.launch(Cc, { x: tx, y: this.y + 0.14, z: tz }, 1.15, 2.2, () => {
              this.ball.launch({ x: tx, y: this.y + 0.14, z: tz }, { x: tx + 2.0, y: this.y + 0.14, z: tz + rnd(-1, 1) }, 0.7, 0.4, () => this.tl.at(0.3, () => this.ball.hide()));
            });
          });
        });
        this.tl.at(1.0 + 0.36 - Boneco.CONTACT.hit + 0.0, () => A.playAction('hit'));
      });
      this.tl.at(2.3, () => this.rotate());
      if (this.count % 3 === 0) this.tl.at(2.6, () => t.playAction('clap'));
      this.tl.at(3.9, () => this.cycle());
    }
    rotate() {
      this.queue.push(this.active);
      this.active = this.queue.shift();
      this.active.moveTo(this.spot.x, this.spot.z, 2.8, true, Math.PI / 2);
      this.queue.forEach((s, i) => { const p = this.slot(i); s.moveTo(p.x, p.z, 2.4, true, Math.PI / 2); s.setMode('stand'); });
      this.teacher.face(-Math.PI / 2);
    }
    update(dt) { this.tl.tick(dt); this.ball.update(dt); }
    destroy() { this.alive = false; this.tl.clear(); this.ball.hide(); this.sim.scene.remove(this.ball.mesh, this.ball.blob); }
  }

  /* ---------- torcida, passeio, equipe ---------- */
  class SpectatorsCtl {
    constructor(sim, people) {
      this.sim = sim; this.people = people.map((p) => ({ p, next: rnd(2, 12) })); this.t = 0;
      this.off = sim.on('point', () => {
        this.people.forEach((e) => { if (Math.random() < 0.4 && !e.p.action) { e.p.playAction(Math.random() < 0.5 ? 'clap' : 'cheer'); } });
      });
    }
    update(dt) {
      this.t += dt;
      this.people.forEach((e) => {
        if (this.t > e.next) { e.next = this.t + rnd(6, 16); if (!e.p.action) e.p.playAction(ABT.pick(['clap', 'clap', 'wave', 'cheer'])); }
      });
    }
    destroy() { this.off && this.off(); }
  }
  class WalkerCtl {
    constructor(sim, b, start) {
      this.b = b; this.sim = sim; this.wait = 0;
      b.setPos(start[0], 0.04, start[1]);
      this.next();
    }
    next() {
      const pts = this.sim.world.plaza, p = ABT.pick(pts);
      this.b.moveTo(p[0] + rnd(-0.8, 0.8), p[1] + rnd(-0.8, 0.8), rnd(1.1, 1.5));
      this.wait = -1;
    }
    update(dt) {
      if (this.b.arrived) {
        if (this.wait < 0) this.wait = rnd(2, 6);
        this.wait -= dt;
        if (this.wait <= 0) this.next();
      }
    }
    destroy() {}
  }

  /* ---------- cenários de demonstração ---------- */
  const SCENARIOS = {
    dia: {
      label: 'Dia a dia',
      courts: [
        { type: 'aluguel', time: '18:00–19:00', teams: [['Bia', 'Léo'], ['Caio', 'Duda']], who: 'Aluguel · Bia (titular)' },
        { type: 'aula', time: '18:00–19:00', teacher: 'Marcos', turma: 'Turma Iniciantes', students: ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio'] },
        { type: 'dayuse', time: 'Day use · 17:00–21:00', players: ['Gabi', 'Hugo', 'Íris', 'João'], queue: ['Kelly', 'Lucas', 'Mari'] },
        { type: 'livre', next: 'Próximo: 19:00 · Aluguel' },
      ],
      spectators: ['Nando', 'Olívia', 'Pedro', 'Quel', 'Rafa', 'Sol'], walkers: 3, cafe: 4,
    },
    campeonato: {
      label: 'Campeonato',
      courts: [
        { type: 'campeonato', time: 'Grupo A · Rodada 2', teams: [['Rui', 'Téo'], ['Vivi', 'Lara']] },
        { type: 'campeonato', time: 'Grupo A · Rodada 2', teams: [['Nina', 'Beto'], ['Zeca', 'Maya']] },
        { type: 'campeonato', time: 'Grupo B · Rodada 2', teams: [['Dani', 'Gui'], ['Lia', 'Caco']] },
        { type: 'campeonato', time: 'Grupo B · Rodada 2', teams: [['Ivo', 'Pati'], ['Joca', 'Bel']] },
      ],
      spectators: ['Ana', 'Bia', 'Caio', 'Duda', 'Edu', 'Fê', 'Gabi', 'Hugo', 'Ian', 'Jô', 'Kaká', 'Léo', 'Mel', 'Nando', 'Olga', 'Paulo', 'Quel', 'Rafa', 'Sol', 'Tati'], walkers: 3, cafe: 4,
    },
    vazio: {
      label: 'Arena vazia',
      courts: [{ type: 'livre' }, { type: 'livre' }, { type: 'livre' }, { type: 'livre', next: 'Próximo: 17:00 · Aula' }],
      spectators: [], walkers: 1, cafe: 1,
    },
  };
  ABT.SCENARIOS = SCENARIOS;

  /* ---------- a simulação ---------- */
  ABT.Sim = class {
    constructor(scene, world, camera) {
      this.scene = scene; this.world = world; this.camera = camera;
      this.people = []; this.ctls = []; this.listeners = {};
      this.banners = []; this.info = { courts: [], spectators: 0, scenario: null };
      this.time = 0;
      C.courts.forEach((c, i) => {
        const cv = document.createElement('canvas'); cv.width = 640; cv.height = 300;
        const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
        const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
        sp.scale.set(9.0, 4.22, 1); sp.renderOrder = 12; sp.userData.base = 9.0;
        sp.position.copy(world.courts[i].bannerPos);
        scene.add(sp);
        this.banners.push({ cv, tex, sp });
      });
    }

    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); return () => { this.listeners[ev] = this.listeners[ev].filter((f) => f !== fn); }; }
    emit(ev, a) { (this.listeners[ev] || []).forEach((f) => f(a)); }

    /* As peças da cena ficam em "grupos" (uma por quadra + o ambiente), para refazer só o que mudou. */
    _group() { return { people: [], ctls: [] }; }
    _in(group, fn) { const prev = this._cur; this._cur = group; try { return fn(); } finally { this._cur = prev; } }
    _ctl(c) { this.ctls.push(c); if (this._cur) this._cur.ctls.push(c); return c; }
    _drop(g) {
      g.ctls.forEach((c) => { c.destroy(); const k = this.ctls.indexOf(c); if (k >= 0) this.ctls.splice(k, 1); });
      g.people.forEach((p) => { this.scene.remove(p.root); p.setLabel(null); const k = this.people.indexOf(p); if (k >= 0) this.people.splice(k, 1); });
      g.people.length = 0; g.ctls.length = 0;
    }

    _person(name, o) {
      o = o || {};
      const look = Object.assign(ABT.Look.fromName(name), (this._looks && this._looks[name]) || {}, o.look || {});
      const b = new Boneco(look, { name, teacher: !!o.teacher, racket: o.racket });
      b.labelRole = o.role || 'court';
      this.scene.add(b.root);
      this.people.push(b);
      if (this._cur) this._cur.people.push(b);
      if (o.label !== false) b.setLabel(o.teacher ? 'PROF. ' + name : name, o.teacher ? 'teacher' : (o.role === 'viewer' ? 'viewer' : 'name'));
      return b;
    }

    clear() {
      (this.courtGroups || []).forEach((g) => this._drop(g));
      if (this.ambient) this._drop(this.ambient);
      this.ctls.forEach((c) => c.destroy()); this.ctls = [];
      this.people.forEach((p) => { this.scene.remove(p.root); p.setLabel(null); }); this.people = [];
      this.courtGroups = C.courts.map(() => this._group()); this.ambient = this._group();
      this._sig = []; this._fixedSig = []; this._ambSig = null;
    }

    loadScenario(id) {
      const sc = SCENARIOS[id]; this.scenarioId = id; this.source = 'demo';
      this.setCena(Object.assign({ id, autoRotate: true, aberto: true }, sc), true);
    }

    /** Recebe o que deve estar acontecendo (ver ABT.Agenda.cena) e refaz só o que mudou. */
    setCena(cena, force) {
      this._looks = cena.looks || {};
      if (force || !this.courtGroups) { this.clear(); this.info.courts = []; }
      this.info.scenario = cena.id || null;
      this.autoRotate = !!cena.autoRotate;
      cena.courts.forEach((cd, i) => {
        const sig = JSON.stringify(Object.assign({}, cd, { fixed: undefined, looks: undefined }));
        if (force || sig !== this._sig[i]) { this._sig[i] = sig; this._fixedSig[i] = JSON.stringify(cd.fixed || null); this._buildCourt(i, cd); }
        else {
          const fs = JSON.stringify(cd.fixed || null);
          if (fs !== this._fixedSig[i]) { // só o placar mudou: atualiza sem mexer nos bonecos
            this._fixedSig[i] = fs;
            const jc = this.courtGroups[i].ctls.map((c) => (c instanceof DayUseCtl ? c.jogo : c)).find((c) => c instanceof JogoCtl);
            if (jc) jc.setFixed(cd.fixed);
          }
        }
      });
      const asig = JSON.stringify([cena.spectators, cena.walkers, cena.cafe, cena.aberto !== false]);
      if (force || asig !== this._ambSig) { this._ambSig = asig; this._buildAmbient(cena); }
      this.applyLabels();
      this.refreshBanners(true);
      this.emit('scenario', cena.id);
    }

    _buildCourt(i, cd) {
      const world = this.world, court = world.courts[i], group = this.courtGroups[i];
      this._drop(group);
      const closed = !!cd.closed;
      const st = closed ? { label: 'Fechada', color: 0x8A8F98, icon: '🔒' } : C.status[cd.type];
      const info = {
        id: court.id, type: cd.type, status: st.label, color: ABT.hex(st.color), icon: st.icon,
        title: 'Quadra ' + court.id, time: cd.time || '', line1: '', line2: '', queue: [], who: [], dirty: true, closed,
      };
      this.info.courts[i] = info;
      court.edgeMat.color.setHex(st.color); court.edgeMat.emissive.setHex(st.color);
      court.freeGlow.visible = cd.type === 'livre' && !closed;
      court.freeGlow.material.color.setHex(st.color);

      this._in(group, () => {
        if (cd.type === 'aluguel' || cd.type === 'campeonato') {
          const ps = cd.teams.map((t) => t.map((n) => this._person(n)));
          this._ctl(new JogoCtl(this, court, ps, { info, mode: 'games', fixed: cd.fixed }));
          info.who = cd.teams.flat();
          if (cd.type === 'aluguel') info.right = cd.time;
          if (cd.torneio) info.torneio = cd.torneio;
        } else if (cd.type === 'aula') {
          const t = this._person(cd.teacher, { teacher: true, look: { shirt: 0 } });
          const ss = cd.students.map((n) => this._person(n));
          info.turma = cd.turma;
          this._ctl(new AulaCtl(this, court, t, ss, info));
          info.who = [cd.teacher + ' (prof.)'].concat(cd.students);
        } else if (cd.type === 'dayuse') {
          const ps = cd.players.map((n) => this._person(n));
          const qs = (cd.queue || []).map((n) => this._person(n));
          this._ctl(new DayUseCtl(this, court, ps, qs, info, { auto: cd.autoRotate !== undefined ? cd.autoRotate : this.autoRotate, fixed: cd.fixed }));
          info.who = cd.players;
        } else if (cd.type === 'bloqueado') {
          info.line1 = 'Quadra em manutenção'; info.line2 = cd.motivo || ''; info.line2Color = '#C9CED6';
        } else {
          info.line1 = closed ? 'Quadra fechada' : (cd.waiting ? 'Day use: esperando jogadores' : 'Quadra livre agora');
          info.line2 = cd.next || (closed ? '' : 'Sem reservas hoje');
          info.line2Color = closed ? '#C9CED6' : '#9BE7B6';
          if (cd.waiting) this._ctl(new WaitCtl(this, court, cd.waiting, info));
        }
      });
      info.dirty = true;
    }

    _buildAmbient(cena) {
      const world = this.world;
      this._drop(this.ambient);
      this._in(this.ambient, () => {
        const sp = cena.spectators || [];
        const seats = world.seats.filter((s) => s.row >= 1 && s.row <= 4 && s.z > -12 && s.z < 12);
        const rng = ABT.rng(77 + sp.length);
        const pool = seats.slice();
        const spect = [];
        sp.forEach((n) => {
          if (!pool.length) return;
          const k = Math.floor(rng() * pool.length); const s = pool.splice(k, 1)[0];
          const b = this._person(n, { role: 'viewer', racket: false });
          b.sit(s.x, s.y, s.z, -Math.PI / 2);
          spect.push(b);
        });
        this.info.spectators = spect.length;
        if (spect.length) this._ctl(new SpectatorsCtl(this, spect));
        if (cena.aberto === false) return;

        // lanchonete: gente sentada
        const cafe = world.cafeSeats.slice().sort(() => rng() - 0.5).slice(0, cena.cafe || 0);
        const cafeNames = ['Tina', 'Vitor', 'Wanda', 'Xavi', 'Yuri', 'Zara'];
        cafe.forEach((s, i) => {
          const b = this._person(cafeNames[i % 6], { role: 'ambient', racket: false, label: false });
          b.sit(s.x, s.seatY, s.z, s.yaw);
        });
        // equipe (recepção, lojinha, lanchonete) — enquanto a arena está aberta
        [['Rita', -17.4, 21.8, 0, 0], ['Sérgio', -1.4, 22.6, Math.PI / 2, 1], ['Chef Zé', 6.2, 21.8, 0, 2]].forEach(([n, x, z, yaw, k]) => {
          const look = ABT.Look.fromName(n);
          if (k === 2) Object.assign(look, { shirt: 3, hair: 0, hairColor: 1, acc: 1 });
          const b = this._person(n, { role: 'ambient', racket: false, label: false, look });
          b.setPos(x, 0.12, z); b.setYaw(yaw);
        });
        // gente passeando
        const wn = ['Alê', 'Bê', 'Cris', 'Dudu'];
        for (let i = 0; i < (cena.walkers || 0); i++) {
          const b = this._person(wn[i], { role: 'ambient', racket: i !== 2, label: false });
          this._ctl(new WalkerCtl(this, b, world.plaza[(i * 4 + 1) % world.plaza.length]));
        }
      });
    }

    applyLabels() { this.people.forEach((p) => p.applyLabelMode()); }

    forceMatchEnd(courtIdx) {
      const c = this.ctls.find((x) => x instanceof DayUseCtl && x.court.id === courtIdx);
      if (c) c.forceEnd();
    }

    refreshBanners(force) {
      this.info.courts.forEach((info, i) => {
        if (!info.dirty && !force) return;
        info.dirty = false;
        const b = this.banners[i];
        let l1 = info.line1, l2 = info.line2;
        if (info.type === 'aula') { l1 = `Prof. ${info.who[0].replace(' (prof.)', '')} · ${info.who.length - 1} alunos`; l2 = info.turma; }
        if (info.type === 'dayuse') { l2 = info.line2 + (info.queue.length ? `   Fila: ${info.queue.length}` : ''); }
        ABT.drawCourtBanner(b.cv, {
          title: info.title, chip: info.status.toUpperCase(), color: info.color,
          chipText: info.type === 'campeonato' || info.type === 'dayuse' ? '#1B2F55' : '#FFFFFF',
          time: info.time, line1: l1, line2: l2, line2Color: info.line2Color,
        });
        b.tex.needsUpdate = true;
      });
    }

    update(dt, time) {
      this.time = time;
      this.ctls.forEach((c) => c.update(dt));
      this.people.forEach((p) => p.update(dt, time));
      if (this.camera) {
        // as placas mantêm um tamanho legível de perto e de longe
        this.banners.forEach((b) => {
          const d = this.camera.position.distanceTo(b.sp.position);
          const k = clamp(d / 72, 0.42, 1.2) * b.sp.userData.base;
          b.sp.scale.set(k, k * 300 / 640, 1);
          // de perto a placa some (a lista lateral e o cartão já mostram tudo)
          const o = clamp((d - 26) / 14, 0, 1);
          b.sp.material.opacity = o; b.sp.visible = o > 0.02;
        });
      }
      this.refreshBanners(false);
    }
  };
})();
