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
  
  console.log('--- COLUMNAS DE FACCustomer ---');
  const cols = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'FACCustomer'
  `);
  console.log(cols.recordset.map(c => c.COLUMN_NAME).join(', '));

  console.log('\n--- MUESTRA DE FACCustomer (1 fila) ---');
  const sample = await pool.request().query(`
    SELECT TOP 1 IDCustomer, ZipCode, City, County, Address
    FROM FACCustomer
  `);
  console.log(JSON.stringify(sample.recordset[0], null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
