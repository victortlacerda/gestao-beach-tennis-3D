/* ============================================================
   Utilitários: matemática, geometria mesclada (low-poly com cor por vértice),
   texturas desenhadas em canvas e etiquetas (sprites) de texto.
   ============================================================ */
(function () {
  const T = THREE;
  const ABT = window.ABT;

  ABT.hex = (n) => '#' + n.toString(16).padStart(6, '0');
  ABT.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  ABT.lerp = (a, b, t) => a + (b - a) * t;
  ABT.smooth = (a, b, x) => { const t = ABT.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  ABT.ease = (t) => t * t * (3 - 2 * t);
  ABT.damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  ABT.angDiff = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  };
  ABT.rnd = (a, b) => a + Math.random() * (b - a);
  ABT.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  ABT.rng = function (seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  ABT.hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  ABT.shade = (hex, f) => {
    const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
    const g = Math.min(255, Math.round(((hex >> 8) & 255) * f));
    const b = Math.min(255, Math.round((hex & 255) * f));
    return (r << 16) | (g << 8) | b;
  };

  /* ---------- geometria mesclada (cada peça com uma cor) ---------- */
  const _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3(1, 1, 1);
  function part(g, color, x, y, z, rx, ry, rz, sx, sy, sz) {
    _e.set(rx || 0, ry || 0, rz || 0);
    _q.setFromEuler(_e);
    _p.set(x || 0, y || 0, z || 0);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return { g, color, m: new T.Matrix4().compose(_p, _q, _s) };
  }
  const G = ABT.G = {
    box: (w, h, d, color, x, y, z, rx, ry, rz) => part(new T.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz),
    cyl: (rt, rb, h, seg, color, x, y, z, rx, ry, rz) => part(new T.CylinderGeometry(rt, rb, h, seg), color, x, y, z, rx, ry, rz),
    sph: (r, ws, hs, color, x, y, z, sx, sy, sz) => part(new T.SphereGeometry(r, ws, hs), color, x, y, z, 0, 0, 0, sx, sy, sz),
    cap: (r, ws, hs, thetaLen, color, x, y, z, rx, ry, rz, sx, sy, sz) =>
      part(new T.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, thetaLen), color, x, y, z, rx, ry, rz, sx, sy, sz),
    cone: (r, h, seg, color, x, y, z, rx, ry, rz) => part(new T.ConeGeometry(r, h, seg), color, x, y, z, rx, ry, rz),
    ico: (r, detail, color, x, y, z, sx, sy, sz) => part(new T.IcosahedronGeometry(r, detail), color, x, y, z, 0, 0, 0, sx, sy, sz),
    geo: (g, color, x, y, z, rx, ry, rz, sx, sy, sz) => part(g, color, x, y, z, rx, ry, rz, sx, sy, sz),
    // aplica uma matriz a um grupo de peças (ex.: inclinar a raquete)
    transform(parts, matrix) {
      parts.forEach((p) => { p.m = new T.Matrix4().multiplyMatrices(matrix, p.m); });
      return parts;
    },
    merge(parts) {
      const gs = parts.map((p) => {
        const g = p.g.index ? p.g.toNonIndexed() : p.g.clone();
        g.applyMatrix4(p.m);
        return g;
      });
      let total = 0;
      gs.forEach((g) => { total += g.attributes.position.count; });
      const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
      let o = 0;
      const c = new T.Color();
      gs.forEach((g, i) => {
        const n = g.attributes.position.count;
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        c.set(parts[i].color);
        for (let k = 0; k < n; k++) {
          col[(o + k) * 3] = c.r; col[(o + k) * 3 + 1] = c.g; col[(o + k) * 3 + 2] = c.b;
        }
        o += n;
        g.dispose();
        parts[i].g.dispose();
      });
      const out = new T.BufferGeometry();
      out.setAttribute('position', new T.BufferAttribute(pos, 3));
      out.setAttribute('normal', new T.BufferAttribute(nor, 3));
      out.setAttribute('color', new T.BufferAttribute(col, 3));
      out.computeBoundingSphere();
      out.computeBoundingBox();
      return out;
    },
  };

  // material único para tudo que usa cor por vértice (estilo low-poly facetado)
  ABT.vcMat = new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.86, metalness: 0 });

  // cache de materiais simples
  const matCache = {};
  ABT.mat = function (color, o) {
    const key = color + JSON.stringify(o || {});
    if (!matCache[key]) {
      matCache[key] = new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.88, metalness: 0, flatShading: true }, o || {}));
    }
    return matCache[key];
  };

  /* ---------- texturas em canvas ---------- */
  ABT.canvasTex = function (w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    draw(x, w, h);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };

  ABT.sandTexture = function (repX, repY) {
    const r = ABT.rng(7);
    const t = ABT.canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = '#F2D8A7'; x.fillRect(0, 0, w, h);
      const cols = ['#EBCB93', '#F8E4BC', '#E4BF85', '#F5DDAE', '#EFD39B'];
      for (let i = 0; i < 2600; i++) {
        x.fillStyle = cols[Math.floor(r() * cols.length)];
        const s = 1 + r() * 2.2;
        x.fillRect(r() * w, r() * h, s, s);
      }
    });
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(repX || 1, repY || 1);
    return t;
  };

  ABT.paverTexture = function (rep) {
    const r = ABT.rng(11);
    const t = ABT.canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = '#D7CDB6'; x.fillRect(0, 0, w, h);
      const n = 4, s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const v = 226 + Math.floor(r() * 14);
        x.fillStyle = `rgb(${v},${v - 6},${v - 22})`;
        x.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      }
    });
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(rep, rep);
    return t;
  };

  ABT.grassTexture = function (rep) {
    const r = ABT.rng(5);
    const t = ABT.canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = '#7DBB5E'; x.fillRect(0, 0, w, h);
      const cols = ['#74B357', '#86C566', '#6CAB50', '#80BF62'];
      for (let i = 0; i < 900; i++) {
        x.fillStyle = cols[Math.floor(r() * cols.length)];
        x.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 5);
      }
    });
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(rep, rep);
    return t;
  };

  ABT.netTexture = function () {
    const t = ABT.canvasTex(256, 64, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.strokeStyle = 'rgba(250,250,250,0.9)';
      x.lineWidth = 2;
      for (let i = 0; i <= w; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
      for (let j = 0; j <= h; j += 8) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
    });
    t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  };

  /* ---------- etiquetas (sprites) ---------- */
  const FONT = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
  ABT.FONT = FONT;
  function rr(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }
  ABT.roundRect = rr;

  const labelCache = {};
  // Etiqueta simples (apelido, número da fila etc.)
  ABT.makeLabel = function (text, o) {
    o = o || {};
    const bg = o.bg || 'rgba(18,53,91,0.88)';
    const fg = o.fg || '#FFFFFF';
    const accent = o.accent || null;
    const h = o.h || 0.34;
    const key = [text, bg, fg, accent, o.sub || ''].join('|');
    let entry = labelCache[key];
    if (!entry) {
      const fs = 44, padX = 22, padY = 12;
      const c = document.createElement('canvas');
      const x = c.getContext('2d');
      x.font = `800 ${fs}px ${FONT}`;
      const tw = x.measureText(text).width;
      const subFs = 28;
      let sw = 0;
      if (o.sub) { x.font = `700 ${subFs}px ${FONT}`; sw = x.measureText(o.sub).width; }
      const accW = accent ? 18 : 0;
      const w = Math.ceil(Math.max(tw, sw) + padX * 2 + accW);
      const hh = fs + padY * 2 + (o.sub ? subFs + 4 : 0);
      c.width = w; c.height = hh;
      x.font = `800 ${fs}px ${FONT}`;
      rr(x, 2, 2, w - 4, hh - 4, 20);
      x.fillStyle = bg; x.fill();
      if (accent) {
        x.save(); rr(x, 2, 2, w - 4, hh - 4, 20); x.clip();
        x.fillStyle = accent; x.fillRect(2, 2, 14, hh);
        x.restore();
      }
      x.textBaseline = 'middle'; x.textAlign = 'left';
      x.fillStyle = fg;
      x.font = `800 ${fs}px ${FONT}`;
      x.fillText(text, padX + accW, padY + fs / 2 + 2);
      if (o.sub) {
        x.font = `700 ${subFs}px ${FONT}`;
        x.fillStyle = 'rgba(255,255,255,0.78)';
        x.fillText(o.sub, padX + accW, padY + fs + subFs / 2 + 6);
      }
      const tex = new T.CanvasTexture(c);
      tex.colorSpace = T.SRGBColorSpace;
      tex.anisotropy = 4;
      entry = labelCache[key] = { tex, ratio: w / hh };
    }
    const mat = new T.SpriteMaterial({ map: entry.tex, transparent: true, depthWrite: false, fog: false });
    const s = new T.Sprite(mat);
    s.scale.set(h * entry.ratio, h, 1);
    s.renderOrder = 10;
    return s;
  };

  // Placa da quadra: título, chip de status, horário, nomes e placar
  ABT.drawCourtBanner = function (canvas, d) {
    const x = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    x.clearRect(0, 0, w, h);
    rr(x, 5, 5, w - 10, h - 10, 36);
    x.fillStyle = 'rgba(12,38,66,0.94)'; x.fill();
    x.lineWidth = 7; x.strokeStyle = d.color; x.stroke();
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.fillStyle = '#FFFFFF';
    x.font = `900 56px ${FONT}`;
    x.fillText(d.title, 34, 60);
    x.font = `900 ${d.chip.length > 9 ? 29 : 36}px ${FONT}`;
    const cw = x.measureText(d.chip).width + 46;
    rr(x, w - cw - 28, 28, cw, 64, 32);
    x.fillStyle = d.color; x.fill();
    x.fillStyle = d.chipText || '#FFFFFF';
    x.textAlign = 'center';
    x.fillText(d.chip, w - cw / 2 - 28, 62);
    x.textAlign = 'left';
    let y = 124;
    if (d.time) { x.fillStyle = '#9FB8CF'; x.font = `700 33px ${FONT}`; x.fillText(d.time, 34, y); y += 46; }
    if (d.line1) { x.fillStyle = '#FFFFFF'; x.font = `800 41px ${FONT}`; x.fillText(d.line1, 34, y); y += 56; }
    if (d.line2) { x.fillStyle = d.line2Color || '#FFD34D'; x.font = `900 47px ${FONT}`; x.fillText(d.line2, 34, y); }
  };

  /** Cor de texto (branco ou azul bem escuro) com melhor contraste sobre um fundo '#rrggbb' (WCAG). */
  ABT.inkFor = function (bg) {
    const lum = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((a, v, k) => a + v * [0.2126, 0.7152, 0.0722][k], 0); };
    const L = lum(bg), cw = 1.05 / (L + 0.05), cd = (L + 0.05) / (lum('#0E1B2C') + 0.05);
    return cw >= cd ? '#FFFFFF' : '#0E1B2C';
  };
})();
