import sql from 'mssql';
import { Suspense } from 'react';
import ThemeToggle from './components/ThemeToggle';
import FilterForm from './components/FilterForm';
import AutoRefresh from './components/AutoRefresh';
import JobCard from './components/JobCard';
import JobCardSkeleton from './components/JobCardSkeleton';
import LoadMore from './components/LoadMore';
import ScrollToTop from './components/ScrollToTop';

// Configuración de la DB
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 15000
  }
};

const TIPO_LABELS = {
  'PM': 'Instalaciones',
  'GC': 'Cobros',
  'VT': 'Visitas',
  'TP': 'Trabajo previo',
  'AS': 'Asistencias',
  'IN': 'Recados'
};

const TIPOS_ORDEN = ['PM', 'GC', 'VT', 'TP', 'AS', 'IN'];

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
async function getMetadata() {
  try {
    const pool = await getDbConnection();
    const [rTecnicos, rPrioridades] = await Promise.all([
      pool.request().query("SELECT DISTINCT abreviatura, comercial FROM tgm_monitorizacion WITH (NOLOCK) WHERE abreviatura IS NOT NULL AND abreviatura != '' ORDER BY abreviatura"),
      pool.request().query("SELECT DISTINCT prioridad FROM tgm_monitorizacion WITH (NOLOCK) WHERE prioridad IS NOT NULL ORDER BY prioridad")
    ]);
    
    const recTecnicos = rTecnicos.recordset || [];
    const recPrioridades = rPrioridades.recordset || [];

    const allTecnicos = recTecnicos.map(r => ({ 
      abbr: r.abreviatura ? String(r.abreviatura).trim() : '', 
      full: r.comercial ? String(r.comercial).trim() : '' 
    }));

    allTecnicos.sort((a, b) => (a.full || a.abbr).localeCompare(b.full || b.abbr));

    return {
      tecnicos: allTecnicos,
      tipos: TIPOS_ORDEN,
      prioridades: recPrioridades.map(r => r.prioridad).filter(p => p != null && p >= 1 && p <= 3).sort((a, b) => a - b)
    };
  } catch (error) {
    console.error("Error obteniendo metadatos:", error.message);
    return { tecnicos: [], tipos: [], prioridades: [] };
  }
}

// Columnas principales y datos extendidos vía JOIN (Dirección Completa y Pre-aviso)
const SQL_COLUMNS = "m.aviso, ISNULL(m.cliente, ISNULL(c2.Description, ISNULL(p2.CompanyName, p3.CompanyName))) as cliente, m.local, m.localidad, m.Telefono1, m.Telefono2, m.fecha, m.hora, m.tiempo_total, m.tiempo_previsto, m.comercial, m.abreviatura, m.tipo, m.prioridad, m.texto, m.observaciones, m.gps, m.foto1, m.foto2, m.foto3, m.foto4, m.solucion, m.asistencia, d.DireccionCliente, d.TelefonoPreavisoCliente, d.LocalidadCliente, c.ZipCode, s.Description as Provincia";

// Componente que carga los datos de la lista (Board)
async function JobBoard({ filters, limit }) {
  const { tecnico, tipo, prioridad, cliente, telefono, fechaInicio, fechaFin } = filters;
  
  try {
    const pool = await getDbConnection();
    let query = `SELECT TOP ${limit} ${SQL_COLUMNS} 
                 FROM tgm_monitorizacion m WITH (NOLOCK)
                 LEFT JOIN TGM_ORDENES_MANTENIMIENTO_DIA d WITH (NOLOCK) ON m.asistencia = d.CodOrdenMantenimiento 
                 LEFT JOIN FACCustomer c WITH (NOLOCK) ON d.CodCliente = c.CodCustomer AND d.CodCompany = c.CodCompany
                 LEFT JOIN GENState s WITH (NOLOCK) ON c.IDState = s.IDState
                 LEFT JOIN MANMaintenanceWarning w WITH (NOLOCK) ON m.aviso = w.MaintenanceWarningCode
                 LEFT JOIN _MANMaintenanceWarning_Custom wc WITH (NOLOCK) ON w.IDMaintenanceWarning = wc.IDMaintenanceWarning
                 LEFT JOIN FACCustomer c2 WITH (NOLOCK) ON wc.IDCliente = c2.IDCustomer
                 LEFT JOIN FACPotentialCustomerSL p2 WITH (NOLOCK) ON wc.IDCliente = p2.IDPotentialCustomer
                 LEFT JOIN FACPotentialCustomerSL p3 WITH (NOLOCK) ON wc.IDClientePotencial = p3.IDPotentialCustomer
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
      query += ` AND (${palabras.map((p, i) => {
        request.input(`cliente${i}`, `%${p}%`);
        return `(m.cliente LIKE @cliente${i} OR c2.Description LIKE @cliente${i} OR p2.CompanyName LIKE @cliente${i} OR p3.CompanyName LIKE @cliente${i})`;
      }).join(' AND ')} OR m.aviso LIKE @clienteFull OR m.comercial LIKE @clienteFull)`;
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
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>Non hay datos para esta selección.</p>
          <p style={{ fontSize: '0.9rem' }}>Proba a cambiar os filtros ou as fechas.</p>
        </div>
      );
    }

    // Fetch all photos for the current batch from the new view
    const asistencias = dbData.map(d => d.asistencia).filter(Boolean);
    let photosMap = {};
    
    if (asistencias.length > 0) {
      try {
        // Query the new view for all photos related to these asistencias
        const photoResult = await pool.request()
          .query(`SELECT asistencia, foto FROM TGM_MONITORIZACION_FOTOS WITH (NOLOCK) WHERE asistencia IN (${asistencias.map(a => `'${String(a).trim()}'`).join(',')})`);
        
        const photoRecords = photoResult.recordset || [];
        
        // Group photos by asistencia
        photoRecords.forEach(row => {
          const key = String(row.asistencia).trim();
          if (!photosMap[key]) photosMap[key] = [];
          photosMap[key].push(row.foto);
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
        {dbData.length >= limit && (
          <LoadMore currentLimit={limit} />
        )}
      </>
    );
  } catch (error) {
    return (
      <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444' }}>
        <strong>⚠️ Error al cargar los registros:</strong> {error.message}
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
    if (item.tiempo_total > item.tiempo_previsto) timeColor = '#ef4444'; 
    else if (item.tiempo_total < item.tiempo_previsto) timeColor = '#10b981';
  }

  // Use extraPhotos if available, otherwise fallback to legacy columns
  let rawPhotos = [];
  if (extraPhotos && extraPhotos.length > 0) {
    rawPhotos = extraPhotos;
  } else {
    rawPhotos = [item.foto1, item.foto2, item.foto3, item.foto4].filter(f => f && f !== '');
  }

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
      direccionCompleta={item.DireccionCliente}
      telefonoPreaviso={item.TelefonoPreavisoCliente}
      zipCode={item.ZipCode}
      provincia={item.Provincia}
      localidadCliente={item.LocalidadCliente}
      timeVal={formatTime(item.tiempo_total)}
      estTimeVal={formatTime(item.tiempo_previsto)}
      solutionVal={item.solucion || 'Pendente'}
      tecnicoVal={tecnicoVal}
      avisoCompleto={avisoCompleto}
      priorityVal={item.prioridad}
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
  const today = new Date().toISOString().split('T')[0];
  const limit = parseInt(params.limit) || 100;

  // Si no hay ningún parámetro de fecha, la carga inicial muestra solo el día de hoy
  const hasDateParams = params.fechaInicio || params.fechaFin;

  const filters = {
    tecnico: params.tecnico || 'TODOS',
    tipo: params.tipo || 'TODOS',
    prioridad: params.prioridad || 'TODAS',
    cliente: params.cliente || '',
    telefono: params.telefono || '',
    fechaInicio: params.fechaInicio || (hasDateParams ? '' : today),
    fechaFin: params.fechaFin || ''
  };

  // El metadata lo cargamos de forma asíncrona también para no bloquear el esqueleto base
  const metadataPromise = getMetadata();

  return (
    <div className="dashboard-container">
      <AutoRefresh interval={60000} />
      <header className="header" style={{ padding: '0.8rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <h1 style={{ fontSize: '1.25rem' }}>Monitorización Tiempos RPS Next</h1>
          <ThemeToggle />
        </div>
        
        {/* Los filtros aparecen en cuanto el metadata está listo, pero no bloquean el resto */}
        <Suspense fallback={<div style={{ height: '40px', background: 'var(--surface-color)', opacity: 0.5, borderRadius: '6px' }} />}>
          <FilterWrapper filters={filters} metadataPromise={metadataPromise} />
        </Suspense>
      </header>

      <main className="main-content" style={{ padding: '0.5rem 1rem' }}>
        {/* El tablero de trabajos se carga en streaming. Usamos una key única para forzar el skeleton al filtrar */}
        <Suspense 
          key={JSON.stringify({...filters, limit})}
          fallback={
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
              <JobCardSkeleton />
              <JobCardSkeleton />
              <JobCardSkeleton />
            </div>
          }
        >
          <JobBoard filters={filters} limit={limit} />
        </Suspense>
        <ScrollToTop />
      </main>
    </div>
  );
}

async function FilterWrapper({ filters, metadataPromise }) {
  const metadata = await metadataPromise;
  return <FilterForm filters={filters} metadata={metadata} tipoLabels={TIPO_LABELS} />;
}
