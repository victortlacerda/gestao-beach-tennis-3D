/* ============================================================
   Câmera: modo AUTOMÁTICO (passeio de TV pela arena) e modo LIVRE
   (arrastar = girar, botão direito/Shift = mover, roda = zoom).
   Clicar numa área voa a câmera até ela.
   ============================================================ */
(function () {
  const T = THREE;
  const damp = ABT.damp, clamp = ABT.clamp;

  ABT.CameraRig = class {
    constructor(camera, dom) {
      this.cam = camera; this.dom = dom;
      this.mode = 'auto';
      this.focus = null;
      this.cur = { tx: 2, ty: 0, tz: 7, r: 90, az: -0.3, el: 0.7 };
      this.des = Object.assign({}, this.cur);
      this.aspect = 1.6;
      this.tourIdx = 0; this.tourT = 0; this.tourOn = true; this.time = 0;
      this.onUserInput = null;
      this.rate = 2.4;
      this._bind();
      this._buildTour();
    }

    overview() {
      const r = 74 * Math.max(1, 1.55 / this.aspect);
      return { tx: 2, ty: 0, tz: 7, r, az: -0.26, el: 0.68 };
    }

    setAspect(a) { this.aspect = a; this._buildTour(); if (!this.focus && this.mode === 'auto') this._applyShot(this.tour[this.tourIdx]); }

    _buildTour() {
      const ov = this.overview();
      const court = (id) => {
        const c = ABT.C.courts[id - 1];
        return { tx: c.cx, ty: 0, tz: c.cz + 1, r: 30 * Math.max(1, 1.5 / this.aspect), az: c.cx < 0 ? -0.2 : 0.2, el: 0.78, hold: 6 };
      };
      this.tour = [
        Object.assign({ hold: 10 }, ov),
        court(1), court(2),
        Object.assign({ hold: 6 }, ov, { az: 0.12 }),
        court(4), court(3),
        { tx: 3, ty: 1.5, tz: 22, r: 34 * Math.max(1, 1.5 / this.aspect), az: -0.1, el: 0.5, hold: 7 },
        { tx: 24.5, ty: 1, tz: 0, r: 40 * Math.max(1, 1.5 / this.aspect), az: -0.8, el: 0.62, hold: 6 },
      ];
    }

    _applyShot(s) {
      const d = this.des;
      d.tx = s.tx; d.ty = s.ty; d.tz = s.tz; d.r = s.r; d.az = s.az; d.el = s.el;
    }

    setMode(m) {
      this.mode = m;
      if (m === 'auto' && !this.focus) { this.tourT = 0; this._applyShot(this.tour[this.tourIdx]); }
    }

    flyTo(shot) { this._applyShot(shot); }
    focusArea(area) {
      this.focus = area;
      const f = area.focus;
      const k = Math.max(1, 1.5 / this.aspect);
      this._applyShot({ tx: f.tx, ty: f.ty, tz: f.tz, r: f.r * (area.kind === 'room' ? 1 : k), az: f.az, el: f.el });
    }
    clearFocus() {
      this.focus = null;
      if (this.mode === 'auto') { this.tourT = 0; this._applyShot(this.tour[this.tourIdx]); }
      else this._applyShot(this.overview());
    }
    goOverview() { this.focus = null; this.tourIdx = 0; this.tourT = 0; this._applyShot(this.overview()); }

    _bind() {
      const el = this.dom;
      let drag = null;
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      el.addEventListener('pointerdown', (e) => {
        drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.button === 1 || e.shiftKey, moved: 0 };
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
        if (drag.moved < 4) return;
        this._user();
        const d = this.des;
        if (drag.pan) {
          const k = d.r * 0.0016;
          d.tx += (-Math.cos(d.az) * dx + Math.sin(d.az) * dy) * k;
          d.tz += (Math.sin(d.az) * dx + Math.cos(d.az) * dy) * k;
          d.tx = clamp(d.tx, -45, 50); d.tz = clamp(d.tz, -35, 55);
        } else {
          d.az -= dx * 0.0052;
          d.el = clamp(d.el + dy * 0.0042, 0.14, 1.45);
        }
      });
      const end = (e) => { drag = null; try { el.releasePointerCapture(e.pointerId); } catch (_) { /* ok */ } };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('wheel', (e) => {
        e.preventDefault();
        this._user();
        this.des.r = clamp(this.des.r * Math.exp(e.deltaY * 0.0012), 9, 150);
      }, { passive: false });
    }

    _user() {
      if (this.mode === 'auto' && this.onUserInput) this.onUserInput();
    }

    update(dt, time) {
      this.time = time;
      if (this.mode === 'auto' && !this.focus) {
        this.tourT += dt;
        const shot = this.tour[this.tourIdx];
        if (this.tourT > shot.hold) {
          this.tourT = 0; this.tourIdx = (this.tourIdx + 1) % this.tour.length;
          this._applyShot(this.tour[this.tourIdx]);
        }
        this.des.az += Math.sin(time * 0.17) * 0.00035;
      }
      const c = this.cur, d = this.des, k = this.rate;
      c.tx = damp(c.tx, d.tx, k, dt); c.ty = damp(c.ty, d.ty, k, dt); c.tz = damp(c.tz, d.tz, k, dt);
      c.r = damp(c.r, d.r, k, dt); c.az = damp(c.az, d.az, k, dt); c.el = damp(c.el, d.el, k, dt);
      const ce = Math.cos(c.el);
      this.cam.position.set(c.tx + c.r * Math.sin(c.az) * ce, c.ty + c.r * Math.sin(c.el), c.tz + c.r * Math.cos(c.az) * ce);
      this.cam.lookAt(c.tx, c.ty, c.tz);
    }
  };
})();
