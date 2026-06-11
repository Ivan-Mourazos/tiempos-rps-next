import sql from 'mssql';
import { NextResponse } from 'next/server';

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 15000,
    requestTimeout: 30000,
  }
};

// Mesmo pool global que page.js (comparte conexións)
async function getDbConnection() {
  if (!global.sqlPool) {
    global.sqlPool = new sql.ConnectionPool(dbConfig);
    global.poolPromise = global.sqlPool.connect();
  }
  const pool = await global.poolPromise;
  if (!pool.connected) {
    global.poolPromise = global.sqlPool.connect();
    return await global.poolPromise;
  }
  return pool;
}

/**
 * GET /api/ficha?asistencia=OM0249437
 * Dirección, preaviso, CP e provincia dun rexistro.
 * Sacouse da query da lista: o JOIN coa vista TGM_ORDENES_MANTENIMIENTO_DIA
 * custa ~800ms por páxina; individual con CodCompany, ~20ms.
 */
export async function GET(request) {
  const asistencia = request.nextUrl.searchParams.get('asistencia')?.trim();
  if (!asistencia) {
    return NextResponse.json({ error: 'Falta asistencia' }, { status: 400 });
  }

  try {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('asistencia', asistencia)
      .query(`SELECT TOP 1
                d.DireccionCliente, d.TelefonoPreavisoCliente, d.LocalidadCliente,
                c.ZipCode, s.Description AS Provincia
              FROM TGM_ORDENES_MANTENIMIENTO_DIA d WITH (NOLOCK)
              LEFT JOIN FACCustomer c WITH (NOLOCK) ON d.CodCliente = c.CodCustomer AND d.CodCompany = c.CodCompany
              LEFT JOIN GENState s WITH (NOLOCK) ON c.IDState = s.IDState
              WHERE d.CodCompany = '001' AND d.CodOrdenMantenimiento = @asistencia`);

    return NextResponse.json(result.recordset[0] || {});
  } catch (error) {
    console.error('Error /api/ficha:', error.message);
    return NextResponse.json({ error: 'Error consultando ficha' }, { status: 500 });
  }
}
