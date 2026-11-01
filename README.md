# Gestão Beach Tennis 3D

Sistema de gestão para arena de beach tennis que roda **só no navegador** (Chrome), sem servidor e sem banco de dados.

- **Ambiente:** arena 3D low-poly animada para a TV (4 quadras ITF 16×8 m, lojinha, lanchonete, recepção, vestiário, estoque, arquibancada).
- **Campeonato:** grupos, mata-mata, placar por set e histórico.
- **Organização:** área da equipe protegida por PIN (agenda, aulas, day use, preços, escritório, vendas, estoque, vestiário, avisos, backup).

Os dados ficam no `localStorage` do navegador. Faça backup em **Organização > Dados > Exportar .json**.

## Usar

1. Baixe `dist/arena-beach-tennis.html` e abra com duplo clique no Chrome. Não precisa de internet.
2. Para a TV: abra uma segunda janela do mesmo arquivo, arraste para a TV e use `#ambiente` ou `#campeonato` no endereço. Tecla `F` = tela cheia.
3. Manual rápido e decisões do projeto: [`docs/roadmap.md`](docs/roadmap.md).

Também é publicado automaticamente em GitHub Pages a cada envio na branch `main` (Settings > Pages > Source: **GitHub Actions**). Lembre que os dados ficam no navegador de cada computador: outro endereço ou outro PC começa vazio até importar um backup.

## Desenvolver

```bash
npm test          # 315 verificações automáticas (campeonato, agenda, regras, backup)
npm run build     # gera dist/arena-beach-tennis.html, dist/artifact.html e dist/pages/
```

Estrutura:

| Pasta/arquivo | Conteúdo |
|---|---|
| `src/` | código em scripts clássicos com namespace global `window.ABT` (funciona por duplo clique, sem módulos ES) |
| `src/regras.js`, `agenda.js`, `torneio.js`, `data.js` | regras de negócio e dados, testáveis em Node |
| `src/org_*.js` | telas do modo Organização |
| `vendor/three.min.js` | Three.js r152 (sem CDN) |
| `tests/` | testes em Node |
| `tools/` | testes de tela com Playwright (lentos por causa do WebGL; rodar em segundo plano) |
| `docs/` | roadmap vivo (decisões D01–D49) e wireframes |
| `build.js` | junta tudo em arquivo único |

## Privacidade

Nunca versione arquivos de backup (`*.json`): contêm telefones e dados de alunos. O `.gitignore` já bloqueia os nomes padrão.

## Fluxo de atualização

Cada rodada: atualizar `docs/roadmap.md` (versão, decisões, log), rodar `npm test`, `npm run build`, copiar `dist/arena-beach-tennis.html` e fazer commit com mensagem no formato `feat(fase3): ...`, `fix: ...`, `docs: ...`.
