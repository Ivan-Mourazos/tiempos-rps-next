const sql = require('mssql');
require('dotenv').config({ path: '.env' });

const cfg = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: { encrypt: false, trustServerCertificate: true }
};

async function main() {
  const pool = await sql.connect(cfg);
  
  console.log('--- BUSCANDO TABLAS DE CLIENTES O DIRECCIONES ---');
  const tables = await pool.request().query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME LIKE '%Cliente%' OR TABLE_NAME LIKE '%Direccion%'
      AND TABLE_TYPE = 'BASE TABLE'
  `);
  console.table(tables.recordset);

  console.log('\n--- COLUMNAS DE tgm_monitorizacion COMPLETAS ---');
  const cols = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'tgm_monitorizacion'
  `);
  console.table(cols.recordset);

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
