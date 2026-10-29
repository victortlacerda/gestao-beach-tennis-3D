/* ============================================================
   A arena: chão, 4 quadras ITF (2x2), arquibancada, fachada com os ambientes
   (recepção/escritório, lojinha, lanchonete, vestiário, estoque), postes, árvores.
   Layout (vista de cima, câmera olhando de +Z):
        fundos     Quadra 1 | Quadra 2   [arquibancada à direita]
                   Quadra 3 | Quadra 4
        fachada    Recepção · portão · Lojinha · Lanchonete · Vestiário · Estoque
   ============================================================ */
(function () {
  const T = THREE;
  const G = ABT.G;
  const C = ABT.C;
  const P = C.palette;

  const WOOD = 0xB07A4A, WOOD_D = 0x8A5C36, CREAM = 0xFFF3DC, DARK = 0x2F3640, GREY = 0x8A929C, WHITE = 0xF4F7FA;
  const GREEN = [0x4FAE55, 0x5CBB5E, 0x3F9A4B, 0x6BC768];

  /* ---------- texturas de placas ---------- */
  function drawLock(x, cx, cy, s) {
    x.save(); x.translate(cx, cy); x.scale(s, s);
    x.strokeStyle = '#FFFFFF'; x.lineWidth = 11; x.lineCap = 'round';
    x.beginPath(); x.arc(0, -14, 24, Math.PI, 0); x.stroke();
    x.fillStyle = '#FFFFFF'; ABT.roundRect(x, -38, -14, 76, 62, 10); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.beginPath(); x.arc(0, 12, 8, 0, Math.PI * 2); x.fill(); x.fillRect(-3, 14, 6, 18);
    x.restore();
  }
  function signTex(title, sub, bg, lock) {
    return ABT.canvasTex(1024, 256, (x, w, h) => {
      x.fillStyle = ABT.hex(bg); x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(0, 0, w, 20);
      x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, h - 30, w, 30);
      x.fillStyle = '#FFFFFF'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const cx = w / 2 - (lock ? 70 : 0);
      x.font = `900 ${title.length > 10 ? 112 : 136}px ${ABT.FONT}`;
      x.fillText(title, cx, sub ? 100 : 118);
      if (sub) { x.font = `700 46px ${ABT.FONT}`; x.globalAlpha = 0.92; x.fillText(sub, cx, 190); x.globalAlpha = 1; }
      if (lock) drawLock(x, w - 120, 112, 1.05);
    });
  }
  function boardTex(w, h, draw) { return ABT.canvasTex(w, h, draw); }

  ABT.buildArena = function (scene, env) {
    const world = { areas: [], courts: [], seats: [], cafeSeats: [], anim: [], plaza: [], rooms: {} };
    const S = []; // peças estáticas (mescladas em uma malha só)
    const bx = (x, y, z, w, h, d, color, rx, ry, rz) => S.push(G.box(w, h, d, color, x, y, z, rx, ry, rz));
    const cy = (x, y, z, rt, rb, h, seg, color, rx, ry, rz) => S.push(G.cyl(rt, rb, h, seg, color, x, y, z, rx, ry, rz));
    const sp = (x, y, z, r, color, sx, sy, sz) => S.push(G.sph(r, 7, 5, color, x, y, z, sx, sy, sz));
    const ico = (x, y, z, r, color, sx, sy, sz) => S.push(G.ico(r, 0, color, x, y, z, sx, sy, sz));
    const plane = (w, h, mat, x, y, z, ry) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z); if (ry) m.rotation.y = ry;
      scene.add(m); return m;
    };
    const flat = (w, d, mat, x, y, z) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); return m;
    };

    // materiais que brilham à noite
    const lampMat = new T.MeshStandardMaterial({ color: 0xFFF6D8, flatShading: true, roughness: 0.6 });
    env.addGlow(lampMat, 0xFFE7A0, 2.4);
    const winMat = new T.MeshStandardMaterial({ color: 0xA9DDF2, flatShading: true, roughness: 0.3, metalness: 0.1 });
    env.addGlow(winMat, 0xFFD98A, 1.1);

    /* ================= chão ================= */
    const grass = new T.Mesh(new T.PlaneGeometry(900, 900), new T.MeshLambertMaterial({ map: ABT.grassTexture(260) }));
    grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);

    const pav = ABT.paverTexture(29);
    pav.repeat.set(29, 28);
    const platform = new T.Mesh(new T.BoxGeometry(58, 0.08, 56), new T.MeshLambertMaterial({ map: pav }));
    platform.position.set(2, 0, 9); platform.receiveShadow = true; scene.add(platform);
    // faixa de calçada mais escura nos corredores (caminhos)
    const pathMat = new T.MeshLambertMaterial({ color: 0xCDBFA2 });
    flat(4, 30, pathMat, 0, 0.045, 0.5);            // corredor central vertical
    flat(50, 4, pathMat, 2, 0.045, 0);              // corredor central horizontal
    flat(52, 5, pathMat, 2, 0.046, 16.5);           // calçada entre quadras e fachada
    flat(4.2, 8, pathMat, -9, 0.046, 22.5);         // passagem do portão
    flat(56, 8, pathMat, 2, 0.046, 31);             // calçada da frente

    /* ================= quadras ================= */
    const sandTex = ABT.sandTexture(10, 6);
    const sandMat = new T.MeshLambertMaterial({ map: sandTex });
    const lineCol = 0x2468B0;
    const netTex = ABT.netTexture(); netTex.repeat.set(2.7, 1);
    const netMat = new T.MeshBasicMaterial({ map: netTex, transparent: true, side: T.DoubleSide, depthWrite: false, alphaTest: 0.08 });
    const PH = C.court.padH;

    C.courts.forEach((c, idx) => {
      const { cx, cz } = c;
      const sand = new T.Mesh(new T.BoxGeometry(C.court.padL, PH, C.court.padW), sandMat);
      sand.position.set(cx, PH / 2, cz); sand.receiveShadow = true; scene.add(sand);
      // moldura de madeira
      bx(cx, 0.12, cz - 6.1, 20.5, 0.24, 0.26, WOOD); bx(cx, 0.12, cz + 6.1, 20.5, 0.24, 0.26, WOOD);
      bx(cx - 10.12, 0.12, cz, 0.26, 0.24, 12, WOOD); bx(cx + 10.12, 0.12, cz, 0.26, 0.24, 12, WOOD);
      // faixa luminosa na cor do status
      const edgeMat = new T.MeshStandardMaterial({ color: 0x2E9E5B, emissive: 0x2E9E5B, emissiveIntensity: 0.4, flatShading: true });
      [[0, -6.1, 20.5, 0.14], [0, 6.1, 20.5, 0.14]].forEach(([dx, dz, w, d]) => {
        const m = new T.Mesh(new T.BoxGeometry(w, 0.03, d), edgeMat); m.position.set(cx + dx, 0.255, cz + dz); scene.add(m);
      });
      [[-10.12, 0], [10.12, 0]].forEach(([dx]) => {
        const m = new T.Mesh(new T.BoxGeometry(0.14, 0.03, 12), edgeMat); m.position.set(cx + dx, 0.255, cz); scene.add(m);
      });
      // linhas oficiais 16 x 8 m
      const y = PH + 0.006;
      bx(cx, y, cz - 4, 16.07, 0.012, 0.07, lineCol); bx(cx, y, cz + 4, 16.07, 0.012, 0.07, lineCol);
      bx(cx - 8, y, cz, 0.07, 0.012, 8.07, lineCol); bx(cx + 8, y, cz, 0.07, 0.012, 8.07, lineCol);
      // rede (1,70 m) — postes, faixa superior e malha
      [-4.3, 4.3].forEach((dz) => {
        cy(cx, PH + 1.0, cz + dz, 0.06, 0.06, 2.0, 8, DARK);
        bx(cx, PH + 0.05, cz + dz, 0.34, 0.1, 0.34, DARK);
      });
      bx(cx, PH + C.court.netH - 0.04, cz, 0.05, 0.08, 8.6, WHITE);
      bx(cx, PH + 0.86, cz, 0.04, 0.05, 8.6, WHITE);
      const net = plane(8.5, 0.78, netMat, cx, PH + C.court.netH - 0.47, cz, Math.PI / 2);
      // número da quadra pintado na areia
      const numTex = ABT.canvasTex(256, 256, (x, w, h) => {
        x.clearRect(0, 0, w, h); x.fillStyle = 'rgba(36,104,176,0.62)'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.font = `900 210px ${ABT.FONT}`; x.fillText(String(c.id), w / 2, h / 2 + 8);
      });
      const numMat = new T.MeshBasicMaterial({ map: numTex, transparent: true, depthWrite: false });
      flat(1.7, 1.7, numMat, cx - 9.05, PH + 0.012, cz); flat(1.7, 1.7, numMat, cx + 9.05, PH + 0.012, cz);
      // brilho verde quando a quadra está livre
      const freeGlow = flat(16, 8, new T.MeshBasicMaterial({ color: 0x2E9E5B, transparent: true, opacity: 0.07, depthWrite: false }), cx, PH + 0.02, cz);
      // banco, bebedouro, cesto de bolinhas
      bx(cx - 5.5, PH + 0.42, cz - 5.15, 1.9, 0.08, 0.42, WOOD); bx(cx - 6.2, PH + 0.2, cz - 5.15, 0.1, 0.4, 0.36, DARK); bx(cx - 4.8, PH + 0.2, cz - 5.15, 0.1, 0.4, 0.36, DARK);
      bx(cx + 5.8, PH + 0.45, cz - 5.15, 0.42, 0.9, 0.42, 0x4BA3E3); cy(cx + 5.8, PH + 0.95, cz - 5.15, 0.18, 0.18, 0.1, 8, 0xCFEAFF);
      cy(cx + 8.9, PH + 0.3, cz + 5.1, 0.26, 0.2, 0.5, 8, 0x3A424C);
      for (let i = 0; i < 7; i++) sp(cx + 8.9 + Math.cos(i * 1.4) * 0.12, PH + 0.58 + (i % 3) * 0.03, cz + 5.1 + Math.sin(i * 1.4) * 0.12, 0.07, 0xFF9F1C);

      world.courts.push({
        id: c.id, cx, cz, edgeMat, freeGlow, net,
        bannerPos: new T.Vector3(cx, 6.4, cz),
        surface: PH,
      });
    });

    /* ================= postes de iluminação ================= */
    const poles = [[-23.2, -8], [-23.2, 8], [0, -8], [0, 8], [-12, -15.2], [12, -15.2], [0, 14.6], [-23.2, 20], [28.2, 20]];
    poles.forEach(([px, pz]) => {
      cy(px, 4.5, pz, 0.1, 0.14, 9, 8, 0x59626E);
      bx(px, 9.05, pz, 2.1, 0.12, 0.12, 0x59626E);
      [-0.85, 0.85].forEach((o) => {
        const m = new T.Mesh(new T.BoxGeometry(0.62, 0.2, 0.42), lampMat);
        m.position.set(px + o, 8.88, pz); scene.add(m);
      });
    });

    /* ================= arquibancada (lateral direita, toda a extensão) ================= */
    const B = C.bleacher;
    const bw = B.z1 - B.z0;
    for (let i = 0; i < B.rows; i++) {
      const h = B.rowH * (i + 1);
      const xc = B.x0 + B.rowD * i + B.rowD / 2;
      bx(xc, h / 2, (B.z0 + B.z1) / 2, B.rowD, h, bw, i % 2 ? 0x2A5E8C : 0x1E4D78);
      for (let s = 0; s < 14; s++) {
        bx(xc - 0.06, h + 0.02, B.z0 + 1 + s * 2, B.rowD - 0.12, 0.04, 1.9, s % 2 ? P.turquoise : WHITE);
      }
      for (let k = 0; k < 22; k++) {
        world.seats.push({ x: xc - 0.12, y: h + 0.04, z: B.z0 + 1.3 + k * 1.2, row: i, idx: k });
      }
    }
    const xb = B.x0 + B.rowD * B.rows;
    bx(xb + 0.05, B.rowH * B.rows + 0.55, (B.z0 + B.z1) / 2, 0.1, 1.1, bw, GREY);          // guarda-corpo do fundo
    bx(B.x0 - 0.05, 0.6, (B.z0 + B.z1) / 2, 0.08, 0.1, bw, WHITE);
    [B.z0, B.z1].forEach((z) => bx((B.x0 + xb) / 2, B.rowH * B.rows * 0.5 + 0.25, z, xb - B.x0, B.rowH * B.rows + 0.5, 0.1, GREY));
    // placa de entrada da arquibancada
    cy(B.x0 - 0.8, 1.2, B.z1 + 1.2, 0.05, 0.05, 2.4, 6, DARK);

    /* ================= fachada: ambientes ================= */
    const FZ0 = C.facade.z0, FZ1 = C.facade.z1, WH = 3.4;
    const czr = (FZ0 + FZ1) / 2, dd = FZ1 - FZ0;
    const lockedColor = 0xB23A48;

    function room(r) {
      const w = r.x1 - r.x0, cxr = (r.x0 + r.x1) / 2;
      bx(cxr, 0.06, czr, w, 0.12, dd, r.floor);                                // piso
      bx(cxr, WH / 2, FZ0 + 0.125, w, WH, 0.25, r.wall);                        // parede do fundo
      bx(r.x0 + 0.125, WH / 2, czr, 0.25, WH, dd, r.wall);                      // laterais
      bx(r.x1 - 0.125, WH / 2, czr, 0.25, WH, dd, r.wall);
      bx(cxr, WH - 0.3, FZ0 + 0.28, w - 0.5, 0.3, 0.06, r.trim);                // faixa de cor
      bx(cxr, 0.3, FZ0 + 0.27, w - 0.5, 0.36, 0.05, ABT.shade(r.wall, 0.82));   // rodapé
      const gap = 2.0, seg = (w - gap) / 2;                                      // mureta frontal com porta
      bx(r.x0 + seg / 2, 0.5, FZ1 - 0.15, seg, 1.0, 0.26, r.trim);
      bx(r.x1 - seg / 2, 0.5, FZ1 - 0.15, seg, 1.0, 0.26, r.trim);
      bx(r.x0 + 0.2, WH / 2, FZ1 - 0.2, 0.4, WH, 0.4, ABT.shade(r.wall, 0.95));  // pilares
      bx(r.x1 - 0.2, WH / 2, FZ1 - 0.2, 0.4, WH, 0.4, ABT.shade(r.wall, 0.95));
      bx(cxr, 3.5, FZ1 - 0.15, w, 1.0, 0.32, r.trim);                            // viga da placa
      const sign = plane(3.6, 0.9, new T.MeshBasicMaterial({ map: signTex(r.title, r.sub, r.signBg || r.trim, r.restricted), toneMapped: false }), cxr, 3.5, FZ1 + 0.02);
      // luminária interna
      const lamp = new T.Mesh(new T.BoxGeometry(Math.min(w - 1.2, 3.4), 0.08, 0.34), lampMat);
      lamp.position.set(cxr, WH - 0.12, czr); scene.add(lamp);
      const pl = new T.PointLight(0xFFE2B0, 0, 15, 1.6);
      pl.position.set(cxr, 2.9, czr + 0.6); scene.add(pl);
      env.addNightLight(pl, 14);
      world.rooms[r.id] = { cx: cxr, w, x0: r.x0, x1: r.x1 };
      world.areas.push({
        id: r.id, name: r.name, kind: 'room', restricted: !!r.restricted, group: r.group || null,
        box: { x0: r.x0, x1: r.x1, z0: FZ0, z1: FZ1 + 0.3, h: 4.1 },
        focus: { tx: cxr, ty: 1.4, tz: czr + 1, r: 12 + w * 0.95, az: 0, el: 0.62 },
      });
      return { cxr, w };
    }

    function racketDeco(x, y, z, color, tilt) {
      S.push(G.geo(new T.CylinderGeometry(0.14, 0.14, 0.04, 12), 0x23262B, x, y + 0.2, z, Math.PI / 2, 0, tilt || 0, 1, 1, 1.3));
      S.push(G.geo(new T.CylinderGeometry(0.115, 0.115, 0.05, 12), color, x, y + 0.2, z, Math.PI / 2, 0, tilt || 0, 1, 1, 1.3));
      cy(x, y - 0.12, z, 0.02, 0.02, 0.22, 6, 0x222831);
    }
    function tube(x, y, z, color) { cy(x, y, z, 0.045, 0.045, 0.24, 8, color); cy(x, y + 0.13, z, 0.048, 0.048, 0.02, 8, 0x23262B); }
    function plant(x, z, s) {
      cy(x, 0.12 + 0.2 * s, z, 0.2 * s, 0.15 * s, 0.4 * s, 7, 0xC7704A);
      ico(x, 0.12 + 0.7 * s, z, 0.34 * s, GREEN[0], 1, 1.2, 1); ico(x + 0.18 * s, 0.12 + 0.95 * s, z, 0.24 * s, GREEN[1], 1, 1.1, 1);
    }

    /* ---- Recepção / Escritório ---- */
    {
      const { cxr } = room({ id: 'recepcao', name: 'Recepção / Escritório', title: 'RECEPÇÃO', sub: 'Escritório · Alunos', x0: -21, x1: -11, wall: CREAM, trim: P.turquoise, floor: 0xD8C7A2, restricted: true, group: 'Escritório' });
      // balcão em L
      bx(-17.4, 0.62, 23.3, 4.6, 1.0, 0.8, P.turquoise); bx(-17.4, 1.14, 23.3, 4.8, 0.08, 1.0, WHITE);
      bx(-14.9, 0.62, 22.2, 0.8, 1.0, 2.2, P.turquoise); bx(-14.9, 1.14, 22.2, 1.0, 0.08, 2.4, WHITE);
      bx(-18.2, 1.55, 23.2, 0.8, 0.5, 0.06, 0x20262E); bx(-18.2, 1.28, 23.2, 0.14, 0.2, 0.14, 0x20262E);
      bx(-17.1, 1.19, 23.55, 0.55, 0.03, 0.2, 0x39414D);
      const scr = plane(0.7, 0.4, new T.MeshBasicMaterial({ color: 0x7FE3E0 }), -18.2, 1.55, 23.17);
      // mesa de escritório com cadeiras
      bx(-12.4, 0.75, 21.6, 1.7, 0.08, 0.9, WOOD); bx(-13.1, 0.38, 21.6, 0.08, 0.76, 0.8, WOOD_D); bx(-11.7, 0.38, 21.6, 0.08, 0.76, 0.8, WOOD_D);
      bx(-12.4, 1.15, 21.35, 0.55, 0.38, 0.05, 0x20262E);
      bx(-12.4, 0.5, 22.5, 0.5, 0.08, 0.5, 0x39414D); bx(-12.4, 0.8, 22.72, 0.5, 0.55, 0.08, 0x39414D);
      // arquivos e prateleira
      for (let i = 0; i < 3; i++) { bx(-20.4 + i * 0.75, 1.0, 19.75, 0.7, 1.8, 0.5, i % 2 ? 0x9AA5B1 : 0xB7C0CA); bx(-20.4 + i * 0.75, 0.7, 20.02, 0.5, 0.03, 0.04, 0x39414D); bx(-20.4 + i * 0.75, 1.3, 20.02, 0.5, 0.03, 0.04, 0x39414D); }
      // troféus
      bx(-19.4, 2.4, 19.55, 2.2, 0.06, 0.3, WOOD);
      for (let i = 0; i < 3; i++) { cy(-20.1 + i * 0.7, 2.62, 19.55, 0.09, 0.05, 0.3, 8, 0xE7B923); sp(-20.1 + i * 0.7, 2.82, 19.55, 0.1, 0xE7B923); }
      plant(-20.4, 24.4, 1); plant(-11.5, 24.5, 0.8);
      // quadro de agenda (exemplo)
      const agenda = boardTex(512, 256, (x, w, h) => {
        x.fillStyle = '#FFFDF6'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#12355B'; x.fillRect(0, 0, w, 44);
        x.fillStyle = '#fff'; x.font = `800 28px ${ABT.FONT}`; x.textBaseline = 'middle'; x.fillText('AGENDA DA SEMANA (exemplo)', 14, 23);
        const cols = [0x2E9E5B, 0x7A4FD1, 0x2F7DE1, 0xF29B2F, 0xD9A800, 0x8A8F98], r = ABT.rng(4);
        for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) {
          x.fillStyle = ABT.hex(cols[Math.floor(r() * cols.length)]);
          x.fillRect(16 + i * 70, 58 + j * 48, 62, 40);
        }
      });
      plane(3.0, 1.5, new T.MeshBasicMaterial({ map: agenda }), -16.4, 1.95, 19.4);
    }

    /* ---- Lojinha ---- */
    {
      const { cxr } = room({ id: 'lojinha', name: 'Lojinha', title: 'LOJINHA', sub: 'Raquetes · Bolas · Moda', x0: -7, x1: 1, wall: 0xFFF0E8, trim: P.coral, floor: 0xE6CFA8, group: 'Convivência' });
      // estantes ao fundo com produtos
      for (let u = 0; u < 3; u++) {
        const ux = -5.8 + u * 2.5;
        bx(ux, 1.4, 19.65, 2.2, 2.4, 0.4, WHITE);
        for (let l = 0; l < 3; l++) {
          bx(ux, 0.62 + l * 0.82, 19.9, 2.1, 0.05, 0.38, GREY);
          for (let k = 0; k < 4; k++) {
            const cc = [P.turquoise, P.coral, 0xF4C531, P.navy][(u + l + k) % 4];
            if ((l + u) % 2) tube(ux - 0.75 + k * 0.5, 0.78 + l * 0.82, 19.95, [0xF4E04D, 0xFF9F1C][k % 2]);
            else bx(ux - 0.75 + k * 0.5, 0.78 + l * 0.82, 19.95, 0.36, 0.3, 0.28, cc);
          }
        }
      }
      // raquetes penduradas
      [P.coral, P.turquoise, P.navy, 0xF4C531, P.coral].forEach((c, i) => racketDeco(-6.4 + i * 0.75, 2.2, 19.95, c));
      // mesa de exposição central
      bx(-3.4, 0.55, 22.2, 2.4, 0.08, 1.2, WOOD); bx(-4.3, 0.28, 22.2, 0.1, 0.5, 1.0, WOOD_D); bx(-2.5, 0.28, 22.2, 0.1, 0.5, 1.0, WOOD_D);
      for (let i = 0; i < 4; i++) bx(-4.1 + i * 0.55, 0.65, 22.0, 0.45, 0.1 + (i % 2) * 0.04, 0.4, [P.turquoise, P.coral, WHITE, 0xF4C531][i]);
      for (let i = 0; i < 5; i++) sp(-4.1 + i * 0.4, 0.68, 22.5, 0.07, 0xFF9F1C);
      // balcão com caixa
      bx(-0.2, 0.55, 22.6, 1.0, 1.0, 3.2, P.coral); bx(-0.2, 1.07, 22.6, 1.2, 0.07, 3.4, WHITE);
      bx(-0.2, 1.25, 22.0, 0.45, 0.32, 0.4, 0x20262E);
      // arara de roupas
      cy(-5.2, 1.0, 23.0, 0.03, 0.03, 1.8, 6, GREY); bx(-5.2, 1.8, 23.0, 1.4, 0.04, 0.04, GREY); bx(-5.2, 0.12, 23.0, 1.4, 0.05, 0.05, GREY);
      for (let i = 0; i < 5; i++) bx(-5.8 + i * 0.28, 1.45, 23.0, 0.08, 0.6, 0.36, [P.turquoise, P.coral, 0xF4C531, WHITE, P.navy][i]);
    }

    /* ---- Lanchonete ---- */
    const smoke = [];
    {
      room({ id: 'lanchonete', name: 'Lanchonete', title: 'LANCHONETE', sub: 'Lanches · Bebidas · Churrasquinho', x0: 1, x1: 11, wall: 0xFFF6DA, trim: 0xE8862C, floor: 0xD9C39B, group: 'Convivência' });
      // bancada do fundo + chapa/churrasqueira
      bx(6.2, 0.55, 20.3, 8.2, 1.1, 0.8, WHITE); bx(6.2, 1.12, 20.3, 8.4, 0.06, 0.9, 0x39414D);
      bx(3.4, 1.35, 20.3, 1.8, 0.5, 0.7, 0x23262B);
      const ember = plane(1.5, 0.5, new T.MeshBasicMaterial({ color: 0xFF5A1F }), 3.4, 1.62, 20.66); ember.rotation.x = -Math.PI / 2; ember.position.set(3.4, 1.6, 20.3); ember.scale.set(1, 1, 1);
      for (let i = 0; i < 7; i++) cy(3.4 - 0.65 + i * 0.22, 1.66, 20.3, 0.018, 0.018, 0.5, 5, i % 2 ? 0x8B3A2B : 0xC95A3B, 0, 0, Math.PI / 2, Math.PI / 2);
      // geladeira
      bx(9.8, 1.15, 20.2, 1.0, 2.2, 0.8, 0xDCEBF4); bx(9.8, 1.2, 20.62, 0.8, 1.8, 0.04, 0x8EC9EA);
      for (let i = 0; i < 4; i++) bx(9.8, 0.55 + i * 0.5, 20.5, 0.7, 0.28, 0.1, [P.coral, 0xF4C531, P.turquoise, P.coral][i]);
      // cardápio (exemplo)
      const menu = boardTex(512, 256, (x, w, h) => {
        x.fillStyle = '#23303F'; x.fillRect(0, 0, w, h);
        x.strokeStyle = '#E8862C'; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16);
        x.fillStyle = '#FFFFFF'; x.textBaseline = 'middle'; x.font = `800 34px ${ABT.FONT}`; x.fillText('CARDÁPIO', 28, 44);
        x.font = `700 26px ${ABT.FONT}`;
        x.fillStyle = '#FFD27A'; x.fillText('Lanches', 28, 98); x.fillText('Bebidas', 28, 148); x.fillText('Churrasquinho', 28, 198);
        x.fillStyle = '#9FB3C4'; x.font = `600 22px ${ABT.FONT}`; x.fillText('preços e disponibilidade (exemplo)', 190, 44);
        x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 2; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(250, 98 + i * 50); x.lineTo(470, 98 + i * 50); x.stroke(); }
      });
      plane(3.2, 1.6, new T.MeshBasicMaterial({ map: menu }), 6.2, 2.2, 19.4);
      // balcão de atendimento
      bx(6.2, 0.55, 23.3, 8.2, 1.0, 0.8, 0xE8862C); bx(6.2, 1.07, 23.3, 8.5, 0.07, 1.0, WHITE);
      for (let i = 0; i < 4; i++) { bx(3.4 + i * 1.8, 1.2, 23.3, 0.3, 0.3, 0.3, [P.coral, 0xF4C531, P.turquoise, WHITE][i]); }
      // pendentes
      for (let i = 0; i < 4; i++) { cy(2.5 + i * 2.4, 3.0, 22.4, 0.01, 0.01, 0.6, 4, DARK); const m = new T.Mesh(new T.ConeGeometry(0.28, 0.24, 8), lampMat); m.position.set(2.5 + i * 2.4, 2.65, 22.4); scene.add(m); }
      // fumaça animada
      const smokeMat = new T.MeshBasicMaterial({ color: 0xD9DEE4, transparent: true, opacity: 0.5, depthWrite: false });
      for (let i = 0; i < 5; i++) {
        const m = new T.Mesh(new T.IcosahedronGeometry(0.22, 0), smokeMat.clone());
        m.userData.off = i / 5; scene.add(m); smoke.push(m);
      }
      world.anim.push((dt, t) => {
        smoke.forEach((m) => {
          const u = (t * 0.28 + m.userData.off) % 1;
          m.position.set(3.4 + Math.sin(u * 6 + m.userData.off * 9) * 0.25, 1.9 + u * 1.5, 20.3);
          m.scale.setScalar(0.5 + u * 1.3); m.material.opacity = 0.5 * (1 - u);
        });
      });
    }

    /* ---- Vestiário (somente Organização) ---- */
    {
      room({ id: 'vestiario', name: 'Vestiário', title: 'VESTIÁRIO', sub: 'Somente Organização', x0: 11, x1: 17, wall: 0xEAF4F7, trim: 0x2F7DE1, floor: 0xBBD3DC, restricted: true });
      for (let i = 0; i < 6; i++) {
        const lx = 11.8 + i * 0.85;
        bx(lx, 1.1, 19.7, 0.8, 2.0, 0.45, i % 2 ? 0x2F7DE1 : 0x1F5FB8);
        bx(lx, 1.7, 19.94, 0.5, 0.05, 0.02, 0x0E2A52); bx(lx, 1.55, 19.94, 0.5, 0.05, 0.02, 0x0E2A52);
        sp(lx + 0.25, 1.1, 19.95, 0.035, 0xE7B923);
      }
      bx(14.2, 0.45, 22.3, 3.4, 0.1, 0.5, WOOD); bx(12.8, 0.22, 22.3, 0.1, 0.44, 0.4, WOOD_D); bx(15.6, 0.22, 22.3, 0.1, 0.44, 0.4, WOOD_D);
      for (let i = 0; i < 3; i++) bx(13.2 + i * 0.5, 0.58, 22.3, 0.4, 0.14, 0.3, [P.turquoise, P.coral, WHITE][i]);
      // chuveiros
      bx(16.4, 1.6, 21.0, 0.05, 3.0, 2.6, 0xBFE3F2); cy(16.1, 2.5, 20.1, 0.03, 0.03, 0.8, 6, GREY); cy(16.1, 2.95, 20.1, 0.16, 0.12, 0.05, 8, GREY);
      // cadeado 3D na entrada
      bx(14, 0.5, 25.5, 0.9, 0.7, 0.14, lockedColor); S.push(G.geo(new T.TorusGeometry(0.22, 0.05, 6, 10, Math.PI), 0xE7B923, 14, 1.0, 25.5, 0, 0, 0));
    }

    /* ---- Estoque (somente Organização) ---- */
    {
      room({ id: 'estoque', name: 'Estoque', title: 'ESTOQUE', sub: 'Bolinhas · Raquetes', x0: 17, x1: 21, wall: 0xF2EFE6, trim: 0x6A7685, floor: 0xCFC6B2, restricted: true });
      for (let l = 0; l < 4; l++) {
        bx(19.0, 0.55 + l * 0.7, 19.7, 3.6, 0.05, 0.5, GREY);
        for (let k = 0; k < 8; k++) tube(17.7 + k * 0.44, 0.7 + l * 0.7, 19.75, k % 2 ? 0xF4E04D : 0xFF9F1C);
      }
      bx(17.5, 1.1, 19.7, 0.06, 2.4, 0.5, GREY); bx(20.5, 1.1, 19.7, 0.06, 2.4, 0.5, GREY);
      [P.coral, P.turquoise, P.navy, 0xF4C531, P.coral, P.turquoise].forEach((c, i) => racketDeco(17.9 + i * 0.5, 0.55, 22.4, c, 0.1));
      bx(19.0, 0.45, 22.8, 3.2, 0.06, 0.5, WOOD); bx(19.0, 0.2, 22.8, 3.0, 0.3, 0.4, WOOD_D);
      bx(18.2, 0.5, 24.0, 0.8, 0.6, 0.8, 0xC49A6C); bx(19.2, 0.5, 24.0, 0.8, 0.6, 0.8, 0xB8895C); bx(18.7, 1.05, 24.0, 0.8, 0.5, 0.8, 0xC49A6C);
      const inv = boardTex(256, 128, (x, w, h) => {
        x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h); x.fillStyle = '#12355B'; x.fillRect(0, 0, w, 32);
        x.fillStyle = '#fff'; x.font = `800 20px ${ABT.FONT}`; x.textBaseline = 'middle'; x.fillText('INVENTÁRIO (exemplo)', 10, 17);
        x.fillStyle = '#12355B'; x.font = `800 26px ${ABT.FONT}`; x.fillText('Bolinhas  120', 12, 62); x.fillText('Raquetes   24', 12, 98);
      });
      plane(1.3, 0.65, new T.MeshBasicMaterial({ map: inv }), 20.5, 1.9, 21.5, -Math.PI / 2);
    }

    /* ---- portão de entrada entre Recepção e Lojinha ---- */
    {
      bx(-10.8, 2.3, 26.4, 0.42, 4.6, 0.42, P.turquoise); bx(-7.2, 2.3, 26.4, 0.42, 4.6, 0.42, P.turquoise);
      bx(-9, 4.6, 26.4, 4.2, 1.5, 0.34, P.navy);
      const arch = ABT.canvasTex(1024, 256, (x, w, h) => {
        x.fillStyle = '#12355B'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#1FB5B0'; x.fillRect(0, h - 22, w, 22); x.fillStyle = '#FF6B57'; x.fillRect(0, h - 22, w * 0.33, 22);
        x.fillStyle = '#FFF9EE'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.font = `900 100px ${ABT.FONT}`; x.fillText('ARENA BEACH', w / 2, 82); x.fillText('TENNIS', w / 2, 178);
      });
      plane(3.9, 0.98, new T.MeshBasicMaterial({ map: arch, toneMapped: false }), -9, 4.6, 26.6);
      plane(3.9, 0.98, new T.MeshBasicMaterial({ map: arch, toneMapped: false }), -9, 4.6, 26.2, Math.PI);
      sp(-9, 5.55, 26.4, 0.3, 0xFF9F1C);
    }

    /* ---- mesas e guarda-sóis em frente à Lanchonete ---- */
    [[3.2, 29.2, P.coral], [6.4, 30.4, P.turquoise], [9.4, 29.0, 0xF4C531], [-2.0, 29.6, P.turquoise]].forEach(([tx, tz, uc]) => {
      cy(tx, 0.72, tz, 0.62, 0.62, 0.07, 10, WHITE); cy(tx, 0.36, tz, 0.06, 0.06, 0.7, 6, DARK); cy(tx, 0.04, tz, 0.3, 0.3, 0.07, 8, DARK);
      cy(tx, 1.7, tz, 0.035, 0.035, 3.0, 6, GREY);
      S.push(G.cone(1.75, 0.65, 8, uc, tx, 3.1, tz));
      S.push(G.cone(1.76, 0.2, 8, WHITE, tx, 2.84, tz));
      [[0.95, 0], [-0.95, 0], [0, 0.95], [0, -0.95]].forEach(([ox, oz], i) => {
        bx(tx + ox, 0.32, tz + oz, 0.42, 0.06, 0.42, WOOD); bx(tx + ox, 0.16, tz + oz, 0.34, 0.3, 0.34, WOOD_D);
        const yaw = Math.atan2(-ox, -oz);
        world.cafeSeats.push({ x: tx + ox * 1.0, y: 0.04 + 0.0, z: tz + oz * 1.0, yaw, seatY: 0.37 });
      });
    });

    /* ---- decoração da calçada: jardineiras, bandeiras, bancos ---- */
    for (let i = 0; i < 9; i++) {
      const px = -20 + i * 5.2;
      if (px > -11.5 && px < -6.5) continue;
      bx(px, 0.32, 27.2, 1.8, 0.5, 0.6, WOOD_D);
      ico(px - 0.35, 0.78, 27.2, 0.3, GREEN[i % 4], 1, 1.1, 1); ico(px + 0.3, 0.74, 27.2, 0.26, GREEN[(i + 1) % 4], 1, 1, 1);
    }
    const flagMeshes = [];
    [-24, -20, 15, 19, 23, 27].forEach((fx, i) => {
      cy(fx, 2.0, 33.2, 0.04, 0.04, 4.0, 6, GREY);
      const f = new T.Mesh(new T.PlaneGeometry(0.7, 2.0), ABT.mat([P.turquoise, P.coral, 0xF4C531][i % 3], { side: T.DoubleSide }));
      f.position.set(fx + 0.38, 2.9, 33.2); f.userData.ph = i; scene.add(f); flagMeshes.push(f);
    });
    world.anim.push((dt, t) => flagMeshes.forEach((f) => { f.rotation.y = Math.sin(t * 2 + f.userData.ph) * 0.28; f.rotation.z = Math.sin(t * 1.4 + f.userData.ph) * 0.05; }));
    [[-15.5, 29.5], [12.5, 33], [26, 29]].forEach(([bxp, bz]) => {
      bx(bxp, 0.5, bz, 2.0, 0.08, 0.5, WOOD); bx(bxp - 0.8, 0.25, bz, 0.1, 0.5, 0.42, DARK); bx(bxp + 0.8, 0.25, bz, 0.1, 0.5, 0.42, DARK); bx(bxp, 0.85, bz - 0.22, 2.0, 0.4, 0.06, WOOD);
    });
    cy(-6.2, 0.5, 28.2, 0.28, 0.24, 0.9, 8, 0x4C5A68);

    /* ================= vegetação ================= */
    function palm(x, z, s, rot) {
      s = s || 1;
      for (let i = 0; i < 5; i++) {
        const bend = i * 0.05 * s;
        S.push(G.cyl(0.2 * s - i * 0.02, 0.24 * s - i * 0.02, 1.1 * s, 6, i % 2 ? 0x9B7048 : 0x8A6240, x + bend * Math.cos(rot || 0), 0.55 * s + i * 1.05 * s, z + bend * Math.sin(rot || 0)));
      }
      const top = 5.3 * s, cx0 = x + 0.25 * s * Math.cos(rot || 0), cz0 = z + 0.25 * s * Math.sin(rot || 0);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + (rot || 0);
        const dir = new T.Vector3(Math.cos(a), -0.35 - (i % 2) * 0.25, Math.sin(a)).normalize();
        const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
        const m = new T.Matrix4().compose(new T.Vector3(cx0 + dir.x * 1.2 * s, top + dir.y * 1.2 * s, cz0 + dir.z * 1.2 * s), q, new T.Vector3(1, 1, 0.22));
        S.push({ g: new T.ConeGeometry(0.42 * s, 2.5 * s, 4), color: GREEN[i % 3], m });
      }
      sp(cx0, top - 0.1 * s, cz0, 0.22 * s, 0x7B5A36);
    }
    function tree(x, z, s) {
      s = s || 1;
      cy(x, 1.0 * s, z, 0.2 * s, 0.28 * s, 2.0 * s, 6, WOOD_D);
      ico(x, 3.1 * s, z, 1.7 * s, GREEN[(Math.abs(Math.floor(x + z))) % 4], 1, 0.9, 1);
      ico(x + 0.9 * s, 2.7 * s, z + 0.4 * s, 1.1 * s, GREEN[(Math.abs(Math.floor(x * 2 + z))) % 4], 1, 0.9, 1);
      ico(x - 0.8 * s, 2.8 * s, z - 0.3 * s, 1.0 * s, GREEN[(Math.abs(Math.floor(x - z))) % 4], 1, 0.9, 1);
    }
    function hedge(x, z, w, d, h) { bx(x, h / 2, z, w, h, d, 0x3F9A4B); bx(x, h + 0.1, z, w - 0.2, 0.25, d - 0.2, 0x4FAE55); }

    [[-25, -12], [-25, 0], [-25, 14], [-25, 33], [29.6, -17], [-6, -17.8], [6, -17.8], [-18, -17.8], [18, -17.8], [30, 32], [-30, 30], [32, 4]].forEach(([x, z], i) => palm(x, z, 0.9 + (i % 3) * 0.1, i));
    [[-28, -6], [-28, 8], [32.5, -10], [33, 12], [-4, -20], [4, -21], [-16, -21], [16, -21], [-30, 20]].forEach(([x, z], i) => tree(x, z, 1 + (i % 3) * 0.15));
    hedge(2, -19.1, 58, 0.8, 0.9); hedge(-27.4, -4, 0.8, 30, 0.9); hedge(31.4, -2, 0.8, 34, 0.9);
    // cerca de vegetação nas laterais da fachada
    hedge(-27.4, 28, 0.8, 18, 0.9);
    // floresta distante e morros
    const fr = ABT.rng(99);
    for (let i = 0; i < 90; i++) {
      const a = fr() * Math.PI * 2, rr = 85 + fr() * 120;
      const x = 2 + Math.cos(a) * rr, z = 9 + Math.sin(a) * rr;
      if (z > 60 && Math.abs(x) < 25) continue;
      tree(x, z, 1.4 + fr() * 1.5);
    }
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, rr = 230 + fr() * 40;
      ico(Math.cos(a) * rr, 0, Math.sin(a) * rr, 55 + fr() * 35, [0x6FBF73, 0x5DAE68, 0x7BC47F][i % 3], 1.5, 0.6, 1.3);
    }

    /* ================= malha estática ================= */
    const mesh = new T.Mesh(G.merge(S), ABT.vcMat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    world.staticMesh = mesh;

    /* ================= áreas clicáveis ================= */
    C.courts.forEach((c) => {
      world.areas.unshift({
        id: 'quadra' + c.id, name: 'Quadra ' + c.id, kind: 'court', courtId: c.id,
        box: { x0: c.cx - 10.3, x1: c.cx + 10.3, z0: c.cz - 6.3, z1: c.cz + 6.3, h: 2.2 },
        focus: { tx: c.cx, ty: 0, tz: c.cz + 1, r: 25, az: c.cx < 0 ? -0.16 : 0.16, el: 0.86 },
      });
    });
    world.areas.push({
      id: 'arquibancada', name: 'Arquibancada', kind: 'stand',
      box: { x0: B.x0 - 0.3, x1: xb + 0.3, z0: B.z0 - 0.3, z1: B.z1 + 0.3, h: 3.0 },
      focus: { tx: 24.5, ty: 1, tz: 0, r: 34, az: -0.95, el: 0.6 },
    });

    // pontos de passeio na calçada (para quem anda pela arena)
    world.plaza = [[-9, 30], [-9, 22], [-9, 17], [-3, 16.5], [3, 16.5], [8, 17], [13, 17], [20, 17], [14, 31], [5, 32], [-14, 31], [-20, 30]];

    world.surfaceY = (x, z) => {
      for (const c of C.courts) if (Math.abs(x - c.cx) <= 10.1 && Math.abs(z - c.cz) <= 6.1) return PH;
      return 0.04;
    };
    world.update = (dt, t) => world.anim.forEach((f) => f(dt, t));
    return world;
  };
})();
