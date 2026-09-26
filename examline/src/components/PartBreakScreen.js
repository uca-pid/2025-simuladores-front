import React, { useState } from "react";

/**
 * Pantalla intermedia que se muestra entre partes de un examen multi-parte,
 * cuando el intento queda en estado "esperando_continuar" tras advance-part.
 * El estudiante confirma explícitamente el paso a la siguiente parte
 * (no hay forma de volver atrás a la parte recién cerrada).
 */
const PartBreakScreen = ({ partNumber, totalParts, onContinue }) => {
  const [continuing, setContinuing] = useState(false);

  const handleContinue = async () => {
    if (continuing) return;
    setContinuing(true);
    try {
      await onContinue();
    } finally {
      setContinuing(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="modern-card" style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div className="modern-card-body text-center py-5">
          <div className="empty-icon mb-3">
            <i className="fas fa-flag-checkered"></i>
          </div>
          <h4 className="mb-3">
            Fin de la parte {partNumber}{totalParts ? ` de ${totalParts}` : ''}.
          </h4>
          <p className="text-muted mb-4">
            Cuando estés listo, hacé click para continuar con la parte siguiente.
            Una vez que avances no vas a poder volver a esta parte.
          </p>
          <button
            className="modern-btn modern-btn-primary modern-btn-lg"
            onClick={handleContinue}
            disabled={continuing}
          >
            {continuing ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                <span>Continuando...</span>
              </>
            ) : (
              <>
                <i className="fas fa-arrow-right me-2"></i>
                <span>Continuar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartBreakScreen;
