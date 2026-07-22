require('dotenv').config();
const conn = require('./db');
const { criarTabelaAtualizacao, criarTabelaBacklog } = require('./schema');
const { baixarBacklog } = require('./scraper');
const { importarArquivo } = require('./importBacklog');

async function main() {
  const usuario = process.env.ELOS_USER;
  const senha = process.env.ELOS_PASSWORD;

  if (!usuario || !senha) {
    console.error('Defina ELOS_USER e ELOS_PASSWORD no .env antes de rodar.');
    process.exit(1);
  }

  // Garante que as tabelas existem antes de usar (idempotente: so cria se faltar).
  const conexao = await conn;
  await criarTabelaAtualizacao(conexao);
  await criarTabelaBacklog(conexao, process.env.BACKLOG_TABLE || 'backlog_elos');

  const [linhas] = await (await conn).query(
    "SELECT DATE_FORMAT(datahora, '%Y-%m-%d %H:%i:%s') as data FROM atualizacao WHERE tipo = 'backlog_elos'"
  );
  const dataAtualizacaoAnterior = linhas[0] ? linhas[0].data : null;

  const { arquivo, dataAtualizacao } = await baixarBacklog({
    usuario,
    senha,
    dataAtualizacaoAnterior
  });

  if (!arquivo) {
    console.log('Nada a importar (Elos ainda nao atualizou o backlog).');
    return;
  }

  const stats = await importarArquivo(arquivo);
  console.log('Importacao concluida:', stats);

  await (await conn).query(
    "UPDATE atualizacao SET datahora = ? WHERE tipo = 'backlog_elos'",
    [dataAtualizacao]
  );
}

main()
  .catch((err) => {
    console.error('Erro na raspagem do backlog:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await (await conn).end(); } catch (e) { /* ja fechado */ }
  });
