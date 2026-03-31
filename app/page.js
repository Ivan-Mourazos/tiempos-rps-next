import sql from 'mssql';
import ThemeToggle from './components/ThemeToggle';
import FilterForm from './components/FilterForm';

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

// Mapeo de códigos de tipo a nombres amigables
// PM = Instalaciones (confirmado por usuario)
const TIPO_LABELS = {
  'PM': 'Instalaciones',
  'CB': 'Cobros',
  'VT': 'Visitas',
  'TP': 'Trabajo previo',
  'AS': 'Asistencia',
  'RC': 'Recados'
};

// Lista de tipos en el orden exacto requerido (código real de BD)
const TIPOS_ORDEN = ['PM', 'CB', 'VT', 'TP', 'AS', 'RC'];

async function getMetadata() {
  try {
    await sql.connect(dbConfig);
    const [tecnicos, tipos, prioridades] = await Promise.all([
      sql.query('SELECT DISTINCT abreviatura, comercial FROM tgm_monitorizacion WHERE abreviatura IS NOT NULL ORDER BY abreviatura'),
      sql.query('SELECT DISTINCT tipo FROM tgm_monitorizacion WHERE tipo IS NOT NULL ORDER BY tipo'),
      sql.query('SELECT DISTINCT prioridad FROM tgm_monitorizacion WHERE prioridad IS NOT NULL ORDER BY prioridad')
    ]);
    const baseTecnicos = tecnicos.recordset.map(r => ({ abbr: r.abreviatura ? r.abreviatura.trim() : '', full: r.comercial ? r.comercial.trim() : '' }));
    const knownMissing = [
      { abbr: 'Miguel Tato', full: 'Miguel Tato' },
      { abbr: 'Ivan Seoane', full: 'Ivan Seoane' }
    ];
    
    const allTecnicos = [...baseTecnicos];
    knownMissing.forEach(km => {
      if (!allTecnicos.some(t => t.full.toLowerCase().includes(km.full.toLowerCase()))) {
        allTecnicos.push(km);
      }
    });

    allTecnicos.sort((a, b) => a.full.localeCompare(b.full));

    return {
      tecnicos: allTecnicos,
      tipos: TIPOS_ORDEN,
      prioridades: prioridades.recordset.map(r => r.prioridad)
    };
  } catch (error) {
    console.error("Error obteniendo metadatos: ", error.message);
    return { tecnicos: [], tipos: [], prioridades: [] };
  }
}

async function getMonitorizacionData(filters = {}) {
  try {
    const { tecnico, tipo, prioridad, cliente, telefono, fechaInicio, fechaFin } = filters;
    await sql.connect(dbConfig);
    
    let query = 'SELECT * FROM tgm_monitorizacion WHERE 1=1';
    const request = new sql.Request();

    if (tecnico && tecnico !== 'TODOS') {
      query += ' AND (abreviatura = @tecnico OR comercial = @tecnico)';
      request.input('tecnico', sql.VarChar, tecnico);
    }
    if (tipo && tipo !== 'TODOS') {
      query += ' AND tipo = @tipo';
      request.input('tipo', sql.VarChar, tipo);
    }
    if (prioridad && prioridad !== 'TODAS') {
      query += ' AND prioridad = @prioridad';
      request.input('prioridad', sql.Int, parseInt(prioridad));
    }
    if (cliente) {
      query += ' AND (cliente LIKE @cliente OR aviso LIKE @cliente OR comercial LIKE @cliente)';
      request.input('cliente', sql.VarChar, `%${cliente}%`);
    }
    if (telefono) {
      query += ' AND (Telefono1 LIKE @telefono OR Telefono2 LIKE @telefono)';
      request.input('telefono', sql.VarChar, `%${telefono}%`);
    }
    if (fechaInicio) {
      query += ' AND fecha >= @fechaInicio';
      request.input('fechaInicio', sql.Date, fechaInicio);
    }
    if (fechaFin) {
      query += ' AND fecha < DATEADD(day, 1, @fechaFin)';
      request.input('fechaFin', sql.Date, fechaFin);
    }

    query += ' ORDER BY fecha DESC, prioridad DESC';
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error("Error conectando a SQL Server: ", error.message);
    return [];
  }
}

function formatTime(minutes) {
  if (!minutes || minutes === 0) return '0h 00m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const today = new Date().toISOString().split('T')[0];

  const filters = {
    tecnico: params.tecnico || 'TODOS',
    tipo: params.tipo || 'TODOS',
    prioridad: params.prioridad || 'TODAS',
    cliente: params.cliente || '',
    telefono: params.telefono || '',
    fechaInicio: params.fechaInicio || today,
    fechaFin: params.fechaFin || today
  };

  const [dbData, metadata] = await Promise.all([
    getMonitorizacionData(filters),
    getMetadata()
  ]);

  const hasData = dbData.length > 0;

  return (
    <div className="dashboard-container">
      <header className="header" style={{ padding: '0.8rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <h1 style={{ fontSize: '1.25rem' }}>Monitorización Tiempos RPS Next</h1>
          <ThemeToggle />
        </div>
        
        <FilterForm filters={filters} metadata={metadata} tipoLabels={TIPO_LABELS} />
      </header>

      <main className="main-content" style={{ padding: '1rem 1.5rem' }}>
        <ul className="job-list" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', listStyle: 'none', padding: 0 }}>
          {dbData.map((item, index) => {
            const timeVal = formatTime(item.tiempo_total);
            const solutionVal = item.solucion || 'Pendente';
            const dbTipo = item.tipo ? item.tipo.trim() : '';
            const dbAbreviatura = item.abreviatura ? item.abreviatura.trim() : '';
            const dbComercial = item.comercial ? item.comercial.trim() : '';
            const tecnicoVal = dbComercial || dbAbreviatura || 'N/A';
            const avisoCompleto = `${item.aviso ? item.aviso.trim() : ''}-${dbTipo}`;
            const tipoEntero = TIPO_LABELS[dbTipo] || dbTipo;
            const priorityVal = item.prioridad;
            const obsVal = item.observaciones;
            
            let statusColor = 'var(--brand-orange)';
            if (solutionVal.toUpperCase().includes('PEDIDO')) statusColor = '#10b981';
            if (solutionVal.toUpperCase().includes('ORZAMENTO') || solutionVal.toUpperCase().includes('PRESUPUESTO')) statusColor = '#3b82f6';

            const googleMapsUrl = item.gps && item.gps !== '0.0,0.0' ? `https://www.google.com/maps/search/?api=1&query=${item.gps}` : null;
            const photos = [item.foto1, item.foto2, item.foto3, item.foto4].filter(f => f && f !== '');

            return (
              <li key={index} className="job-card" style={{ 
                display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1.2rem',
                border: priorityVal === 1 ? '2px solid var(--brand-orange)' : '1px solid var(--border-color)',
                position: 'relative'
              }}>
                {priorityVal === 1 && <span style={{ position: 'absolute', top: '-11px', right: '12px', background: 'var(--brand-orange)', color: 'white', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '3px', fontWeight: '900', letterSpacing: '0.05em' }}>ALTA PRIORIDADE</span>}
                
                {/* Header Line */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                     <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--brand-orange)' }}>{avisoCompleto}</span>
                     <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>{tecnicoVal}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                     <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#10b981' }}>⏱️ {timeVal}</span>
                     <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: statusColor, textTransform: 'uppercase' }}>{solutionVal}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', padding: '0.2rem 0', gap: '0.6rem', borderBottom: '1px dotted var(--border-color)' }}>
                   <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tipo: {tipoEntero}</span>
                </div>
                
                {/* Body Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                       <strong style={{color: 'var(--text-secondary)', fontSize: '0.6rem', textTransform: 'uppercase'}}>Cliente:</strong> {item.cliente || 'N/A'}
                    </div>
                    <div><strong style={{color: 'var(--text-secondary)', fontSize: '0.6rem', textTransform: 'uppercase'}}>Localidade:</strong> {item.localidad || 'N/A'}</div>
                    <div style={{ fontSize: '0.8rem' }}><strong style={{color: 'var(--text-secondary)', fontSize: '0.6rem', textTransform: 'uppercase'}}>Telfs:</strong> {item.Telefono1 || ''} {item.Telefono2 ? `/ ${item.Telefono2}` : ''}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: photos.length > 0 ? '1.2fr 0.8fr' : '1fr', gap: '1rem' }}>
                    <div style={{ padding: '0.8rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                      <strong style={{display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.4rem'}}>Descrición Técnica</strong>
                      {item.texto || 'Sen descrición.'}
                    </div>

                    {photos.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignContent: 'flex-start' }}>
                        {photos.map((p, i) => (
                          <img 
                            key={i} 
                            src={`/api/images?path=${encodeURIComponent(p)}`} 
                            alt={`Obra ${i+1}`}
                            style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)', background: '#eee' }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {obsVal && (
                    <div style={{ padding: '0.5rem 0.8rem', borderLeft: '3px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)', fontSize: '0.8rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                      <strong style={{fontSize: '0.6rem', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '0.15rem', display: 'inline-block'}}>Observacións:</strong> {obsVal}
                    </div>
                  )}
                </div>

                {/* Footer Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px dotted var(--border-color)', paddingTop: '0.4rem' }}>
                   <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.8rem' }}>
                      <span>📅 {item.fecha ? new Date(item.fecha).toLocaleDateString('gl-ES', { day: 'numeric', month: 'short' }) : ''}</span>
                   </div>
                   
                   {googleMapsUrl && (
                     <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--brand-orange)', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                       📍 GOOGLE MAPS
                     </a>
                   )}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
