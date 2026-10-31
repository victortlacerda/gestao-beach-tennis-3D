/* ============================================================
   Agenda (Fase 2): a partir dos dados e da hora, decide o que acontece
   em cada quadra agora, quem está esperando, quem assiste e o que vai na faixa de avisos.
   Não depende do 3D nem do navegador (testável em Node).
   ============================================================ */
(function (root) {
  const ABT = root.ABT = root.ABT || {};
  const T = ABT.Torneio;
  const TIPO_ORDEM = { jogo: 0, bloqueio: 1, aula: 2, aluguel: 3 };
  const NOME_TIPO = { aula: 'Aula', aluguel: 'Aluguel', bloqueio: 'Manutenção', jogo: 'Campeonato', dayuse: 'Day use' };

  const hoursFor = (state, date) => {
    const h = state.config.horario, d = date.getDay();
    return (d === 0 || d === 6) ? h.fimSemana : h.semana;
  };
  const range = (a, b) => `${ABT.fmtHM(a)}–${ABT.fmtHM(b)}`;

  const pessoaPorId = (state) => { const m = {}; state.pessoas.forEach((p) => { m[p.id] = p; }); return m; };
  /** Na TV só aparece apelido ou primeiro nome (D09). */
  const nomeTV = (p) => (p ? (p.apelido || String(p.nome || '?').split(' ')[0]) : '?');

  /** D46 = A: aluguel e day use só mostram "Em jogo" até a recepção digitar o placar. */
  const placarFixo = (state, quadra, chave) => {
    if (state.config.placarIlustrativo) return undefined; // modo antigo: placar de enfeite
    const x = (state.placares || []).find((p) => p.quadra === quadra && p.chave === chave);
    return { sets: [], texto: x ? `${x.a} × ${x.b}` : 'Em jogo', chave, placar: x ? [x.a, x.b] : null };
  };

  const A = ABT.Agenda = {
    NOME_TIPO, hoursFor, nomeTV,

    /** Todos os blocos de uma quadra num dia: horários avulsos, turmas que se repetem e jogos de campeonato. */
    slotsDaQuadra(state, date, quadra) {
      const dk = ABT.dk(date), slots = [];
      state.horarios.forEach((h) => {
        if (h.quadra !== quadra || h.data !== dk || h.cancelado) return;
        slots.push({ fonte: 'horario', tipo: h.tipo === 'bloqueio' ? 'bloqueio' : h.tipo === 'aula' ? 'aula' : 'aluguel', ini: ABT.parseHM(h.inicio), fim: ABT.parseHM(h.fim), ref: h });
      });
      state.turmas.forEach((t) => {
        if (t.quadra !== quadra || t.ativa === false || !(t.diasSemana || [t.diaSemana]).includes(date.getDay())) return;
        if (state.horarios.some((h) => h.turmaId === t.id && h.data === dk)) return; // exceção do dia
        slots.push({ fonte: 'turma', tipo: 'aula', ini: ABT.parseHM(t.inicio), fim: ABT.parseHM(t.fim), ref: t });
      });
      state.campeonatos.forEach((c) => {
        c.jogos.forEach((j) => { if (j.quadra === quadra && j.data === dk && j.inicio) slots.push({ fonte: 'jogo', tipo: 'jogo', ini: ABT.parseHM(j.inicio), fim: ABT.parseHM(j.fim), ref: j, camp: c }); });
      });
      return slots.sort((a, b) => a.ini - b.ini || TIPO_ORDEM[a.tipo] - TIPO_ORDEM[b.tipo]);
    },

    sessaoDayUse(state, now) {
      const dk = ABT.dk(now), h = ABT.hourOf(now);
      return state.dayuse_sessoes.find((s) => s.data === dk && h >= ABT.parseHM(s.inicio) && h < ABT.parseHM(s.fim)) || null;
    },

    campeonatoAtual(state) {
      const cs = state.campeonatos;
      return cs.find((c) => c.status === 'em_andamento') || cs[cs.length - 1] || null;
    },

    /** Estado de uma quadra agora, no formato que a cena 3D entende. */
    quadraAgora(state, now, quadra) {
      const h = ABT.hourOf(now), dk = ABT.dk(now), P = pessoaPorId(state);
      const [abre, fecha] = hoursFor(state, now);
      const nomes = (ids) => (ids || []).map((id) => nomeTV(P[id]));
      const looks = {}; const look = (p) => { if (p && p.boneco) looks[nomeTV(p)] = p.boneco; };
      const spec = { quadra, looks };

      if (h < abre || h >= fecha) {
        const proximo = h < abre ? `Abre hoje às ${ABT.fmtHM(abre)}` : 'Fechada · abre amanhã';
        return Object.assign(spec, { type: 'livre', closed: true, next: proximo });
      }
      const slots = A.slotsDaQuadra(state, now, quadra);
      const ativo = slots.find((s) => {
        if (h < s.ini || h >= s.fim) return false;
        if (s.fonte === 'jogo') { const st = T.statusDe(s.ref, now); return st === 'andamento'; }
        return true;
      });
      const prox = slots.find((s) => s.ini > h && !(s.fonte === 'jogo' && s.ref.encerrado));
      const textoProx = prox ? `Próximo: ${ABT.fmtHM(prox.ini)} · ${NOME_TIPO[prox.tipo]}` : 'Sem mais reservas hoje';

      if (ativo) {
        const time = range(ativo.ini, ativo.fim);
        if (ativo.tipo === 'bloqueio') return Object.assign(spec, { type: 'bloqueado', time, motivo: ativo.ref.obs || 'Manutenção', next: textoProx });
        if (ativo.tipo === 'jogo') {
          const camp = ativo.camp, j = ativo.ref, pt = T.participantes(camp, j);
          if (!pt.a.id || !pt.b.id) return Object.assign(spec, { type: 'livre', time, next: `${T.rotuloJogo(j)}: aguardando definição das duplas` });
          const dupla = (x) => { const d = x.id && camp.duplas.find((q) => q.id === x.id); if (!d) return ['A definir', '—']; [d.p1, d.p2].forEach((id) => look(P[id])); return nomes([d.p1, d.p2]); };
          const sets = j.sets || [];
          return Object.assign(spec, { type: 'campeonato', time: `${T.rotuloJogo(j)} · ${time}`, teams: [dupla(pt.a), dupla(pt.b)],
            jogoId: j.id, campId: camp.id, torneio: camp.nome, fixed: { sets, atual: sets.length ? sets[sets.length - 1] : [0, 0] }, next: textoProx });
        }
        if (ativo.tipo === 'aula') {
          const r = ativo.ref, ids = (r.alunos || r.pessoas || []).slice(0, state.config.aulaMax || 6);
          const prof = P[r.professorId];
          if (ids.length >= (state.config.aulaMin || 1) && prof) {
            ids.forEach((id) => look(P[id])); look(prof);
            const turma = ids.length === 1 ? 'Aula particular' : (r.nome || r.obs || 'Aula em grupo');
            return Object.assign(spec, { type: 'aula', time, teacher: nomeTV(prof), students: nomes(ids), turma, next: textoProx });
          }
          return Object.assign(spec, { type: 'livre', time, next: 'Aula sem aluno ou professor definido' });
        }
        // aluguel
        const ids = (ativo.ref.pessoas || []).slice(0, 4); ids.forEach((id) => look(P[id]));
        const n = nomes(ids); while (n.length < 4) n.push('Convidado');
        return Object.assign(spec, { type: 'aluguel', time, teams: [[n[0], n[1]], [n[2], n[3]]], titular: nomes(ids)[0], next: textoProx,
          fixed: placarFixo(state, quadra, `a|${quadra}|${ABT.dk(now)}|${ativo.ref.inicio}`) });
      }

      // day use: sexta a domingo, fila por quadra (D07)
      const sessao = A.sessaoDayUse(state, now);
      if (sessao) {
        const pres = state.dayuse_presencas.filter((x) => x.sessaoId === sessao.id && x.quadra === quadra && x.status !== 'saiu');
        const ord = (st) => pres.filter((x) => x.status === st).sort((a, b) => (a.posicao || 0) - (b.posicao || 0)).map((x) => x.pessoaId);
        const jogam = ord('quadra'), fila = ord('fila');
        [...jogam, ...fila].forEach((id) => look(P[id]));
        const time = `Day use · ${range(ABT.parseHM(sessao.inicio), ABT.parseHM(sessao.fim))}`;
        if (jogam.length >= 4) return Object.assign(spec, { type: 'dayuse', time, players: nomes(jogam.slice(0, 4)), queue: nomes(jogam.slice(4).concat(fila)), valor: sessao.valor, next: textoProx,
          fixed: placarFixo(state, quadra, `d|${sessao.id}|${quadra}|${jogam.slice(0, 4).join(',')}`) });
        const esperando = nomes(jogam.concat(fila));
        if (esperando.length) return Object.assign(spec, { type: 'livre', waiting: esperando, next: `Day use: ${esperando.length} esperando · faltam ${Math.max(0, 4 - esperando.length)}` });
        return Object.assign(spec, { type: 'livre', next: 'Day use: pode entrar' });
      }
      return Object.assign(spec, { type: 'livre', next: textoProx });
    },

    /** Agenda do dia de uma quadra para o cartão público: sem nomes de pessoas (só tipo e horário). */
    agendaPublica(state, date, quadra) {
      const [abre, fecha] = hoursFor(state, date), rows = [];
      const slots = A.slotsDaQuadra(state, date, quadra);
      slots.forEach((s) => rows.push({ ini: s.ini, fim: s.fim, tipo: s.tipo === 'jogo' ? 'campeonato' : s.tipo, texto: s.tipo === 'jogo' ? s.camp.nome : (s.tipo === 'bloqueio' ? 'Manutenção' : NOME_TIPO[s.tipo]) }));
      let cur = abre;
      slots.slice().sort((a, b) => a.ini - b.ini).forEach((s) => { if (s.ini - cur >= 0.5 - 1e-9) rows.push({ ini: cur, fim: s.ini, tipo: 'livre', texto: 'Livre' }); cur = Math.max(cur, s.fim); });
      if (fecha - cur >= 0.5 - 1e-9) rows.push({ ini: cur, fim: fecha, tipo: 'livre', texto: 'Livre' });
      return rows.sort((a, b) => a.ini - b.ini);
    },

    /** Gente de fora que assiste: quem joga logo mais, visitantes e duplas do campeonato que não estão em quadra. */
    espectadores(state, now, emQuadra) {
      const h = ABT.hourOf(now), P = pessoaPorId(state), dk = ABT.dk(now), out = [], vistos = new Set(emQuadra);
      const add = (p) => { if (!p) return; const n = nomeTV(p); if (!vistos.has(n)) { vistos.add(n); out.push(n); } };
      [1, 2, 3, 4].forEach((q) => A.slotsDaQuadra(state, now, q).forEach((s) => {
        if (s.ini > h && s.ini - h <= 0.5 && s.tipo !== 'bloqueio' && s.fonte !== 'jogo') (s.ref.alunos || s.ref.pessoas || []).forEach((id) => add(P[id]));
      }));
      state.pessoas.filter((p) => p.tipo === 'visitante').forEach(add);
      state.campeonatos.forEach((c) => {
        if (!c.jogos.some((j) => j.data === dk)) return;
        c.duplas.forEach((d) => { add(P[d.p1]); add(P[d.p2]); });
      });
      return out.slice(0, 16);
    },

    /** Tudo que a cena precisa para se montar: 4 quadras + plateia + figurantes. */
    cena(state, now) {
      const quadras = [1, 2, 3, 4].map((q) => A.quadraAgora(state, now, q));
      const emQuadra = []; const looks = {};
      quadras.forEach((c) => {
        [].concat(c.teams ? c.teams.flat() : [], c.teacher ? [c.teacher] : [], c.students || [], c.players || [], c.queue || [], c.waiting || []).forEach((n) => emQuadra.push(n));
        Object.assign(looks, c.looks);
      });
      const [abre, fecha] = hoursFor(state, now), h = ABT.hourOf(now);
      const aberto = h >= abre && h < fecha;
      const ocupadas = quadras.filter((c) => c.type !== 'livre' && c.type !== 'bloqueado').length;
      const espectadores = aberto ? A.espectadores(state, now, emQuadra) : [];
      espectadores.forEach((n) => { const p = state.pessoas.find((x) => nomeTV(x) === n); if (p && p.boneco) looks[n] = p.boneco; });
      return { quadras, espectadores, looks, aberto, walkers: aberto ? Math.min(3, 1 + Math.ceil(ocupadas / 2)) : 0,
        cafe: aberto ? (h >= 17 && h < 21 ? 5 : h >= 11 && h < 14 ? 3 : 1) + (ocupadas > 2 ? 1 : 0) : 0 };
    },

    situacao(state, now) {
      const [abre, fecha] = hoursFor(state, now), h = ABT.hourOf(now);
      return { aberto: h >= abre && h < fecha, abre, fecha, h };
    },

    /** Faixa de avisos da TV (D41): avisos, aniversariantes e patrocinadores ativos hoje. */
    avisos(state, now) {
      const dk = ABT.dk(now), mmdd = dk.slice(5), out = [];
      const dentro = (x) => x.ativo !== false && (!x.inicio || x.inicio <= dk) && (!x.fim || x.fim >= dk);
      state.avisos.filter(dentro).forEach((a) => out.push({ tipo: 'aviso', texto: a.texto }));
      const aniv = state.pessoas.filter((p) => p.nascimento && p.nascimento.slice(5) === mmdd).map(nomeTV);
      if (aniv.length) out.push({ tipo: 'aniversario', texto: aniv.length === 1 ? `Hoje é aniversário de ${aniv[0]}. Parabéns!` : `Hoje é aniversário de ${aniv.slice(0, -1).join(', ')} e ${aniv[aniv.length - 1]}. Parabéns!` });
      state.patrocinadores.filter(dentro).forEach((p) => out.push({ tipo: 'patrocinio', texto: p.nome, imagem: p.imagem }));
      return out;
    },

    /** Texto estável que muda só quando a cena de uma quadra precisa ser refeita. */
    assinatura(spec) {
      const f = spec.fixed ? JSON.stringify([spec.fixed.sets || [], spec.fixed.texto || '']) : '';
      return [spec.type, spec.time || '', spec.closed ? 'x' : '', (spec.teams || []).flat().join(','), spec.teacher || '', (spec.students || []).join(','),
        (spec.players || []).join(','), (spec.waiting || []).join(','), spec.jogoId || '', spec.motivo || '', f].join('|');
    },
    assinaturaFila(spec) { return (spec.queue || []).join(','); },
    assinaturaAmbiente(c) { return [c.espectadores.join(','), c.walkers, c.cafe, c.aberto].join('|'); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
