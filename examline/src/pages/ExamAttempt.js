import React, { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import './ExamAttempt.css';
import { useModal, useSEB, useMultipleChoiceAttempt } from "../hooks";
import Modal from "../components/Modal";

const ExamAttempt = ({ examId: propExamId, onBack }) => {
  const { examId: routeExamId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const examId = propExamId || routeExamId;

  // Obtener windowId de la URL o del sessionStorage
  const windowIdFromUrl = searchParams.get('windowId');
  const examKey = `exam_${examId}_windowId`;

  // Si hay windowId en la URL, guardarlo en sessionStorage
  if (windowIdFromUrl) {
    sessionStorage.setItem(examKey, windowIdFromUrl);
  }

  // Usar windowId de la URL o recuperarlo de sessionStorage
  const windowId = windowIdFromUrl || sessionStorage.getItem(examKey);

  // Usar hooks personalizados
  const { modal, showModal, closeModal, setModalProcessing } = useModal();
  const { isInSEB, tryCloseSEB } = useSEB();
  const {
    exam,
    attempt,
    loading,
    setLoading,
    error,
    setError,
    submitting,
    setSubmitting,
    respuestas,
    setRespuestas,
    updateRespuesta,
    randomizedOptions,
    randomizedMatchingAnswers,
    selectedMatchingConcepts,
    setSelectedMatchingConcepts,
    finishAttempt
  } = useMultipleChoiceAttempt(examId, windowId, navigate, { propExamId });

  // 🔒 Validación inicial de seguridad para estudiantes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    
    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
    }

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // SIEMPRE bloquear a profesores - no pueden tomar exámenes
        if (payload.rol === 'professor' || payload.rol === 'system') {
          setError('Acceso no autorizado: Los profesores no pueden tomar exámenes');
          setLoading(false);
          return;
        }
        
        // Bloquear a estudiantes sin windowId válido (solo si no es propExamId)
        if (payload.rol === 'student' && !windowId && !tokenFromUrl && !propExamId) {
          setError('Acceso no autorizado: Debes acceder desde tus inscripciones');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error validando token:', err);
      }
    }
  }, [windowId, propExamId, setError, setLoading]);

  // Handle back navigation for errors only
  const handleErrorBack = async () => {
    // Limpiar windowId del sessionStorage
    const examKey = `exam_${examId}_windowId`;
    sessionStorage.removeItem(examKey);
    
    if (isInSEB) {
      // Intentar cerrar SEB automáticamente
      const closed = await tryCloseSEB();
      
      // Si el usuario canceló (puso "NO"), redirigir a login
      if (!closed) {
        navigate('/login');
      }
    } else {
      if (onBack) {
        onBack();
      } else {
        navigate('/student-exam');
      }
    }
  };

  // Handle exam completion - finish attempt and return
  const handleExamCompletion = () => {
    if (!attempt) {
      // Limpiar windowId del sessionStorage
      const examKey = `exam_${examId}_windowId`;
      sessionStorage.removeItem(examKey);
      
      // Si no hay intento, navegar directamente
      if (onBack) {
        onBack();
      } else {
        navigate(isInSEB ? '/login' : '/student-exam');
      }
      return;
    }

    // Para exámenes múltiple choice, advertir si no se respondieron todas las preguntas
    if (exam.tipo === 'multiple_choice') {
      const totalPreguntas = exam.preguntas?.length || 0;
      const preguntasRespondidas = Object.keys(respuestas).filter(key => {
        const respuesta = respuestas[key];
        // Para fill_in_blank, verificar que el array tenga elementos
        if (Array.isArray(respuesta)) {
          return respuesta.length > 0;
        }
        // Para otros tipos, verificar que exista
        return respuesta !== undefined && respuesta !== null;
      }).length;
      
      if (preguntasRespondidas < totalPreguntas) {
        showModal(
          'warning',
          '⚠️ Preguntas sin responder',
          `Has respondido ${preguntasRespondidas} de ${totalPreguntas} preguntas. Las preguntas sin responder se contarán como incorrectas. ¿Deseas finalizar de todos modos?`,
          () => {
            closeModal();
            // Confirmar finalización después de advertencia
            proceedWithFinalization();
          },
          true
        );
        return;
      }
    }

    proceedWithFinalization();
  };

  // Función auxiliar para proceder con la finalización
  const proceedWithFinalization = () => {
    showModal(
      'confirm',
      'Terminar Intento',
      '¿Estás seguro de que quieres terminar el intento? Una vez finalizado no podrás volver a entrar al examen.',
      async () => {
        // Prevenir múltiples ejecuciones
        if (submitting) return;
        
        try {
          setSubmitting(true);
          setModalProcessing(true); // Deshabilitar botón del modal

          await finishAttempt();

          // Redirigir directamente sin modal de éxito
          closeModal();

          console.log('Intento finalizado exitosamente, isInSEB:', isInSEB);

          if (isInSEB) {
            // Intentar cerrar SEB automáticamente
            console.log('Intentando cerrar SEB...');
            const closed = await tryCloseSEB();
            console.log('Resultado de tryCloseSEB:', closed);

            // Si el usuario canceló el cierre (pusO "NO"), mostrar resultados
            if (!closed) {
              console.log('Usuario canceló cierre de SEB, mostrando resultados...');
              navigate(`/exam-results/${attempt.id}?fromSEB=true`);
            }
            // Si aceptó el cierre, SEB se cerrará y no llegará aquí
          } else {
            // Navegación normal si no está en SEB
            if (onBack) {
              onBack();
            } else {
              navigate('/student-exam');
            }
          }
        } catch (error) {
          console.error('Error finishing attempt:', error);
          const errorMessage = error.message || 'Error de conexión al finalizar intento';

          // Si el error es que el intento ya fue finalizado y estamos en SEB, redirigir a login
          if (errorMessage.includes('intento ya fue finalizado') && isInSEB) {
            showModal('error', 'Error', errorMessage, () => {
              closeModal();
              navigate('/login');
            }, false, 'Salir del examen');
          } else {
            showModal('error', 'Error', errorMessage);
          }
        } finally {
          setSubmitting(false);
          setModalProcessing(false);
        }
      },
      true
    );
  };

  // Handle navigation away from exam with confirmation
  const handleLeaveExam = () => {
    showModal(
      'warning',
      'Salir del Examen',
      '¿Estás seguro de que quieres salir del examen? Se perderá todo tu progreso y no podrás volver a intentarlo.',
      async () => {
        // Limpiar windowId del sessionStorage
        const examKey = `exam_${examId}_windowId`;
        sessionStorage.removeItem(examKey);
        
        closeModal();
        
        if (isInSEB) {
          // Intentar cerrar SEB automáticamente
          const closed = await tryCloseSEB();
          
          // Si el usuario canceló (puso "NO"), redirigir a login
          if (!closed) {
            navigate('/login');
          }
        } else {
          if (onBack) {
            onBack();
          } else {
            navigate('/student-exam');
          }
        }
      },
      true
    );
  };

  // Add page leave confirmation for exam security
  useEffect(() => {
    if (!exam || error || propExamId) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '¿Estás seguro de que quieres salir del examen? Se perderá tu progreso.';
      return e.returnValue;
    };

    const handlePopState = (e) => {
      e.preventDefault();
      showModal(
        'warning',
        'Salir del Examen',
        '¿Estás seguro de que quieres salir del examen? Se perderá todo tu progreso.',
        () => {
          closeModal();
          window.history.back();
        },
        true
      );
      
      window.history.pushState(null, '', window.location.pathname);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    window.history.pushState(null, '', window.location.pathname);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [exam, error, propExamId, closeModal, showModal]);

  if (loading) {
    return (
      <div className="container py-5">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando examen...</p>
        </div>
      </div>
    );
  }
  
  if (error || !exam) {
    const isExamCompleted = error && (error.includes('Ya has completado') || error.includes('intento ya fue finalizado'));
    const buttonText = isExamCompleted && isInSEB ? 'Salir del examen' : 'Volver';
    
    return (
      <div className="container py-5">
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h4 className="empty-title">Error al cargar examen</h4>
          <p className="empty-subtitle">
            {error || "El examen solicitado no existe o no tienes permisos para acceder."}
          </p>
          <button className="modern-btn modern-btn-secondary" onClick={handleErrorBack}>
            <i className={`fas ${isExamCompleted && isInSEB ? 'fa-sign-out-alt' : 'fa-arrow-left'} me-2`}></i>
            {buttonText}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="exam-attempt-header">
            <div className="header-content-section">
              <h1 className="page-title mb-0">
                <i className="fas fa-clipboard-list me-3"></i>
                <span className="title-text">{exam.titulo || "Sin título"}</span>
              </h1>
              <div className="header-badges mt-2">
                {!propExamId ? (
                  <span className="badge bg-warning text-dark">
                    <i className="fas fa-exclamation-triangle me-1"></i>
                    <span className="badge-text">EXAMEN EN CURSO</span>
                  </span>
                ) : (
                  <span className="badge bg-info text-white">
                    <i className="fas fa-eye me-1"></i>
                    <span className="badge-text">VISTA PREVIA</span>
                  </span>
                )}
                <span className="badge badge-primary">
                  <i className="fas fa-question-circle me-2"></i>
                  <span className="count-text">{exam.preguntas?.length || 0} preguntas</span>
                </span>
                {exam.tipo === 'multiple_choice' && (
                  <span className={`badge ${Object.keys(respuestas).filter(key => {
                    const respuesta = respuestas[key];
                    return Array.isArray(respuesta) ? respuesta.length > 0 : respuesta !== undefined;
                  }).length === exam.preguntas?.length ? 'bg-success' : 'bg-secondary'}`}>
                    <i className={`fas ${Object.keys(respuestas).filter(key => {
                      const respuesta = respuestas[key];
                      return Array.isArray(respuesta) ? respuesta.length > 0 : respuesta !== undefined;
                    }).length === exam.preguntas?.length ? 'fa-check-circle' : 'fa-list-check'} me-2`}></i>
                    <span className="count-text">
                      {Object.keys(respuestas).filter(key => {
                        const respuesta = respuestas[key];
                        return Array.isArray(respuesta) ? respuesta.length > 0 : respuesta !== undefined;
                      }).length} / {exam.preguntas?.length || 0} respondidas
                    </span>
                  </span>
                )}
              {isInSEB && (
                <span className="badge bg-success ms-2">
                  <i className="fas fa-lock me-1"></i>
                  Modo Seguro (SEB)
                </span>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!exam.preguntas || exam.preguntas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-question-circle"></i>
          </div>
          <h4 className="empty-title">Sin preguntas</h4>
          <p className="empty-subtitle">
            Este examen no tiene preguntas configuradas aún.
          </p>
          <button className="modern-btn modern-btn-primary" onClick={handleErrorBack}>
            <i className="fas fa-arrow-left me-2"></i>
            Volver al inicio
          </button>
        </div>
      ) : (
        <>
          <div className="exam-attempt-questions-grid">
            {exam.preguntas.map((p, i) => {
              const isMatching = p.tipo === 'matching';
              const opcionesParaMostrar = randomizedOptions[i] || p.opciones?.map((texto, idx) => ({ texto, originalIndex: idx })) || [];
              const isFillInBlank = p.tipo === 'fill_in_blank';
              const respuestaActual = respuestas[p.id]; // Usar ID de pregunta, no índice
              
              return (
              <div key={i} className="exam-attempt-question-card">
                <div className={`exam-card fade-in-up`} style={{animationDelay: `${i * 0.1}s`}}>
                  <div className="exam-card-header">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <span 
                        className="badge"
                        style={{
                          backgroundColor: p.tipo === 'true_false' ? '#28a745' : p.tipo === 'fill_in_blank' ? '#ffc107' : p.tipo === 'matching' ? '#9c27b0' : '#007bff',
                          color: 'white',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.75rem',
                          borderRadius: '6px'
                        }}
                      >
                        <i className={`fas ${p.tipo === 'true_false' ? 'fa-check-double' : p.tipo === 'fill_in_blank' ? 'fa-fill-drip' : p.tipo === 'matching' ? 'fa-arrows-alt-h' : 'fa-list-ul'} me-1`}></i>
                        {p.tipo === 'true_false' ? 'V/F' : p.tipo === 'fill_in_blank' ? 'Completar' : p.tipo === 'matching' ? 'Unir' : 'Múltiple'}
                      </span>
                      <span className="badge badge-primary">{i + 1}</span>
                    </div>
                    {/* ESTILO ORIGINAL - Puede causar texto aplastado con preguntas largas 
                    <h5 className="exam-title" style={{ marginTop: 0 }}>
                      <span className="question-text">{p.texto || "Sin texto"}</span>
                    </h5>*/}
                    {/* ESTILO NUEVO - Permite que la caja se estire verticalmente con textos largos*/}
                    <h5 className="exam-title" style={{ 
                      marginTop: 0,
                      minHeight: 'auto',
                      height: 'auto',
                      whiteSpace: 'normal',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}>
                      <span className="question-text" style={{
                        display: 'block',
                        whiteSpace: 'normal',
                        wordWrap: 'break-word',
                        lineHeight: '1.5'
                      }}>{p.texto || "Sin texto"}</span>
                    </h5>
                  </div>
                  <div className="exam-card-body">
                    <div className="exam-info">
                      {isMatching ? (
                        <>
                          <h6 className="mb-3">
                            <i className="fas fa-arrows-alt-h me-2"></i>
                            <span className="options-label">Une cada concepto con su respuesta haciendo clic:</span>
                          </h6>
                          <div className="alert alert-info mb-3" style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Haz clic en un concepto y luego en su respuesta para conectarlos. Haz clic nuevamente para cambiar.
                          </div>
                          
                          {/* Obtener conceptos y respuestas randomizadas */}
                          {(() => {
                            const numConceptos = p.correcta || 0;
                            const conceptos = p.opciones?.slice(0, numConceptos) || [];
                            const respuestasRandomizadas = randomizedMatchingAnswers[i] || [];
                            const respuestasEstudiante = Array.isArray(respuestaActual) ? respuestaActual : [];
                            
                            // Obtener el concepto seleccionado para esta pregunta
                            const selectedConcept = selectedMatchingConcepts[p.id] ?? null;
                            
                            return (
                              <div style={{ position: 'relative' }}>
                                <div className="row">
                                  {/* Columna izquierda: Conceptos */}
                                  <div className="col-6">
                                    <h6 className="text-muted mb-3"><i className="fas fa-list-ol me-2"></i>Conceptos</h6>
                                    {conceptos.map((concepto, conceptoIdx) => {
                                      const isSelected = selectedConcept === conceptoIdx;
                                      const hasConnection = respuestasEstudiante[conceptoIdx] !== undefined && respuestasEstudiante[conceptoIdx] !== null;
                                      
                                      return (
                                        <div
                                          key={conceptoIdx}
                                          id={`matching-${i}-concept-${conceptoIdx}`}
                                          className={`matching-item ${isSelected ? 'selected' : ''} ${hasConnection ? 'connected' : ''}`}
                                          onClick={() => {
                                            if (selectedConcept === conceptoIdx) {
                                              // Deseleccionar
                                              setSelectedMatchingConcepts(prev => ({
                                                ...prev,
                                                [p.id]: null
                                              }));
                                            } else {
                                              // Seleccionar concepto
                                              setSelectedMatchingConcepts(prev => ({
                                                ...prev,
                                                [p.id]: conceptoIdx
                                              }));
                                            }
                                          }}
                                          style={{
                                            padding: '0.75rem 1rem',
                                            marginBottom: '0.75rem',
                                            border: isSelected ? '2px solid #0d6efd' : hasConnection ? '2px solid #28a745' : '2px solid #dee2e6',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? '#e7f1ff' : hasConnection ? '#d1f4e0' : 'white',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem'
                                          }}
                                        >
                                          <span className="badge bg-primary" style={{ fontSize: '0.9rem', minWidth: '35px', padding: '0.5rem' }}>
                                            {conceptoIdx + 1}
                                          </span>
                                          <span style={{ flex: 1, fontSize: '0.95rem' }}>{concepto}</span>
                                          {hasConnection && <i className="fas fa-check text-success"></i>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  {/* Columna derecha: Respuestas */}
                                  <div className="col-6">
                                    <h6 className="text-muted mb-3"><i className="fas fa-list me-2"></i>Respuestas</h6>
                                    {respuestasRandomizadas.map((respuestaObj, respuestaIdx) => {
                                      const isTargetOfSelected = selectedConcept !== null && respuestasEstudiante[selectedConcept] === respuestaIdx;
                                      const isConnectedToOther = respuestasEstudiante.indexOf(respuestaIdx) !== -1;
                                      
                                      return (
                                        <div
                                          key={respuestaIdx}
                                          id={`matching-${i}-answer-${respuestaIdx}`}
                                          className={`matching-item ${isTargetOfSelected ? 'selected' : ''} ${isConnectedToOther ? 'connected' : ''}`}
                                          onClick={() => {
                                            if (selectedConcept !== null) {
                                              // Conectar el concepto seleccionado con esta respuesta
                                              setRespuestas(prev => {
                                                const current = Array.isArray(prev[p.id]) ? [...prev[p.id]] : [];
                                                // Asegurarse de que el array tenga el tamaño correcto
                                                while (current.length < numConceptos) {
                                                  current.push(null);
                                                }
                                                // Quitar esta respuesta de cualquier otro concepto al que estuviera conectada
                                                for (let c = 0; c < current.length; c++) {
                                                  if (c !== selectedConcept && current[c] === respuestaIdx) {
                                                    current[c] = null;
                                                  }
                                                }
                                                // Asignar la respuesta al concepto actual
                                                current[selectedConcept] = respuestaIdx;
                                                return {
                                                  ...prev,
                                                  [p.id]: current
                                                };
                                              });
                                              // Deseleccionar después de conectar
                                              setSelectedMatchingConcepts(prev => ({
                                                ...prev,
                                                [p.id]: null
                                              }));
                                            }
                                          }}
                                          style={{
                                            padding: '0.75rem 1rem',
                                            marginBottom: '0.75rem',
                                            border: isTargetOfSelected ? '2px solid #0d6efd' : isConnectedToOther ? '2px solid #28a745' : '2px solid #dee2e6',
                                            borderRadius: '8px',
                                            cursor: selectedConcept !== null ? 'pointer' : 'default',
                                            backgroundColor: isTargetOfSelected ? '#e7f1ff' : isConnectedToOther ? '#d1f4e0' : 'white',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            opacity: selectedConcept !== null ? 1 : (isConnectedToOther ? 1 : 0.9)
                                          }}
                                        >
                                          <span className="badge bg-success" style={{ fontSize: '0.9rem', minWidth: '35px', padding: '0.5rem' }}>
                                            {String.fromCharCode(65 + respuestaIdx)}
                                          </span>
                                          <span style={{ flex: 1, fontSize: '0.95rem' }}>{respuestaObj.texto}</span>
                                          {isConnectedToOther && (
                                            <span className="badge bg-primary" style={{ fontSize: '0.75rem' }}>
                                              {respuestasEstudiante.indexOf(respuestaIdx) + 1}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                
                                {/* Resumen de conexiones */}
                                {respuestasEstudiante.some(r => r !== null && r !== undefined) && (
                                  <div className="mt-3 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                    <h6 className="mb-2" style={{ fontSize: '0.9rem' }}>
                                      <i className="fas fa-link me-2"></i>Tus conexiones:
                                    </h6>
                                    <div className="d-flex flex-wrap gap-2">
                                      {conceptos.map((concepto, conceptoIdx) => {
                                        const respuestaIdx = respuestasEstudiante[conceptoIdx];
                                        if (respuestaIdx === null || respuestaIdx === undefined) return null;
                                        const respuesta = respuestasRandomizadas[respuestaIdx];
                                        if (!respuesta) return null;
                                        
                                        return (
                                          <div key={conceptoIdx} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                                            <span className="badge bg-primary me-1" style={{ fontSize: '0.75rem' }}>{conceptoIdx + 1}</span>
                                            <i className="fas fa-arrow-right text-muted mx-1" style={{ fontSize: '0.7rem' }}></i>
                                            <span className="badge bg-success me-1" style={{ fontSize: '0.75rem' }}>{String.fromCharCode(65 + respuestaIdx)}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          <h6 className="mb-3">
                            <i className={`fas ${isFillInBlank ? 'fa-check-double' : 'fa-list-ul'} me-2`}></i>
                            <span className="options-label">{isFillInBlank ? 'Selecciona las respuestas (en orden):' : 'Selecciona tu respuesta:'}</span>
                          </h6>
                          {isFillInBlank && (
                            <div className="alert alert-info mb-3" style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
                              <i className="fas fa-info-circle me-2"></i>
                              Selecciona las opciones en el orden en que deben aparecer en los espacios en blanco
                            </div>
                          )}
                          <div className="exam-options-list">
                        {opcionesParaMostrar.map((opcion, j) => {
                          const isSelected = isFillInBlank 
                            ? Array.isArray(respuestaActual) && respuestaActual.includes(j)
                            : respuestaActual === j;
                          const selectionOrder = isFillInBlank && Array.isArray(respuestaActual) 
                            ? respuestaActual.indexOf(j) + 1 
                            : null;
                          
                          return (
                          <div 
                            key={j} 
                            className={`exam-option-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              if (submitting) return;
                              if (isFillInBlank) {
                                updateRespuesta(p.id, (current) => {
                                  const currentArr = Array.isArray(current) ? current : [];
                                  return currentArr.includes(j)
                                    ? currentArr.filter(idx => idx !== j) // Deseleccionar
                                    : [...currentArr, j]; // Seleccionar (agregar al final)
                                });
                              } else {
                                updateRespuesta(p.id, j);
                              }
                            }}



                            style={{
                              padding: '0.75rem 1rem',
                              marginBottom: '0.5rem',
                              border: isSelected ? '2px solid #0d6efd' : '1px solid #dee2e6',
                              borderRadius: '8px',
                              cursor: submitting ? 'not-allowed' : 'pointer',
                              backgroundColor: isSelected ? '#e7f1ff' : 'white',
                              opacity: submitting ? 0.6 : 1,
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                                e.currentTarget.style.borderColor = '#adb5bd';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.borderColor = '#dee2e6';
                              }
                            }}
                          >
                            {isFillInBlank ? (
                              <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: isSelected ? '2px solid #0d6efd' : '2px solid #adb5bd',
                                backgroundColor: isSelected ? '#0d6efd' : 'white',
                                flexShrink: 0,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                color: 'white',
                                fontSize: '0.75rem'
                              }}>
                                {isSelected && selectionOrder}
                              </div>
                            ) : (
                              <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                border: isSelected ? '6px solid #0d6efd' : '2px solid #adb5bd',
                                flexShrink: 0,
                                transition: 'all 0.2s ease'
                              }}></div>
                            )}
                            <span style={{
                              fontSize: '0.95rem',
                              color: isSelected ? '#0d6efd' : '#212529',
                              fontWeight: isSelected ? '500' : '400'
                            }}>
                              {opcion.texto || "Opción vacía"}
                            </span>
                          </div>
                        );})}
                      </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );})}
          </div>

          {/* Botón Terminar intento */}
          <div className="modern-card mt-4">
            <div className="modern-card-body text-center">
              <div className="exam-completion-section">
                <h5 className="completion-title mb-3">
                  <i className="fas fa-flag-checkered me-2"></i>
                  <span className="completion-text">¿Terminaste el examen?</span>
                </h5>
                <p className="completion-description text-muted mb-4">
                  Una vez que finalices el intento, no podrás volver a entrar al examen. Asegúrate de haber respondido todas las preguntas.
                </p>
                <div className="exam-attempt-actions">
                  <button 
                    className="modern-btn modern-btn-primary modern-btn-lg" 
                    onClick={handleExamCompletion}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                        <span className="btn-text">Finalizando...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check me-2"></i>
                        <span className="btn-text">Finalizar Intento</span>
                      </>
                    )}
                  </button>
                  {propExamId && (
                    <button className="modern-btn modern-btn-secondary modern-btn-lg" onClick={handleExamCompletion}>
                      <i className="fas fa-arrow-left me-2"></i>
                      <span className="btn-text">Volver al inicio</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Component */}
      <Modal
        show={modal.show}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        showCancel={modal.showCancel}
        confirmText={modal.confirmText || (modal.type === 'warning' ? 'Salir del Examen' : modal.type === 'confirm' ? 'Finalizar' : 'Aceptar')}
        cancelText={modal.type === 'confirm' ? 'Cancelar' : 'Continuar Examen'}
        isProcessing={modal.isProcessing}
      />
    </div>
  );
};

export default ExamAttempt;