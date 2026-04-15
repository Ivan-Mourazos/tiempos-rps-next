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
  
  console.log('--- COLUMNAS de TGM_ORDENES_MANTENIMIENTO_DIA ---');
  const cols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'TGM_ORDENES_MANTENIMIENTO_DIA'
    ORDER BY ORDINAL_POSITION
  `);
  cols.recordset.forEach(c => console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

  console.log('\n--- BUSCANDO TABLAS CON CP Y PROVINCIA ---');
  const searchCols = await pool.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE (COLUMN_NAME LIKE '%Postal%' OR COLUMN_NAME LIKE '%CP%' OR COLUMN_NAME LIKE '%Provin%')
      AND TABLE_NAME NOT LIKE '_%'
  `);
  console.table(searchCols.recordset);

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
