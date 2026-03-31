import sql from 'mssql';
import ThemeToggle from './components/ThemeToggle';

// Datos falsos basados en tu captura para previsualización
const MOCK_DATA = [
  {
    Aviso: 'I127378-VT',
    Cliente: 'O PEQUENO MERCADO',
    Localidad: 'A CORUÑA',
    Telefonos: '647714970-',
    Texto: 'FALDON LATERAL MEDIR FALDON LATERAL',
    'T.Total': '00:28:00',
    Solucion: 'SOLICITUD DE PRESUPUESTO'
  },
  {
    Aviso: 'I127099-VT',
    Cliente: 'HIJOS DE RIVERA, S.A.U.',
    Localidad: 'VALDOVIÑO',
    Telefonos: '981486486-',
    Texto: 'CASA ROBLES CONCRETAR PT26000323.',
    'T.Total': '01:21:00',
    Solucion: 'PEDIDO'
  },
  {
    Aviso: 'I127363-VT',
    Cliente: 'CCI CARROCERIAS INTELIGENTES S.L.',
    Localidad: 'VALGA',
    Telefonos: '986556371 - 696823035',
    Texto: 'TRABAJOS ESCENARIO PASAR A MEDIR ESCENARIO MODELO R500 EE, DE SIBEMOL...',
    'T.Total': '02:24:00',
    Solucion: 'PEDIDO'
  }
];

async function getMonitorizacionData() {
  try {
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
    await sql.connect(config);
    const result = await sql.query('SELECT * FROM tgm_monitorizacion'); // Extraídos todos los datos
    return result.recordset;
  } catch (error) {
    console.error("Error conectando a SQL Server (mostrando mockup): ", error.message);
    return []; // Retorna vacío si falla la conexión
  }
}

export default async function Page() {
  const dbData = await getMonitorizacionData();
  
  // Si no hay datos, mostramos los "MOCKS" para que veas el diseño
  const data = dbData.length === 0 ? MOCK_DATA : dbData;
  const isMock = dbData.length === 0;

  return (
    <div className="dashboard-container">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Monitorización en tempo real RPS Next</h1>
            {isMock && <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>⚠️ Modo Previsualización (Sen conexión á BBDD)</span>}
          </div>
          <ThemeToggle />
        </div>
        
        {/* Filtros */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
          <div>
            <label style={{display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: '500'}}>Técnico</label>
            <select style={{padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none'}}>
              <option>TODOS</option>
            </select>
          </div>
          <div>
            <label style={{display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: '500'}}>Data inicio</label>
            <input type="date" style={{padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none'}} />
          </div>
          <div>
            <label style={{display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: '500'}}>Data fin</label>
            <input type="date" style={{padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none'}} />
          </div>
          <div>
            <label style={{display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: '500'}}>Tipo</label>
            <select style={{padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none'}}>
              <option>TODOS</option>
            </select>
          </div>
          <div>
            <label style={{display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: '500'}}>Prioridade</label>
            <select style={{padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none'}}>
              <option>TODAS</option>
            </select>
          </div>
          <div>
            <label style={{display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: '500'}}>Cliente / Aviso</label>
            <input type="text" placeholder="Buscar..." style={{padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none'}} />
          </div>
        </div>
      </header>

      <main className="main-content">
        <ul className="job-list">
          {data.map((item, index) => {
            const timeVal = item.TTotal || item['T.Total'] || '00:00:00';
            const solutionVal = item.Solucion || 'Pendente';
            
            // Colores por solución
            let badgeBg = 'var(--brand-orange-hover)';
            if (solutionVal.includes('PEDIDO')) badgeBg = '#10b981'; // Green
            if (solutionVal.includes('PRESUPUESTO')) badgeBg = '#3b82f6'; // Blue

            return (
              <li key={index} className="job-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontWeight: '600', color: 'var(--brand-orange)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Aviso: {item.Aviso || 'N/A'}
                  <span style={{ padding: '0.25rem 0.75rem', background: badgeBg, color: '#fff', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    {solutionVal}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div><strong style={{color: 'var(--text-secondary)'}}>Cliente:</strong> {item.Cliente || 'N/A'}</div>
                  <div><strong style={{color: 'var(--text-secondary)'}}>Localidade:</strong> {item.Localidad || 'N/A'}</div>
                  <div style={{gridColumn: '1 / -1'}}><strong style={{color: 'var(--text-secondary)'}}>Teléfonos:</strong> {item.Telefonos || 'N/A'}</div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '6px', fontSize: '0.875rem', flexGrow: 1, border: '1px solid var(--border-color)' }}>
                  {item.Texto || 'Sen descrición...'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                   <span style={{ fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                     ⏱️ Tempo: {timeVal}
                   </span>
                   <button style={{ 
                     background: 'transparent', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', 
                     borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)',
                     display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: '500' 
                   }}>
                     📍 Ver no Mapa
                   </button>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
