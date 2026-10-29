/* ============================================================
   Camada de dados (Fase 2.1)
   - Tudo fica num único objeto JSON, salvo no navegador (localStorage).
   - Exportar / importar .json (D17), com número de versão para dados antigos abrirem.
   - Duas janelas no mesmo computador se atualizam sozinhas (D30): BroadcastChannel + evento "storage".
   - Aviso de backup após N dias sem exportar (D31, padrão 7).
   Funciona no navegador e no Node (para os testes).
   ============================================================ */
(function (root) {
  const ABT = root.ABT = root.ABT || {};

  /* ---------- datas e horas (sempre horário local) ---------- */
  const p2 = (n) => String(n).padStart(2, '0');
  ABT.dk = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;       // 2026-10-28
  ABT.parseDK = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  ABT.parseHM = (s) => { const [h, m] = String(s).split(':').map(Number); return h + (m || 0) / 60; }; // '18:30' -> 18.5
  ABT.fmtHM = (h) => `${p2(Math.floor(h + 1e-9) % 24)}:${p2(Math.round((h - Math.floor(h + 1e-9)) * 60) % 60)}`;
  ABT.hourOf = (d) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  ABT.addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds()); return x; };

  const APP = 'arena-beach-tennis';
  const VERSION = 2;
  const KEY = 'abt.dados';

  const COLLECTIONS = ['pessoas', 'alunos', 'horarios', 'turmas', 'tabela_precos', 'feriados', 'dayuse_sessoes', 'dayuse_presencas',
    'produtos', 'cardapio', 'vendas', 'equipamentos', 'limpezas', 'manutencoes', 'campeonatos', 'patrocinadores', 'avisos', 'placares'];

  function defaultConfig() {
    return {
      nomeArena: 'Arena Beach Tennis',
      horario: { semana: [6, 22], fimSemana: [7, 21] },        // D33
      faixas: [                                                  // D42
        { id: 'manha', nome: 'Manhã', de: 6, ate: 12 },
        { id: 'tarde', nome: 'Tarde', de: 12, ate: 18 },
        { id: 'noite', nome: 'Noite', de: 18, ate: 22 },
      ],
      diasAvisoBackup: 7,                                        // D31
      diasLimpezaAtrasada: 1,                                    // D43
      anuncioSegundos: 8,                                        // D41
      valorDayUse: 20,                                           // D36
      aulaMax: 6, aulaMin: 1,                                    // D05, D34
      placarIlustrativo: false,                                  // D46 = A: aluguel e day use mostram "Em jogo" até alguém digitar o placar
      pinHash: null, pinSalt: '',                                // PIN do modo Organização (D11). Trava de tela, não é segurança forte
    };
  }

  function empty() {
    const s = { app: APP, versao: VERSION, criadoEm: new Date().toISOString(), ultimoBackup: null, config: defaultConfig() };
    COLLECTIONS.forEach((c) => { s[c] = []; });
    return s;
  }

  /* ---------- validação e migração ---------- */
  function normalize(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('O arquivo não é um JSON de dados da arena.');
    if (obj.app !== APP) throw new Error('Este arquivo não é um backup da Arena Beach Tennis.');
    if (typeof obj.versao !== 'number') throw new Error('Arquivo sem número de versão.');
    if (obj.versao > VERSION) throw new Error(`Este arquivo é da versão ${obj.versao}, mais nova que este app (${VERSION}). Atualize o app.`);
    // migrações: cada passo leva os dados de uma versão para a seguinte
    if (obj.versao < 2) { // v2: placar de enfeite desligado (D46) e campos do PIN
      obj.config = Object.assign({}, obj.config, { placarIlustrativo: false });
      obj.placares = obj.placares || [];
      obj.versao = 2;
    }
    const s = empty();
    s.criadoEm = obj.criadoEm || s.criadoEm;
    s.ultimoBackup = obj.ultimoBackup || null;
    s.config = Object.assign(defaultConfig(), obj.config || {});
    COLLECTIONS.forEach((c) => {
      if (obj[c] !== undefined && !Array.isArray(obj[c])) throw new Error(`Campo "${c}" inválido: deveria ser uma lista.`);
      s[c] = obj[c] || [];
    });
    s.versao = VERSION;
    return s;
  }

  /* ---------- armazenamento ---------- */
  const mem = {}; // plano B quando o navegador bloqueia o armazenamento
  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return mem[k] == null ? null : mem[k]; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); return true; } catch (e) { mem[k] = v; return false; } }
  function lsDel(k) { try { root.localStorage.removeItem(k); } catch (e) { delete mem[k]; } }

  const listeners = [];
  let chan = null;
  const tabId = Math.random().toString(36).slice(2);

  ABT.Data = {
    VERSION, COLLECTIONS, state: null, storageOk: true,
    empty, normalize, defaultConfig,

    uid(prefix) { return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); },

    init() {
      const raw = lsGet(KEY);
      if (raw) {
        try { this.state = normalize(JSON.parse(raw)); } catch (e) { this.loadError = e.message; this.state = empty(); }
      } else this.state = empty();
      this._listen();
      return this.state;
    },

    get() { if (!this.state) this.init(); return this.state; },

    /** Altera os dados: fn recebe o objeto e pode mexer à vontade. Salva e avisa as outras janelas. */
    update(fn) {
      const s = this.get(); fn(s); this._persist(true);
    },
    replace(newState) { this.state = normalize(newState); this._persist(true); },

    _persist(broadcast) {
      this.storageOk = lsSet(KEY, JSON.stringify(this.state)); // false = navegador bloqueou ou lotou: nada será lembrado ao fechar
      if (broadcast && chan) { try { chan.postMessage({ from: tabId, t: Date.now() }); } catch (e) { /* ignora */ } }
      this._emit();
    },

    onChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    _emit() { listeners.slice().forEach((f) => { try { f(this.state); } catch (e) { if (root.console) console.error(e); } }); },

    _listen() {
      if (this._listening || typeof root.addEventListener !== 'function') return;
      this._listening = true;
      const reload = () => {
        const raw = lsGet(KEY);
        try { this.state = raw ? normalize(JSON.parse(raw)) : empty(); } catch (e) { return; }
        this._emit();
      };
      try {
        if (typeof root.BroadcastChannel === 'function') { chan = new root.BroadcastChannel('abt-sync'); chan.onmessage = (e) => { if (!e.data || e.data.from !== tabId) reload(); }; }
      } catch (e) { chan = null; }
      root.addEventListener('storage', (e) => { if (e.key === KEY) reload(); });
    },

    /* ---------- exemplo e limpeza ---------- */
    loadSample(baseDate) {
      this.state = normalize(ABT.Sample.build(baseDate || new Date()));
      this._persist(true);
    },
    clear() { this.state = empty(); this._persist(true); },
    isEmpty() { const s = this.get(); return COLLECTIONS.every((c) => !s[c].length); },

    /* ---------- exportar / importar (D17) ---------- */
    exportText() { return JSON.stringify(this.get(), null, 2); },
    exportFileName(now) { const d = now || new Date(); return `arena-beach-tennis-backup-${ABT.dk(d)}-${p2(d.getHours())}${p2(d.getMinutes())}.json`; },
    markBackup(now) { this.get().ultimoBackup = (now || new Date()).toISOString(); this._persist(true); },
    /** Baixa o arquivo (só no navegador) e registra a data do backup. */
    downloadBackup(now) {
      const d = now || new Date();
      this.get().ultimoBackup = d.toISOString();
      const text = this.exportText();
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = this.exportFileName(d);
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      this._persist(true);
    },
    /** Lê texto JSON, valida e substitui os dados. Devolve {ok, erro, resumo}. */
    importText(text) {
      let obj;
      try { obj = JSON.parse(text); } catch (e) { return { ok: false, erro: 'O arquivo não é um JSON válido.' }; }
      try { this.replace(obj); } catch (e) { return { ok: false, erro: e.message }; }
      return { ok: true, resumo: this.summary() };
    },
    summary() { const s = this.get(); return { pessoas: s.pessoas.length, horarios: s.horarios.length, turmas: s.turmas.length, campeonatos: s.campeonatos.length }; },

    /** Situação do backup para o aviso de N dias (D31). */
    backupInfo(now) {
      const s = this.get(), n = (now || new Date()).getTime();
      const limite = s.config.diasAvisoBackup || 7;
      if (this.isEmpty()) return { nunca: !s.ultimoBackup, dias: null, atrasado: false, limite, vazio: true };
      if (!s.ultimoBackup) return { nunca: true, dias: null, atrasado: true, limite };
      const dias = Math.floor((n - new Date(s.ultimoBackup).getTime()) / 86400000);
      return { nunca: false, dias, atrasado: dias >= limite, limite };
    },
  };

  /* ---------- relógio da arena: hora real ou simulada (para demonstrar) ---------- */
  const CK = 'abt.relogio';
  ABT.Clock = {
    sim: null, // { base: ms, real: ms }
    init() {
      try { const raw = lsGet(CK); this.sim = raw ? JSON.parse(raw) : null; } catch (e) { this.sim = null; }
      if (typeof root.addEventListener === 'function') root.addEventListener('storage', (e) => { if (e.key === CK) { try { this.sim = e.newValue ? JSON.parse(e.newValue) : null; } catch (x) { this.sim = null; } this.onChange && this.onChange(); } });
    },
    now() { return this.sim ? new Date(this.sim.base + (Date.now() - this.sim.real)) : new Date(); },
    isSim() { return !!this.sim; },
    setSim(date) { this.sim = { base: date.getTime(), real: Date.now() }; lsSet(CK, JSON.stringify(this.sim)); this.onChange && this.onChange(); },
    setReal() { this.sim = null; lsDel(CK); this.onChange && this.onChange(); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
