/* ============================================================
   Painel do modo Campeonato (Fase 2.6): jogando agora, grupos, mata-mata e histórico.
   Só monta HTML a partir dos dados; quem desenha na tela é ui.js.
   ============================================================ */
(function () {
  const ABT = window.ABT, T = ABT.Torneio;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const dnome = (camp, id, label) => { const d = id && camp.duplas.find((x) => x.id === id); return d ? d.nome : (label || 'A definir'); };
  const setsHtml = (j, fmt, vivo) => {
    const sets = j.sets || [];
    if (!sets.length) return '<span class="cp-set dim">0–0</span>';
    return sets.map((s, i) => {
      const atual = vivo && i === sets.length - 1;
      const w = T.vencedorSet(s, i, fmt);
      return `<span class="cp-set${atual ? ' live' : ''}${w === 0 && !atual ? ' wa' : ''}${w === 1 && !atual ? ' wb' : ''}">${s[0]}–${s[1]}</span>`;
    }).join('');
  };

  ABT.CampUI = {
    render(state, now) {
      const camp = ABT.Agenda.campeonatoAtual(state);
      if (!camp) {
        return `<div class="cp-empty"><div class="cp-k">CAMPEONATO</div><h1>Nenhum campeonato cadastrado</h1>
          <p>Quando houver um torneio, a tabela de grupos, o mata-mata e o histórico aparecem aqui.</p>
          <p class="dim">Para ver um exemplo, abra o painel <b>Dados e demonstração</b> (canto inferior esquerdo) e toque em <b>Carregar exemplo</b>.</p></div>`;
      }
      const fmt = T.formatoDe(camp);
      const jogos = camp.jogos.map((j) => Object.assign({}, j, { _st: T.statusDe(j, now) }));
      const grupoJ = jogos.filter((j) => j.fase === 'grupo');
      const feitos = grupoJ.filter((j) => j.encerrado).length;
      const koCompleto = jogos.filter((j) => j.fase !== 'grupo');
      const final = jogos.find((j) => j.fase === 'final');
      const fase = final && final.encerrado ? 'Encerrado' : (T.faseGruposCompleta(camp) ? 'Mata-mata' : 'Fase de grupos');
      const out = [];
      out.push(`<header class="cp-head"><div><div class="cp-k">CAMPEONATO</div><h1>${esc(camp.nome)}</h1></div>
        <div class="cp-fase"><b>${fase}</b><span>${feitos} de ${grupoJ.length} jogos de grupo</span></div></header>`);

      /* jogando agora */
      const vivos = jogos.filter((j) => j._st === 'andamento');
      const prox = jogos.filter((j) => j._st === 'agendado' && j.data).sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))[0];
      out.push('<section class="cp-sec"><h2>Jogando agora</h2>');
      if (vivos.length) {
        out.push('<div class="cp-live">' + vivos.map((j) => {
          const p = T.participantes(camp, j);
          const na = dnome(camp, p.a.id, p.a.label), nb = dnome(camp, p.b.id, p.b.label);
          return `<div class="cp-game"><div class="cp-meta"><span class="chip gold">🏆 Quadra ${j.quadra}</span><span>${esc(T.rotuloJogo(j))}</span></div>
            <div class="cp-vs"><b>${esc(na)}</b><i>×</i><b>${esc(nb)}</b></div><div class="cp-sets">${setsHtml(j, fmt, true)}</div></div>`;
        }).join('') + '</div>');
      } else {
        out.push(`<p class="cp-none">Nenhum jogo em andamento agora.${prox ? ` Próximo: <b>${esc(prox.inicio)}</b> · ${esc(T.rotuloJogo(prox))}.` : ''}</p>`);
      }
      out.push('</section>');

      /* grupos */
      out.push('<section class="cp-sec"><h2>Fase de grupos</h2><div class="cp-tables">');
      T.grupos(camp).forEach((g) => {
        const rows = T.tabela(camp, g), done = T.grupoCompleto(camp, g);
        out.push(`<div class="cp-table"><h3>Grupo ${g}${done ? ' <span class="chip ok">✔ completo</span>' : ''}</h3><table>
          <tr><th>#</th><th>Dupla</th><th class="n">J</th><th class="n">V</th><th class="n">Sets</th><th class="n">Games</th></tr>
          ${rows.map((r) => `<tr class="${r.pos <= fmt.classificam ? 'q' : ''}"><td>${r.pos}</td><td>${esc(r.dupla.nome)}${r.pos <= fmt.classificam ? '<small>classifica</small>' : ''}</td><td class="n">${r.J}</td><td class="n">${r.V}</td><td class="n">${r.sv}–${r.sp}</td><td class="n">${r.gv}–${r.gp}</td></tr>`).join('')}
        </table></div>`);
      });
      out.push('</div></section>');

      /* mata-mata */
      if (koCompleto.length) {
        const ch = T.chaveamento(camp);
        const col = (fases) => ch.filter((x) => fases.includes(x.jogo.fase));
        const match = (x) => {
          const j = jogos.find((q) => q.id === x.jogo.id), w = T.vencedorJogo(j, fmt);
          const row = (side, p) => `<div class="${w === side ? 'w' : ''}"><span>${esc(dnome(camp, p.id, p.label))}</span></div>`;
          const quando = j.data && j.inicio ? `${j.inicio}${j.quadra ? ' · Q' + j.quadra : ''}` : '';
          return `<div class="cp-match${j._st === 'andamento' ? ' live' : ''}"><div class="cp-mh"><b>${esc(T.nomeFase(j.fase))}${/\d$/.test(j.id) && j.fase !== 'terceiro' ? ' ' + j.id.slice(-1) : ''}</b><small>${esc(quando)}</small></div>
            ${row('a', x.a)}${row('b', x.b)}<div class="cp-sets">${(j.sets || []).length ? setsHtml(j, fmt, j._st === 'andamento') : ''}</div></div>`;
        };
        const fasesOrd = ['oitavas', 'quartas', 'semi'];
        const cols = fasesOrd.map((f) => col([f])).filter((c) => c.length);
        out.push('<section class="cp-sec"><h2>Mata-mata</h2><div class="cp-bracket">');
        cols.forEach((c) => out.push('<div class="cp-col">' + c.map(match).join('') + '</div>'));
        out.push('<div class="cp-col">' + col(['final']).map(match).join('') + col(['terceiro']).map(match).join('') + '</div>');
        out.push('</div></section>');
      }

      /* histórico */
      const hist = jogos.filter((j) => j.encerrado).sort((a, b) => (b.data + b.inicio).localeCompare(a.data + a.inicio)).slice(0, 8);
      out.push('<section class="cp-sec"><h2>Histórico de jogos</h2>');
      if (!hist.length) out.push('<p class="cp-none">Nenhum jogo encerrado ainda.</p>');
      else {
        out.push('<table class="cp-hist">' + hist.map((j) => {
          const p = T.participantes(camp, j), w = T.vencedorJogo(j, fmt);
          const na = dnome(camp, p.a.id, p.a.label), nb = dnome(camp, p.b.id, p.b.label);
          return `<tr><td class="dim">${esc(T.rotuloJogo(j))}</td><td class="${w === 'a' ? 'w' : ''}">${esc(na)}</td><td class="mid">×</td><td class="${w === 'b' ? 'w' : ''}">${esc(nb)}</td><td class="n">${esc(T.placarTexto(j))}</td></tr>`;
        }).join('') + '</table>');
      }
      out.push('</section>');
      return out.join('');
    },
  };
})();
