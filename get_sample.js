require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 5000
  }
};

async function inspect() {
  try {
    await sql.connect(config);
    const data = await sql.query('SELECT TOP 1 * FROM tgm_monitorizacion WHERE abreviatura = \'NUÑ\'');
    fs.writeFileSync('sample_data.json', JSON.stringify(data.recordset[0] || {}, null, 2));
    console.log('Sample guardado en sample_data.json');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

inspect();
