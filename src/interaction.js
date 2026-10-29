/* ============================================================
   Interação: passar o mouse destaca a área (com nome), clicar seleciona.
   Cada área é uma caixa invisível usada só para detectar o mouse.
   ============================================================ */
(function () {
  const T = THREE;

  ABT.Interaction = class {
    constructor(scene, camera, canvas, world, cb) {
      this.camera = camera; this.canvas = canvas; this.cb = cb || {};
      this.ray = new T.Raycaster(); this.ndc = new T.Vector2();
      this.items = []; this.hover = null; this.selected = null;
      this.mouse = { x: 0, y: 0, inside: false };

      const edgeMat = new T.LineBasicMaterial({ color: 0x1FE0D6, transparent: true, opacity: 0, depthTest: false });
      world.areas.forEach((a) => {
        const b = a.box, w = b.x1 - b.x0, d = b.z1 - b.z0, h = b.h;
        const geo = new T.BoxGeometry(w, h, d);
        const mat = new T.MeshBasicMaterial({ color: 0x9FFFF6, transparent: true, opacity: 0, depthWrite: false });
        const m = new T.Mesh(geo, mat);
        m.position.set(b.x0 + w / 2, h / 2 + 0.02, b.z0 + d / 2);
        m.userData.area = a;
        const edges = new T.LineSegments(new T.EdgesGeometry(geo), edgeMat.clone());
        edges.position.copy(m.position); edges.renderOrder = 20;
        scene.add(m, edges);
        this.items.push({ area: a, mesh: m, edges, level: 0 });
      });

      let down = null;
      canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
      canvas.addEventListener('pointerup', (e) => {
        if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5 && performance.now() - down.t < 600 && e.button === 0) {
          const a = this._pick(e);
          if (a && this.cb.onSelect) this.cb.onSelect(a);
          else if (!a && this.cb.onEmptyClick) this.cb.onEmptyClick();
        }
        down = null;
      });
      canvas.addEventListener('pointermove', (e) => {
        this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.inside = true;
        if (e.buttons) { this._setHover(null); return; }
        this._setHover(this._pick(e), e);
      });
      canvas.addEventListener('pointerleave', () => { this.mouse.inside = false; this._setHover(null); });
    }

    _pick(e) {
      const r = this.canvas.getBoundingClientRect();
      this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(this.ndc, this.camera);
      const hits = this.ray.intersectObjects(this.items.map((i) => i.mesh), false);
      return hits.length ? hits[0].object.userData.area : null;
    }

    _setHover(area, e) {
      if (area !== this.hover) {
        this.hover = area;
        this.canvas.style.cursor = area ? 'pointer' : '';
        if (this.cb.onHover) this.cb.onHover(area, e);
      } else if (area && this.cb.onHoverMove) this.cb.onHoverMove(e);
    }

    select(area) { this.selected = area; }

    update(dt, time) {
      this.items.forEach((it) => {
        const target = it.area === this.selected ? 1 : (it.area === this.hover ? 0.75 : 0);
        it.level += (target - it.level) * Math.min(1, dt * 12);
        const pulse = 0.85 + Math.sin(time * 4) * 0.15;
        it.mesh.material.opacity = it.level * 0.16 * (it.area === this.hover ? pulse : 1);
        it.edges.material.opacity = it.level;
        it.edges.visible = it.level > 0.01;
      });
    }
  };
})();
