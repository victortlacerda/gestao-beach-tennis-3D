# 🏖️ Arena Beach Tennis 3D — Planejamento e Roadmap

> Documento vivo. A cada rodada: eu envio, você responde as decisões e devolve, eu atualizo e seguimos.
> **Regra de ouro: nenhuma ideia se perde.** Tudo que foi dito está nas seções 3, 4 ou 12. O que ainda não tem lugar definido vai para a seção 12 (Banco de ideias).

**Versão do documento:** 1.0
**Status atual:** ✅ Fases 0, 1 e 2 fechadas e testadas por você · ✅ Fase 3 entregue (D47–D49 fechadas) · 🟢 **Fase 4 (polimento e lançamento) entregue para sua avaliação**: falta o seu teste de campo com dados reais e a publicação

---

## 0.x O que mudou da v0.9 para a v1.0 (esta rodada)

**Fase 4 entregue.** Suas respostas: **D47 = A, D48 = A, D49 = A** (tudo como estava, sem mudar código).

1. **Acessibilidade (4.2):** contraste medido e corrigido (texto branco ou escuro escolhido automaticamente sobre cada cor; verde e azul das etiquetas escurecidos); nomes para leitores de tela nos botões; contorno de foco visível ao navegar pelo teclado; cor sempre acompanhada de texto.
2. **Backup e restauração (4.3):** novo teste automático (36 verificações): exportar, apagar tudo, importar e conferir que tudo volta idêntico (incluindo PIN, bonecos, placares e estoque); arquivos errados, vazios ou de outro aplicativo são **recusados sem tocar nos dados atuais**; arquivos de versão antiga abrem e são atualizados; campos desconhecidos não quebram. O exemplo grande ocupa bem menos que o limite do navegador. Se o navegador não conseguir salvar, o Resumo mostra um aviso.
3. **Publicação (4.4):** `node build.js` agora também gera `dist/pages/index.html` (+ `.nojekyll`), pronto para enviar ao GitHub Pages. Passo a passo no manual.
4. **Manual rápido (4.5):** documento editável "Manual rápido da Arena Beach Tennis" (primeiro uso, rotina do dia, TV, campeonato, backup e problemas comuns, publicação).
5. **Testes automáticos:** 43 (campeonato) + 41 (agenda) + 195 (regras) + 36 (backup) passando.

Falta só o que depende de você: **3.15** e **4.1** (uso real) e, se quiser, a publicação (4.4). Veja a seção 16.

---

## 0.y O que mudou da v0.8 para a v0.9

**A Fase 3 está pronta para você testar: o modo Organização.** Agora dá para operar a arena pela tela, sem editar arquivo:

1. **Seu retorno:** a Fase 1 e a Fase 2 rodaram bem no seu computador e na TV (itens 1.14 e 2.8 marcados). **D46 = A** fechada: aluguel e day use mostram só **"Em jogo"** na TV até a recepção digitar o placar (botões **+1**). Nunca aparece placar inventado.
2. **Entrada com PIN** (4 a 8 números, criado na primeira vez). Trava a tela do computador da arena; não é segurança forte (D11). Botão **🔒 Travar**.
3. **Painel da Organização** à direita, com a arena à esquerda. Clicar numa área da arena abre a tela certa (quadra → agenda; recepção → escritório; lojinha, lanchonete, vestiário, estoque). Telas:
   - **Resumo:** alertas (backup, estoque baixo, limpeza atrasada, pagamento atrasado, jogo sem resultado), quadras agora, vendas do dia.
   - **Quadras:** agenda por dia, horários livres com botão **Marcar**, aluguel/aula/manutenção, aviso de conflito antes de salvar, repetir toda semana, preço sugerido pela tabela e **placar +1**.
   - **Aulas:** turmas semanais (1 a 6 alunos, professor, dias, quadra), cancelar a aula só num dia.
   - **Day use:** sessão do dia, **Chegou alguém** (cobra R$ 20,00 como venda), fila por quadra, subir/descer/mover, **Terminou a partida** com Saiu / Continua / Fica.
   - **Preços:** tabela faixa × dia útil/fim de semana/feriado × duração (começa vazia), lista de feriados, valor do day use.
   - **Escritório:** pessoas e alunos (apelido da TV, contato, nascimento opcional, link do contrato, pagamento) e **editor de boneco com prévia 3D**, presets e sorteio.
   - **Lojinha e lanchonete:** vender (venda atual, forma de pagamento), produtos e cardápio com preço e disponibilidade, vendas do dia, desfazer venda.
   - **Estoque:** bolinhas e raquetes em destaque, alerta de mínimo. **Vestiário:** limpeza e manutenção com link do Drive e lembrete.
   - **Campeonato:** criar torneio (duplas, grupos sorteados, mata-mata cruzado, horários nas quadras livres), lançar placar por set, mudar horário.
   - **Avisos e patrocinadores**, e **Dados** (backup exportar/importar, configurações, PIN).
4. **Modo Ambiente (TV) agora mostra cartões públicos:** lojinha e lanchonete com produtos, preços e disponibilidade; cada quadra com a agenda do dia **sem nomes**; escritório, vestiário e estoque mostram o cadeado.
5. **Testes automáticos:** 41 (agenda) + 43 (campeonato) + 195 (regras da Organização) passando, mais um teste de tela completo (marcar horário, conflito, day use, placar, venda, boneco, campeonato, PIN) sem erros.

Perguntas novas e pendências: seção 8.4 (D47 a D49) e o teste da Fase 3 na seção 16.

---

## 0.0d O que mudou da v0.7 para a v0.8


**A Fase 2 está pronta para você testar.** O app agora funciona com dados de verdade (por enquanto carregados do exemplo ou de um `.json`), sem servidor:

1. **Dados no navegador + exportar/importar `.json`** (D17), com número de versão e aviso após 7 dias sem backup (D31).
2. **Modo Ambiente guiado pelos dados:** a cena 3D mostra o que a agenda manda para a hora atual (aula, aluguel, day use, campeonato, manutenção, livre ou fechada). Troca sozinha quando a hora vira.
3. **Modo Campeonato:** cena à esquerda e, à direita, "Jogando agora", tabela de cada grupo, mata-mata cruzado e histórico. O motor segue o padrão D37 (grupos todos-contra-todos, classificam 2, desempate, mata-mata).
4. **Duas janelas sincronizadas (D30):** uma na TV (`#campeonato` ou `#ambiente`) e outra no PC do dono. O que muda numa aparece na outra em segundos.
5. **Faixa de avisos (D41):** avisos, aniversariantes, patrocinadores e "Próximos" do day use, trocando a cada 8 s.
6. **Relógio da arena:** hora real, com opção de **simular** outro dia e horário para demonstrar (ex.: "Sexta 18:30", "Sábado 15:30"). O céu acompanha o relógio.
7. **Horários e regras já valem:** seg–sex 06–22, sáb/dom 07–21 (fora disso a arena aparece "Fechada"), aula de 1 a 6 alunos, day use manual (sem rodízio automático), na TV só apelido ou primeiro nome.
8. **Testes automáticos** do motor de campeonato, dos dados e da agenda (80 verificações passando).

Pendências e novas perguntas: seção 8.3 (D46).

---

## 0.0c O que mudou da v0.6 para a v0.7

1. **Você aprovou os wireframes e a Rodada 3 inteira.** Fase 0 fechada.
2. **Decisões fechadas:** D42 faixas Manhã 06–12, Tarde 12–18, Noite 18–22 · D43 limpeza atrasada após 1 dia · D44 data de nascimento opcional · D45 o aluno personaliza o boneco pela recepção.
3. **Começou a Fase 2** (seção 11).

---

## 0.0b O que mudou da v0.5 para a v0.6

1. **Wireframes prontos** (12 telas, página publicada com o nome "Wireframes Arena Beach Tennis"). Ao desenhar, surgiram **4 perguntas pequenas** (seção 8.2, Rodada 3).
2. Nenhuma decisão anterior mudou.

---

## 0.0a O que mudou da v0.4 para a v0.5

1. **D40 fechada:** você **gostou da ordem atual da fachada** (Recepção · Lojinha · Lanchonete · Vestiário · Estoque) e não queria ter marcado "Outra". Fica como está.
2. **Todas as decisões da Rodada 2 estão fechadas.** Falta só aprovar os wireframes para fechar a Fase 0.

---

## 0.0 O que mudou da v0.3 para a v0.4

Você devolveu a Rodada 2 respondida. O que isso muda:

1. **D26 = B: não haverá Modo Cliente na v1.** Só a equipe marca horários. Cliente remoto (pedido de reserva pelo celular) vai para o **Futuro**. Isso **tira** o quiosque que eu tinha assumido: saem a rota `#/cliente`, a tela de pedidos pendentes e a coleção `pedidos_reserva` da v1.
2. **D35: o preço do aluguel varia por 4 fatores ao mesmo tempo:** faixa de horário, dia útil × fim de semana, **feriados** e duração (1h, 2h). A tabela de preços precisa de uma **lista de feriados** (cadastrada à mão; ver seção 12).
3. **D36: day use = R$ 20,00 por pessoa**, registrado como venda (forma de pagamento).
4. **Confirmadas como eu tinha assumido:** D27 (registro de venda na v1, comanda depois), D28 (fluxo manual da fila), D29 (GitHub Pages **e** arquivo único), D30 (mesmo computador, duas janelas), D31 (navegador + exportar/importar, aviso com 7 dias), D32 (Chrome), D37 (padrão de campeonato), D38 (paleta), D39 (peças e 12 presets), D41 (link direto de imagem, 8 s), escopo da v1 (seção 9).
5. **D40:** a marcação "Outra" na ordem da fachada foi engano; **fica a ordem atual** (confirmado na v0.5). Arquibancada à direita, convivência com vista, fila junto à quadra e quadras descobertas também confirmados.

---

## 0.1 O que mudou da v0.2 para a v0.3

1. **Fase 1 (animação 3D) começou e já tem uma versão para você abrir** (arquivo único, sem instalar nada). Veja a seção 11.
2. **Horários fechados (D33):** segunda a sexta **06:00–22:00**; sábado e domingo **07:00–21:00**. A agenda, o relógio "Aberto/Fecha às…" e o ciclo dia/noite da cena já usam isso.
3. **Aula particular (D34):** existe, **mínimo de 1 pessoa** (máximo 6). Turma = 1 a 6 alunos.
4. **Decisões D26–D32 e D35–D41 ainda sem resposta.** Para não parar, **assumi a recomendação ⭐ de cada uma** e listei na seção 8.1 como "assumido, a confirmar". Nada disso trava a Fase 1; só precisa estar resolvido antes da Fase 2/3.
5. **Ajuste técnico:** o app é feito com **arquivos JavaScript simples** (sem Vite, sem Node, sem servidor). O arquivo único abre com **duplo clique** (isso atende D14 e a opção B/C de D29).

---

## 0.2 O que mudou da v0.1 para a v0.2

1. **Arquitetura mudou:** sem Node, sem banco de dados, sem servidor. Agora é um app **100% de navegador** (HTML + JavaScript + Three.js), com dados salvos no próprio navegador e **exportar/importar JSON** como backup (suas respostas D14, D17).
2. **Regras do day use** registradas do jeito que você descreveu: tudo **manual**, sem automação por enquanto (D07).
3. **Regras ITF** pesquisadas (quadra, rede, pontuação, fase de grupos). Resumo na seção 6. Alguns detalhes eu não consegui confirmar e deixei marcados.
4. **Layout da arena** desenhado em esboço (seção 3.0) com base na sua descrição.
5. **Encontrei 3 conflitos** entre respostas (Modo Cliente, comanda e day use automático). Estão na **Rodada 2, bloco A**, com proposta de solução.
6. **Rodada 2 de decisões** (D26 em diante), bem menor que a primeira.

---

## Como usar este documento

1. Vá direto na **seção 8 (Rodada 2)**. As decisões D01–D25 já estão fechadas na seção 7.
2. Marque `[x]` na opção escolhida ou escreva a resposta. Pode ser "aceito a recomendação (⭐)" em tudo.
3. Devolva o arquivo. Eu atualizo para a v0.3.
4. Só começamos a desenvolver quando a Fase 0 estiver toda marcada.

---

## 1. Visão do produto

Um **app web com uma arena de beach tennis em 3D** que funciona como painel da quadra e também como sistema de gestão:

- **Visual:** cena 3D animada com 4 quadras, área de convivência, escritório, vestiário e estoque.
- **Funcional:** clicar em cada área abre o "sistema" daquela área (agenda, preços, cadastros etc.).
- **Dia a dia:** a mesma cena roda na TV como vitrine (modo Ambiente) e como painel de torneio (modo Campeonato).
- **Gestão:** o dono controla tudo pelo modo Organização, que clientes não acessam.

### O que o app NÃO é

- **Não armazena** fotos, vídeos ou áudios. Ficam no Drive; o sistema guarda **só o link**.
- **Não tem servidor nem banco de dados.** Os dados ficam no navegador do computador da arena e o backup é um arquivo `.json`.
- **Não processa pagamentos.** Só registra manualmente (D12, D13).

### Princípios de design e UX

- **Prático primeiro:** tarefas comuns (marcar horário, ver quem joga agora) em no máximo 3 cliques.
- **Cena como menu:** o 3D é a navegação. Clicou na quadra, abriu a quadra.
- **Leitura de longe:** no modo TV, fontes grandes, alto contraste, nada que dependa de mouse.
- **Estados visíveis na cena:** o que acontece aparece no mundo 3D (bonecos, cores, arquibancada), não só em tabelas.
- **Leve:** rodar bem num PC/notebook comum ligado à TV por HDMI. Estilo *low-poly*, colorido, ensolarado.
- **Consistente e acessível:** mesma paleta, ícones e cores de status em todo o sistema; **status nunca só por cor** (sempre cor + ícone + texto), para quem tem daltonismo.

---

## 2. Os modos do sistema

| Modo | Quem usa | Para que serve | Acesso |
|---|---|---|---|
| **Ambiente** | TV / público | Cena 3D das 4 quadras + lista lateral com apelidos e horários de quem está jogando. É o que fica passando no dia a dia. Inclui avisos, aniversariantes e propagandas/patrocinadores. | Livre |
| **Campeonato** | TV / público | Cena 3D dos jogos em andamento + tela dividida com histórico de jogos, tabela da fase de grupos e mata-mata. | Livre |
| **Organização** | Dono | Controle total: agendas, cadastros, financeiro (situação), vendas, estoque, vestiário, cardápio, campeonato. | 🔒 Login / PIN |
| ~~Cliente~~ | Aluno / quem aluga | **Fora da v1 (D26 = B).** Só a equipe marca horários. Pedido de reserva pelo celular fica para o Futuro. | — |

**Câmera (D19):** nos modos Ambiente/Campeonato, câmera **fixa/automática** (visão geral e foco em quadras com jogo). Na Organização, câmera **livre** (girar, aproximar) e atalhos para cada área.

---

## 3. Áreas da arena e o que cada uma mostra

### 3.0 Layout da arena (esboço para validar)

Baseado na sua descrição: **4 quadras em 2×2** nos fundos, **fachada de entrada** com todos os ambientes de apoio e **arquibancada** ao longo da lateral.

```
                      FUNDOS
        ┌────────────────┐   ┌────────────────┐
        │   QUADRA 1     │   │   QUADRA 2     │  ▒▒
        │   16 m × 8 m   │   │   16 m × 8 m   │  ▒▒  ARQUIBANCADA
        └────────────────┘   └────────────────┘  ▒▒  (toda a extensão
             corredor central de circulação      ▒▒   lateral)
        ┌────────────────┐   ┌────────────────┐  ▒▒
        │   QUADRA 3     │   │   QUADRA 4     │  ▒▒
        │   16 m × 8 m   │   │   16 m × 8 m   │  ▒▒
        └────────────────┘   └────────────────┘  ▒▒
  ═══════════════ FACHADA / ENTRADA (ambiente de chegada) ═══════════════
   Recepção/     Convivência:        Vestiário    Estoque
   Escritório    Lojinha + Lanchonete  (só Org.)   (só Org.)
```

- Quadras com **dimensões oficiais ITF: 16 m × 8 m** (seção 6).
- A ordem dos ambientes na fachada e o lado da arquibancada são propostas minhas. Confirmar na **D40**.
- Referência de mercado: arenas de alto padrão costumam combinar quadras, área de descanso/convivência e um bar/lounge com vista para as quadras (por exemplo, uma arena de beach tennis com 4 quadras, parte delas cobertas, área de relaxamento e rooftop bar). Pretendo usar isso como inspiração: **convivência com vista para as quadras**.

### 3.1 Quadras (4 quadras 3D)
- [x] Clicar em uma quadra abre a **agenda** daquela quadra.
- [x] Horários com tipos visíveis por cor + ícone: **Aula**, **Livre**, **Aluguel**, **Day use**, **Campeonato**, **Manutenção/Bloqueado**.
- [x] Marcar (reservar) um horário direto na agenda.
- [x] Ver na quadra 3D quem está jogando agora.
- [x] **Jogo:** 4 jogadores = 2 duplas, uma de cada lado da rede.
- [x] **Aula:** até **6 alunos + professor** (D05). Professor destacado (cor, brilho, ícone, nome flutuante).
- [x] Arquibancada: se houver alguém sentado, indica que tem gente de fora.
- [x] Day use: fila de espera **por quadra, gerenciada manualmente** (D07). *Atualização: a fila não avança sozinha por enquanto.*
- [x] Duração do horário **varia por tipo** (D01): aula 1h, aluguel 1h, day use por partida.
- [x] Funcionamento **todos os dias** (D03). Horário exato: ver D33.

### 3.2 Convivência: Lojinha
- [x] Produtos à venda (nome, preço, disponibilidade/estoque).
- [x] Edição só no modo Organização.
- [x] **Registro manual de venda** (D13): item, quantidade, forma de pagamento (crédito, débito, Pix, dinheiro). Sem integração com maquininha ou banco.

### 3.3 Convivência: Lanchonete
- [x] Lanches, bebidas e churrasquinho, com preço e **disponibilidade** (disponível / acabou).
- [x] Categorias: Lanches · Bebidas · Churrasquinho.
- [x] **Registro manual de venda** (igual à lojinha).

### 3.4 Escritório / Recepção
- [x] Lista de **todos os alunos**, contato, contrato (link do Drive), situação de pagamento (em dia / pendente / atrasado — D10).
- [x] 🔒 Só no modo Organização.

### 3.5 Vestiário
- [x] 🔒 **Somente modo Organização.**
- [x] Último registro de limpeza (data/hora, quem fez) e última manutenção (data, o que foi feito).
- [x] Anexos (foto/vídeo) só como link do Drive.
- [x] Lembrete de limpeza atrasada, **somente no modo Organização**.

### 3.6 Estoque (salinha)
- [x] Todos os equipamentos com quantidade; destaque para **bolinhas e raquetes**.
- [x] 🔒 Edição só no modo Organização.
- [x] Alerta de estoque baixo **somente no modo Organização** *(você editou o texto mas não marcou o item; assumi que está aprovado. Me avise se não).*

---

## 4. Personagens (bonecos 3D)

- [x] Cada **aluno** e cada **pessoa que aluga quadra** vira um boneco genérico automaticamente.
- [x] **Presets prontos com várias combinações** (sorteados automaticamente ao cadastrar a pessoa) **e** personalização manual montando as peças (D22).
- [x] **Quem personaliza:** equipe **e** o próprio aluno (D22).
- [x] **Professor:** boneco diferenciado e destacado nas aulas.
- [x] **Jogo:** duas duplas. **Aula:** até 6 alunos + professor.
- [x] **Quem está de fora:** sentado na arquibancada.
- [x] **Fila do day use:** bonecos aguardando perto da quadra escolhida.
- [x] Animações mínimas: parado, andando, saque, rebatida, sentado, comemoração.

**Proposta de peças (4 opções de cada, o usuário combina como quiser — D22).** Para aprovar na D39:

| Peça | Opção 1 | Opção 2 | Opção 3 | Opção 4 |
|---|---|---|---|---|
| Tom de pele | Claro | Médio claro | Médio escuro | Escuro |
| Cabelo (estilo) | Curto | Comprido | Rabo de cavalo | Raspado/careca |
| Cor do cabelo | Preto | Castanho | Loiro | Ruivo |
| Camisa | Turquesa | Coral | Amarela | Branca |
| Shorts | Azul-marinho | Preto | Cinza | Verde |
| Acessório | Nenhum | Boné | Viseira | Óculos de sol |

**4⁶ = 4.096 combinações.** O professor usa uma camisa exclusiva (fora da lista) + marcador de destaque.

---

## 5. Regra de mídia (importante)

> O sistema **não guarda** foto, áudio nem vídeo. Todo anexo fica no **Drive** e o sistema guarda **somente o link**.

- [x] Campo padrão "Link do Drive" em cada registro que aceitar anexo.
- [x] Validação simples: só aceita URL.
- [x] Botão "abrir link" em nova aba.
- ⚠️ **Atenção (propagandas na TV):** link de Drive abre numa página de visualização, não vira imagem dentro da TV. Para exibir banners de patrocinadores na tela, precisamos de um **link direto de imagem**. Ver D41.

---

## 6. Regras oficiais ITF pesquisadas (beach tennis)

Resumo do que encontrei nas fontes da ITF e em documentos de regulamento. **Para o desenvolvimento, tudo isso será configurável** (seção D37), porque cada torneio pode variar.

### Quadra e equipamento (usaremos na modelagem 3D)
| Item | Valor |
|---|---|
| Quadra | **16 m × 8 m** (duplas); simples usa 4,5 m de largura |
| Altura da rede | **1,70 m** (feminino) / **1,80 m** (masculino). A ITF limita entre 1,70 e 1,80 m |
| Linhas | Largura de 2,5 a 5 cm, cor contrastante com a areia *(fonte secundária)* |
| Raquete | Sem cordas, ~50 cm de comprimento *(fonte secundária)* |
| Bola | Baixa compressão ("laranja", Stage 2) |

### Pontuação
- Mesma contagem do tênis (15, 30, 40), **mas com ponto decisivo no 40-40 (no-ad)**: quem fizer o próximo ponto leva o game.
- **Sem segundo saque** e **sem "let"** no saque.
- Set: primeiro a **6 games** com 2 de diferença; **tie-break em 6–6**.
- Em 2020 foi introduzido o **super tie-break de 10 pontos no 3º set**.
- O organizador anuncia **antes do torneio** o formato (2 ou 3 sets, set com diferença de 2 games ou tie-break set).

### Fase de grupos e mata-mata (circuito ITF)
- Nas finais do circuito ITF: **grupos A e B** em formato todos contra todos, **2 melhores de cada grupo avançam** e o mata-mata é **cruzado** (1º do A × 2º do B e 1º do B × 2º do A).
- Na classificação do grupo, o 1º critério que consegui confirmar é o **percentual de sets vencidos**. 

### Como o sistema calcula hoje (suposições para você conferir)
- **Classificação do grupo:** vitórias → % de sets vencidos → % de games vencidos → confronto direto (ordem editável). Se tudo empatar, vale a ordem de inscrição.
- **Super tie-break de 10 pontos (3º set):** conta como **1 set e 1 game** para quem vence.
- Jogo em andamento **não** entra na tabela; só jogo encerrado.
- Mata-mata: sementes 1ºA, 1ºB, 2ºA, 2ºB… e emparelhamento 1ª × última, o que dá **1ºA × 2ºB e 1ºB × 2ºA**. Aceita 2, 4, 8 ou 16 vagas.
- Sorteio de grupos e número de grupos (1, 2, 4 ou 8) automáticos pelo número de duplas.

### ⚠️ O que eu NÃO consegui confirmar
- A **ordem completa dos critérios de desempate** (além do percentual de sets).
- O **texto exato** do tie-break e do super tie-break nas regras atuais.
- Os **recuos mínimos** (área livre) ao redor da quadra.

👉 Proposta: o sistema terá **critérios de desempate configuráveis em ordem** e eu deixo um padrão que você confirma com o regulamento oficial. Vale você (ou o organizador do torneio) conferir no PDF oficial antes de usarmos em campeonato de verdade (links na seção 14).

---

## 7. Decisões fechadas (Rodada 1: D01–D25)

| # | Tema | Decisão |
|---|---|---|
| D01 | Duração do horário | Varia por tipo (aula 1h, aluguel 1h, day use por partida) |
| D02 | Modo Cliente | **Sim, com pedido de reserva aprovado pela equipe**. Resolvido na D26: **fica para depois da v1** (precisa de serviço online) |
| D03 | Funcionamento | Todos os dias. Seg–Sex 06:00–22:00 · Sáb–Dom 07:00–21:00 (D33) |
| D04 | Aulas recorrentes | Sim, turmas com repetição semanal |
| D05 | Máx. por aula | **6 alunos** (+ professor) |
| D06 | Preço do aluguel | **Varia** por faixa de horário, dia útil × fim de semana, feriado e duração (D35) |
| D07 | Day use | Sexta, sábado ou domingo. Valor único por pessoa; joga o horário todo revezando. Se há quadra e quórum, joga; senão escolhe uma quadra e espera na fila. Partida vai até X pontos; regra de rodízio é dos jogadores. **Tudo manual por enquanto:** só marcar "saiu" ou "continua na quadra". |
| D08 | Campeonato | Sempre duplas. Grupos e classificados dependem do nº de inscritos. Regras ITF. **Configurável por torneio.** |
| D09 | TV pública | Apelido ou primeiro nome |
| D10 | Pagamento | Em dia / Pendente / Atrasado |
| D11 | Acesso Organização | Um único login (dono) |
| D12 | Pagamento no sistema | Não: só registra a situação manualmente |
| D13 | Lojinha/lanchonete | **Registra vendas manualmente** (crédito, débito, Pix, dinheiro), sem integração ⚠️ conflito com seção 9 → **D27** |
| D14 | Onde roda | No computador da arena, **sem instalar nada**; no máximo hospedado no **GitHub Pages** |
| D15 | TV | Computador ligado por HDMI; a TV é só uma tela |
| D16 | Idioma | Só português |
| D17 | Backup | **Exportar `.json` e importar `.json`.** Nada de banco de dados |
| D18 | Estilo | Low-poly colorido e ensolarado |
| D19 | Câmera | Os dois: livre e fixa/automática |
| D20 | Marca | Nada definido: **tudo genérico** (nome provisório "Arena Beach Tennis") |
| D21 | Layout | 2×2 nos fundos, ambientes na fachada de entrada, medidas ITF |
| D22 | Bonecos | Presets prontos + 4 opções de cada peça, combináveis. Equipe e aluno personalizam |
| D23 | Arquibancada | Ao lado das quadras, por toda a extensão lateral |
| D24 | Som | Sem som |
| D25 | Dispositivos | PC e notebook (sem celular/tablet) |

**Consequência de D25:** o app será projetado para **tela de computador (mouse e teclado) e TV**. Celular/tablet **não** são alvo da v1 (o layout ainda será flexível, mas não vamos otimizar).

---

## 8. Rodada 2 — suas respostas ✅

> Respostas recebidas em 28/10/2026. Mantive as perguntas para registro. ⭐ = minha recomendação.

### Bloco A — Conflitos entre respostas (resolver primeiro)

**D26. Modo Cliente × "sem servidor".**
Você quer que o cliente peça reserva e a equipe aprove (D02), mas sem servidor/banco (D14, D17) o celular do cliente **não consegue enviar nada** para o computador da arena. E como D25 diz que só usaremos PC/notebook, o cliente não teria um aparelho próprio.
- [ ] **A) Modo Cliente em "quiosque":** o cliente usa o PC/notebook da recepção (ou um segundo notebook) para ver horários livres e preencher o pedido; o pedido fica como **"pendente"** para o dono aprovar. Funciona sem servidor.
- [x] **B) Deixar o Modo Cliente remoto para depois (Fase 5):** na v1 só a equipe marca. Depois, se quiser pedidos pelo celular, adicionamos um serviço online gratuito só para isso.
- [ ] **C) Só visualização na v1** (horários livres), sem pedido.
- Sua resposta: ___

**D27. Comanda × v1.**
Na seção 9 da v0.1 você aprovou "comanda fica para depois", mas na D13 pediu registro de vendas. Proponho separar:
- [x] **Entra na v1 ⭐: registro manual de venda** (o que foi vendido, quantidade, forma de pagamento, valor, data/hora) + resumo do dia.
- [ ] **Fica para depois: comanda** (conta aberta por mesa/cliente, pagar no final).
- Sua resposta: ___

**D28. Fila do day use manual (confirmar o fluxo).**
Pela sua D07, entendi assim. Confirma?
1. Pessoa chega no day use e a recepção a registra (ou ela já é aluna cadastrada).
2. Se há **quadra com vaga e quórum**, o dono marca "entrou na quadra X". Senão, marca "na fila da quadra X".
3. Quando o jogo acaba, o dono marca cada pessoa como **"saiu"** ou **"continua"**. Quem está na fila é movido **manualmente** (arrastando ou clicando em "entrar na quadra").
4. Cada quadra tem **sua própria fila**.
5. Na TV, a fila aparece (bonecos esperando) e o aviso "Próximos: …" mostra a ordem.
- [x] Confirmado ⭐
- [ ] Ajustar: ___

### Bloco B — Execução, dados e backup

**D29. Como o app é aberto no computador?** (porque o navegador bloqueia alguns recursos quando se abre um `.html` direto do disco)
- [ ] **A) GitHub Pages ⭐:** você abre um endereço no navegador; depois do primeiro carregamento ele **funciona sem internet** (modo offline).
- [ ] **B) Arquivo único:** eu gero um `.html` único que abre com duplo clique, sem internet e sem endereço.
- [x] **C) Os dois** (Pages para uso normal + arquivo único como reserva)
- Sua resposta: ___

> Observação: o Node.js e as ferramentas de programação só são usados por quem **desenvolve**. **Nada é instalado** no computador da arena.

**D30. A TV e a Organização rodam no mesmo computador?** Isso decide como as telas se mantêm sincronizadas.
- [x] **Sim ⭐:** um único PC. Uma janela na TV (Ambiente/Campeonato) e outra na tela do dono (Organização). As duas se atualizam **sozinhas e na hora**.
- [ ] **Não:** a TV é outro computador. Então a TV só atualiza **importando o `.json`** manualmente (ou usando um serviço online no futuro).
- Sua resposta: ___

**D31. Onde ficam os dados no dia a dia e como evitar perder?**
- [x] **A) No navegador ⭐ + backup:** os dados ficam salvos no navegador; botões **Exportar** e **Importar** `.json`; o app **avisa** se faz mais de X dias sem exportar.
- [ ] **B) Além disso (só Chrome/Edge):** salvar o `.json` direto em uma **pasta sincronizada com o Drive**, que serve de backup automático.
- Quantos dias sem backup para o aviso aparecer? [ ] 3 [x] 7 ⭐ [ ] Outro: ___
- ⚠️ Se alguém limpar os dados do navegador, **o que não foi exportado se perde**. É a principal fraqueza da escolha "sem banco".

**D32. Navegador oficial do computador da arena?**
- [x] Chrome ⭐   [ ] Edge   [ ] Outro: ___

**D33. Horário de abertura e fechamento:** ✅ **Seg–Sex 06:00–22:00 · Sáb–Dom 07:00–21:00** (respondido na rodada 2).
(Precisamos para montar a agenda e a mudança dia/noite da cena.)

### Bloco C — Regras de negócio

**D34. Aula particular existe?** ✅ **Sim. Mínimo 1 pessoa, máximo 6.** (respondido na rodada 2)

**D35. Preço do aluguel varia por quê?**
- [x] Faixa de horário (manhã / tarde / noite)
- [x] Dia útil × fim de semana
- [x] Feriados
- [x] Por duração (1h, 2h)
- [ ] Outro: ___
- Valores: **tabela vazia, você preenche no sistema** (não informou os valores).

**D36. Day use: o sistema registra o valor pago?**
- [x] Sim ⭐: registro manual de "day use" como venda (valor único, forma de pagamento)
- [ ] Não
- Valor atual do day use: **R$ 20,00**

**D37. Padrão de campeonato** (cada torneio poderá mudar, mas precisamos de um ponto de partida). Meu rascunho, baseado no formato do circuito ITF:
1. Duplas inscritas são sorteadas em **grupos** (nº automático conforme inscritos).
2. Todos contra todos dentro do grupo.
3. Classificação: **vitórias** → **% de sets vencidos** → **% de games vencidos** → **confronto direto** *(ordem editável)*.
4. Avançam os **N melhores de cada grupo** (você define por torneio).
5. Mata-mata **cruzado**, com disputa de 3º lugar opcional.
6. Formato do jogo configurável: nº de sets, set com 6 games ou tie-break set, super tie-break de 10 pontos no 3º set (sim/não), ponto decisivo no 40-40 (sim/não).
- [x] Aprovado como padrão ⭐
- [ ] Ajustar: ___
- [ ] Alguém vai conferir os critérios de desempate no regulamento oficial (links na seção 14)

### Bloco D — Visual e conteúdo

**D38. Paleta provisória** (genérica, só para não ficar sem identidade; trocável depois):

| Uso | Cor | Hex |
|---|---|---|
| Areia (base) | Areia clara | `#F2D8A7` |
| Principal | Turquesa | `#1FB5B0` |
| Destaque | Coral | `#FF6B57` |
| Texto/fundo escuro | Azul-marinho | `#12355B` |
| Neutro | Branco quente | `#FFF9EE` |

**Cores de status dos horários (sempre com ícone + texto):**

| Status | Cor | Ícone |
|---|---|---|
| Livre | Verde `#2E9E5B` | ✔ |
| Aula | Roxo `#7A4FD1` | 🎓 |
| Aluguel | Azul `#2F7DE1` | 🎾 |
| Day use | Laranja `#F29B2F` | 🔁 |
| Campeonato | Dourado `#D9A800` | 🏆 |
| Manutenção/Bloqueado | Cinza `#8A8F98` | 🛠 |

- [x] Aprovado ⭐
- [ ] Ajustar: ___

**D39. Peças e presets dos bonecos** (tabela da seção 4).
- [x] Aprovado ⭐
- [ ] Ajustar: ___
- Quantos **presets prontos** quer (sugestão 12)? ___ *(em branco: mantive 12)*

**D40. Detalhes do layout** (ver esboço na seção 3.0):
- Arquibancada fica do lado: [x] direito ⭐ [ ] esquerdo [ ] os dois
- Ordem da fachada (esquerda → direita): Recepção/Escritório · Convivência (lojinha + lanchonete) · Vestiário · Estoque ⭐ [x] **mantida a ordem atual** *(a marcação "Outra" foi engano, confirmado em 29/10)*
- Convivência com **vista para as quadras** (varanda/deck)? [x] Sim ⭐ [ ] Não
- Área de espera do day use: [x] ao lado de cada quadra, junto à cerca ⭐ [ ] uma área única
- Quadras 100% descobertas? [x] Sim ⭐ [ ] Algumas cobertas: ___

**D41. Propagandas e patrocinadores na TV:**
- Como as imagens serão fornecidas?
  - [x] **Link direto de imagem** (uma URL que termina em `.png`/`.jpg`) ⭐
  - [ ] Somente texto e logo simples, sem imagens externas
- Tempo de cada anúncio: [x] 8 s ⭐ [ ] 15 s [ ] Outro: ___
- Cadastro de patrocinador: nome, link da imagem, período (início/fim), ativo sim/não.

---

### 8.1 Resumo das decisões da Rodada 2 (D26–D41)

| # | Tema | Decisão | Situação |
|---|---|---|---|
| D26 | Modo Cliente | **Fora da v1.** Só a equipe marca. Cliente remoto no Futuro | ✅ Fechada (**mudou** em relação ao que eu tinha assumido) |
| D27 | Comanda × v1 | Registro manual de venda na v1; comanda depois | ✅ |
| D28 | Fila do day use | Manual, 1 fila por quadra, "saiu/continua" | ✅ |
| D29 | Como abrir | GitHub Pages **e** arquivo único | ✅ |
| D30 | TV e Organização | Mesmo computador, duas janelas sincronizadas | ✅ |
| D31 | Dados e backup | Navegador + exportar/importar `.json`, aviso após 7 dias | ✅ |
| D32 | Navegador | Chrome | ✅ |
| D33 | Horário | Seg–Sex 06–22 · Sáb–Dom 07–21 | ✅ |
| D34 | Aula particular | Sim, mínimo 1, máximo 6 | ✅ |
| D35 | Preço do aluguel | Varia por faixa de horário, dia útil/fim de semana, feriado e duração. Tabela vazia para você preencher | ✅ |
| D36 | Day use | **R$ 20,00** por pessoa, registrado como venda | ✅ |
| D37 | Campeonato | Padrão aprovado; desempates a conferir no regulamento ITF | ✅ |
| D38 | Paleta e status | Aprovada | ✅ |
| D39 | Bonecos | Peças aprovadas, 12 presets | ✅ |
| D40 | Layout | Arquibancada à direita, convivência com vista, fila junto à quadra, quadras descobertas. Ordem da fachada **mantida**: Recepção · Lojinha · Lanchonete · Vestiário · Estoque | ✅ |
| D41 | Propagandas | Link direto de imagem, 8 s por anúncio | ✅ |

### 8.2 Rodada 3: perguntas que surgiram nos wireframes

Todas aceitas em 29/10/2026 (você concordou com todas as sugestões ⭐).

**D42. Faixas de horário do preço do aluguel** (D35). Sugestão ⭐: **Manhã 06–12 · Tarde 12–18 · Noite 18–22**.
- [x] Aceito ⭐   [ ] Outra divisão: ___

**D43. Prazo para a limpeza do vestiário ser considerada atrasada** (dispara o lembrete na Organização). Sugestão ⭐: **1 dia**.
- [x] 1 dia ⭐   [ ] 2 dias   [ ] Outro: ___

**D44. Aniversariantes na TV exigem data de nascimento no cadastro** (é um dado pessoal a mais). Sugestão ⭐: **campo opcional**; só mostra aniversário de quem informou.
- [x] Opcional ⭐   [ ] Não quero aniversários   [ ] Obrigatório

**D45. Como o aluno personaliza o próprio boneco, já que não há Modo Cliente na v1** (D22 × D26). Sugestão ⭐: **o aluno pede na recepção e a equipe abre o editor com ele**.
- [x] Na recepção ⭐   [ ] Só a equipe personaliza   [ ] Outra: ___

### 8.3 Rodada 4: uma pergunta nova (surgiu na Fase 2) — ✅ fechada: D46 = A

**D46. Placar de aluguel e day use na TV.** Hoje a demonstração inventa um placar para dar vida à cena. Numa arena de verdade esse número seria falso, porque ninguém o digita. No campeonato o placar já vem dos dados.
- [ ] **A) Mostrar só "Em jogo" ⭐** até a recepção digitar o placar (botões "+1" na Fase 3). Nunca aparece número inventado.
- [ ] **B) Manter o placar de enfeite** (só para a TV ficar animada)
- [ ] **C) Sem placar** em aluguel e day use
- Sua resposta: ___

*Enquanto você não responde, o exemplo continua com o placar de enfeite, e há um interruptor pronto no código (`placarIlustrativo`).*

---

### 8.4 Rodada 5: três perguntas pequenas (surgiram na Fase 3) — ✅ fechadas: D47 = A, D48 = A, D49 = A

Todas respondidas com a opção ⭐ (sem mudança de código).

**D47. O valor do aluguel entra no total de "Vendas de hoje"?** Hoje o aluguel guarda valor e "já foi pago" na própria reserva, e **não** entra no resumo de vendas (que soma só lojinha, lanchonete, day use e vendas avulsas).
- [x] A ⭐ Manter assim por enquanto (aluguel fica na agenda; simples). **Escolhida.**
- B Quando marcar "já foi pago", lançar também como venda do dia.

**D48. "Continua" no fim da partida do day use.** Hoje há três botões por pessoa: **Saiu** (vai embora), **Continua** (volta para o **fim da fila**) e **Fica** (segue na quadra). Quem está na fila entra no lugar de quem sai ou vai para o fim.
- [x] A ⭐ Manter os três. **Escolhida.**
- B Só Saiu e Continua (Continua = segue na quadra, sem passar pela fila).

**D49. "Apagar tudo" também apaga o PIN?** Hoje sim (volta ao estado de fábrica, e a pessoa cria um PIN novo). Isso permite recuperar o acesso se alguém esquecer o PIN, mas qualquer um com o computador pode apagar tudo.
- [x] A ⭐ Manter assim (o botão pede dois cliques). **Escolhida.**
- B Pedir o PIN antes de apagar.

---

## 9. Escopo da v1 (atualizado)

**Entra na v1:**
Modo Ambiente · Modo Campeonato · Modo Organização (1 PIN) · 4 quadras com agenda · bonecos com presets e personalização · professor destacado · arquibancada · fila do day use (manual) · lojinha e lanchonete (cardápio + **registro manual de venda**) · escritório (alunos/contato/contrato-link/pagamento-status) · vestiário · estoque · alertas (somente Organização) · propagandas/patrocinadores na TV · links do Drive · **tabela de preços com feriados** · **exportar/importar JSON**.

**Fica para depois:**
Pagamento online · comanda (conta aberta) · WhatsApp · ranking · celular/tablet · **Modo Cliente (pedido de reserva, D26 = B)**.

- [x] Aprovado
- [ ] Quero mudar: ___

---

## 10. Arquitetura (atualizada)

| Camada | Proposta | Observação |
|---|---|---|
| 3D | **Three.js** | Padrão para 3D no navegador |
| App | **HTML + JavaScript simples (scripts clássicos)** | Sem servidor, sem Node, sem Vite. Abre por duplo clique (`file://`). Um script `build.js` só junta tudo em 1 arquivo |
| Interface | HTML/CSS por cima da cena | Painéis, listas, formulários |
| Dados | **`localStorage`/IndexedDB** no navegador | Sem banco de dados. Estrutura em JSON |
| Backup | **Exportar / Importar `.json`** | Com número de versão do arquivo, para dados antigos continuarem abrindo |
| Sincronia entre janelas | **BroadcastChannel** (mesmo PC, mesmo navegador) | Janela da TV atualiza na hora. Vale só se D30 = "mesmo computador" |
| Hospedagem | **GitHub Pages** (D29) | Público contém **só o código, nunca os dados** |
| Bonecos | Gerados por código (low-poly) | Peças trocáveis (cor/forma) |
| Segurança | PIN no modo Organização | ⚠️ Trava de tela, **não é segurança forte**: quem usa o computador pode ver dados do navegador. Aceitável para a v1 (um único PC), mas precisa ficar claro |

### Rotas (endereços internos)
- `#/ambiente` → TV (sem login)
- `#/campeonato` → TV (sem login)
- `#/organizacao` → exige PIN

### Estrutura de pastas proposta
```
arena-beach-tennis/            (como está hoje, Fase 1)
├─ index.html                 # versão de desenvolvimento
├─ styles.css
├─ vendor/three.min.js        # Three.js r152 (copiado, funciona offline)
├─ src/
│  ├─ config.js               # medidas ITF, cores, horários
│  ├─ utils.js                # geometria low-poly, texturas, placas
│  ├─ characters.js           # bonecos, presets, animações
│  ├─ environment.js          # céu, sol/lua, dia/noite
│  ├─ arena.js                # quadras, arquibancada, fachada, ambientes
│  ├─ camera.js               # câmera automática e livre
│  ├─ sim.js                  # jogos, aula, day use, plateia (dados de exemplo)
│  ├─ interaction.js          # hover e clique nas áreas
│  ├─ ui.js                   # lista lateral, cartões, painel de demonstração
│  └─ main.js
├─ build.js                   # gera dist/arena-beach-tennis.html (arquivo único)
├─ dist/                      # arquivo único para abrir com duplo clique
└─ docs/roadmap.md            # este documento
```

### Modelo de dados (rascunho v2) — tudo dentro de um único JSON

| Coleção | Campos principais |
|---|---|
| **configuracoes** | nome da arena, horário de funcionamento, PIN (guardado com hash), dias para aviso de backup, paleta |
| **pessoas** | id, nome, apelido (TV), tipo (aluno / locatário / professor / visitante / day use), contato, boneco (peças) |
| **alunos** *(extensão)* | plano, link do contrato (Drive), situação de pagamento, observações |
| **quadras** | id (1–4), nome, status |
| **horarios** | id, quadra, início, fim, tipo (aula / aluguel / day use / campeonato / bloqueio), pessoas, professor, preço, status |
| **turmas** | id, nome, professor, alunos (1 a 6), dias da semana (lista), início, fim, quadra, ativa |
| **tabela_precos** | faixa de horário (manhã/tarde/noite), tipo de dia (dia útil / fim de semana / feriado), duração (1h/2h), valor (D35) |
| **feriados** | data, nome (cadastro manual) |
| **dayuse_sessoes** | data, início, fim, valor por pessoa (padrão R$ 20,00) |
| **dayuse_presencas** | sessão, pessoa, status (quadra / fila / saiu), quadra, posição |
| **avisos** | id, texto, início, fim, ativo |
| **produtos** | id, nome, preço, estoque, disponível |
| **cardapio** | id, categoria, nome, preço, disponível |
| **vendas** | id, data/hora, itens, total, forma de pagamento (crédito / débito / Pix / dinheiro) |
| **equipamentos** | id, nome, quantidade, quantidade mínima |
| **limpezas** | id, local, data/hora, responsável, link Drive |
| **manutencoes** | id, local, data, descrição, responsável, link Drive |
| **campeonatos** | id, nome, formato (configurável), datas, status |
| **duplas** | id, campeonato, pessoa 1, pessoa 2, grupo |
| **jogos** *(dentro de cada campeonato)* | id, fase (grupo/semi/final/terceiro…), grupo, rodada, quadra, data, início, fim, duplas (a, b ou origem no mata-mata), sets [[6,4],[3,2]], encerrado |
| **patrocinadores** | id, nome, link da imagem, início, fim, ativo |
| ~~pedidos_reserva~~ | *(Futuro: só se houver Modo Cliente)* |

---

## 11. Roadmap

### ✅ Fase 0 — Planejamento *(fechada em 29/10/2026)*
- [x] Capturar todas as ideias iniciais
- [x] Rascunhar modos, áreas, personagens e arquitetura
- [x] Responder decisões D01–D25 (rodada 1)
- [x] Pesquisar regras ITF e referências de layout
- [x] Responder decisões D26–D41 (rodada 2)
- [x] Fechar escopo da **v1** (seção 9)
- [x] Aprovar identidade provisória (D38) e layout (D40)
- [x] Desenhar **wireframes** simples de cada tela/painel *(aguardando sua aprovação)*
- [x] Aprovar wireframes e responder a Rodada 3 (D42–D45)
- [x] Definir modelo de dados final *(v3, seção 10)*
- [x] Aprovar roadmap final ➜ liberar Fase 1

### ✅ Fase 1 — Animação 3D (só visual, dados de exemplo fixos no código) — **entregue e testada por você**
**Objetivo:** a arena viva e bonita.
- [x] 1.1 Projeto base (Three.js) abrindo no navegador
- [x] 1.2 Cena: chão, céu, luz, câmera (ciclo dia/noite de demonstração)
- [x] 1.3 4 quadras 2×2 com medidas ITF (areia, linhas, rede 1,70 m; cercas ainda não)
- [x] 1.4 Arquibancada na lateral
- [x] 1.5 Fachada: convivência (lojinha + lanchonete), escritório/recepção, vestiário, estoque (clicáveis)
- [x] 1.6 Bonecos: corpo, peças (pele, cabelo, camisa, shorts, acessório) e presets
- [x] 1.7 Animações: parado, andar, saque, rebatida, sentado, comemorar
- [x] 1.8 Cena de exemplo: jogo com 2 duplas
- [x] 1.9 Cena de exemplo: aula com 6 alunos + professor destacado
- [x] 1.10 Cena de exemplo: pessoas na arquibancada
- [x] 1.11 Cena de exemplo: fila do day use ao lado das quadras
- [x] 1.12 Hover/clique nas áreas (destaque + nome), sem painel real ainda
- [x] 1.13 Câmera: modo fixo/automático e modo livre, com transições entre áreas
- [x] 1.14 Teste de desempenho no PC/notebook e na TV via HDMI *(você testou e deu certo)*
- ✅ **Pronto quando:** a arena parece viva e dá para clicar em cada área.

**O que a Fase 1 entrega (v0.1 da animação):**
- 4 quadras 16×8 m em 2×2, rede 1,70 m, linhas, bancos, cestos de bolinhas, postes de luz.
- Arquibancada lateral à direita (5 degraus) com pessoas sentadas.
- Fachada com Recepção, Lojinha, Lanchonete (mesas e guarda-sóis), Vestiário 🔒 e Estoque 🔒 — com o interior visível por cima.
- Bonecos low-poly com 12 presets; professor com camisa roxa, anel dourado, seta e nome em destaque.
- Quadra 1: **aluguel** (duas duplas, pontuação sem vantagem). Quadra 2: **aula** (professor + 6 alunos rodando). Quadra 3: **day use** (jogo até 7 pontos, fila de 3 com ordem, **rodízio automático na demonstração**). Quadra 4: **livre**.
- Placas flutuantes sobre cada quadra (status, horário, quem joga, placar); somem quando a câmera chega perto.
- Lista lateral "Agora nas quadras" estilo TV.
- Dia, entardecer e noite, com luzes acendendo.
- Câmera automática (passeio) e livre; atalhos **0** (visão geral), **1–4** (quadras), **C** (câmera), **N** (nomes), **F** (tela cheia), **Esc**.
- Clicar em qualquer área abre um cartão (o conteúdo real chega na Fase 3).
- **Rodízio do day use é automático só na demonstração**; no sistema real continua manual (D07/D28).

### ✅ Fase 2 — Dados locais e modos de TV *(entregue e testada por você)*
- [x] 2.1 **Camada de dados:** salvar no navegador, exportar/importar JSON, versão do arquivo
- [x] 2.2 Dados de exemplo (carregar e apagar)
- [x] 2.3 **Modo Ambiente:** cena + lista lateral (apelidos e horários), guiada pelos dados e pela hora
- [x] 2.4 Sincronia entre janelas (D30 = mesmo PC), testada com duas janelas do mesmo navegador
- [x] 2.5 Carrossel de avisos, aniversariantes, propagandas e "Próximos" do day use
- [x] 2.6 **Modo Campeonato:** cena + tela dividida (jogando agora, grupos, mata-mata, histórico)
- [x] 2.7 Mudança de horário conforme a hora real (com relógio simulado para demonstrar)
- [x] 2.8 **Teste no seu computador e na TV** (inclui o item 1.14): velocidade, leitura de longe, duas janelas *(você testou e deu certo)*
- ✅ **Pronto quando:** a TV mostra o dia a dia sozinha e se atualiza conforme os dados mudam.
- ℹ️ Até a Fase 3 os dados entram por **exemplo ou importação de `.json`**. Digitar horários, alunos e placares pela tela é a Fase 3.

### 🟢 Fase 3 — Sistema de gestão (Modo Organização) — **entregue para avaliação**
- [x] 3.1 PIN do modo Organização (criar, entrar, trocar, remover, travar)
- [x] 3.2 Pessoas: alunos, locatários, professores, visitantes, equipe + **editor de boneco** com prévia 3D
- [x] 3.3 Quadras: agenda por dia, marcar horário, tipos (aluguel, aula, manutenção), preço sugerido, conflitos, repetir semanalmente
- [x] 3.4 Aulas e turmas (recorrência semanal, 1 a 6 alunos, professor, cancelar/mudar só num dia)
- [x] 3.5 Day use: presença, fila por quadra, Saiu/Continua/Fica (manual), R$ 20,00 registrado como venda, placar +1
- [x] 3.6 Escritório: alunos, contato, contrato (link), situação de pagamento, nascimento opcional
- [x] 3.7 Lojinha e lanchonete: produtos, preços, disponibilidade, **registro manual de vendas** e resumo do dia
- [x] 3.8 Estoque: equipamentos, quantidades, alerta de mínimo (só Organização)
- [x] 3.9 Vestiário: limpezas, manutenções, lembrete de atraso (só Organização)
- [x] 3.10 Campeonato: criar torneio, duplas, grupos, placar por set, desempate, mata-mata, horários sem conflito
- [x] 3.11 Patrocinadores e avisos da TV
- [x] 3.12 Campo "link do Drive" nos registros (contrato, limpeza, manutenção)
- [x] 3.13 Preços do aluguel: tabela por faixa × tipo de dia × duração, com cadastro de feriados (D35)
- [x] 3.14 Cartões públicos no modo Ambiente (lojinha, lanchonete, agenda da quadra sem nomes, cadeado)
- [ ] 3.15 **Teste no seu computador** *(depende de você)* com dados reais: cadastrar pessoas, preços e uma semana de horários
- ~~Modo Cliente em quiosque~~ *(removido da v1 pela D26 = B)*
- ✅ **Pronto quando:** o dono opera a arena inteira pelo sistema.

### 🟢 Fase 4 — Polimento e lançamento — **entregue para avaliação**
- [ ] 4.1 **Teste em campo** com uso real e ajustes de UX *(depende de você; me conte o que ficou confuso)*
- [x] 4.2 Acessibilidade (contraste, nomes para leitores de tela, foco, cor + texto)
- [x] 4.3 Aviso de backup, teste de **restaurar** um JSON antigo (36 verificações automáticas)
- [x] 4.4 Publicação: arquivo pronto em `dist/pages` e passo a passo no manual *(falta você publicar, se quiser; instalação na TV = segunda janela do Chrome)*
- [x] 4.5 Manual rápido para o dono

### 🔭 Futuro (fora da v1)
- [ ] **Modo Cliente** (ver horários e pedir reserva pelo celular, com aprovação da equipe), com serviço online
- [ ] Pagamento online (Pix)
- [ ] Comanda (conta aberta)
- [ ] WhatsApp (lembrar aula, avisar fila)
- [ ] Ranking/estatísticas
- [ ] Fila do day use **automática**
- [ ] Modelos 3D mais detalhados (`.glb`)
- [ ] Equipe com permissões diferentes

---

## 12. Banco de ideias (nada se perde)

Aprovadas pelo dono:
- [x] Aviso na TV quando a fila anda ("Próximos: …")
- [x] Placar flutuante sobre a quadra durante o jogo
- [x] Boneco comemora ao fim do jogo
- [x] Cena muda conforme o horário real (dia/noite)
- [x] Destaques na TV: aniversariantes, avisos, propagandas, patrocinadores
- [x] Lembrete de limpeza do vestiário atrasada (só Organização)
- [x] Alerta de estoque baixo de bolinhas/raquetes (só Organização)

Sugestões minhas (ainda não aprovadas):
- [ ] **Fechamento do dia:** resumo de vendas por forma de pagamento
- [ ] **Quem está na arena agora** (contador) na lista lateral
- [ ] **Tela de espera da TV** quando não houver jogo ("Quadra livre — venha jogar")
- [ ] **Atalhos de teclado** na Organização (ex.: 1–4 para abrir quadras)
- [ ] **Modo apresentação** da TV em tela cheia com um clique

Surgidas durante a Fase 1 (propostas minhas, não aprovadas):
- [ ] Placas das quadras somem de perto (já feito na demonstração) — confirmar se gosta
- [ ] Bolinha ficar visível na TV de longe (aumentar um pouco o tamanho)
- [ ] Botão "Modo TV" que esconde painel de demonstração e dicas

Surgidas da Rodada 2 (propostas minhas, não aprovadas):
- [ ] **Calendário de feriados** já preenchido com os feriados nacionais, para você só ajustar os locais
- [ ] Day use: sugerir R$ 20,00 já preenchido ao registrar a pessoa

Suas ideias novas: ___

---

## 13. Riscos e cuidados

| Risco | Cuidado |
|---|---|
| **Perda de dados** (limpar navegador, trocar de PC) | Exportar JSON, aviso por dias sem backup (D31), teste de restauração na Fase 4 |
| **Dados pessoais** (contato, contrato, pagamento) | Só no modo Organização; na TV só apelido; **o arquivo JSON exportado contém dados pessoais**, guardar em local seguro (LGPD) |
| **PIN não é segurança forte** | Aceitar na v1; se mais pessoas usarem, planejar login de verdade |
| **GitHub Pages é público** | Publicar **só o código**, nunca o JSON com dados |
| **TV em outro computador não sincroniza** | D30 = mesmo computador. Se mudar, a TV só atualiza importando o `.json` |
| **Regras de campeonato** | Tudo configurável; conferir desempates no regulamento oficial |
| **Imagens de patrocinadores** | Link de Drive não vira imagem na TV (D41) |
| **Desempenho do 3D** | Estilo low-poly, poucas sombras, teste na 1.14 |
| **Escopo crescer** | v1 definida (seção 9); novidades vão para a seção 12 |
| **Links do Drive quebrados** | Campo opcional e aviso se o link não abrir |

---

## 14. Fontes consultadas (regras ITF e referências)

- ITF, "A guide to beach tennis": https://itftennis.com/en/news-and-media/articles/a-guide-to-beach-tennis
- ITF, Rules of Beach Tennis 2023 (PDF): https://www.Itftennis.com/media/8999/rules-of-beach-tennis-2023.pdf
- ITF, Summary of Beach Tennis rule changes 2019 (classificação em grupos): https://www.itftennis.com/media/2281/summary-of-itf-beach-tennis-rule-changes-2019.pdf
- ITF, Sand Series Tour Finals 2025 (formato de grupos A/B e mata-mata cruzado): https://www.itftennis.com/media/15414/2025-itf-sand-series-tour-finals-regulations-updated-24-oct.pdf
- Resumo das regras principais (fonte secundária): https://eta.bibl.u-szeged.hu/1262/2/rekreacio_II_angol/rekreacio_II_angol/i31_main_rules.html
- Clube de Regatas do Flamengo, arena de beach tennis na Gávea (referência de layout): https://en.flamengo.com.br/noticias/institucional/arena-de-beach-tennis-e-inaugurada-na-sede-da-gavea

---

## 15. Log de decisões

| Data | Decisão | Quem |
|---|---|---|
| 27/10/2026 | Ordem: Planejamento → Animação 3D → Funcionalidades | Dono |
| 27/10/2026 | Só links de foto/vídeo/áudio (Drive) | Dono |
| 27/10/2026 | Modo Organização restrito (não disponível a clientes) | Dono |
| 27/10/2026 | Vestiário só no modo Organização | Dono |
| 27/10/2026 | **Sem banco de dados e sem servidor.** Backup por exportar/importar JSON | Dono |
| 27/10/2026 | Roda no computador da arena, sem instalar nada (GitHub Pages no máximo) | Dono |
| 27/10/2026 | Day use totalmente manual por enquanto | Dono |
| 27/10/2026 | Vendas registradas manualmente (crédito, débito, Pix, dinheiro) | Dono |
| 27/10/2026 | Aula: máx. 6 alunos | Dono |
| 27/10/2026 | Dispositivos: PC e notebook | Dono |
| 27/10/2026 | Marca genérica; layout 2×2 com medidas ITF | Dono |
| 27/10/2026 | v0.2: arquitetura de app 100% de navegador; pesquisa ITF concluída parcialmente | Claude |
| 28/10/2026 | Horário: seg–sex 06:00–22:00, sáb–dom 07:00–21:00 (D33) | Dono |
| 28/10/2026 | Aula particular existe, mínimo 1 pessoa (D34) | Dono |
| 28/10/2026 | "Pode começar a fazer as animações" → Fase 1 iniciada | Dono |
| 28/10/2026 | v0.3: D26–D32 e D35–D41 assumidas pela recomendação ⭐ até confirmação; app em scripts simples com arquivo único | Claude |
| 28/10/2026 | **D26 = B:** sem Modo Cliente na v1 (fica para o Futuro) | Dono |
| 28/10/2026 | D27, D28, D29 (os dois), D30, D31 (7 dias), D32 (Chrome) confirmadas | Dono |
| 28/10/2026 | D35: preço do aluguel varia por faixa de horário, dia útil/fim de semana, feriado e duração | Dono |
| 28/10/2026 | D36: day use = R$ 20,00 por pessoa, registrado como venda | Dono |
| 28/10/2026 | D37, D38, D39, D41 aprovadas; D40 aprovada exceto ordem da fachada | Dono |
| 28/10/2026 | v0.4: Rodada 2 incorporada; Modo Cliente removido da v1 | Claude |
| 29/10/2026 | D40: mantida a ordem atual da fachada ("Outra" foi engano) | Dono |
| 29/10/2026 | v0.5: todas as decisões da Fase 0 fechadas; faltam wireframes | Claude |
| 29/10/2026 | v0.6: wireframes de 12 telas; Rodada 3 (D42–D45) aberta | Claude |
| 29/10/2026 | Wireframes aprovados; D42–D45 aceitas; **Fase 0 fechada, Fase 2 liberada** | Dono |
| 29/10/2026 | v0.8: Fase 2 entregue para avaliação (dados, Ambiente, Campeonato, sincronia, avisos); D46 aberta | Claude |
| 30/10/2026 | Fases 1 e 2 testadas no computador e na TV: deu certo. **D46 = A** (aluguel e day use mostram "Em jogo" até digitar o placar) | Dono |
| 31/10/2026 | v0.9: Fase 3 entregue para avaliação (modo Organização completo, cartões públicos); D47–D49 abertas com padrão ⭐ | Claude |
| 01/11/2026 | **D47 = A, D48 = A, D49 = A** (aluguel fora das vendas do dia; Saiu/Continua/Fica; Apagar tudo apaga o PIN com dois toques) | Dono |
| 01/11/2026 | v1.0: Fase 4 entregue (acessibilidade, teste de restaurar backup, pasta `dist/pages` para GitHub Pages, manual rápido) | Claude |

---

## 16. Próximos passos

1. **Teste de campo (itens 3.15 e 4.1):** use o sistema alguns dias com dados reais: cadastre pessoas, preencha **Preços**, marque uma semana de horários, abra o day use, registre vendas e deixe a TV em `#ambiente`. Anote o que ficou confuso, lento ou faltou.
2. **Faça um backup** (Organização > Dados > Exportar .json) e guarde no Drive. Teste importar uma vez, para saber que funciona.
3. **Publicação (opcional):** siga a última seção do manual e envie `dist/pages/index.html` ao GitHub Pages. Lembre: os dados ficam no navegador de cada computador.
4. **Me traga a lista do teste de campo.** Eu ajusto e fechamos a **v1.0 final**. O que for novo (modo Cliente, Pix, comanda, WhatsApp, fila automática, ranking) fica na seção "Futuro" e no Banco de ideias.
