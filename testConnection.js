require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

async function testConnection() {
  console.log('Intentando conectar a DB_HOST:', process.env.DB_HOST);
  console.log('Usuario:', process.env.DB_USER);
  console.log('Base de datos:', process.env.DB_NAME);

  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_HOST,
    port: 1433,
    database: process.env.DB_NAME,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 15000,
      cryptoCredentialsDetails: {
        minVersion: 'TLSv1' // Needed for older SQL Servers on Node 18+
      }
    }
  };

  try {
    console.log('Conectando a SQL Server...');
    await sql.connect(config);
    console.log('¡Conexión Exitosa!');
    
    console.log('probando consulta SELECT TOP 5 * FROM tgm_monitorizacion...');
    const result = await sql.query('SELECT TOP 5 * FROM tgm_monitorizacion');
    console.log('Datos extraídos:', result.recordset);
    
  } catch (err) {
    console.error('Error al conectar a SQL Server:', err);
  } finally {
    process.exit();
  }
}

testConnection();
