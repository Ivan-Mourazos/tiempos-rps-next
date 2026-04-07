import sql from 'mssql';
import ThemeToggle from './components/ThemeToggle';
import FilterForm from './components/FilterForm';
import ImageCarousel from './components/ImageCarousel';
import ExpandableText from './components/ExpandableText';
import AutoRefresh from './components/AutoRefresh';
import JobCard from './components/JobCard';
import { Clock, Calendar, User, MapPin, Phone } from 'lucide-react';

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

async function getDbConnection() {
  if (!global.sqlPool) {
    global.sqlPool = new sql.ConnectionPool(dbConfig);
    global.poolPromise = global.sqlPool.connect();
  }
  
  const pool = await global.poolPromise;
  if (!pool.connected) {
    console.log('Reconectando a SQL Server...');
    global.poolPromise = global.sqlPool.connect();
    return await global.poolPromise;
  }
  return pool;
}

async function getMetadata() {
  try {
    const pool = await getDbConnection();
    const rTecnicos = await pool.request().query("SELECT DISTINCT abreviatura, comercial FROM tgm_monitorizacion WHERE abreviatura IS NOT NULL AND abreviatura != '' ORDER BY abreviatura");
    const rTipos = await pool.request().query("SELECT DISTINCT tipo FROM tgm_monitorizacion WHERE tipo IS NOT NULL AND tipo != '' ORDER BY tipo");
    const rPrioridades = await pool.request().query("SELECT DISTINCT prioridad FROM tgm_monitorizacion WHERE prioridad IS NOT NULL ORDER BY prioridad");
    
    const recTecnicos = rTecnicos.recordset || [];
    const recPrioridades = rPrioridades.recordset || [];

    const allTecnicos = recTecnicos.map(r => ({ 
      abbr: r.abreviatura ? String(r.abreviatura).trim() : '', 
      full: r.comercial ? String(r.comercial).trim() : '' 
    }));

    allTecnicos.sort((a, b) => (a.full || a.abbr).localeCompare(b.full || b.abbr));

    return {
      success: true,
      data: {
        tecnicos: allTecnicos,
        tipos: TIPOS_ORDEN,
        prioridades: recPrioridades.map(r => r.prioridad).filter(p => p != null && p >= 1 && p <= 3).sort((a, b) => a - b)
      }
    };
  } catch (error) {
    console.error("Error obteniendo metadatos:", error.message);
    return { success: false, error: error.message, data: { tecnicos: [], tipos: [], prioridades: [] } };
  }
}

async function getMonitorizacionData(filters = {}) {
  try {
    const { tecnico, tipo, prioridad, cliente, telefono, fechaInicio, fechaFin } = filters;
    const pool = await getDbConnection();
    
    let query = 'SELECT * FROM tgm_monitorizacion WHERE 1=1';
    const request = pool.request();

    if (tecnico && tecnico !== 'TODOS') {
      query += ' AND (abreviatura = @tecnico OR comercial = @tecnico)';
      request.input('tecnico', tecnico);
    }
    if (tipo && tipo !== 'TODOS') {
      query += ' AND tipo = @tipo';
      request.input('tipo', tipo);
    }
    if (prioridad && prioridad !== 'TODAS') {
      query += ' AND prioridad = @prioridad';
      request.input('prioridad', parseInt(prioridad));
    }
    if (cliente) {
      const palabras = cliente.trim().split(/\s+/).filter(Boolean);
      if (palabras.length === 1) {
        query += ' AND (cliente LIKE @cliente0 OR aviso LIKE @cliente0 OR comercial LIKE @cliente0)';
        request.input('cliente0', `%${palabras[0]}%`);
      } else {
        const condiciones = palabras.map((p, i) => {
          request.input(`cliente${i}`, `%${p}%`);
          return `(cliente LIKE @cliente${i})`;
        });
        query += ` AND (${condiciones.join(' AND ')} OR aviso LIKE @clienteFull OR comercial LIKE @clienteFull)`;
        request.input('clienteFull', `%${cliente}%`);
      }
    }
    if (telefono) {
      query += ' AND (Telefono1 LIKE @telefono OR Telefono2 LIKE @telefono)';
      request.input('telefono', `%${telefono}%`);
    }
    if (fechaInicio) {
      query += ' AND fecha >= @fechaInicio';
      request.input('fechaInicio', fechaInicio);
    }
    if (fechaFin) {
      query += ' AND fecha < DATEADD(day, 1, @fechaFin)';
      request.input('fechaFin', fechaFin);
    }

    query += ' ORDER BY fecha DESC, hora DESC';
    const result = await request.query(query);
    const records = result.recordset || [];
    
    console.log(`[RPS] Query final: Range ${fechaInicio} - ${fechaFin}, Total: ${records.length}`);
    return { success: true, data: records };
  } catch (error) {
    console.error("Error cargando monitorización:", error.message);
    return { success: false, error: error.message, data: [] };
  }
}

function formatTime(minutes) {
  if (!minutes || minutes === 0) return '0h 00m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function safeString(val, defaultVal) {
  if (!val) return defaultVal;
  val = Array.isArray(val) ? val[0] : val;
  return typeof val === 'string' ? val : String(val);
}

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const today = new Date().toISOString().split('T')[0];

  const filters = {
    tecnico: safeString(params.tecnico, 'TODOS'),
    tipo: safeString(params.tipo, 'TODOS'),
    prioridad: safeString(params.prioridad, 'TODAS'),
    cliente: safeString(params.cliente, ''),
    telefono: safeString(params.telefono, ''),
    fechaInicio: safeString(params.fechaInicio, today),
    fechaFin: safeString(params.fechaFin, today)
  };

  const monitorizacionRes = await getMonitorizacionData(filters);
  const metadataRes = await getMetadata();

  const dbData = monitorizacionRes?.data || [];
  const metadata = metadataRes?.data || { tecnicos: [], tipos: [], prioridades: [] };
  const connectionError = monitorizacionRes?.error || metadataRes?.error;
  const hasData = dbData.length > 0;

  return (
    <div className="dashboard-container">
      <AutoRefresh interval={60000} />
      <header className="header" style={{ padding: '0.8rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <h1 style={{ fontSize: '1.25rem' }}>Monitorización Tiempos RPS Next</h1>
          <ThemeToggle />
        </div>
        
        <FilterForm filters={filters} metadata={metadata} tipoLabels={TIPO_LABELS} />
      </header>

      <main className="main-content" style={{ padding: '1rem 1.5rem' }}>
        {connectionError && (
          <div style={{ 
            padding: '1rem', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid #ef4444', 
            borderRadius: '8px', 
            color: '#ef4444', 
            marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}>
            <strong>⚠️ Error de conexión con la base de datos:</strong> {connectionError}
            <br />
            <small style={{ marginTop: '0.5rem', display: 'block', opacity: 0.8 }}>
              Verifica el archivo .env y asegúrate de que el servidor tenga acceso a SQL Server.
            </small>
          </div>
        )}

        {!connectionError && !hasData && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>Non hay datos para esta selección.</p>
            <p style={{ fontSize: '0.85rem' }}>Proba a cambiar os filtros ou as fechas.</p>
          </div>
        )}

        <ul className="job-list" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', listStyle: 'none', padding: 0 }}>
          {dbData.map((item, index) => {
            const timeVal = formatTime(item.tiempo_total);
            const estTimeVal = formatTime(item.tiempo_previsto);
            const solutionVal = item.solucion || 'Pendente';
            const dbTipo = item.tipo ? String(item.tipo).trim() : '';
            const dbAbreviatura = item.abreviatura ? String(item.abreviatura).trim() : '';
            const dbComercial = item.comercial ? String(item.comercial).trim() : '';
            const tecnicoVal = dbComercial || dbAbreviatura || 'N/A';
            const avisoCompleto = `${item.aviso ? String(item.aviso).trim() : ''}-${dbTipo}`;
            const priorityVal = item.prioridad;
            const obsVal = item.observaciones;

            let timeColor = 'var(--text-primary)';
            if (item.tiempo_previsto && item.tiempo_total) {
                if (item.tiempo_total > item.tiempo_previsto) timeColor = '#ef4444'; // Red
                else if (item.tiempo_total < item.tiempo_previsto) timeColor = '#10b981'; // Green
            }

            const gpsParts = item.gps && item.gps !== '0.0,0.0' ? item.gps.split(',') : null;
            const photos = [item.foto1, item.foto2, item.foto3, item.foto4].filter(f => f && f !== '').map(p => `/api/images?path=${encodeURIComponent(p)}`);
            const cleanLocal = item.local?.replace(/['"]+/g, '').trim() || '';
            const cleanCliente = item.cliente?.replace(/['"]+/g, '').trim() || '';
            const isRealClientDifferent = cleanLocal.length > 0 && cleanLocal.toLowerCase() !== cleanCliente.toLowerCase();
            const formattedDate = item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

            return (
              <JobCard 
                key={index}
                index={index}
                item={{...item, local: cleanLocal, cliente: cleanCliente}}
                timeVal={timeVal}
                estTimeVal={estTimeVal}
                solutionVal={solutionVal}
                tecnicoVal={tecnicoVal}
                avisoCompleto={avisoCompleto}
                priorityVal={priorityVal}
                obsVal={obsVal}
                timeColor={timeColor}
                gpsParts={gpsParts}
                photos={photos}
                isRealClientDifferent={isRealClientDifferent}
                formattedDate={formattedDate}
              />
            );
          })}
        </ul>
      </main>
    </div>
  );
}
