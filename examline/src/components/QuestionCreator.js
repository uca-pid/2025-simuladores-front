// src/components/QuestionCreator.jsx
import React, { useState } from "react";

const QuestionCreator = ({ onAddQuestion }) => {
  const [tipoPregunta, setTipoPregunta] = useState("multiple_choice");
  const [textoPregunta, setTextoPregunta] = useState("");
  const [opciones, setOpciones] = useState(["", ""]);
  const [correcta, setCorrecta] = useState(0);
  const [error, setError] = useState("");
  
  // Estados adicionales para fill_in_blank
  const [respuestasCorrectas, setRespuestasCorrectas] = useState([""]);
  const [distractores, setDistractores] = useState([]);
  
  // Estados adicionales para matching
  const [conceptos, setConceptos] = useState(["", ""]);
  const [respuestasMatching, setRespuestasMatching] = useState(["", ""]);

  // Efecto para ajustar opciones cuando cambia el tipo de pregunta
  React.useEffect(() => {
    if (tipoPregunta === "true_false") {
      setOpciones(["Verdadero", "Falso"]);
      setCorrecta(0);
    } else if (tipoPregunta === "fill_in_blank") {
      setRespuestasCorrectas([""]);
      setDistractores([]);
      setCorrecta(0);
    } else if (tipoPregunta === "matching") {
      setConceptos(["", ""]);
      setRespuestasMatching(["", ""]);
      setCorrecta(0);
    } else if (tipoPregunta === "multiple_choice" && opciones.length === 2 && opciones[0] === "Verdadero" && opciones[1] === "Falso") {
      // Si volvemos de true_false a multiple_choice, resetear opciones
      setOpciones(["", ""]);
      setCorrecta(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoPregunta]);

  // Agregar opción nueva
  const handleAgregarOpcion = () => {
    if (opciones.length < 10) { // Máximo 10 opciones
      setOpciones([...opciones, ""]);
    }
  };

  // Eliminar opción
  const handleEliminarOpcion = (index) => {
    if (opciones.length > 2) { // Mínimo 2 opciones
      const nuevasOpciones = opciones.filter((_, i) => i !== index);
      setOpciones(nuevasOpciones);
      // Ajustar la respuesta correcta si es necesario
      if (correcta >= nuevasOpciones.length) {
        setCorrecta(nuevasOpciones.length - 1);
      }
    }
  };
  
  // Funciones para respuestas correctas de fill_in_blank
  const handleAgregarRespuestaCorrecta = () => {
    if (respuestasCorrectas.length < 10) {
      setRespuestasCorrectas([...respuestasCorrectas, ""]);
    }
  };
  
  const handleEliminarRespuestaCorrecta = (index) => {
    if (respuestasCorrectas.length > 1) {
      setRespuestasCorrectas(respuestasCorrectas.filter((_, i) => i !== index));
    }
  };
  
  // Funciones para distractores de fill_in_blank
  const handleAgregarDistractor = () => {
    if (distractores.length < 10) {
      setDistractores([...distractores, ""]);
    }
  };
  
  const handleEliminarDistractor = (index) => {
    setDistractores(distractores.filter((_, i) => i !== index));
  };
  
  // Insertar guion largo en el texto de la pregunta
  const handleInsertarGuion = () => {
    setTextoPregunta(textoPregunta + "—");
  };

  // Agregar pregunta al listado
  const handleAgregarPregunta = () => {
    if (!textoPregunta.trim()) {
      setError("Ingrese el texto de la pregunta");
      return;
    }
    
    if (tipoPregunta === "multiple_choice") {
      if (opciones.length < 2) {
        setError("La pregunta debe tener al menos 2 opciones");
        return;
      }
      
      if (opciones.some(o => !o.trim())) {
        setError("Complete todas las opciones antes de agregar la pregunta");
        return;
      }
    }
    
    if (tipoPregunta === "fill_in_blank") {
      const espaciosEnBlanco = (textoPregunta.match(/—/g) || []).length;
      
      if (espaciosEnBlanco === 0) {
        setError("Debe agregar al menos un espacio en blanco (—) en la pregunta");
        return;
      }
      
      if (respuestasCorrectas.length !== espaciosEnBlanco) {
        setError(`La pregunta tiene ${espaciosEnBlanco} espacio(s) en blanco. Debe tener exactamente ${espaciosEnBlanco} respuesta(s) correcta(s).`);
        return;
      }
      
      if (respuestasCorrectas.some(r => !r.trim())) {
        setError("Complete todas las respuestas correctas antes de agregar la pregunta");
        return;
      }
      
      if (distractores.some(d => !d.trim())) {
        setError("Complete todas las opciones incorrectas o elimínelas");
        return;
      }
      
      // Validar que no haya duplicados
      const todasLasRespuestas = [...respuestasCorrectas, ...distractores].map(r => r.trim().toLowerCase());
      const duplicados = todasLasRespuestas.filter((item, index) => todasLasRespuestas.indexOf(item) !== index);
      
      if (duplicados.length > 0) {
        setError("No se permiten respuestas duplicadas. Verifica que no haya respuestas correctas o distractores repetidos.");
        return;
      }
    }

    // Preparar datos según el tipo de pregunta
    let preguntaData = {
      tipo: tipoPregunta,
      texto: textoPregunta,
      opciones: [],
      correcta: correcta
    };
    
    if (tipoPregunta === "fill_in_blank") {
      // Combinar respuestas correctas y distractores
      // Las primeras N opciones son las correctas en orden
      preguntaData.opciones = [...respuestasCorrectas, ...distractores];
      preguntaData.correcta = respuestasCorrectas.length; // Indica cuántas son correctas
    } else if (tipoPregunta === "matching") {
      // Para matching, combinar conceptos y respuestas en un solo array
      // Primera mitad: conceptos, segunda mitad: respuestas
      preguntaData.opciones = [...conceptos, ...respuestasMatching];
      preguntaData.correcta = conceptos.length; // Indica cuántos son conceptos (el resto son respuestas)
    } else {
      preguntaData.opciones = [...opciones];
      preguntaData.correcta = correcta;
    }
    
    // Llamar al callback del padre con la nueva pregunta
    onAddQuestion(preguntaData);

    // Limpiar inputs
    setTextoPregunta("");
    if (tipoPregunta === "multiple_choice") {
      setOpciones(["", ""]);
    } else if (tipoPregunta === "fill_in_blank") {
      setRespuestasCorrectas([""]);
      setDistractores([]);
    } else if (tipoPregunta === "matching") {
      setConceptos(["", ""]);
      setRespuestasMatching(["", ""]);
    }
    setCorrecta(0);
    setError("");
  };

  return (
    <div className="modern-card mb-4">
      <div className="modern-card-header">
        <h3 className="modern-card-title">
          <i className="fas fa-question-circle me-2"></i>
          Agregar Pregunta
        </h3>
      </div>
      <div className="modern-card-body">
        {error && (
          <div className="error-message mb-3">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="form-label d-flex align-items-center gap-2">
            <i className="fas fa-clipboard-list text-muted"></i>
            Tipo de pregunta
          </label>
          <select
            className="form-select"
            value={tipoPregunta}
            onChange={(e) => setTipoPregunta(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          >
            <option value="multiple_choice">Opción Múltiple</option>
            <option value="true_false">Verdadero / Falso</option>
            <option value="fill_in_blank">Completar Espacios</option>
            <option value="matching">Unir con Flechas (Matching)</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="form-label d-flex align-items-center gap-2">
            <i className="fas fa-comment-alt text-muted"></i>
            Texto de la pregunta
          </label>
          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control"
              placeholder={tipoPregunta === "fill_in_blank" ? "Escribe tu pregunta y usa el botón para agregar espacios en blanco" : "Escribe aquí tu pregunta"}
              value={textoPregunta}
              onChange={(e) => setTextoPregunta(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
            {tipoPregunta === "fill_in_blank" && (
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={handleInsertarGuion}
                title="Insertar espacio en blanco"
                style={{ minWidth: '120px' }}
              >
                <i className="fas fa-plus me-2"></i>
                Agregar —
              </button>
            )}
          </div>
          {tipoPregunta === "fill_in_blank" && (
            <small className="form-text text-muted mt-1 d-block">
              <i className="fas fa-info-circle me-1"></i>
              Usa el botón "Agregar —" para insertar espacios en blanco donde irán las respuestas
            </small>
          )}
        </div>

        {tipoPregunta === "multiple_choice" && (
          <>
            <div className="mb-4">
              <label className="form-label d-flex align-items-center gap-2">
                <i className="fas fa-list text-muted"></i>
                Opciones de respuesta (mínimo 2, máximo 10)
              </label>
              <div className="exam-creator-options-list">
                {opciones.map((op, i) => (
                  <div key={i} className="exam-creator-option-item mb-2 d-flex gap-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Opción ${i + 1}`}
                      value={op}
                      onChange={(e) => {
                        const nuevasOpciones = [...opciones];
                        nuevasOpciones[i] = e.target.value;
                        setOpciones(nuevasOpciones);
                      }}
                      style={{
                        padding: '0.6rem 0.8rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                      }}
                    />
                    {opciones.length > 2 && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleEliminarOpcion(i)}
                        title="Eliminar opción"
                        style={{ minWidth: '40px' }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {opciones.length < 10 && (
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm mt-2"
                  onClick={handleAgregarOpcion}
                >
                  <i className="fas fa-plus me-2"></i>
                  Agregar opción
                </button>
              )}
            </div>
          </>
        )}

        {tipoPregunta === "true_false" && (
          <div className="mb-4">
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              Las opciones para preguntas de Verdadero/Falso están predefinidas.
            </div>
          </div>
        )}

        {tipoPregunta === "fill_in_blank" && (
          <>
            <div className="mb-3">
              <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Instrucciones:</strong> Agrega las respuestas correctas en el orden en que aparecen los espacios en blanco (—). 
                Luego, opcionalmente agrega opciones incorrectas como distractores.
                <br/>
                <small>Ejemplo: "La capital de — es —" requiere exactamente 2 respuestas correctas. Puedes agregar distractores como "Madrid", "Londres".</small>
              </div>
            </div>
            
            {/* Respuestas correctas */}
            <div className="mb-4">
              <label className="form-label d-flex align-items-center gap-2">
                <i className="fas fa-check-circle text-success me-2"></i>
                Respuestas correctas ordenadas ({(textoPregunta.match(/—/g) || []).length} requerida(s))
              </label>
              <div className="exam-creator-options-list">
                {respuestasCorrectas.map((respuesta, i) => (
                  <div key={i} className="exam-creator-option-item mb-2 d-flex gap-2 align-items-center">
                    <span 
                      className="badge bg-success"
                      style={{
                        minWidth: '35px',
                        height: '35px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Respuesta correcta para espacio ${i + 1}`}
                      value={respuesta}
                      onChange={(e) => {
                        const nuevoValor = e.target.value;
                        const valorTrim = nuevoValor.trim().toLowerCase();
                        
                        // Validar duplicados en tiempo real
                        if (valorTrim) {
                          // Verificar en otras respuestas correctas
                          const duplicadoEnCorrectas = respuestasCorrectas.some((resp, idx) => 
                            idx !== i && resp.trim().toLowerCase() === valorTrim
                          );
                          
                          // Verificar en distractores
                          const duplicadoEnDistractores = distractores.some(dist => 
                            dist.trim().toLowerCase() === valorTrim
                          );
                          
                          if (duplicadoEnCorrectas || duplicadoEnDistractores) {
                            setError('Esta respuesta ya existe. No se permiten respuestas duplicadas.');
                            setTimeout(() => setError(''), 3000);
                            return;
                          }
                        }
                        
                        const nuevasRespuestas = [...respuestasCorrectas];
                        nuevasRespuestas[i] = nuevoValor;
                        setRespuestasCorrectas(nuevasRespuestas);
                        setError('');
                      }}
                      style={{
                        padding: '0.6rem 0.8rem',
                        border: '2px solid #28a745',
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                      }}
                    />
                    {respuestasCorrectas.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleEliminarRespuestaCorrecta(i)}
                        title="Eliminar respuesta"
                        style={{ minWidth: '40px' }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {respuestasCorrectas.length < 10 && (
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm mt-2"
                  onClick={handleAgregarRespuestaCorrecta}
                >
                  <i className="fas fa-plus me-2"></i>
                  Agregar respuesta correcta
                </button>
              )}
            </div>

            {/* Distractores */}
            <div className="mb-4">
              <label className="form-label d-flex align-items-center gap-2">
                <i className="fas fa-times-circle text-danger me-2"></i>
                Opciones incorrectas - Distractores (opcional)
              </label>
              {distractores.length === 0 ? (
                <div className="alert alert-secondary">
                  <i className="fas fa-lightbulb me-2"></i>
                  Puedes agregar opciones incorrectas para dificultar la pregunta. Los estudiantes verán todas las opciones mezcladas.
                </div>
              ) : (
                <div className="exam-creator-options-list">
                  {distractores.map((distractor, i) => (
                    <div key={i} className="exam-creator-option-item mb-2 d-flex gap-2 align-items-center">
                      <span 
                        className="badge bg-danger"
                        style={{
                          minWidth: '35px',
                          height: '35px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem',
                          fontWeight: 'bold'
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Opción incorrecta ${i + 1}`}
                        value={distractor}
                        onChange={(e) => {
                          const nuevoValor = e.target.value;
                          const valorTrim = nuevoValor.trim().toLowerCase();
                          
                          // Validar duplicados en tiempo real
                          if (valorTrim) {
                            // Verificar en otros distractores
                            const duplicadoEnDistractores = distractores.some((dist, idx) => 
                              idx !== i && dist.trim().toLowerCase() === valorTrim
                            );
                            
                            // Verificar en respuestas correctas
                            const duplicadoEnCorrectas = respuestasCorrectas.some(resp => 
                              resp.trim().toLowerCase() === valorTrim
                            );
                            
                            if (duplicadoEnDistractores || duplicadoEnCorrectas) {
                              setError('Esta opción ya existe. No se permiten respuestas duplicadas.');
                              setTimeout(() => setError(''), 3000);
                              return;
                            }
                          }
                          
                          const nuevosDistractores = [...distractores];
                          nuevosDistractores[i] = nuevoValor;
                          setDistractores(nuevosDistractores);
                          setError('');
                        }}
                        style={{
                          padding: '0.6rem 0.8rem',
                          border: '2px solid #dc3545',
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleEliminarDistractor(i)}
                        title="Eliminar distractor"
                        style={{ minWidth: '40px' }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {distractores.length < 10 && (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm mt-2"
                  onClick={handleAgregarDistractor}
                >
                  <i className="fas fa-plus me-2"></i>
                  Agregar distractor
                </button>
              )}
            </div>
          </>
        )}

        {tipoPregunta === "matching" && (
          <>
            <div className="mb-3">
              <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Instrucciones:</strong> Agrega los conceptos en la columna izquierda y sus respuestas correspondientes en la columna derecha.
                Los estudiantes deberán unir cada concepto con su respuesta correcta.
                <br/>
                <small>Ejemplo: Concepto "Francia" → Respuesta "París"</small>
              </div>
            </div>
            
            <div className="row mb-4">
              {/* Columna de Conceptos */}
              <div className="col-md-6">
                <label className="form-label d-flex align-items-center gap-2">
                  <i className="fas fa-list-ul text-primary me-2"></i>
                  Conceptos / Preguntas (Columna Izquierda)
                </label>
                <div className="exam-creator-options-list">
                  {conceptos.map((concepto, i) => (
                    <div key={i} className="exam-creator-option-item mb-2 d-flex gap-2 align-items-center">
                      <span 
                        className="badge bg-primary"
                        style={{
                          minWidth: '35px',
                          height: '35px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Concepto ${i + 1}`}
                        value={concepto}
                        onChange={(e) => {
                          const nuevoValor = e.target.value;
                          const valorTrim = nuevoValor.trim().toLowerCase();
                          
                          if (valorTrim) {
                            const duplicado = conceptos.some((c, idx) => 
                              idx !== i && c.trim().toLowerCase() === valorTrim
                            );
                            if (duplicado) {
                              setError('Este concepto ya existe');
                              setTimeout(() => setError(''), 3000);
                              return;
                            }
                          }
                          
                          const nuevos = [...conceptos];
                          nuevos[i] = nuevoValor;
                          setConceptos(nuevos);
                          setError('');
                        }}
                        style={{
                          padding: '0.6rem 0.8rem',
                          border: '2px solid #007bff',
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}
                      />
                      {conceptos.length > 2 && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => {
                            setConceptos(conceptos.filter((_, idx) => idx !== i));
                            setRespuestasMatching(respuestasMatching.filter((_, idx) => idx !== i));
                          }}
                          title="Eliminar par"
                          style={{ minWidth: '40px' }}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {conceptos.length < 10 && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm mt-2"
                    onClick={() => {
                      setConceptos([...conceptos, ""]);
                      setRespuestasMatching([...respuestasMatching, ""]);
                    }}
                  >
                    <i className="fas fa-plus me-2"></i>
                    Agregar par concepto-respuesta
                  </button>
                )}
              </div>
              
              {/* Columna de Respuestas */}
              <div className="col-md-6">
                <label className="form-label d-flex align-items-center gap-2">
                  <i className="fas fa-arrow-right text-success me-2"></i>
                  Respuestas Correctas (Columna Derecha)
                </label>
                <div className="exam-creator-options-list">
                  {respuestasMatching.map((respuesta, i) => (
                    <div key={i} className="exam-creator-option-item mb-2 d-flex gap-2 align-items-center">
                      <span 
                        className="badge bg-success"
                        style={{
                          minWidth: '35px',
                          height: '35px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Respuesta ${String.fromCharCode(65 + i)}`}
                        value={respuesta}
                        onChange={(e) => {
                          const nuevoValor = e.target.value;
                          const valorTrim = nuevoValor.trim().toLowerCase();
                          
                          if (valorTrim) {
                            const duplicado = respuestasMatching.some((r, idx) => 
                              idx !== i && r.trim().toLowerCase() === valorTrim
                            );
                            if (duplicado) {
                              setError('Esta respuesta ya existe');
                              setTimeout(() => setError(''), 3000);
                              return;
                            }
                          }
                          
                          const nuevas = [...respuestasMatching];
                          nuevas[i] = nuevoValor;
                          setRespuestasMatching(nuevas);
                          setError('');
                        }}
                        style={{
                          padding: '0.6rem 0.8rem',
                          border: '2px solid #28a745',
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2" style={{ height: '38px' }}>
                  {/* Espacio para mantener alineación con columna izquierda */}
                </div>
              </div>
            </div>
            
            {/* Vista previa del matching */}
            <div className="alert alert-secondary">
              <strong><i className="fas fa-eye me-2"></i>Vista previa de los pares correctos:</strong>
              <div className="mt-2">
                {conceptos.map((concepto, i) => {
                  const respuesta = respuestasMatching[i];
                  if (!concepto.trim() || !respuesta.trim()) return null;
                  
                  return (
                    <div key={i} className="mb-2 d-flex align-items-center gap-2">
                      <span className="badge bg-primary" style={{ fontSize: '0.85rem', minWidth: '30px' }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: '0.9rem' }}>{concepto}</span>
                      <i className="fas fa-arrow-right text-primary mx-1"></i>
                      <span className="badge bg-success" style={{ fontSize: '0.85rem', minWidth: '30px' }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span style={{ fontSize: '0.9rem' }}>{respuesta}</span>
                    </div>
                  );
                })}
                {conceptos.filter(c => c.trim()).length === 0 && (
                  <small className="text-muted">Complete los campos para ver la vista previa</small>
                )}
              </div>
            </div>
          </>
        )}

        {tipoPregunta !== "fill_in_blank" && tipoPregunta !== "matching" && (
          <div className="mb-4">
            <label className="form-label d-flex align-items-center gap-2">
              <i className="fas fa-check-circle text-muted"></i>
              Respuesta correcta
            </label>
            <select
              className="form-select"
              value={correcta}
              onChange={(e) => setCorrecta(Number(e.target.value))}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              {opciones.map((opcion, i) => (
                <option key={i} value={i}>
                  {tipoPregunta === "true_false" ? opcion : `Opción ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="exam-creator-buttons">
          <button 
            className="modern-btn modern-btn-secondary"
            onClick={handleAgregarPregunta}
          >
            <i className="fas fa-plus me-2"></i>
            <span className="button-text">Agregar Pregunta</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionCreator;
