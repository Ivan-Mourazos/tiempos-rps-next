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
  
  console.log('--- BUSCANDO TABLAS General_Direcciones ---');
  const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Direccion%' OR TABLE_NAME LIKE 'General%'");
  console.table(tables.recordset);

  // Intentamos obtener las columnas de la vista TGM_ORDENES_MANTENIMIENTO_DIA de nuevo
  console.log('\n--- COLUMNAS DE TGM_ORDENES_MANTENIMIENTO_DIA ---');
  const cols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TGM_ORDENES_MANTENIMIENTO_DIA'");
  console.table(cols.recordset);

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
