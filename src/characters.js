/* ============================================================
   Bonecos 3D genéricos (low-poly) com peças combináveis e animação procedural.
   Peças (D22/D39): tom de pele, cabelo, cor do cabelo, camisa, shorts, acessório
   — 4 opções de cada = 4.096 combinações. O professor tem camisa exclusiva + destaque.
   O boneco olha para +Z no seu próprio sistema (mão direita em -X).
   ============================================================ */
(function () {
  const T = THREE;
  const G = ABT.G;

  const SKIN = [0xF6D1B0, 0xE3AB82, 0xB97B52, 0x7A4A2E];            // claro, médio claro, médio escuro, escuro
  const HAIR_COLOR = [0x1E1A18, 0x5A3A22, 0xE0B65A, 0xB5481C];       // preto, castanho, loiro, ruivo
  const SHIRT = [0x1FB5B0, 0xFF6B57, 0xF4C531, 0xF4F7FA];            // turquesa, coral, amarela, branca
  const SHORTS = [0x1B2F55, 0x23262B, 0x7F8793, 0x2E8B57];           // marinho, preto, cinza, verde
  const ACC_COLOR = [0xFF6B57, 0x12355B, 0xF4F7FA, 0x1FB5B0];
  const RACKET = [0xFF6B57, 0x1FB5B0, 0x12355B, 0xF4C531];
  const TEACHER_SHIRT = 0x7A4FD1;
  const TEACHER_TRIM = 0xF4C531;

  const HIP_Y = 0.89, THIGH = 0.42, SHIN = 0.47;

  ABT.Look = {
    SKIN, HAIR_COLOR, SHIRT, SHORTS,
    hairStyles: ['Curto', 'Comprido', 'Rabo de cavalo', 'Raspado'],
    accessories: ['Nenhum', 'Boné', 'Viseira', 'Óculos de sol'],
    // aparência determinística a partir do nome (boneco "automático" ao cadastrar)
    fromName(name) {
      const h = ABT.hash(name || 'x');
      return {
        skin: h % 4, hair: (h >> 2) % 4, hairColor: (h >> 4) % 4, shirt: (h >> 6) % 4,
        shorts: (h >> 8) % 4, acc: [0, 0, 1, 0, 2, 0, 3][(h >> 10) % 7], racket: (h >> 13) % 4,
      };
    },
    // 12 presets prontos (D39)
    presets: [
      { skin: 0, hair: 0, hairColor: 1, shirt: 0, shorts: 0, acc: 0, racket: 0 },
      { skin: 1, hair: 1, hairColor: 0, shirt: 1, shorts: 1, acc: 0, racket: 1 },
      { skin: 2, hair: 2, hairColor: 0, shirt: 3, shorts: 0, acc: 2, racket: 2 },
      { skin: 3, hair: 3, hairColor: 0, shirt: 2, shorts: 1, acc: 0, racket: 3 },
      { skin: 0, hair: 1, hairColor: 2, shirt: 1, shorts: 2, acc: 3, racket: 0 },
      { skin: 1, hair: 0, hairColor: 3, shirt: 0, shorts: 3, acc: 1, racket: 1 },
      { skin: 2, hair: 1, hairColor: 1, shirt: 2, shorts: 0, acc: 0, racket: 2 },
      { skin: 3, hair: 2, hairColor: 0, shirt: 0, shorts: 2, acc: 2, racket: 3 },
      { skin: 0, hair: 2, hairColor: 3, shirt: 3, shorts: 1, acc: 0, racket: 0 },
      { skin: 1, hair: 3, hairColor: 1, shirt: 1, shorts: 3, acc: 3, racket: 1 },
      { skin: 2, hair: 0, hairColor: 0, shirt: 3, shorts: 2, acc: 1, racket: 2 },
      { skin: 3, hair: 1, hairColor: 0, shirt: 2, shorts: 0, acc: 0, racket: 3 },
    ],
  };

  /* ---------- geometrias (em cache por combinação) ---------- */
  const cache = {};
  function cached(key, build) { return cache[key] || (cache[key] = G.merge(build())); }

  function headGeo(a) {
    return cached(`h${a.skin}${a.hair}${a.hairColor}${a.acc}`, () => {
      const skin = SKIN[a.skin], hc = HAIR_COLOR[a.hairColor], ac = ACC_COLOR[(a.hairColor + 1) % 4];
      const p = [];
      const cy = 0.14;
      p.push(G.sph(0.125, 10, 8, skin, 0, cy, 0));
      p.push(G.sph(0.03, 5, 4, skin, 0.122, cy - 0.01, 0));
      p.push(G.sph(0.03, 5, 4, skin, -0.122, cy - 0.01, 0));
      p.push(G.box(0.026, 0.032, 0.03, ABT.shade(skin, 0.92), 0, cy - 0.02, 0.122));          // nariz
      p.push(G.box(0.022, 0.032, 0.014, 0x1B1B1B, 0.05, cy + 0.015, 0.117));                   // olhos
      p.push(G.box(0.022, 0.032, 0.014, 0x1B1B1B, -0.05, cy + 0.015, 0.117));
      p.push(G.box(0.052, 0.012, 0.012, 0x8A3B3B, 0, cy - 0.06, 0.118));                       // boca
      switch (a.hair) {
        case 0: // curto
          p.push(G.cap(0.137, 10, 7, 1.75, hc, 0, cy + 0.006, -0.004, -0.42, 0, 0));
          break;
        case 1: // comprido
          p.push(G.cap(0.138, 10, 7, 1.85, hc, 0, cy + 0.006, -0.004, -0.4, 0, 0));
          p.push(G.box(0.27, 0.34, 0.07, hc, 0, cy - 0.07, -0.105));
          p.push(G.box(0.04, 0.22, 0.09, hc, 0.128, cy - 0.01, -0.03));
          p.push(G.box(0.04, 0.22, 0.09, hc, -0.128, cy - 0.01, -0.03));
          break;
        case 2: // rabo de cavalo
          p.push(G.cap(0.137, 10, 7, 1.75, hc, 0, cy + 0.006, -0.004, -0.42, 0, 0));
          p.push(G.sph(0.05, 6, 5, hc, 0, cy + 0.09, -0.15));
          p.push(G.cyl(0.04, 0.018, 0.26, 6, hc, 0, cy - 0.04, -0.17, 0.3, 0, 0));
          break;
        default: // raspado
          p.push(G.cap(0.1285, 10, 7, 1.45, ABT.shade(skin, 0.62), 0, cy + 0.004, -0.002, -0.35, 0, 0));
      }
      switch (a.acc) {
        case 1: // boné
          p.push(G.cap(0.147, 10, 7, 1.5, ac, 0, cy + 0.025, -0.01, -0.3, 0, 0));
          p.push(G.box(0.2, 0.016, 0.12, ac, 0, cy + 0.085, 0.17, 0.1, 0, 0));
          break;
        case 2: // viseira
          p.push(G.cyl(0.14, 0.14, 0.04, 12, ac, 0, cy + 0.085, -0.005));
          p.push(G.box(0.2, 0.016, 0.12, ac, 0, cy + 0.085, 0.17, 0.1, 0, 0));
          break;
        case 3: // óculos de sol
          p.push(G.box(0.215, 0.05, 0.028, 0x15171C, 0, cy + 0.015, 0.124));
          p.push(G.box(0.012, 0.012, 0.12, 0x15171C, 0.11, cy + 0.02, 0.06));
          p.push(G.box(0.012, 0.012, 0.12, 0x15171C, -0.11, cy + 0.02, 0.06));
          break;
      }
      return p;
    });
  }

  function torsoGeo(a, teacher) {
    return cached(`t${teacher ? 'P' : a.shirt}${a.shorts}${a.skin}`, () => {
      const shirt = teacher ? TEACHER_SHIRT : SHIRT[a.shirt];
      const skin = SKIN[a.skin];
      const p = [];
      p.push(G.box(0.34, 0.18, 0.2, SHORTS[a.shorts], 0, 0, 0));                 // quadril
      p.push(G.box(0.37, 0.46, 0.21, shirt, 0, 0.285, 0));                          // tronco
      p.push(G.box(0.46, 0.12, 0.22, shirt, 0, 0.5, 0));                            // ombros
      p.push(G.cyl(0.048, 0.056, 0.12, 7, skin, 0, 0.6, 0));                        // pescoço
      if (teacher) {
        p.push(G.box(0.38, 0.05, 0.215, 0xF4F7FA, 0, 0.3, 0));                      // faixa branca
        p.push(G.box(0.14, 0.025, 0.225, TEACHER_TRIM, 0, 0.545, 0));               // gola dourada
        p.push(G.cyl(0.018, 0.018, 0.05, 6, TEACHER_TRIM, 0, 0.42, 0.115, Math.PI / 2, 0, 0)); // apito
      } else if (a.shirt === 3) {
        p.push(G.box(0.375, 0.035, 0.215, 0x1FB5B0, 0, 0.3, 0));                    // detalhe na camisa branca
      }
      return p;
    });
  }

  function upperArmGeo(a, teacher) {
    return cached(`ua${teacher ? 'P' : a.shirt}${a.skin}`, () => {
      const shirt = teacher ? TEACHER_SHIRT : SHIRT[a.shirt];
      return [
        G.cyl(0.054, 0.05, 0.19, 7, shirt, 0, -0.095, 0),
        G.cyl(0.046, 0.042, 0.11, 7, SKIN[a.skin], 0, -0.235, 0),
      ];
    });
  }

  function foreArmGeo(a, racket) {
    return cached(`fa${a.skin}${racket ? 'R' + a.racket : '-'}`, () => {
      const skin = SKIN[a.skin];
      const p = [
        G.cyl(0.042, 0.036, 0.27, 7, skin, 0, -0.135, 0),
        G.sph(0.05, 6, 5, skin, 0, -0.295, 0),
      ];
      if (racket) {
        const rc = RACKET[a.racket];
        const r = [
          G.cyl(0.021, 0.021, 0.17, 6, 0x222831, 0, -0.07, 0),
          // aro e face da raquete (sem cordas, estilo beach tennis)
          G.geo(new T.CylinderGeometry(0.145, 0.145, 0.045, 12), 0x23262B, 0, -0.34, 0, 0, 0, Math.PI / 2, 1.25, 1, 1),
          G.geo(new T.CylinderGeometry(0.118, 0.118, 0.052, 12), rc, 0, -0.34, 0, 0, 0, Math.PI / 2, 1.25, 1, 1),
        ];
        const m = new T.Matrix4().makeTranslation(0, -0.3, 0).multiply(new T.Matrix4().makeRotationX(-0.4));
        G.transform(r, m);
        p.push(...r);
      }
      return p;
    });
  }

  function thighGeo(a) {
    return cached(`th${a.shorts}${a.skin}`, () => [
      G.box(0.17, 0.28, 0.19, SHORTS[a.shorts], 0, -0.14, 0),
      G.cyl(0.062, 0.052, 0.17, 7, SKIN[a.skin], 0, -0.335, 0),
    ]);
  }

  function shinGeo(a) {
    return cached(`sh${a.skin}`, () => [
      G.cyl(0.05, 0.04, 0.3, 7, SKIN[a.skin], 0, -0.17, 0),
      G.cyl(0.046, 0.046, 0.12, 7, 0xF4F7FA, 0, -0.36, 0),                  // meia
      G.box(0.115, 0.07, 0.26, 0xF4F7FA, 0, -0.435, 0.045),                  // tênis
      G.box(0.12, 0.022, 0.265, 0x2B3138, 0, -0.466, 0.045),                 // sola
    ]);
  }

  const legFoot = (h, k) => THIGH * Math.cos(h) + SHIN * Math.cos(h + k);

  /* ---------- a classe do boneco ---------- */
  const JOINTS = ['bodyY', 'torsoX', 'torsoY', 'torsoZ', 'headX', 'headY', 'lArmX', 'lArmZ', 'lElb', 'rArmX', 'rArmZ', 'rElb', 'lHip', 'lKnee', 'rHip', 'rKnee'];
  const ACTIONS = { hit: 0.58, serve: 1.1, cheer: 1.7, clap: 1.5, wave: 1.4 };

  class Boneco {
    constructor(look, o) {
      o = o || {};
      this.look = look; this.teacher = !!o.teacher; this.hasRacket = o.racket !== false;
      this.name = o.name || '';
      this.phase = Math.random() * 100;
      this.baseY = 0;
      this.yaw = 0; this.desiredYaw = 0;
      this.target = null; this.speed = 2.2; this.moving = false; this.lockYaw = false; this.arrived = true;
      this.mode = 'stand';
      this.action = null; this.actionT = 0;
      this.walkPhase = Math.random() * 6;
      this.cur = {}; this.tgt = {};
      JOINTS.forEach((k) => { this.cur[k] = 0; this.tgt[k] = 0; });
      this.labelRole = 'court';
      this.label = null;

      const root = this.root = new T.Group();
      root.scale.setScalar(0.97);
      const body = this.body = new T.Group();
      root.add(body);
      const mk = (geo, parent, x, y, z) => {
        const m = new T.Mesh(geo, ABT.vcMat);
        m.castShadow = true;
        m.position.set(x, y, z);
        parent.add(m);
        return m;
      };
      const thigh = thighGeo(look), shin = shinGeo(look);
      this.hipL = new T.Group(); this.hipL.position.set(0.1, HIP_Y, 0); body.add(this.hipL);
      this.hipR = new T.Group(); this.hipR.position.set(-0.1, HIP_Y, 0); body.add(this.hipR);
      mk(thigh, this.hipL, 0, 0, 0); mk(thigh, this.hipR, 0, 0, 0);
      this.kneeL = new T.Group(); this.kneeL.position.y = -THIGH; this.hipL.add(this.kneeL);
      this.kneeR = new T.Group(); this.kneeR.position.y = -THIGH; this.hipR.add(this.kneeR);
      mk(shin, this.kneeL, 0, 0, 0); mk(shin, this.kneeR, 0, 0, 0);

      this.torso = new T.Group(); this.torso.position.y = HIP_Y; body.add(this.torso);
      mk(torsoGeo(look, this.teacher), this.torso, 0, 0, 0);
      this.head = new T.Group(); this.head.position.y = 0.64; this.torso.add(this.head);
      mk(headGeo(look), this.head, 0, 0, 0);

      const ua = upperArmGeo(look, this.teacher);
      this.shL = new T.Group(); this.shL.position.set(0.25, 0.5, 0); this.torso.add(this.shL);
      this.shR = new T.Group(); this.shR.position.set(-0.25, 0.5, 0); this.torso.add(this.shR);
      mk(ua, this.shL, 0, 0, 0); mk(ua, this.shR, 0, 0, 0);
      this.elL = new T.Group(); this.elL.position.y = -0.29; this.shL.add(this.elL);
      this.elR = new T.Group(); this.elR.position.y = -0.29; this.shR.add(this.elR);
      mk(foreArmGeo(look, false), this.elL, 0, 0, 0);
      mk(foreArmGeo(look, this.hasRacket), this.elR, 0, 0, 0);

      if (this.teacher) this._buildTeacherFx();
    }

    _buildTeacherFx() {
      const ring = new T.Mesh(
        new T.RingGeometry(0.62, 0.82, 36),
        new T.MeshBasicMaterial({ color: 0xF4C531, transparent: true, opacity: 0.92, depthWrite: false, side: T.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.renderOrder = 2;
      this.root.add(ring);
      const ring2 = new T.Mesh(
        new T.CircleGeometry(0.62, 28),
        new T.MeshBasicMaterial({ color: 0x7A4FD1, transparent: true, opacity: 0.28, depthWrite: false })
      );
      ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.025; ring2.renderOrder = 1;
      this.root.add(ring2);
      const beacon = new T.Mesh(
        new T.ConeGeometry(0.12, 0.26, 4),
        new T.MeshBasicMaterial({ color: 0xF4C531 })
      );
      beacon.rotation.x = Math.PI; beacon.position.y = 2.5;
      this.root.add(beacon);
      this.fx = { ring, ring2, beacon };
    }

    /* ----- posicionamento e movimento ----- */
    setPos(x, y, z) { this.root.position.set(x, y, z); this.baseY = y; }
    setYaw(a) { this.yaw = this.desiredYaw = a; this.root.rotation.y = a; }
    face(a) { this.desiredYaw = a; }
    lookAt(x, z) { this.desiredYaw = Math.atan2(x - this.root.position.x, z - this.root.position.z); }
    moveTo(x, z, speed, lockYaw, faceAfter) {
      this.target = { x, z };
      this.speed = speed || 2.2;
      this.lockYaw = !!lockYaw;
      this.faceAfter = faceAfter == null ? null : faceAfter;
      this.arrived = false;
    }
    stop() { this.target = null; this.moving = false; this.arrived = true; }
    sit(x, y, z, yaw) { this.setPos(x, y, z); this.setYaw(yaw); this.mode = 'sit'; this.target = null; }
    playAction(name) { if (ACTIONS[name]) { this.action = name; this.actionT = 0; } }
    setMode(m) { this.mode = m; }

    setLabel(text, kind) {
      if (this.label) { this.root.remove(this.label); this.label.material.dispose(); this.label = null; }
      if (!text) return;
      const styles = {
        name: { bg: 'rgba(18,53,91,0.9)', fg: '#FFFFFF', h: 0.36 },
        teacher: { bg: 'rgba(217,168,0,0.96)', fg: '#1B2F55', h: 0.4 },
        queue: { bg: 'rgba(242,155,47,0.96)', fg: '#1B2F55', h: 0.36 },
        viewer: { bg: 'rgba(18,53,91,0.7)', fg: '#FFFFFF', h: 0.3 },
      };
      const st = styles[kind || 'name'];
      this.label = ABT.makeLabel(text, st);
      this.label.position.y = this.teacher ? 2.17 : 2.0;
      this.root.add(this.label);
      this.labelKind = kind || 'name';
      this.applyLabelMode();
    }
    applyLabelMode() {
      if (!this.label) return;
      const m = ABT.labelMode || 'courts';
      let v = true;
      if (m === 'off') v = false;
      else if (m === 'courts') v = this.labelRole !== 'ambient' && this.labelRole !== 'viewer';
      this.label.visible = v;
    }

    /* ----- animação ----- */
    update(dt, time) {
      const r = this.root;
      // movimento
      this.moving = false;
      if (this.target) {
        const dx = this.target.x - r.position.x, dz = this.target.z - r.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.05) {
          const step = Math.min(d, this.speed * dt);
          r.position.x += (dx / d) * step; r.position.z += (dz / d) * step;
          this.moving = true;
          if (!this.lockYaw || d > 2.6) this.desiredYaw = Math.atan2(dx, dz);
          else if (this.faceAfter != null) this.desiredYaw = this.faceAfter;
        } else {
          this.target = null; this.arrived = true;
          if (this.faceAfter != null) this.desiredYaw = this.faceAfter;
        }
      }
      this.yaw += ABT.angDiff(this.yaw, this.desiredYaw) * (1 - Math.exp(-dt * 11));
      r.rotation.y = this.yaw;

      this._computePose(dt, time);

      // suavização + aplicação
      const c = this.cur, t = this.tgt;
      const rate = this.action && (this.action === 'hit' || this.action === 'serve') ? 30 : 15;
      const k = 1 - Math.exp(-rate * dt);
      for (let i = 0; i < JOINTS.length; i++) { const j = JOINTS[i]; c[j] += (t[j] - c[j]) * k; }
      this.body.position.y = c.bodyY;
      this.torso.rotation.set(c.torsoX, c.torsoY, c.torsoZ);
      this.head.rotation.set(c.headX, c.headY, 0);
      this.shL.rotation.set(c.lArmX, 0, c.lArmZ);
      this.shR.rotation.set(c.rArmX, 0, c.rArmZ);
      this.elL.rotation.x = c.lElb; this.elR.rotation.x = c.rElb;
      this.hipL.rotation.x = c.lHip; this.hipR.rotation.x = c.rHip;
      this.kneeL.rotation.x = c.lKnee; this.kneeR.rotation.x = c.rKnee;
      this.root.position.y = this.baseY;

      if (this.fx) {
        const s = 1 + Math.sin(time * 3) * 0.06;
        this.fx.ring.scale.setScalar(s);
        this.fx.ring.material.opacity = 0.7 + Math.sin(time * 3) * 0.22;
        this.fx.beacon.position.y = 2.5 + Math.sin(time * 2.6) * 0.08;
        this.fx.beacon.rotation.y = time * 1.8;
      }
    }

    _computePose(dt, time) {
      const T_ = this.tgt;
      for (let i = 0; i < JOINTS.length; i++) T_[JOINTS[i]] = 0;
      T_.lArmZ = 0.12; T_.rArmZ = -0.12; T_.lElb = -0.2; T_.rElb = -0.2;
      const t = time + this.phase;
      const breathe = Math.sin(t * 1.7) * 0.015;

      if (this.mode === 'sit') {
        T_.bodyY = -0.82;
        T_.lHip = T_.rHip = -1.5; T_.lKnee = T_.rKnee = 1.5;
        T_.torsoX = -0.04 + breathe;
        T_.lArmX = T_.rArmX = -0.5; T_.lElb = T_.rElb = -1.0; T_.lArmZ = 0.06; T_.rArmZ = -0.06;
        T_.headY = Math.sin(t * 0.5) * 0.35; T_.headX = Math.sin(t * 0.37) * 0.05;
      } else if (this.moving) {
        const run = this.speed > 3.4;
        this.walkPhase += dt * (run ? 11 : 4.2 + this.speed * 1.4);
        const ph = this.walkPhase;
        const A = run ? 0.95 : 0.5, K = run ? 1.45 : 0.75;
        const lh = Math.sin(ph) * A, rh = -Math.sin(ph) * A;
        T_.lHip = lh; T_.rHip = rh;
        T_.lKnee = K * Math.max(0, -Math.cos(ph)) + 0.08;
        T_.rKnee = K * Math.max(0, Math.cos(ph)) + 0.08;
        T_.lArmX = rh * 0.9; T_.rArmX = lh * 0.9 * (this.hasRacket ? 0.45 : 1);
        if (this.hasRacket) T_.rElb = -0.9; else T_.rElb = -0.35 - (run ? 0.6 : 0);
        T_.lElb = -0.35 - (run ? 0.7 : 0);
        T_.torsoX = run ? 0.2 : 0.05;
        T_.torsoY = Math.sin(ph) * 0.12;
        T_.bodyY = -Math.min(0.89 - legFoot(lh, T_.lKnee), 0.89 - legFoot(rh, T_.rKnee));
      } else if (this.mode === 'ready') {
        const bob = Math.sin(t * 5) * 0.06;
        T_.lHip = T_.rHip = -0.32 + bob; T_.lKnee = T_.rKnee = 0.7 - bob;
        T_.bodyY = -Math.min(0.89 - legFoot(T_.lHip, T_.lKnee), 0.89 - legFoot(T_.rHip, T_.rKnee));
        T_.torsoX = 0.2; T_.headX = -0.1;
        T_.rArmX = -0.65; T_.rElb = -1.0; T_.rArmZ = -0.3;
        T_.lArmX = -0.35; T_.lElb = -0.8; T_.lArmZ = 0.3;
        T_.headY = Math.sin(t * 0.9) * 0.15;
      } else {
        // parado
        T_.torsoX = breathe;
        T_.lArmX = Math.sin(t * 1.3) * 0.04; T_.rArmX = Math.cos(t * 1.1) * 0.04;
        T_.headY = Math.sin(t * 0.55) * 0.3; T_.headX = Math.sin(t * 0.4) * 0.04;
        T_.lHip = 0.03; T_.rHip = -0.03;
        T_.bodyY = 0;
      }

      if (this.action) this._actionPose(dt, T_);
    }

    _actionPose(dt, T_) {
      this.actionT += dt;
      const dur = ACTIONS[this.action];
      const u = this.actionT / dur;
      if (u >= 1) { this.action = null; return; }
      const e = ABT.ease;
      const seg = (a, b) => ABT.clamp((u - a) / (b - a), 0, 1);
      const legs = (h, k) => {
        T_.lHip = T_.rHip = h; T_.lKnee = T_.rKnee = k;
        T_.bodyY = -Math.min(0.89 - legFoot(h, k), 0.89 - legFoot(h, k));
      };
      switch (this.action) {
        case 'hit': { // devolução (forehand): preparação → batida → recuperação
          const a = e(seg(0, 0.3)), s = e(seg(0.3, 0.55)), f = e(seg(0.55, 1));
          const mix = (W, S, R) => a * W + s * (S - W) + f * (R - S);
          T_.rArmX = mix(0.55, -1.35, -0.2); T_.rArmZ = mix(-0.55, -0.1, -0.12); T_.rElb = mix(-1.2, -0.25, -0.3);
          T_.torsoY = mix(-0.75, 0.65, 0); T_.torsoX = mix(0.08, 0.22, 0.05);
          T_.lArmX = mix(-0.9, 0.3, 0); T_.lArmZ = mix(0.5, 0.7, 0.12);
          legs(mix(-0.32, -0.5, -0.1), mix(0.7, 0.9, 0.2));
          break;
        }
        case 'serve': { // saque por cima
          const a1 = e(seg(0, 0.35)), a2 = e(seg(0.35, 0.52)), s = e(seg(0.52, 0.64)), f = e(seg(0.64, 1));
          T_.lArmX = -3.0 * a1 * (1 - f) - 0.2 * f * 0; T_.lArmZ = 0.2 + 0.15 * a1;
          T_.rArmX = a1 * 0.3 + a2 * (-2.5 - 0.3) + s * (-3.05 + 2.5) + f * (-0.35 + 3.05);
          T_.rElb = -0.3 * a1 + a2 * (-2.3 + 0.3) + s * (-0.15 + 2.3) + f * (-0.4 + 0.15);
          T_.rArmZ = -0.2 - 0.3 * a2 * (1 - s) ;
          T_.torsoX = -0.2 * a1 * (1 - s) + 0.35 * s - 0.1 * f;
          T_.torsoY = -0.35 * a2 * (1 - s) + 0.25 * s * (1 - f);
          const bend = 0.55 * a1 * (1 - s);
          legs(-0.3 * (1 - s) * a1 - 0.0, 0.55 * a1 * (1 - s) + 0.05);
          T_.bodyY += s * (1 - f) * 0.06;
          break;
        }
        case 'cheer': {
          const w = Math.sin(this.actionT * 14) * 0.25;
          T_.lArmX = -2.75 + w; T_.rArmX = -2.75 - w; T_.lArmZ = 0.45; T_.rArmZ = -0.45;
          T_.lElb = -0.25; T_.rElb = -0.25; T_.headX = -0.2;
          const jump = Math.abs(Math.sin(this.actionT * 8.5)) * 0.2;
          legs(-0.1, 0.25);
          T_.bodyY += jump;
          break;
        }
        case 'clap': {
          const c = Math.sin(this.actionT * 15);
          T_.lArmX = T_.rArmX = -1.1; T_.lElb = T_.rElb = -1.5 + c * 0.2;
          T_.lArmZ = 0.18 - c * 0.12; T_.rArmZ = -0.18 + c * 0.12;
          break;
        }
        case 'wave': {
          T_.rArmX = -2.5; T_.rArmZ = -0.7; T_.rElb = -0.5 + Math.sin(this.actionT * 12) * 0.5;
          break;
        }
      }
    }
  }
  Boneco.CONTACT = { hit: 0.25, serve: 0.62 };
  Boneco.HIP_Y = HIP_Y;
  ABT.Boneco = Boneco;
})();
