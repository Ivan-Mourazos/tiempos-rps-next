require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  }
};

async function inspect() {
  try {
    await sql.connect(config);
    console.log('--- ESTRUCTURA DE tgm_monitorizacion ---');
    const schema = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'tgm_monitorizacion'
    `);
    console.table(schema.recordset);

    console.log('\n--- DATOS DE MUESTRA (20 Rilas) ---');
    const data = await sql.query('SELECT TOP 20 * FROM tgm_monitorizacion ORDER BY fecha DESC');
    console.table(data.recordset);

    console.log('\n--- LISTADO DE TÉCNICOS DISPONIBLES ---');
    const tecnicos = await sql.query('SELECT DISTINCT abreviatura FROM tgm_monitorizacion WHERE abreviatura IS NOT NULL');
    console.log(tecnicos.recordset.map(t => t.abreviatura));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

inspect();
