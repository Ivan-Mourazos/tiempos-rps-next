import sql from 'mssql';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import ThemeToggle from './components/ThemeToggle';
import ClearFiltersButton from './components/ClearFiltersButton';
import FilterForm from './components/FilterForm';
import AutoRefresh from './components/AutoRefresh';
import JobCard from './components/JobCard';
import LoadingState from './components/LoadingState';
import { FilterNavProvider, FilterNavMain } from './components/FilterNavContext';
import LoadMore from './components/LoadMore';
import ScrollToTop from './components/ScrollToTop';
import ViewSwitcher from './components/ViewSwitcher';
import MonitoringMap from './components/MonitoringMap';
import {
  MAX_LIST_LIMIT,
  expandDefaultDateRangeForTextSearch,
  getListQueryLimit,
  getLocalTodayISO,
  getSlowQueryWarningMessage,
  isDateRangeInverted,
  isTodayDashboardView,
} from './lib/dateRange';
import {
  OUTER_APPLY_WARNING_CLIENT,
  CLIENTE_RESOLVED_COLUMN,
} from './lib/monitorizacionSql';
import {
  applyMonitorizacionFilters,
  applyMonitorizacionOrder,
  normalizeMonitorizacionFilters,
} from './lib/monitorizacionFilters';

// Configuración de la DB
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 15000,
    // Rangos de datas amplos poden superar 15s; 3 min para búsquedas históricas
    requestTimeout: 180000,
  }
};

function formatQueryError(error) {
  const msg = error?.message || '';
  if (msg.includes('Timeout') || error?.code === 'ETIMEOUT') {
    return 'A consulta tardou demasiado. Proba a acotar máis as datas ou engadir cliente/aviso no filtro.';
  }
  if (msg.includes('Subquery returned more than 1 value')) {
    return 'Erro interno ao resolver o nome do cliente. Proba de novo; se persiste, contacta con soporte.';
  }
  return 'Non foi posible completar a consulta. Proba de novo ou contacta con soporte.';
}

/** SQL Server admite como moito 2100 parámetros por consulta. */
const PHOTO_PARAM_CHUNK = 1000;

const TIPO_LABELS = {
  'PM': 'Instalaciones',
  'GC': 'Cobros',
  'VT': 'Visitas',
  'TP': 'Trabajo previo',
  'AS': 'Asistencias',
  'IN': 'Recados',
  'COT': 'Consulta con OT'
};

const TIPOS_ORDEN = ['PM', 'GC', 'VT', 'TP', 'AS', 'IN', 'COT'];
const MAP_POINT_LIMIT = 50000;

// Pool de conexión global
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

// Fetch de metadatos (Tecnicos, Prioridades, etc)
async function getMetadata(filters = {}) {
  const { fechaInicio, fechaFin } = filters;
  try {
    const pool = await getDbConnection();
    
    // Consulta de tecnicos dinamica segun fechas
    let tecQuery = `SELECT DISTINCT 
                    ISNULL(NULLIF(CAST(abreviatura AS VARCHAR(100)), ''), comercial) as abreviatura, 
                    comercial 
                    FROM tgm_monitorizacion WITH (NOLOCK) 
                    WHERE ((abreviatura IS NOT NULL AND abreviatura != '') OR (comercial IS NOT NULL AND comercial != ''))`;
    
    const tecRequest = pool.request();
    if (fechaInicio) {
      tecQuery += ' AND fecha >= @fIni';
      tecRequest.input('fIni', fechaInicio);
    }
    const effectiveFechaFin = fechaFin || (fechaInicio ? fechaInicio : null);
    if (effectiveFechaFin) {
      tecQuery += ' AND fecha < DATEADD(day, 1, @fFin)';
      tecRequest.input('fFin', effectiveFechaFin);
    }
    tecQuery += ' ORDER BY comercial';

    const rTecnicos = await tecRequest.query(tecQuery);

    const recTecnicos = rTecnicos.recordset || [];

    const allTecnicos = recTecnicos.map(r => ({ 
      abbr: r.abreviatura ? String(r.abreviatura).trim() : '', 
      full: r.comercial ? String(r.comercial).trim() : '' 
    }));

    // El sort ya viene por comercial de la query, pero mantenemos por seguridad
    allTecnicos.sort((a, b) => (a.full || a.abbr).localeCompare(b.full || b.abbr));

    return {
      tecnicos: allTecnicos,
      tipos: TIPOS_ORDEN,
      // Escala TGM fixa 1=baixa, 2=media, 3=alta: evita un SELECT DISTINCT
      // sobre a vista enteira (~1s) en cada carga
      prioridades: [1, 2, 3]
    };
  } catch (error) {
    console.error("Error obteniendo metadatos:", error.message);
    return { tecnicos: [], tipos: [], prioridades: [] };
  }
}

// Columnas SELECT organizadas por origen/JOIN.
// IMPORTANTE: el orden y los alias no se pueden cambiar — el ORM no es estricto
// pero algunos componentes leen propiedades por nombre exacto (ej: item.Provincia).
const SQL_COLUMN_GROUPS = {
  // Campos base de la tabla principal tgm_monitorizacion (alias m)
  monitorizacion: [
    'm.aviso',
    // Cliente: OUTER APPLY TOP 1 (ver monitorizacionSql.js) — evita subquery >1 valor
    CLIENTE_RESOLVED_COLUMN,
    'm.local', 'm.localidad', 'm.Telefono1', 'm.Telefono2',
    'm.fecha', 'm.hora', 'm.tiempo_total', 'm.tiempo_previsto',
    'm.comercial', 'm.abreviatura', 'm.tipo', 'm.prioridad',
    'm.texto', 'm.observaciones', 'm.gps',
    'm.solucion', 'm.asistencia',
  ],
  // Dirección/preaviso/CP/provincia: cárganse baixo demanda en /api/ficha
  // ao abrir o modal. O JOIN coa vista TGM_ORDENES_MANTENIMIENTO_DIA custa
  // ~800ms por consulta de lista; sen el, ~50ms.
  // Pedido (al final por compatibilidad con el orden histórico de la query)
  extras: ['m.pedido'],
};

const SQL_COLUMNS = Object.values(SQL_COLUMN_GROUPS).flat().join(', ');

// Componente que carga los datos de la lista (Board)
async function JobBoard({ filters, limit, isTodayView }) {
  const { fechaInicio, fechaFin } = filters;

  if (isDateRangeInverted(fechaInicio, fechaFin)) {
    return (
      <div className="error-banner" role="alert">
        <strong>⚠️ Intervalo de datas non válido:</strong> a data &quot;Ata&quot; debe ser posterior ou igual á data &quot;Desde&quot;.
      </div>
    );
  }

  try {
    const pool = await getDbConnection();
    const queryLimit = getListQueryLimit(limit);
    let query = `SELECT TOP ${queryLimit} ${SQL_COLUMNS}
                 FROM tgm_monitorizacion m WITH (NOLOCK)
                 ${OUTER_APPLY_WARNING_CLIENT}
                 WHERE 1=1`;
    const request = pool.request();
    query = applyMonitorizacionFilters(query, request, filters);
    query = applyMonitorizacionOrder(query, filters);

    const result = await request.query(query);
    const dbData = result.recordset || [];

    if (dbData.length === 0) {
      return (
        <div className="empty-state">
          {isTodayView ? (
            <>
              <p className="empty-state-title">Aínda non hai rexistros hoxe</p>
              <p className="empty-state-hint">
                Cando os comerciais rexistren actividade, aparecerán aquí automaticamente.
              </p>
            </>
          ) : (
            <>
              <p className="empty-state-title">Non hay datos para esta selección.</p>
              <p className="empty-state-hint">Proba a cambiar os filtros ou as fechas.</p>
              <Link href="/" className="empty-state-action">
                Volver á vista de hoxe
              </Link>
            </>
          )}
        </div>
      );
    }

    // Fetch all photos for the current batch from the new view
    const asistencias = dbData.map(d => d.asistencia).filter(Boolean);
    let photosMap = {};
    
    if (asistencias.length > 0) {
      try {
        // Construimos parámetros @a0, @a1, ... uno por asistencia.
        // Patrón parametrizado: evita inyección SQL y soporta valores con caracteres especiales
        // (comillas, espacios, etc.) sin romper la query.
        // Por bloques: con máis de 2100 parámetros SQL Server rexeita a
        // consulta e as tarxetas quedaban sen fotos.
        const uniqueAsistencias = [...new Set(asistencias.map((value) => String(value).trim()))];
        const chunks = [];
        for (let i = 0; i < uniqueAsistencias.length; i += PHOTO_PARAM_CHUNK) {
          chunks.push(uniqueAsistencias.slice(i, i + PHOTO_PARAM_CHUNK));
        }

        const photoResults = await Promise.all(chunks.map((chunk) => {
          const photoRequest = pool.request();
          const placeholders = chunk.map((value, idx) => {
            const paramName = `a${idx}`;
            photoRequest.input(paramName, value);
            return `@${paramName}`;
          });
          return photoRequest.query(
            `SELECT asistencia, foto FROM TGM_MONITORIZACION_FOTOS WITH (NOLOCK)
             WHERE asistencia IN (${placeholders.join(', ')})`
          );
        }));

        const photoRecords = photoResults.flatMap((result) => result.recordset || []);
        
        // Group photos by asistencia
        photoRecords.forEach(row => {
          const key = String(row.asistencia).trim();
          if (!photosMap[key]) photosMap[key] = [];
          photosMap[key].push(row.foto);
        });

        // Sort photos by the number in the filename (e.g., _1.jpg, _2.jpg)
        Object.keys(photosMap).forEach(key => {
          photosMap[key].sort((a, b) => {
            const getNum = (str) => {
              // Extract the last number before the extension (e.g. _1.jpg -> 1)
              const match = String(str).match(/_(\d+)\.[^.]+$/);
              return match ? parseInt(match[1], 10) : 999;
            };
            return getNum(a) - getNum(b);
          });
        });
      } catch (photoError) {
        console.error("Error fetching photos from TGM_MONITORIZACION_FOTOS:", photoError.message);
        // Fallback: photosMap will be empty, will use legacy columns
      }
    }

    const usedKeys = new Map();
    return (
      <>
        <ul className="job-list job-list--stack">
          {dbData.map((item, index) => {
            const asistKey = item.asistencia ? String(item.asistencia).trim() : null;
            const extraPhotos = asistKey ? photosMap[asistKey] : null;
            // Clave estable: co refresco automático entran rexistros novos arriba e,
            // con key={index}, o modal aberto saltaba a outra tarxeta.
            const baseKey = asistKey || `${String(item.aviso || '').trim()}-${String(item.tipo || '').trim()}`;
            const repeat = usedKeys.get(baseKey) || 0;
            usedKeys.set(baseKey, repeat + 1);
            const key = repeat ? `${baseKey}#${repeat}` : baseKey;
            return <JobCardWrapper key={key} item={item} index={index} extraPhotos={extraPhotos} />;
          })}
        </ul>
        {dbData.length >= queryLimit && queryLimit < MAX_LIST_LIMIT && (
          <LoadMore currentLimit={queryLimit} />
        )}
      </>
    );
  } catch (error) {
    return (
      <div className="error-banner" role="alert">
        <strong>⚠️ Error al cargar los registros:</strong> {formatQueryError(error)}
      </div>
    );
  }
}

function parseGps(rawGps) {
  const normalized = String(rawGps || '').trim();
  if (!normalized || normalized === '0.0,0.0' || normalized === '0,0') return null;

  const [latRaw, lonRaw] = normalized.split(',');
  const lat = Number(String(latRaw || '').trim());
  const lon = Number(String(lonRaw || '').trim());

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180 ||
    (lat === 0 && lon === 0)
  ) {
    return null;
  }

  return {
    lat: Math.round(lat * 1e6) / 1e6,
    lon: Math.round(lon * 1e6) / 1e6,
  };
}

function hasDeclaredGps(rawGps) {
  const normalized = String(rawGps || '').trim();
  return Boolean(normalized && normalized !== '0.0,0.0' && normalized !== '0,0');
}

function serializeMapPoint(row, coordinates) {
  const fecha = row.fecha instanceof Date
    ? row.fecha.toISOString()
    : row.fecha
      ? new Date(row.fecha).toISOString()
      : null;

  return {
    id: String(row.asistencia || '').trim(),
    aviso: String(row.aviso || '').trim(),
    tipo: String(row.tipo || '').trim().toUpperCase(),
    cliente: String(row.cliente || '').replace(/['"]+/g, '').trim(),
    local: String(row.local || '').replace(/['"]+/g, '').trim(),
    localidad: String(row.localidad || '').trim(),
    tecnico: String(row.comercial || row.abreviatura || '').trim(),
    fecha,
    hora: Number(row.hora) || null,
    lat: coordinates.lat,
    lon: coordinates.lon,
  };
}

async function MapBoard({ filters }) {
  if (isDateRangeInverted(filters.fechaInicio, filters.fechaFin)) {
    return (
      <div className="error-banner" role="alert">
        <strong>⚠️ Intervalo de datas non válido:</strong> a data &quot;Ata&quot; debe ser posterior ou igual á data &quot;Desde&quot;.
      </div>
    );
  }

  try {
    const pool = await getDbConnection();
    const request = pool.request();
    let query = `SELECT TOP ${MAP_POINT_LIMIT + 1}
                   m.asistencia, m.aviso, m.tipo, m.fecha, m.hora,
                   m.comercial, m.abreviatura, m.local, m.localidad, m.gps,
                   ${CLIENTE_RESOLVED_COLUMN}
                 FROM tgm_monitorizacion m WITH (NOLOCK)
                 ${OUTER_APPLY_WARNING_CLIENT}
                 WHERE 1=1`;

    query = applyMonitorizacionFilters(query, request, filters);
    query += ' ORDER BY m.fecha DESC, m.hora DESC';

    const result = await request.query(query);
    const rows = result.recordset || [];
    const truncated = rows.length > MAP_POINT_LIMIT;
    if (truncated) rows.length = MAP_POINT_LIMIT;

    const points = [];
    const unmappedByLocation = new Map();
    let withoutGps = 0;
    let invalidGps = 0;

    for (const row of rows) {
      const coordinates = parseGps(row.gps);
      if (coordinates) {
        points.push(serializeMapPoint(row, coordinates));
        continue;
      }

      if (hasDeclaredGps(row.gps)) invalidGps += 1;
      else withoutGps += 1;

      const location = String(row.localidad || 'Sen concello').trim() || 'Sen concello';
      unmappedByLocation.set(location, (unmappedByLocation.get(location) || 0) + 1);
    }

    const unmappedLocations = Array.from(unmappedByLocation, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'gl'))
      .slice(0, 12);

    return (
      <MonitoringMap
        points={points}
        coverage={{
          total: rows.length,
          mapped: points.length,
          withoutGps,
          invalidGps,
          truncated,
          limit: MAP_POINT_LIMIT,
        }}
        unmappedLocations={unmappedLocations}
      />
    );
  } catch (error) {
    return (
      <div className="error-banner" role="alert">
        <strong>⚠️ Erro ao cargar o mapa:</strong> {formatQueryError(error)}
      </div>
    );
  }
}

// Wrapper para formatear los datos de cada tarjeta
function JobCardWrapper({ item, index, extraPhotos }) {
  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return '0h 00m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  };

  const dbTipo = item.tipo ? String(item.tipo).trim() : '';
  const tecnicoVal = item.comercial || item.abreviatura || 'N/A';
  const avisoCompleto = `${item.aviso ? String(item.aviso).trim() : ''}-${dbTipo}`;
  
  let timeColor = 'var(--text-primary)';
  if (item.tiempo_previsto && item.tiempo_total) {
    if (item.tiempo_total > item.tiempo_previsto) timeColor = 'var(--time-over)';
    else if (item.tiempo_total < item.tiempo_previsto) timeColor = 'var(--time-under)';
  }

  // Fotos: única fonte é TGM_MONITORIZACION_FOTOS (foto1-4 da vista eliminadas por IT)
  const rawPhotos = extraPhotos && extraPhotos.length > 0 ? extraPhotos : [];

  const photos = rawPhotos.map(p => ({
    url: `/api/images?path=${encodeURIComponent(p)}`,
    originalName: String(p).split(/[\\/]/).pop() || 'image.jpg'
  }));

  const cleanLocal = item.local?.replace(/['"]+/g, '').trim() || '';
  const cleanCliente = item.cliente?.replace(/['"]+/g, '').trim() || '';
  const isRealClientDifferent = cleanLocal.length > 0 && cleanLocal.toLowerCase() !== cleanCliente.toLowerCase();
  const formattedDate = item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <JobCard 
      index={index}
      item={{...item, local: cleanLocal, cliente: cleanCliente}}
      asistencia={item.asistencia}
      timeVal={formatTime(item.tiempo_total)}
      estTimeVal={formatTime(item.tiempo_previsto)}
      solutionVal={item.solucion || 'Pendente'}
      tecnicoVal={tecnicoVal}
      avisoCompleto={avisoCompleto}
      obsVal={item.observaciones}
      timeColor={timeColor}
      gpsParts={item.gps && item.gps !== '0.0,0.0' ? item.gps.split(',') : null}
      photos={photos}
      isRealClientDifferent={isRealClientDifferent}
      formattedDate={formattedDate}
    />
  );
}

// Componente principal de la página
export default async function Page({ searchParams }) {
  const params = await searchParams;
  const today = getLocalTodayISO();
  const view = params.vista === 'mapa' ? 'mapa' : 'listado';
  const isTodayView = isTodayDashboardView(params, today);
  const hasDateParams = params.fechaInicio || params.fechaFin;
  const limit = getListQueryLimit(params.limit);

  let filters = normalizeMonitorizacionFilters({
    tecnico: params.tecnico || 'TODOS',
    tipo: params.tipo || 'TODOS',
    prioridad: params.prioridad || 'TODAS',
    cliente: params.cliente || '',
    telefono: params.telefono || '',
    fechaInicio: params.fechaInicio || (hasDateParams ? '' : today),
    fechaFin: params.fechaFin || ''
  });

  if (!filters.fechaInicio && !filters.fechaFin) {
    filters = { ...filters, fechaInicio: today };
  }

  filters = expandDefaultDateRangeForTextSearch(filters, today);

  const loadingSubmessage = getSlowQueryWarningMessage(filters.fechaInicio, filters.fechaFin);

  // El metadata lo cargamos de forma asíncrona también para no bloquear el esqueleto base
  const metadataPromise = getMetadata(filters);

  return (
    <FilterNavProvider>
    <div className="dashboard-container">
      <AutoRefresh interval={60000} />
      <header className="header">
        <div className="header-container">
          {/* Logo */}
          <div
            className="header-title-logo"
            role="img"
            aria-label="Monitorización Tiempos RPS Next"
          >
            {/* Orixinais 2172×724 (~480 KB cada un); next/image serve WebP ao tamaño mostrado. */}
            <Image src="/monitorizacion_claro.PNG" width={2172} height={724} alt="" className="logo-light" sizes="240px" loading="eager" />
            <Image src="/monitorizacion_oscuro.PNG" width={2172} height={724} alt="" className="logo-dark" sizes="240px" loading="eager" />
          </div>

          {/* Filtros */}
          <div className="header-filters">
            <Suspense fallback={<div className="filter-placeholder" aria-hidden="true" style={{ height: '55px' }} />}>
              <FilterWrapper filters={filters} metadataPromise={metadataPromise} />
            </Suspense>
          </div>

          {/* Acciones */}
          <div className="header-actions">
            <ViewSwitcher currentView={view} />
            <ClearFiltersButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="main-content" style={{ padding: '0.5rem 1rem' }}>
        <Suspense
          fallback={
            <LoadingState
              message="Cargando datos"
              submessage={loadingSubmessage}
              submessageVariant={loadingSubmessage ? 'warning' : 'default'}
            />
          }
        >
          <FilterNavMain>
            <Suspense
              // Sen `limit`: "Cargar máis" mantén a lista visible en vez de volver ao spinner.
              key={JSON.stringify({ ...filters, view })}
              fallback={
                <LoadingState
                  message={view === 'mapa' ? 'Cargando mapa' : 'Cargando datos'}
                  submessage={loadingSubmessage}
                  submessageVariant={loadingSubmessage ? 'warning' : 'default'}
                />
              }
            >
              {view === 'mapa' ? (
                <MapBoard filters={filters} />
              ) : (
                <JobBoard filters={filters} limit={limit} isTodayView={isTodayView} />
              )}
            </Suspense>
          </FilterNavMain>
        </Suspense>
        <ScrollToTop />
      </main>
    </div>
    </FilterNavProvider>
  );
}

async function FilterWrapper({ filters, metadataPromise }) {
  const metadata = await metadataPromise;
  return <FilterForm filters={filters} metadata={metadata} tipoLabels={TIPO_LABELS} />;
}
