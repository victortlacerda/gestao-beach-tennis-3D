/* ============================================================
   Ponto de entrada: monta renderer, cena, simulação, câmera e interface.
   ============================================================ */
(function () {
  const T = THREE;
  const canvas = document.getElementById('c');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.NoToneMapping;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(38, 1.6, 0.5, 900);
  ABT.labelMode = 'courts';

  const env = new ABT.Environment(scene, renderer, camera);
  const world = ABT.buildArena(scene, env);
  const rig = new ABT.CameraRig(camera, canvas);
  const sim = new ABT.Sim(scene, world, camera);
  const state = { lapse: false, followClock: true };
  const app = { sim, rig, env, world, state, renderer, scene, camera };

  let ui = null;
  app.interaction = new ABT.Interaction(scene, camera, canvas, world, {
    onHover: (a, e) => ui && ui.hover(a, e),
    onHoverMove: (e) => ui && ui.moveTip(e),
    onSelect: (a) => ui && ui.selectArea(a),
    onEmptyClick: () => { if (ui && ui.card) ui.closeCard(); },
  });
  ABT.Clock.init();
  ui = new ABT.UI(app);
  app.ui = ui;
  ABT.Org.init(app);
  if (ui.mode === 'organizacao') ABT.Org.enter();
  sim.toast = (m) => ui.toast(m);
  rig.onUserInput = () => ui.setCamera('livre');

  ui.refreshCena(true); // monta a cena a partir dos dados salvos e da hora da arena
  window.ABT_DEBUG = app;

  function resize() {
    const stage = document.getElementById('stage');
    const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    rig.setAspect(w / h);
  }
  window.addEventListener('resize', resize);
  resize();
  // posição inicial já na visão geral (sem "voo" de entrada)
  Object.assign(rig.cur, rig.overview()); Object.assign(rig.des, rig.overview());

  const clock = new T.Clock(); let time = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05); time += dt;
    if (state.lapse) env.setHour(env.hour + dt * 0.125);
    sim.update(dt, time);
    world.update(dt, time);
    rig.update(dt, time);
    env.update(dt, time);
    app.interaction.update(dt, time);
    ui.update(dt, time, renderer);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
})();
