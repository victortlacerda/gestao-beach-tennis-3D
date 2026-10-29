/* ============================================================
   Ambiente: céu, sol/lua, luzes, névoa, estrelas, nuvens e ciclo dia/noite.
   A hora da cena (0–24) controla tudo; postes e janelas acendem à noite.
   ============================================================ */
(function () {
  const T = THREE;
  const L = ABT.lerp, sm = ABT.smooth;

  const C = (h) => new T.Color(h);
  const NIGHT = { top: C(0x040A22), hor: C(0x1B2A55), hemiSky: C(0x3A4F8E), hemiGround: C(0x1E2438) };
  const DAY = { top: C(0x3E9BEA), hor: C(0xD4ECFF), hemiSky: C(0xCFE8FF), hemiGround: C(0xD2BD8C) };
  const SUNSET = { top: C(0x44609F), hor: C(0xFFB070) };

  ABT.Environment = class {
    constructor(scene, renderer, camera) {
      this.scene = scene; this.renderer = renderer; this.camera = camera;
      this.hour = ABT.C.dayStartHour;
      this.glows = []; this.nightLights = [];
      this.day = 1; this.sunElev = 1;

      this.hemi = new T.HemisphereLight(0xCFE8FF, 0xD2BD8C, 0.9);
      scene.add(this.hemi);

      this.sun = new T.DirectionalLight(0xFFF2D6, 1.7);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const sc = this.sun.shadow.camera;
      sc.left = -48; sc.right = 48; sc.top = 48; sc.bottom = -48; sc.near = 5; sc.far = 260;
      this.sun.shadow.bias = -0.0005;
      this.sun.shadow.normalBias = 0.05;
      this.sunTarget = new T.Object3D(); this.sunTarget.position.set(2, 0, 8);
      scene.add(this.sunTarget); this.sun.target = this.sunTarget;
      scene.add(this.sun);

      this.moon = new T.DirectionalLight(0x8FB4FF, 0);
      this.moon.position.set(-40, 80, 50); scene.add(this.moon);
      this.fill = new T.DirectionalLight(0xFFE2B0, 0);   // "refletores" da arena à noite
      this.fill.position.set(10, 70, 40); scene.add(this.fill);

      // céu (cúpula com degradê + brilho do sol)
      this.skyMat = new T.ShaderMaterial({
        side: T.BackSide, depthWrite: false, fog: false,
        uniforms: {
          top: { value: new T.Color() }, hor: { value: new T.Color() },
          sunDir: { value: new T.Vector3(0, 1, 0) }, sunCol: { value: new T.Color(0xFFE9B0) }, sunAmt: { value: 1 },
        },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunAmt;
          void main(){
            float h = clamp(vP.y, 0.0, 1.0);
            vec3 c = mix(hor, top, pow(h, 0.55));
            float g = max(dot(normalize(vP), normalize(sunDir)), 0.0);
            c += sunCol * (pow(g, 220.0) * 1.2 + pow(g, 12.0) * 0.28) * sunAmt;
            gl_FragColor = vec4(c, 1.0);
          }`,
      });
      this.sky = new T.Mesh(new T.SphereGeometry(420, 24, 16), this.skyMat);
      this.sky.renderOrder = -20; this.sky.frustumCulled = false;
      scene.add(this.sky);

      scene.fog = new T.Fog(0xD4ECFF, 140, 520);

      // estrelas
      const n = 450, pos = new Float32Array(n * 3), r = ABT.rng(3);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, e = Math.acos(1 - r() * 0.95);
        pos[i * 3] = Math.sin(e) * Math.cos(a) * 400; pos[i * 3 + 1] = Math.cos(e) * 400; pos[i * 3 + 2] = Math.sin(e) * Math.sin(a) * 400;
      }
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(pos, 3));
      this.stars = new T.Points(sg, new T.PointsMaterial({ color: 0xFFFFFF, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
      this.stars.frustumCulled = false; scene.add(this.stars);

      // discos do sol e da lua
      this.sunDisc = new T.Mesh(new T.CircleGeometry(15, 24), new T.MeshBasicMaterial({ color: 0xFFF3C4, fog: false, depthWrite: false }));
      this.moonDisc = new T.Mesh(new T.CircleGeometry(9, 24), new T.MeshBasicMaterial({ color: 0xE9F0FF, fog: false, depthWrite: false }));
      scene.add(this.sunDisc, this.moonDisc);

      // nuvens
      this.clouds = new T.Group();
      this.cloudMat = new T.MeshBasicMaterial({ color: 0xFFFFFF, fog: false });
      const cr = ABT.rng(21);
      for (let i = 0; i < 12; i++) {
        const g = new T.Group();
        const parts = 4 + Math.floor(cr() * 3);
        for (let k = 0; k < parts; k++) {
          const s = new T.Mesh(new T.IcosahedronGeometry(5 + cr() * 5, 1), this.cloudMat);
          s.position.set(k * 7 - parts * 3, cr() * 2, (cr() - 0.5) * 5);
          s.scale.set(1.3, 0.62, 1);
          g.add(s);
        }
        g.position.set((cr() - 0.5) * 420, 70 + cr() * 40, -60 - cr() * 220);
        g.userData.speed = 0.6 + cr() * 0.9;
        this.clouds.add(g);
      }
      scene.add(this.clouds);

      this.setHour(this.hour);
    }

    addGlow(mat, color, max) { this.glows.push({ mat, color: new T.Color(color), max }); mat.emissive = new T.Color(color); mat.emissiveIntensity = 0; }
    addNightLight(light, max) { this.nightLights.push({ light, max }); light.intensity = 0; }

    // elevação do sol: nasce às 5:35, põe às 17:55
    _solar(h) {
      const rise = 5.6, set = 17.9;
      if (h >= rise && h <= set) {
        const t = (h - rise) / (set - rise);
        return { elev: Math.sin(Math.PI * t) * 1.18, az: L(-1.25, 1.25, t) };
      }
      const nt = (h > set ? h - set : h + 24 - set) / (24 - (set - rise));
      return { elev: -Math.sin(Math.PI * nt) * 0.9, az: L(1.25, 2.4, nt) };
    }

    setHour(h) {
      this.hour = ((h % 24) + 24) % 24;
      const s = this._solar(this.hour);
      const ce = Math.cos(s.elev);
      const dir = new T.Vector3(Math.sin(s.az) * ce, Math.sin(s.elev), 0.5 * ce).normalize();
      const sinE = Math.sin(s.elev);
      const d = sm(-0.06, 0.28, sinE);          // fator de dia
      const w = sm(-0.14, 0.02, sinE) * (1 - sm(0.12, 0.5, sinE)); // fator de pôr/nascer do sol
      this.day = d; this.sunElev = sinE;

      const up = new T.Vector3(); // sol
      this.sun.position.copy(this.sunTarget.position).addScaledVector(dir.clone().setY(Math.max(dir.y, 0.15)).normalize(), 110);
      this.sun.intensity = 2.0 * sm(0.0, 0.3, sinE) + 0.0;
      this.sun.color.set(0xFFF4DE).lerp(C(0xFF9E55), 1 - sm(0.05, 0.55, sinE));
      this.sun.castShadow = d > 0.12;

      this.hemi.intensity = L(0.3, 0.92, d);
      this.hemi.color.copy(NIGHT.hemiSky).lerp(DAY.hemiSky, d);
      this.hemi.groundColor.copy(NIGHT.hemiGround).lerp(DAY.hemiGround, d);
      this.moon.intensity = (1 - d) * 0.3;
      this.fill.intensity = (1 - d) * 0.42;

      const top = NIGHT.top.clone().lerp(DAY.top, d).lerp(SUNSET.top, w * 0.55);
      const hor = NIGHT.hor.clone().lerp(DAY.hor, d).lerp(SUNSET.hor, w * 0.8);
      this.skyMat.uniforms.top.value.copy(top);
      this.skyMat.uniforms.hor.value.copy(hor);
      this.skyMat.uniforms.sunDir.value.copy(dir);
      this.skyMat.uniforms.sunCol.value.set(0xFFE2A0).lerp(C(0xFF8A3D), w);
      this.skyMat.uniforms.sunAmt.value = sm(-0.1, 0.1, sinE);
      this.scene.fog.color.copy(hor);

      this.stars.material.opacity = 1 - sm(0.0, 0.5, d + 0.0);
      this.sunDirVec = dir;
      this.moonDir = new T.Vector3(-0.45, 0.75, -0.4).normalize();
      this.cloudMat.color.set(0x2B3860).lerp(C(0xFFFFFF), d).lerp(C(0xFFC9A0), w * 0.5);

      const lamp = 1 - sm(0.2, 0.62, d);          // lâmpadas acesas
      this.lampFactor = lamp;
      this.glows.forEach((g) => { g.mat.emissiveIntensity = lamp * g.max; });
      this.nightLights.forEach((n) => { n.light.intensity = lamp * n.max; });
    }

    update(dt, time) {
      const cp = this.camera.position;
      this.sky.position.copy(cp);
      this.stars.position.copy(cp);
      if (this.sunDirVec) {
        this.sunDisc.position.copy(cp).addScaledVector(this.sunDirVec, 380);
        this.sunDisc.lookAt(cp);
        this.sunDisc.visible = this.sunElev > -0.08;
        this.moonDisc.position.copy(cp).addScaledVector(this.moonDir, 380);
        this.moonDisc.lookAt(cp);
        this.moonDisc.visible = this.day < 0.5;
      }
      this.clouds.children.forEach((c) => {
        c.position.x += dt * c.userData.speed;
        if (c.position.x > 260) c.position.x = -260;
      });
    }
  };
})();
