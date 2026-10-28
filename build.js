// Gera dist/arena-beach-tennis.html (arquivo único, abre com duplo clique)
// e dist/artifact.html (fragmento para publicar como página).
// Uso: node build.js
const fs = require('fs');
const path = require('path');
const root = __dirname;
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const scripts = ['vendor/three.min.js', 'src/config.js', 'src/utils.js', 'src/data.js', 'src/torneio.js', 'src/sample.js', 'src/agenda.js', 'src/regras.js', 'src/characters.js', 'src/environment.js',
  'src/arena.js', 'src/camera.js', 'src/sim.js', 'src/interaction.js', 'src/campeonato_ui.js', 'src/org_core.js', 'src/org_agenda.js', 'src/org_cad.js', 'src/org_camp.js', 'src/ui.js', 'src/main.js'];
const css = rd('styles.css');
const js = scripts.map((f) => `/* ===== ${f} ===== */\n` + rd(f).replace(/<\/script/gi, '<\\/script')).join('\n;\n');

// corpo do app = conteúdo de <body> do index.html sem as tags <script>
const idx = rd('index.html');
const bodyHtml = idx.match(/<body>([\s\S]*?)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>\s*/g, '').trim();

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });

// 1) arquivo único para o computador da arena
const full = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arena Beach Tennis</title>
<style>
${css}
</style>
</head>
<body>
${bodyHtml}
<script>
${js}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'dist/arena-beach-tennis.html'), full);

// 1b) pasta pronta para o GitHub Pages: só um arquivo (index.html) + .nojekyll
fs.mkdirSync(path.join(root, 'dist/pages'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/pages/index.html'), full);
fs.writeFileSync(path.join(root, 'dist/pages/.nojekyll'), '');

// 2) fragmento para publicar como artifact (sem doctype/html/head/body)
const art = `<title>Arena Beach Tennis</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
${css}
/* ajustes para rodar dentro da página publicada */
:root { color-scheme: dark; }
html, body { height: 100%; }
body { padding-left: max(0px, env(safe-area-inset-left, 0px)); padding-right: max(0px, env(safe-area-inset-right, 0px)); }
</style>
${bodyHtml}
<script>
${js}
</script>
`;
fs.writeFileSync(path.join(root, 'dist/artifact.html'), art);

for (const f of ['arena-beach-tennis.html', 'artifact.html']) {
  console.log(f, (fs.statSync(path.join(root, 'dist', f)).size / 1024).toFixed(0) + ' KB');
}
