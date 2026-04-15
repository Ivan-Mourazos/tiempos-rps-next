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
  
  console.log('--- TODAS LAS TABLAS QUE EMPIEZAN POR TGM ---');
  const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE 'TGM%' AND TABLE_TYPE = 'BASE TABLE'");
  console.table(tables.recordset);

  if (tables.recordset.length > 0) {
      console.log('\n--- COLUMNAS DE ALGUNAS TABLAS TGM ---');
      // Probamos con una que suene a clientes si existe
      const tablesToCheck = ['TGM_Clientes', 'TGM_Direcciones', 'TGM_Avisos'];
      for (const t of tablesToCheck) {
          try {
              const cols = await pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${t}'`);
              console.log(`Columnas de ${t}:`, cols.recordset.map(c => c.COLUMN_NAME).join(', '));
          } catch (e) {}
      }
  }

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
