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
  
  console.log('--- BUSCANDO COLUMNAS DE CP / PROVINCIA EN TODA LA DB ---');
  const searchCols = await pool.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE (COLUMN_NAME LIKE '%Postal%' OR COLUMN_NAME LIKE '%CP%' OR COLUMN_NAME LIKE '%Zip%')
      OR (COLUMN_NAME LIKE '%Provin%' AND COLUMN_NAME NOT LIKE '%Provincip%')
  `);
  console.table(searchCols.recordset);

  // También buscamos si hay alguna columna que se llame 'Direccion' pero sea más larga o diferente
  const direccCols = await pool.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE COLUMN_NAME LIKE '%Direccion%' AND TABLE_NAME NOT LIKE '_%'
  `);
  console.table(direccCols.recordset);

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
