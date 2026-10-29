/* ============================================================
   Motor de campeonato (Fase 2.6)
   Padrão D37, baseado no formato do circuito ITF: grupos todos-contra-todos,
   classificam os N melhores de cada grupo, mata-mata cruzado.
   Tudo configurável por torneio em camp.formato.
   Suposições a conferir no regulamento oficial (ver roadmap):
   - desempate: vitórias, % de sets, % de games, confronto direto (ordem editável);
   - o super tie-break de 10 pontos (3º set) conta como 1 set e 1 game para quem vence.
   ============================================================ */
(function (root) {
  const ABT = root.ABT = root.ABT || {};

  const FORMATO = {
    melhorDe: 3,              // nº máximo de sets (2 vencidos)
    setAte: 6,                // games por set
    tieBreakEm: 6,            // tie-break em 6–6
    superTieBreak: true,      // 3º set vira super tie-break de 10 pontos
    pontoDecisivo: true,      // no-ad no 40–40
    classificam: 2,           // por grupo
    terceiro: true,           // disputa de 3º lugar
    desempate: ['vitorias', 'pctSets', 'pctGames', 'confronto'],
  };

  const T = ABT.Torneio = { FORMATO };

  T.formatoDe = (camp) => Object.assign({}, FORMATO, (camp && camp.formato) || {});

  /* ---------- tempo e status de um jogo ---------- */
  T.inicioFim = (j) => {
    const d = ABT.parseDK(j.data);
    const a = new Date(d.getTime()), b = new Date(d.getTime());
    const hi = ABT.parseHM(j.inicio), hf = ABT.parseHM(j.fim);
    a.setHours(Math.floor(hi), Math.round((hi % 1) * 60), 0, 0);
    b.setHours(Math.floor(hf), Math.round((hf % 1) * 60), 0, 0);
    return [a, b];
  };
  /** 'encerrado' | 'andamento' | 'aguardando' (passou da hora sem resultado) | 'agendado' */
  T.statusDe = (j, now) => {
    if (j.encerrado) return 'encerrado';
    if (!j.data || !j.inicio) return 'agendado';
    const [a, b] = T.inicioFim(j);
    if (now >= a && now < b) return 'andamento';
    if (now >= b) return 'aguardando';
    return 'agendado';
  };

  /* ---------- sets e partidas ---------- */
  T.ehSuper = (idx, fmt) => idx >= 2 && fmt.superTieBreak;
  /** vencedor de um set: 0 (a), 1 (b) ou -1 (indefinido/empate) */
  T.vencedorSet = (set, idx, fmt) => (set[0] === set[1] ? -1 : (set[0] > set[1] ? 0 : 1));
  /** sets completos: se encerrado, todos; se em andamento, todos menos o último (em disputa) */
  T.setsCompletos = (j) => (j.encerrado ? (j.sets || []) : (j.sets || []).slice(0, -1));
  T.contagem = (j, fmt) => {
    let sa = 0, sb = 0, ga = 0, gb = 0;
    T.setsCompletos(j).forEach((s, i) => {
      const w = T.vencedorSet(s, i, fmt);
      if (w === 0) sa++; else if (w === 1) sb++;
      if (T.ehSuper(i, fmt)) { if (w === 0) ga++; else if (w === 1) gb++; }
      else { ga += s[0]; gb += s[1]; }
    });
    return { sa, sb, ga, gb };
  };
  /** 'a' | 'b' | null (só para jogos encerrados) */
  T.vencedorJogo = (j, fmt) => {
    if (!j.encerrado) return null;
    const c = T.contagem(j, fmt);
    return c.sa === c.sb ? null : (c.sa > c.sb ? 'a' : 'b');
  };
  T.placarTexto = (j) => (j.sets || []).map((s) => `${s[0]}–${s[1]}`).join(' · ');

  /* ---------- classificação dos grupos ---------- */
  T.grupos = (camp) => [...new Set(camp.duplas.map((d) => d.grupo).filter(Boolean))].sort();

  T.tabela = (camp, grupo) => {
    const fmt = T.formatoDe(camp);
    const duplas = camp.duplas.filter((d) => d.grupo === grupo);
    const jogos = camp.jogos.filter((j) => j.fase === 'grupo' && j.grupo === grupo);
    const rows = duplas.map((d) => ({ duplaId: d.id, dupla: d, J: 0, V: 0, D: 0, sv: 0, sp: 0, gv: 0, gp: 0, pctSets: 0, pctGames: 0, pos: 0 }));
    const by = {}; rows.forEach((r) => { by[r.duplaId] = r; });
    jogos.forEach((j) => {
      if (!j.encerrado || !by[j.a] || !by[j.b]) return;
      const c = T.contagem(j, fmt), w = T.vencedorJogo(j, fmt);
      const A = by[j.a], B = by[j.b];
      A.J++; B.J++;
      A.sv += c.sa; A.sp += c.sb; B.sv += c.sb; B.sp += c.sa;
      A.gv += c.ga; A.gp += c.gb; B.gv += c.gb; B.gp += c.ga;
      if (w === 'a') { A.V++; B.D++; } else if (w === 'b') { B.V++; A.D++; }
    });
    rows.forEach((r) => {
      r.pctSets = r.sv + r.sp ? r.sv / (r.sv + r.sp) : 0;
      r.pctGames = r.gv + r.gp ? r.gv / (r.gv + r.gp) : 0;
    });
    const confronto = (x, y) => {
      const j = jogos.find((q) => q.encerrado && ((q.a === x.duplaId && q.b === y.duplaId) || (q.a === y.duplaId && q.b === x.duplaId)));
      if (!j) return 0;
      const w = T.vencedorJogo(j, fmt); if (!w) return 0;
      const winnerId = w === 'a' ? j.a : j.b;
      return winnerId === x.duplaId ? -1 : 1;
    };
    const crit = {
      vitorias: (x, y) => y.V - x.V,
      pctSets: (x, y) => y.pctSets - x.pctSets,
      pctGames: (x, y) => y.pctGames - x.pctGames,
      confronto,
    };
    const ordem = fmt.desempate.filter((k) => crit[k]);
    rows.forEach((r, i) => { r._i = i; });
    rows.sort((x, y) => {
      for (const k of ordem) { const v = crit[k](x, y); if (Math.abs(v) > 1e-9) return v; }
      return x._i - y._i; // empate total: ordem de inscrição (a conferir com o regulamento)
    });
    rows.forEach((r, i) => { r.pos = i + 1; delete r._i; });
    return rows;
  };
  T.grupoCompleto = (camp, grupo) => {
    const js = camp.jogos.filter((j) => j.fase === 'grupo' && j.grupo === grupo);
    return js.length > 0 && js.every((j) => j.encerrado);
  };
  T.faseGruposCompleta = (camp) => T.grupos(camp).length > 0 && T.grupos(camp).every((g) => T.grupoCompleto(camp, g));

  /* ---------- mata-mata ---------- */
  const NOME_RODADA = { 2: 'final', 4: 'semi', 8: 'quartas', 16: 'oitavas' };
  T.nomeFase = (fase) => ({ grupo: 'Fase de grupos', oitavas: 'Oitavas', quartas: 'Quartas', semi: 'Semifinal', final: 'Final', terceiro: '3º lugar' }[fase] || fase);

  const ordemSementes = (n) => { let o = [1, 2]; for (let s = 4; s <= n; s *= 2) { const x = []; o.forEach((v) => x.push(v, s + 1 - v)); o = x; } return o; };

  /** Cria os jogos do mata-mata (sem horário). Sementes: 1ºA,1ºB,…,2ºA,2ºB,… ⇒ 1A×2B e 1B×2A (cruzado). */
  T.gerarMataMata = (grupos, classificam, comTerceiro) => {
    const n = grupos.length * classificam;
    if (n < 2 || (n & (n - 1)) !== 0) return { erro: `Com ${grupos.length} grupo(s) e ${classificam} classificado(s) por grupo são ${n} vagas. O mata-mata precisa de 2, 4, 8 ou 16.` };
    const sementes = []; for (let p = 1; p <= classificam; p++) grupos.forEach((g) => sementes.push(p + g));
    const ordem = ordemSementes(n);
    const jogos = [];
    let rodadaAnterior = [];
    for (let i = 0; i < n / 2; i++) {
      const id = (NOME_RODADA[n] || 'rodada') + (n === 2 ? '' : (i + 1));
      jogos.push({ id, fase: NOME_RODADA[n], origem: { a: sementes[ordem[2 * i] - 1], b: sementes[ordem[2 * i + 1] - 1] } });
      rodadaAnterior.push(id);
    }
    for (let m = n / 2; m >= 2; m /= 2) {
      const nome = NOME_RODADA[m];
      const prox = [];
      for (let i = 0; i < rodadaAnterior.length; i += 2) {
        const id = nome + (m === 2 ? '' : (i / 2 + 1));
        jogos.push({ id, fase: nome, origem: { a: 'V:' + rodadaAnterior[i], b: 'V:' + rodadaAnterior[i + 1] } });
        if (m === 2 && comTerceiro) jogos.push({ id: 'terceiro', fase: 'terceiro', origem: { a: 'P:' + rodadaAnterior[i], b: 'P:' + rodadaAnterior[i + 1] } });
        prox.push(id);
      }
      rodadaAnterior = prox;
      if (m === 2) break;
    }
    return { jogos };
  };

  const nomeDupla = (d) => (d ? (d.nome || '') : '');
  /** Resolve quem joga cada jogo do mata-mata. Devolve [{jogo, a:{id,label}, b:{id,label}}]. */
  T.chaveamento = (camp) => {
    const fmt = T.formatoDe(camp);
    const ko = camp.jogos.filter((j) => j.fase !== 'grupo');
    const tabelas = {}; T.grupos(camp).forEach((g) => { tabelas[g] = T.tabela(camp, g); });
    const byId = {}; ko.forEach((j) => { byId[j.id] = j; });
    const res = {};
    const resolve = (tok) => {
      if (!tok) return { id: null, label: 'A definir' };
      let m;
      if ((m = /^(\d+)([A-Z])$/.exec(tok))) {
        const pos = +m[1], g = m[2];
        if (T.grupoCompleto(camp, g) && tabelas[g] && tabelas[g][pos - 1]) return { id: tabelas[g][pos - 1].duplaId, label: '' };
        return { id: null, label: `${pos}º Grupo ${g}` };
      }
      if ((m = /^([VP]):(.+)$/.exec(tok))) {
        const ref = byId[m[2]]; const r = ref && solve(ref);
        const lbl = (m[1] === 'V' ? 'Vencedor ' : 'Perdedor ') + (ref ? T.nomeFase(ref.fase) + (/\d$/.test(ref.id) ? ' ' + ref.id.slice(-1) : '') : '');
        if (!r || !r.a.id || !r.b.id || !ref.encerrado) return { id: null, label: lbl };
        const w = T.vencedorJogo(ref, fmt); if (!w) return { id: null, label: lbl };
        const win = w === 'a' ? r.a.id : r.b.id, lose = w === 'a' ? r.b.id : r.a.id;
        return { id: m[1] === 'V' ? win : lose, label: '' };
      }
      return { id: null, label: String(tok) };
    };
    const solve = (j) => {
      if (res[j.id]) return res[j.id];
      const o = j.origem || {};
      res[j.id] = { jogo: j, a: { id: null, label: '' }, b: { id: null, label: '' } }; // protege contra ciclos
      res[j.id].a = j.a ? { id: j.a, label: '' } : resolve(o.a);
      res[j.id].b = j.b ? { id: j.b, label: '' } : resolve(o.b);
      return res[j.id];
    };
    return ko.map(solve);
  };

  /** Dupla de um jogo (grupo ou mata-mata) já resolvida. */
  T.participantes = (camp, jogo) => {
    if (jogo.fase === 'grupo') return { a: { id: jogo.a, label: '' }, b: { id: jogo.b, label: '' } };
    const r = T.chaveamento(camp).find((x) => x.jogo.id === jogo.id);
    return r ? { a: r.a, b: r.b } : { a: { id: null, label: 'A definir' }, b: { id: null, label: 'A definir' } };
  };

  /* ---------- geração de grupos e rodadas ---------- */
  T.nGruposSugerido = (n) => (n <= 4 ? 1 : n <= 10 ? 2 : n <= 20 ? 4 : 8);

  const lcg = (seed) => { let s = seed >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
  /** Sorteia as duplas em grupos (A, B, …) de forma equilibrada. Devolve { duplaId: 'A' }. */
  T.sortearGrupos = (duplaIds, nGrupos, seed) => {
    const r = lcg(seed || 7), ids = duplaIds.slice();
    for (let i = ids.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [ids[i], ids[k]] = [ids[k], ids[i]]; }
    const out = {};
    ids.forEach((id, i) => { out[id] = String.fromCharCode(65 + (i % nGrupos)); });
    return out;
  };
  /** Todos contra todos (método do círculo): lista de rodadas, cada uma com pares [a,b]. */
  T.rodadasGrupo = (ids) => {
    const a = ids.slice(); if (a.length % 2) a.push(null);
    const n = a.length, rodadas = [];
    for (let r = 0; r < n - 1; r++) {
      const par = [];
      for (let i = 0; i < n / 2; i++) { const x = a[i], y = a[n - 1 - i]; if (x != null && y != null) par.push([x, y]); }
      rodadas.push(par);
      a.splice(1, 0, a.pop());
    }
    return rodadas;
  };
  /** Distribui jogos em horários e quadras, em sequência. Altera os jogos e devolve a lista. */
  T.agendar = (jogos, opt) => {
    const dur = opt.duracao || 1, quadras = opt.quadras || [1, 2, 3, 4];
    let slot = 0, usados = 0;
    jogos.forEach((j) => {
      if (usados >= quadras.length) { slot++; usados = 0; }
      j.data = opt.data; j.quadra = quadras[usados++];
      j.inicio = ABT.fmtHM(opt.inicio + slot * dur); j.fim = ABT.fmtHM(opt.inicio + (slot + 1) * dur);
    });
    return jogos;
  };
  /** Rótulo curto para o placar/rodapé: "Grupo A · Rodada 2". */
  T.rotuloJogo = (j) => (j.fase === 'grupo' ? `Grupo ${j.grupo} · Rodada ${j.rodada}` : T.nomeFase(j.fase));
  T.nomeDupla = nomeDupla;
})(typeof window !== 'undefined' ? window : globalThis);
