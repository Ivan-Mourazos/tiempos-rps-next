import sql from 'mssql';
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
import {
  DEFAULT_LIST_LIMIT,
  SEARCH_RESULT_LIMIT,
  getLocalTodayISO,
  getSlowQueryWarningMessage,
  isDateRangeInverted,
  isTodayDashboardView,
} from './lib/dateRange';
import {
  OUTER_APPLY_WARNING_CLIENT,
  CLIENTE_RESOLVED_COLUMN,
  buildClienteWarningExistsClause,
} from './lib/monitorizacionSql';

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
  return msg;
}

function hasTextSearch(filters) {
  return Boolean(filters.cliente?.trim() || filters.telefono?.trim());
}

/** Límite SQL: búsqueda por texto trae todos os coincidentes (ata SEARCH_RESULT_LIMIT). */
function getEffectiveQueryLimit(limit, filters) {
  if (hasTextSearch(filters)) {
    return SEARCH_RESULT_LIMIT;
  }
  return Math.min(Math.max(limit, DEFAULT_LIST_LIMIT), 500);
}

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
  const { tecnico, tipo, prioridad, cliente, telefono, fechaInicio, fechaFin } = filters;

  if (isDateRangeInverted(fechaInicio, fechaFin)) {
    return (
      <div className="error-banner" role="alert">
        <strong>⚠️ Intervalo de datas non válido:</strong> a data &quot;Ata&quot; debe ser posterior ou igual á data &quot;Desde&quot;.
      </div>
    );
  }

  try {
    const pool = await getDbConnection();
    const queryLimit = getEffectiveQueryLimit(limit, filters);
    let query = `SELECT TOP ${queryLimit} ${SQL_COLUMNS}
                 FROM tgm_monitorizacion m WITH (NOLOCK)
                 ${OUTER_APPLY_WARNING_CLIENT}
                 WHERE 1=1`;
    const request = pool.request();

    if (tecnico && tecnico !== 'TODOS') {
      query += ' AND (m.abreviatura = @tecnico OR m.comercial = @tecnico)';
      request.input('tecnico', tecnico);
    }
    if (tipo && tipo !== 'TODOS') {
      query += ' AND m.tipo = @tipo';
      request.input('tipo', tipo);
    }
    if (prioridad && prioridad !== 'TODAS') {
      query += ' AND m.prioridad = @prioridad';
      request.input('prioridad', parseInt(prioridad));
    }
    if (cliente) {
      const palabras = cliente.trim().split(/\s+/).filter(Boolean);
      const paramNames = palabras.map((p, i) => {
        const name = `cliente${i}`;
        request.input(name, `%${p}%`);
        return name;
      });

      const directMatch = palabras
        .map((_, i) => `m.cliente LIKE @cliente${i}`)
        .join(' AND ');
      const warningExists = buildClienteWarningExistsClause(paramNames);

      query += ` AND ((${directMatch}) OR ${warningExists} OR m.aviso LIKE @clienteFull OR m.comercial LIKE @clienteFull)`;
      request.input('clienteFull', `%${cliente}%`);
    }
    if (telefono) {
      query += ' AND (m.Telefono1 LIKE @telefono OR m.Telefono2 LIKE @telefono)';
      request.input('telefono', `%${telefono}%`);
    }
    if (fechaInicio) {
      query += ' AND m.fecha >= @fechaInicio';
      request.input('fechaInicio', fechaInicio);
    }
    
    // Determine the end date for SQL and Order logic
    // If no end date was chosen in the params but we have a start date, 
    // it functions as a single day filter (for the start date) per user request.
    const effectiveFechaFin = filters.fechaFin || filters.fechaInicio;
    
    if (effectiveFechaFin) {
      query += ' AND m.fecha < DATEADD(day, 1, @fechaFinSql)';
      request.input('fechaFinSql', effectiveFechaFin);
    }

    // Lógica orden web vieja revisada
    if (!filters.fechaInicio && !filters.fechaFin) {
      // Default: últimos registros primero
      query += ' ORDER BY m.fecha DESC, m.hora DESC';
    } else if (filters.fechaInicio && !filters.fechaFin) {
      // Día específico suelto: orden hora descendente (nuevos primero)
      query += ' ORDER BY m.fecha DESC, m.hora DESC';
    } else if (filters.fechaInicio === effectiveFechaFin) {
      // Mismo día explícito
      query += ' ORDER BY m.fecha DESC, m.hora DESC';
    } else {
      // Intervalo de varios días
      query += ' ORDER BY m.fecha ASC, m.hora DESC';
    }

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
        const photoRequest = pool.request();
        const placeholders = asistencias.map((value, idx) => {
          const paramName = `a${idx}`;
          photoRequest.input(paramName, String(value).trim());
          return `@${paramName}`;
        });

        const photoResult = await photoRequest.query(
          `SELECT asistencia, foto FROM TGM_MONITORIZACION_FOTOS WITH (NOLOCK) 
           WHERE asistencia IN (${placeholders.join(', ')})`
        );

        const photoRecords = photoResult.recordset || [];
        
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

    return (
      <>
        <ul className="job-list" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', listStyle: 'none', padding: 0 }}>
          {dbData.map((item, index) => {
            const asistKey = item.asistencia ? String(item.asistencia).trim() : null;
            const extraPhotos = asistKey ? photosMap[asistKey] : null;
            return <JobCardWrapper key={index} item={item} index={index} extraPhotos={extraPhotos} />;
          })}
        </ul>
        {dbData.length >= queryLimit && queryLimit < SEARCH_RESULT_LIMIT && (
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
  const isTodayView = isTodayDashboardView(params, today);
  const hasDateParams = params.fechaInicio || params.fechaFin;
  const limit = parseInt(params.limit) || DEFAULT_LIST_LIMIT;

  const filters = {
    tecnico: params.tecnico || 'TODOS',
    tipo: params.tipo || 'TODOS',
    prioridad: params.prioridad || 'TODAS',
    cliente: params.cliente || '',
    telefono: params.telefono || '',
    fechaInicio: params.fechaInicio || (hasDateParams ? '' : today),
    fechaFin: params.fechaFin || ''
  };

  const loadingSubmessage = getSlowQueryWarningMessage(filters.fechaInicio, filters.fechaFin);

  // El metadata lo cargamos de forma asíncrona también para no bloquear el esqueleto base
  const metadataPromise = getMetadata(filters);

  return (
    <FilterNavProvider>
    <div className="dashboard-container">
      <AutoRefresh interval={60000} />
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', maxWidth: '1600px', margin: '0 auto' }}>
          {/* Logo */}
          <div
            className="header-title-logo"
            role="img"
            aria-label="Monitorización Tiempos RPS Next"
            style={{ flexShrink: 0, borderRight: '1px solid var(--border-strong)', paddingRight: '1rem', marginLeft: '-14px' }}
          >
            <img src="/monitorizacion_claro.PNG" alt="" className="logo-light" />
            <img src="/monitorizacion_oscuro.PNG" alt="" className="logo-dark" />
          </div>

          {/* Filtros */}
          <div style={{ flex: '1 1 0', minWidth: 0, padding: '0 1.25rem' }}>
            <Suspense fallback={<div className="filter-placeholder" aria-hidden="true" style={{ height: '55px' }} />}>
              <FilterWrapper filters={filters} metadataPromise={metadataPromise} />
            </Suspense>
          </div>

          {/* Acciones */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--border-strong)', paddingLeft: '1rem' }}>
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
              key={JSON.stringify({ ...filters, limit })}
              fallback={
                <LoadingState
                  message="Cargando datos"
                  submessage={loadingSubmessage}
                  submessageVariant={loadingSubmessage ? 'warning' : 'default'}
                />
              }
            >
              <JobBoard filters={filters} limit={limit} isTodayView={isTodayView} />
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
