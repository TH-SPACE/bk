require('dotenv').config();
const mysql = require('mysql2/promise');
const { criarTabelaAtualizacao, criarTabelaBacklog } = require('./schema');

async function setupDatabase() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Conectado. Criando tabelas...');

  await criarTabelaAtualizacao(conn);
  console.log('Tabela atualizacao ok.');

  const tableName = process.env.BACKLOG_TABLE || 'backlog_elos';
  await criarTabelaBacklog(conn, tableName);
  console.log(`Tabela ${tableName} ok.`);

  await conn.end();
  console.log('Setup finalizado.');
}

setupDatabase().catch((err) => {
  console.error('Erro no setup:', err);
  process.exit(1);
});
