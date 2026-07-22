# Elos Backlog Scraper

Versão independente, enxuta, da raspagem do backlog do site Elos (intranet). Faz login,
exporta o CSV do dashboard de backlog e sobe os dados na tabela `backlog_elos` do MariaDB/MySQL.

Baseado no script original do projeto `estoque` (`raspagem_backlogBD.js`), mas sem as tabelas
derivadas (`backlog_elos_hist`, `RNE_N_PL_BACKLOG_REG_TT`, `PL_TT_WO_NE`, `qua_percepcao_elos`,
`backlog_elos_congelado`, `etaProduction`) — este projeto cuida só da parte "baixar CSV do Elos
e manter a tabela `backlog_elos` atualizada".

## O que já foi testado (sem precisar do Elos)

Não dá pra testar o login/scraping de dentro daqui porque o Elos só é acessível pela intranet.
O que **foi validado de verdade**, usando o seu MariaDB local e uma fatia real de um CSV do Elos
(`fixtures/backlog-sample.csv`, 1500 linhas reais, várias regionais):

- `importBacklog.js` lê o CSV, filtra por REGIONAL, mapeia colunas pelo **nome do cabeçalho**
  (não pela posição — o export do Elos já mudou o número de colunas ao longo do tempo, então
  depender de posição fixa quebra silenciosamente).
- Faz upsert em lote (`INSERT ... ON DUPLICATE KEY UPDATE`) e marca/remove registros que saíram
  do backlog (`STATUS_GOPER`).
- Acentuação (á, ã, ç, ...) é lida corretamente — o export do Elos vem em Latin-1/Windows-1252,
  não UTF-8, e o parser já trata isso.
- Rodei `npm run test-import`: 538 de 1500 linhas da fixture batem com CENTRO OESTE/NORTE e foram
  importadas corretamente (345 CENTRO OESTE + 193 NORTE), sem tocar no seu banco `indicadores` real
  (usa um banco `elos_scraper_test` à parte).
- No caminho descobri que `PHYSICALRESOURCESUMMARY` pode chegar com quase 900 caracteres — mais
  que o `VARCHAR(255)` do schema original do seu amigo. Nesta versão a coluna virou `TEXT` para
  não truncar/dar erro.

## O que você precisa testar (só isso depende da intranet)

1. Rodar `npm start` de uma máquina com acesso a `http://10.31.36.30/elos`, com `ELOS_USER`/
   `ELOS_PASSWORD` reais no `.env`.
2. Conferir os screenshots em `./screenshots/` (1 a 4) se o login ou a navegação até o dashboard
   travar em algum ponto — os seletores/XPaths foram copiados do script original, mas são
   posicionais e dependem do layout exato da tela do Elos.
3. Confirmar que o arquivo baixado em `./downloads/` tem cabeçalho com `COD_SS` e `REGIONAL` (se o
   Elos mudar o formato do export de novo, o script avisa e para, em vez de importar lixo).

## Setup

```bash
npm install
cp .env.example .env
# edite o .env: credenciais do Elos + dados do banco
npm run setup-db      # opcional: cria as tabelas com antecedencia
```

`npm start` já verifica e cria as tabelas `atualizacao` e `backlog_elos` sozinho se elas não
existirem no banco (`DB_NAME` do `.env`), então rodar `npm run setup-db` antes é opcional —
serve só se você quiser conferir o schema sem rodar a raspagem inteira.

## Uso

```bash
npm start             # login no Elos -> exporta CSV -> importa para backlog_elos
npm run test-import   # testa só o parser/import, com a fixture local, sem Puppeteer
```

`npm start` só baixa e reprocessa se a data de atualização do Elos (`#hdDataAtualizacao`) for
diferente da última execução registrada na tabela `atualizacao` — isso evita reprocessar o mesmo
backlog várias vezes por dia.

## Variáveis de ambiente (`.env`)

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | sim | — | Conexão com o MariaDB/MySQL |
| `ELOS_USER`, `ELOS_PASSWORD` | sim | — | Login no site Elos |
| `ELOS_URL` | não | `http://10.31.36.30/elos` | URL do Elos |
| `CHROME_PATH` | não | detecta automaticamente | Caminho do Chrome/Chromium |
| `HEADLESS` | não | `true` | Coloque `false` para ver o navegador rodando (útil pra debugar seletor) |
| `DOWNLOAD_DIR`, `SCREENSHOT_DIR` | não | `./downloads`, `./screenshots` | Pastas de saída |
| `BACKLOG_TABLE` | não | `backlog_elos` | Nome da tabela de destino |
| `REGIOES_VALIDAS` | não | `CENTRO OESTE,NORTE` | Regionais a importar (separadas por vírgula) |
| `MIN_LINHAS` | não | `1000` | Sanidade: aborta se o CSV vier menor que isso |
| `BATCH_SIZE` | não | `500` | Tamanho do lote de INSERT |

## Estrutura

```
db.js              -> pool de conexao mysql2
schema.js          -> definicao da tabela backlog_elos (compartilhada por setup-db.js e test-import.js)
setup-db.js        -> cria as tabelas atualizacao/backlog_elos
scraper.js         -> Puppeteer: login, navegacao, export do CSV (so roda com acesso a intranet)
importBacklog.js   -> parse do CSV + upsert em lote (testavel sem Puppeteer)
index.js           -> orquestra: checa atualizacao -> scraper -> importBacklog
test-import.js     -> testa importBacklog.js com fixtures/backlog-sample.csv, sem precisar do Elos
fixtures/          -> fatia real (anonimizavel) de um export do Elos, para teste local
```
