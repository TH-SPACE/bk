require('dotenv').config();
const mysql = require('mysql2/promise');
const { criarTabelaBacklog } = require('./schema');

async function setupDatabase() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Conectado. Criando tabelas...');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS atualizacao (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tipo VARCHAR(100) NOT NULL,
      datahora DATETIME,
      UNIQUE KEY idx_tipo (tipo)
    )
  `);
  await conn.query(`
    INSERT IGNORE INTO atualizacao (tipo, datahora) VALUES ('backlog_elos', '2000-01-01 00:00:00')
  `);
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
