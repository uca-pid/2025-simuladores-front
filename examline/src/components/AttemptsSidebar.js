export default function AttemptsSidebar({ attempts, activeAttemptId, onSelect, onPrev, onNext, hasPrev, hasNext, onBack }) {
  const corregidos = attempts.filter(a => a.calificacionManual !== null && a.calificacionManual !== undefined).length;
  const pendientes = attempts.length - corregidos;

  return (
    <div style={styles.sidebar}>
      <div style={styles.nav}>
        <button
          className="modern-btn modern-btn-secondary modern-btn-sm"
          onClick={onPrev}
          disabled={!hasPrev}
          title="Alumno anterior"
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        <button
          className="modern-btn modern-btn-secondary modern-btn-sm"
          onClick={onNext}
          disabled={!hasNext}
          title="Siguiente alumno"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
        <button
          className="modern-btn modern-btn-secondary modern-btn-sm"
          onClick={onBack}
          title="Volver a la lista de resultados"
        >
          <i className="fas fa-arrow-left me-1"></i>
          Volver
        </button>
      </div>
      <div style={styles.summary}>
        <span className="badge bg-success me-2">{corregidos} corregidos</span>
        <span className="badge bg-warning text-dark">{pendientes} pendientes</span>
      </div>
      <div style={styles.list}>
        {attempts.map((attempt) => {
          const isManuallyGraded = attempt.calificacionManual !== null && attempt.calificacionManual !== undefined;
          const isActive = String(attempt.id) === String(activeAttemptId);

          return (
            <button
              key={attempt.id}
              type="button"
              onClick={() => onSelect(attempt.id)}
              style={{
                ...styles.item,
                ...(isActive ? styles.itemActive : {})
              }}
            >
              <div style={{
                ...styles.avatar,
                background: isManuallyGraded
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              }}>
                {attempt.user.nombre.charAt(0).toUpperCase()}
              </div>
              <div style={styles.itemText}>
                <div style={styles.itemName}>{attempt.user.nombre}</div>
                <div style={styles.itemStatus}>
                  {isManuallyGraded ? (
                    <><i className="fas fa-check-circle me-1" style={{ color: '#28a745' }}></i>{attempt.calificacionManual}</>
                  ) : (
                    <><i className="fas fa-clock me-1" style={{ color: '#ffc107' }}></i>Pendiente</>
                  )}
                </div>
              </div>
            </button>
          );
        })}
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
    height: 'calc(100vh - 100px)',
    position: 'sticky',
    top: '20px'
  },
  nav: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb'
  },
  summary: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb'
  },
  list: {
    overflowY: 'auto',
    flex: 1
  },
  item: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    border: 'none',
    borderBottom: '1px solid #f1f1f1',
    background: 'white',
    cursor: 'pointer',
    textAlign: 'left'
  },
  itemActive: {
    background: 'rgba(99, 102, 241, 0.1)',
    borderLeft: '3px solid var(--primary-color)'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    flexShrink: 0
  },
  itemText: {
    minWidth: 0
  },
  itemName: {
    fontWeight: 500,
    fontSize: '0.9rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  itemStatus: {
    fontSize: '0.8rem',
    color: '#6b7280'
  }
};
