/* ============================================================
   Arena Beach Tennis 3D — configuração geral
   Tudo que é "número mágico" do projeto fica aqui.
   Unidades do mundo 3D: metros. X = direita, Y = cima, Z = em direção à câmera/entrada.
   ============================================================ */
window.ABT = window.ABT || {};

ABT.C = {
  brand: 'Arena Beach Tennis', // nome provisório (D20: marca genérica)

  // Paleta provisória (D38)
  palette: {
    sand: 0xF2D8A7,
    turquoise: 0x1FB5B0,
    coral: 0xFF6B57,
    navy: 0x12355B,
    cream: 0xFFF9EE,
  },

  // Status dos horários (D38): sempre cor + texto (+ ícone na interface)
  status: {
    livre:       { label: 'Livre',       color: 0x2E9E5B, icon: '✔' },
    aula:        { label: 'Aula',        color: 0x7A4FD1, icon: '🎓' },
    aluguel:     { label: 'Aluguel',     color: 0x2A6FD0, icon: '🎾' },
    dayuse:      { label: 'Day use',     color: 0xF29B2F, icon: '🔁' },
    campeonato:  { label: 'Campeonato',  color: 0xD9A800, icon: '🏆' },
    bloqueado:   { label: 'Manutenção',  color: 0x8A8F98, icon: '🛠' },
  },

  // Quadra oficial ITF: 16 m x 8 m, rede 1,70 m (feminino) / 1,80 m (masculino)
  court: { L: 16, W: 8, padL: 20, padW: 12, padH: 0.14, netH: 1.7 },

  // Disposição 2x2 (D21): duas lado a lado nos fundos e duas na frente
  courts: [
    { id: 1, cx: -12, cz: -8 },
    { id: 2, cx:  12, cz: -8 },
    { id: 3, cx: -12, cz:  8 },
    { id: 4, cx:  12, cz:  8 },
  ],

  // Horário de funcionamento (D33)
  hours: { weekday: [6, 22], weekend: [7, 21] }, // seg–sex 06–22, sáb/dom 07–21

  // Arquibancada na lateral direita, por toda a extensão (D23)
  bleacher: { x0: 23, rows: 5, rowD: 0.8, rowH: 0.45, z0: -14, z1: 14 },

  // Fachada com os ambientes de apoio (D21): ordem da esquerda para a direita
  facade: { z0: 19, z1: 26 },

  dayStartHour: 16.5, // hora inicial da cena de demonstração (tarde ensolarada)
};

ABT.dayNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

ABT.hoursFor = function (date) {
  const d = date.getDay();
  return (d === 0 || d === 6) ? ABT.C.hours.weekend : ABT.C.hours.weekday;
};
