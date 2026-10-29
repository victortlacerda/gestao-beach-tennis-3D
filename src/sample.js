/* ============================================================
   Dados de exemplo (Fase 2.2): carregar e apagar.
   Tudo é montado em volta da data de hoje, então sempre há horários nos próximos dias.
   Nomes e valores são inventados.
   ============================================================ */
(function (root) {
  const ABT = root.ABT = root.ABT || {};

  ABT.Sample = {
    /** Próximo sábado a partir de d (ou o próprio d, se for sábado). */
    proximoSabado(d) { return ABT.addDays(d, (6 - d.getDay() + 7) % 7); },

    build(base) {
      const D = ABT.Data, T = ABT.Torneio;
      const s = D.empty();
      s.criadoEm = new Date().toISOString();
      const slug = (n) => 'p_' + n.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
      const pid = slug;

      /* ---------- pessoas ---------- */
      const tel = '(00) 00000-0000';
      const pes = (nome, tipo, extra) => { s.pessoas.push(Object.assign({ id: pid(nome), nome, apelido: nome, tipo, contato: tel, nascimento: '', boneco: null }, extra || {})); };
      ['Marcos', 'Sandra'].forEach((n) => pes(n, 'professor'));
      const alunos = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Nina', 'Beto', 'Zeca', 'Maya'];
      alunos.forEach((n) => pes(n, 'aluno'));
      ['Bia', 'Léo', 'Caio', 'Duda', 'Pri', 'Rô', 'Sam', 'Tom'].forEach((n) => pes(n, 'locatario'));
      ['Gabi', 'Hugo', 'Íris', 'João', 'Kelly', 'Lucas', 'Mari'].forEach((n) => pes(n, 'dayuse'));
      ['Rui', 'Téo', 'Vivi', 'Lara', 'Dani', 'Gui', 'Lia', 'Caco', 'Ivo', 'Pati', 'Joca', 'Bel'].forEach((n) => pes(n, 'aluno'));
      ['Nando', 'Olívia', 'Pedro', 'Quel', 'Rafa', 'Sol'].forEach((n) => pes(n, 'visitante'));
      // aniversariante de hoje, para a faixa de avisos mostrar
      const carla = s.pessoas.find((p) => p.id === pid('Carla'));
      carla.nascimento = `1995-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
      const nomesPag = ['em_dia', 'em_dia', 'pendente', 'em_dia', 'atrasado'];
      s.pessoas.filter((p) => p.tipo === 'aluno').forEach((p, i) => {
        s.alunos.push({ pessoaId: p.id, plano: 'Mensal', contrato: '', pagamento: nomesPag[i % nomesPag.length], obs: '' });
      });

      /* ---------- turmas que se repetem toda semana (D04) ---------- */
      const ids = (ns) => ns.map(pid);
      s.turmas.push(
        { id: 't_inic', nome: 'Turma Iniciantes', professorId: pid('Marcos'), alunos: ids(['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio']), diasSemana: [1, 3, 5], inicio: '18:00', fim: '19:00', quadra: 2, ativa: true },
        { id: 't_avan', nome: 'Turma Avançada', professorId: pid('Sandra'), alunos: ids(['Nina', 'Beto', 'Zeca', 'Maya']), diasSemana: [2, 4], inicio: '19:00', fim: '20:00', quadra: 4, ativa: true },
        { id: 't_manha', nome: 'Turma da Manhã', professorId: pid('Sandra'), alunos: ids(['Ana', 'Elisa', 'Carla']), diasSemana: [2, 4], inicio: '07:00', fim: '08:00', quadra: 2, ativa: true },
        { id: 't_part', nome: 'Aula particular', professorId: pid('Marcos'), alunos: ids(['Diego']), diasSemana: [6], inicio: '09:00', fim: '10:00', quadra: 3, ativa: true },
      );

      /* ---------- horários avulsos, dayuse e campeonato ---------- */
      const sab = ABT.dk(ABT.Sample.proximoSabado(base));
      for (let i = -1; i <= 20; i++) {
        const d = ABT.addDays(base, i), dk = ABT.dk(d), w = d.getDay();
        const h = (quadra, ini, fim, tipo, pessoas, extra) => s.horarios.push(Object.assign({ id: D.uid('h'), quadra, data: dk, inicio: ini, fim: fim, tipo, pessoas: pessoas ? ids(pessoas) : [], preco: null, obs: '' }, extra || {}));
        if (dk === sab) { /* dia de campeonato: quadras reservadas pelos jogos */ }
        else {
          h(1, '18:00', '19:00', 'aluguel', ['Bia', 'Léo', 'Caio', 'Duda']);
          h(1, '19:00', '20:00', 'aluguel', ['Pri', 'Rô', 'Sam', 'Tom']);
          if (w >= 1 && w <= 5) h(3, '08:00', '09:00', 'aluguel', ['Kelly', 'Lucas', 'Mari', 'João']);
          if (w === 3) h(4, '09:00', '10:00', 'bloqueio', null, { obs: 'Manutenção da rede' });
        }
        if (w === 5 || w === 6 || w === 0) { // day use: sexta, sábado e domingo (D07)
          const sid = D.uid('du');
          s.dayuse_sessoes.push({ id: sid, data: dk, inicio: '17:00', fim: '21:00', valor: 20 });
          ['Gabi', 'Hugo', 'Íris', 'João'].forEach((n, k) => s.dayuse_presencas.push({ id: D.uid('pr'), sessaoId: sid, pessoaId: pid(n), status: 'quadra', quadra: 3, posicao: k + 1 }));
          ['Kelly', 'Lucas', 'Mari'].forEach((n, k) => s.dayuse_presencas.push({ id: D.uid('pr'), sessaoId: sid, pessoaId: pid(n), status: 'fila', quadra: 3, posicao: k + 1 }));
        }
      }

      /* ---------- campeonato: Copa da Arena (8 duplas, 2 grupos) ---------- */
      const nomes = [['Rui', 'Téo'], ['Vivi', 'Lara'], ['Nina', 'Beto'], ['Zeca', 'Maya'], ['Dani', 'Gui'], ['Lia', 'Caco'], ['Ivo', 'Pati'], ['Joca', 'Bel']];
      const duplas = nomes.map((n, i) => ({ id: 'd' + (i + 1), nome: n.join('/'), p1: pid(n[0]), p2: pid(n[1]), grupo: i < 4 ? 'A' : 'B' }));
      const camp = { id: 'c_copa', nome: 'Copa da Arena', status: 'em_andamento', formato: Object.assign({}, T.FORMATO), duplas, jogos: [] };
      const resultados = [[[6, 3], [6, 4]], [[4, 6], [6, 2], [10, 7]], [[6, 1], [6, 0]], [[3, 6], [4, 6]]];
      const parciais = [[[6, 4], [3, 2]], [[2, 6], [4, 3]], [[5, 4]], [[6, 3], [1, 0]]];
      const porRodada = [[], [], []];
      ['A', 'B'].forEach((g) => {
        T.rodadasGrupo(duplas.filter((d) => d.grupo === g).map((d) => d.id)).forEach((par, r) => par.forEach(([a, b]) => porRodada[r].push({ id: `g${g}${r + 1}${porRodada[r].length}`, fase: 'grupo', grupo: g, rodada: r + 1, a, b, sets: [] })));
      });
      const grupoJogos = porRodada.flat();
      T.agendar(grupoJogos, { data: sab, inicio: 14, duracao: 1, quadras: [1, 2, 3, 4] });
      porRodada.forEach((rod, r) => rod.forEach((j, k) => {
        if (r === 0) { j.sets = resultados[k % resultados.length]; j.encerrado = true; }
        else if (r === 1) { j.sets = parciais[k % parciais.length]; }
      }));
      // jogos de ida e volta para os resultados da rodada 2 não ficarem "encerrados": o status vem da hora
      camp.jogos.push(...grupoJogos);
      const mm = T.gerarMataMata(['A', 'B'], 2, true).jogos;
      mm.forEach((j) => { j.sets = []; });
      T.agendar(mm.filter((j) => j.fase === 'semi'), { data: sab, inicio: 17, duracao: 1, quadras: [1, 2] });
      T.agendar(mm.filter((j) => j.fase === 'final'), { data: sab, inicio: 18, duracao: 1, quadras: [1] });
      T.agendar(mm.filter((j) => j.fase === 'terceiro'), { data: sab, inicio: 18, duracao: 1, quadras: [2] });
      camp.jogos.push(...mm);
      s.campeonatos.push(camp);

      /* ---------- avisos, patrocinador (sem imagem) ---------- */
      const hoje = ABT.dk(base), ate = ABT.dk(ABT.addDays(base, 4));
      s.avisos.push({ id: D.uid('av'), texto: 'Sábado tem Copa da Arena. Venha torcer!', inicio: hoje, fim: sab, ativo: true });
      s.avisos.push({ id: D.uid('av'), texto: 'Aulas experimentais grátis esta semana. Fale com a recepção.', inicio: hoje, fim: ate, ativo: true });
      s.patrocinadores.push({ id: D.uid('pa'), nome: 'Loja Exemplo · material esportivo', imagem: '', inicio: hoje, fim: ABT.dk(ABT.addDays(base, 30)), ativo: true });

      /* ---------- o que as próximas fases vão usar (só para o arquivo ficar completo) ---------- */
      s.equipamentos.push({ id: 'e_raq', nome: 'Raquetes', quantidade: 14, minimo: 10 }, { id: 'e_bol', nome: 'Bolinhas', quantidade: 36, minimo: 40 });
      s.produtos.push({ id: 'pr_1', nome: 'Garrafa de água', preco: 6, estoque: 20, disponivel: true });
      s.cardapio.push({ id: 'c_1', categoria: 'Lanches', nome: 'Pão de queijo', preco: 6, disponivel: true }, { id: 'c_2', categoria: 'Bebidas', nome: 'Suco natural', preco: 9, disponivel: true });
      s.limpezas.push({ id: 'l_1', local: 'Vestiário', quando: ABT.dk(ABT.addDays(base, -1)) + 'T08:15', responsavel: 'Rita', link: '' });
      s.manutencoes.push({ id: 'm_1', local: 'Vestiário', quando: ABT.dk(ABT.addDays(base, -15)), descricao: 'Troca de cadeados', responsavel: 'Sérgio', link: '' });
      return s;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
