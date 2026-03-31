require('dotenv').config({ path: '.env' });
const sql = require('mssql');

async function testConnection() {
  console.log('Intentando conectar a DB_HOST:', process.env.DB_HOST);
  console.log('Usuario:', process.env.DB_USER);
  console.log('Base de datos:', process.env.DB_NAME);

  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || 1433),
    options: {
      encrypt: true, // Probando true por si acaso
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 30000,
      cryptoCredentialsDetails: {
        minVersion: 'TLSv1.1' // SQL 2014 suele usar TLS 1.1 o 1.2
      }
    }
  };

  try {
    console.log('Conectando a SQL Server a través de la red local...');
    console.log(`Parámetros: ${config.server}:${config.port} | Usuario: ${config.user} | DB: ${config.database}`);
    await sql.connect(config);
    console.log('¡Conexión Exitosa!');
    
    console.log('probando consulta SELECT TOP 5 * FROM tgm_monitorizacion...');
    const result = await sql.query('SELECT TOP 5 * FROM tgm_monitorizacion');
    console.log('Datos extraídos:', result.recordset);
    
  } catch (err) {
    console.error('Error al conectar a SQL Server:', err);
    if (err.originalError) {
      console.error('Detalle técnico original:', err.originalError);
    }
    if (err.cause) {
      console.error('Posible causa fundamental (network level):', err.cause);
    }
  } finally {
    process.exit();
  }
}

testConnection();
