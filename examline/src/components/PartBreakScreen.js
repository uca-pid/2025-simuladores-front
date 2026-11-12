import React, { useState } from "react";

/**
 * Pantalla intermedia que se muestra entre partes de un examen multi-parte,
 * cuando el intento queda en estado "esperando_continuar" tras advance-part.
 * El estudiante confirma explícitamente el paso a la siguiente parte
 * (no hay forma de volver atrás a la parte recién cerrada).
 *
 * Si la parte siguiente todavía no está habilitada (`locked`), el botón queda
 * deshabilitado: en modo "manual" hasta que el profesor la habilite, y en modo
 * "codigo" hasta que el alumno ingrese el código que dicta el profesor.
 */
const PartBreakScreen = ({ partNumber, totalParts, onContinue, locked = false, conCodigo = false }) => {
  const [continuing, setContinuing] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState(null);

  const handleContinue = async (codigoIngresado) => {
    if (continuing) return;
    setContinuing(true);
    setError(null);
    try {
      await onContinue(codigoIngresado);
    } catch (err) {
      setError(err.message || 'No se pudo continuar');
    } finally {
      setContinuing(false);
    }
  };

  const handleSubmitCodigo = (e) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    handleContinue(codigo.trim().toUpperCase());
  };

  return (
    <div className="container py-5">
      <div className="modern-card" style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div className="modern-card-body text-center py-5">
          <div className="empty-icon mb-3">
            <i className={`fas ${locked ? 'fa-lock' : 'fa-flag-checkered'}`}></i>
          </div>
          <h4 className="mb-3">
            Fin de la parte {partNumber}{totalParts ? ` de ${totalParts}` : ''}.
          </h4>
          {locked && conCodigo ? (
            <p className="text-muted mb-4">
              Ingresá el código que te indique el profesor para continuar con la parte siguiente.
              Una vez que avances no vas a poder volver a esta parte.
            </p>
          ) : locked ? (
            <p className="text-muted mb-4">
              Esperá a que el profesor habilite la siguiente parte.
              Una vez que avances no vas a poder volver a esta parte.
            </p>
          ) : (
            <p className="text-muted mb-4">
              Cuando estés listo, hacé click para continuar con la parte siguiente.
              Una vez que avances no vas a poder volver a esta parte.
            </p>
          )}

          {locked && conCodigo && (
            <form className="d-flex gap-2 justify-content-center mb-3" onSubmit={handleSubmitCodigo}>
              <input
                type="text"
                className="form-control text-center"
                placeholder="Código"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                maxLength={10}
                style={{ maxWidth: '180px', letterSpacing: '0.2em', fontWeight: 600 }}
                disabled={continuing}
              />
              <button type="submit" className="modern-btn modern-btn-secondary" disabled={continuing || !codigo.trim()}>
                Ingresar
              </button>
            </form>
          )}

          {error && <div className="alert alert-danger py-2">{error}</div>}

          {/* En modo código el botón es "Ingresar"; este solo aplica a los otros modos */}
          {!(locked && conCodigo) && (
            <button
              className="modern-btn modern-btn-primary modern-btn-lg"
              onClick={() => handleContinue()}
              disabled={continuing || locked}
            >
              {continuing ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                  <span>Continuando...</span>
                </>
              ) : locked ? (
                <>
                  <i className="fas fa-hourglass-half me-2"></i>
                  <span>Esperando al profesor...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-arrow-right me-2"></i>
                  <span>Continuar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartBreakScreen;
