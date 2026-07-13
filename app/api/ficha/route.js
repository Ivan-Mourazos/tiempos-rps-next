import sql from 'mssql';
import { NextResponse } from 'next/server';
import {
  CLIENTE_RESOLVED_COLUMN,
  OUTER_APPLY_WARNING_CLIENT,
} from '../../lib/monitorizacionSql';

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

const ASISTENCIA_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const PRIVATE_RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
};

function jsonResponse(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: PRIVATE_RESPONSE_HEADERS,
  });
}

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
  const includeDetail = request.nextUrl.searchParams.get('detalle') === '1';
  if (!asistencia || !ASISTENCIA_PATTERN.test(asistencia)) {
    return jsonResponse({ error: 'Asistencia non válida' }, 400);
  }

  try {
    const pool = await getDbConnection();

    if (includeDetail) {
      const baseRequest = pool.request().input('asistencia', asistencia);
      const addressRequest = pool.request().input('asistencia', asistencia);
      const photosRequest = pool.request().input('asistencia', asistencia);

      const [baseResult, addressResult, photosResult] = await Promise.all([
        baseRequest.query(`SELECT TOP 1
                            m.aviso, ${CLIENTE_RESOLVED_COLUMN}, m.local, m.localidad,
                            m.Telefono1, m.Telefono2, m.fecha, m.hora,
                            m.tiempo_total, m.tiempo_previsto, m.comercial, m.abreviatura,
                            m.tipo, m.prioridad, m.texto, m.observaciones, m.gps,
                            m.solucion, m.asistencia, m.pedido
                          FROM tgm_monitorizacion m WITH (NOLOCK)
                          ${OUTER_APPLY_WARNING_CLIENT}
                          WHERE m.asistencia = @asistencia`),
        addressRequest.query(`SELECT TOP 1
                                d.DireccionCliente, d.TelefonoPreavisoCliente, d.LocalidadCliente,
                                c.ZipCode, s.Description AS Provincia
                              FROM TGM_ORDENES_MANTENIMIENTO_DIA d WITH (NOLOCK)
                              LEFT JOIN FACCustomer c WITH (NOLOCK)
                                ON d.CodCliente = c.CodCustomer AND d.CodCompany = c.CodCompany
                              LEFT JOIN GENState s WITH (NOLOCK) ON c.IDState = s.IDState
                              WHERE d.CodCompany = '001' AND d.CodOrdenMantenimiento = @asistencia`),
        photosRequest.query(`SELECT foto
                             FROM TGM_MONITORIZACION_FOTOS WITH (NOLOCK)
                             WHERE asistencia = @asistencia`),
      ]);

      const baseItem = baseResult.recordset[0];
      if (!baseItem) {
        return jsonResponse({ error: 'Ficha non atopada' }, 404);
      }

      const photos = (photosResult.recordset || [])
        .map(row => String(row.foto || '').trim())
        .filter(Boolean)
        .sort((a, b) => {
          const aNum = Number.parseInt(a.match(/_(\d+)\.[^.]+$/)?.[1] || '999', 10);
          const bNum = Number.parseInt(b.match(/_(\d+)\.[^.]+$/)?.[1] || '999', 10);
          return aNum - bNum;
        })
        .map(photoPath => ({
          url: `/api/images?path=${encodeURIComponent(photoPath)}`,
          originalName: photoPath.split(/[\\/]/).pop() || 'image.jpg',
        }));

      return jsonResponse({
        item: { ...baseItem, ...(addressResult.recordset[0] || {}) },
        photos,
      });
    }

    const result = await pool.request()
      .input('asistencia', asistencia)
      .query(`SELECT TOP 1
                d.DireccionCliente, d.TelefonoPreavisoCliente, d.LocalidadCliente,
                c.ZipCode, s.Description AS Provincia
              FROM TGM_ORDENES_MANTENIMIENTO_DIA d WITH (NOLOCK)
              LEFT JOIN FACCustomer c WITH (NOLOCK) ON d.CodCliente = c.CodCustomer AND d.CodCompany = c.CodCompany
              LEFT JOIN GENState s WITH (NOLOCK) ON c.IDState = s.IDState
              WHERE d.CodCompany = '001' AND d.CodOrdenMantenimiento = @asistencia`);

    return jsonResponse(result.recordset[0] || {});
  } catch (error) {
    console.error('Error /api/ficha:', error?.code || error?.name || 'UNKNOWN');
    return jsonResponse({ error: 'Error consultando ficha' }, 500);
  }
}
