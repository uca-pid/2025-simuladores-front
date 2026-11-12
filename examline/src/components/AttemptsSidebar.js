export default function AttemptsSidebar({
  attempts, activeAttemptId, onSelect,
  notasPublicadas, puedePublicar, puedeSincronizar, tienePendientes, sinCorregirCount,
  isPublishing, onPublicarNotas, onSincronizarMoodle,
}) {
  const corregidos = attempts.filter(a => a.calificacionManual !== null && a.calificacionManual !== undefined).length;
  const pendientes = attempts.length - corregidos;

  return (
    <div style={styles.sidebar}>
      <div style={styles.summary}>
        <span className="badge bg-success me-2">{corregidos} corregidos</span>
        <span className="badge bg-warning text-dark">{pendientes} pendientes</span>
      </div>
      <div style={styles.list}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Alumno</th>
              <th style={{ ...styles.th, padding: '6px 4px', textAlign: 'right' }}>Auto</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Manual</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => {
              const isManuallyGraded = attempt.calificacionManual !== null && attempt.calificacionManual !== undefined;
              const isActive = String(attempt.id) === String(activeAttemptId);

              return (
                <tr
                  key={attempt.id}
                  onClick={() => onSelect(attempt.id)}
                  style={{
                    ...styles.row,
                    ...(isManuallyGraded ? styles.rowGraded : styles.rowPending),
                    ...(isActive ? styles.rowActive : {})
                  }}
                >
                  <td style={styles.tdName} title={attempt.user.nombre}>{attempt.user.nombre}</td>
                  <td style={styles.tdGradeSmall}>
                    {attempt.puntaje !== null && attempt.puntaje !== undefined ? (
                      <span style={{ color: '#0d6efd' }}>{attempt.puntaje.toFixed(0)}%</span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td style={styles.tdGrade}>
                    {isManuallyGraded ? (
                      <span style={{ color: '#198754', fontWeight: 600 }}>
                        <i className="fas fa-check-circle me-1"></i>{attempt.calificacionManual}
                      </span>
                    ) : (
                      <span style={{ color: '#d97706', fontWeight: 600 }}>
                        <i className="fas fa-clock me-1"></i>—
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="d-flex gap-2" style={styles.actions}>
        <button
          type="button"
          className={`modern-btn ${notasPublicadas ? 'modern-btn-warning' : 'modern-btn-success'} modern-btn-sm flex-fill`}
          onClick={onPublicarNotas}
          title={notasPublicadas ? 'Ocultar notas' : (tienePendientes ? `Debes corregir ${sinCorregirCount} examen(es) antes de publicar` : 'Publicar notas')}
          disabled={!puedePublicar || isPublishing}
          style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem' }}
        >
          {isPublishing ? (
            <span className="spinner-border spinner-border-sm" role="status"></span>
          ) : (
            <><i className={`fas ${notasPublicadas ? 'fa-eye-slash' : 'fa-eye'} me-1`}></i>{notasPublicadas ? 'Ocultar' : 'Publicar'}{tienePendientes ? ` (${sinCorregirCount})` : ''}</>
          )}
        </button>
        <button
          type="button"
          className="modern-btn modern-btn-primary modern-btn-sm flex-fill"
          onClick={onSincronizarMoodle}
          title={tienePendientes ? `Debes corregir ${sinCorregirCount} examen(es) antes de sincronizar` : 'Sincronizar calificaciones con Moodle'}
          disabled={!puedeSincronizar || isPublishing}
          style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem' }}
        >
          <i className="fas fa-sync-alt me-1"></i>
          Moodle{tienePendientes ? ` (${sinCorregirCount})` : ''}
        </button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: '280px',
    minWidth: '280px',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 40px)',
    overflowY: 'auto',
    position: 'sticky',
    top: '20px'
  },
  summary: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb'
  },
  actions: {
    padding: '12px 16px',
    borderTop: '1px solid #e5e7eb'
  },
  list: {},
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem'
  },
  th: {
    position: 'sticky',
    top: 0,
    background: '#f8fafc',
    padding: '6px 16px',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    color: '#6b7280',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'left'
  },
  row: {
    cursor: 'pointer',
    borderBottom: '1px solid #f1f1f1'
  },
  rowPending: {
    background: 'rgba(245, 158, 11, 0.08)'
  },
  rowGraded: {
    background: 'rgba(16, 185, 129, 0.08)'
  },
  rowActive: {
    background: 'rgba(99, 102, 241, 0.15)',
    boxShadow: 'inset 3px 0 0 0 var(--primary-color)'
  },
  tdName: {
    padding: '8px 16px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 0,
    width: '100%',
    fontWeight: 500
  },
  tdGrade: {
    padding: '8px 16px',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    fontSize: '0.8rem'
  },
  tdGradeSmall: {
    padding: '8px 4px',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    fontSize: '0.75rem'
  }
};
