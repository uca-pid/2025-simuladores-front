// src/pages/ExamCreator.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ExamCreator.css";
import Editor from '@monaco-editor/react';
import { useModal } from "../hooks";
import BackToMainButton from "../components/BackToMainButton";
import Modal from "../components/Modal";
import QuestionCreator from "../components/QuestionCreator";
import QuestionBankSelector from "../components/QuestionBankSelector";
import { createExam, testSolutionPreview } from "../services/api";

const DRAFT_KEY = 'examCreatorDraft';

const ExamCreator = () => {
  const navigate = useNavigate();
  const { modal, showModal, closeModal } = useModal();

  // Cargar borrador desde localStorage
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (err) {
      console.error('Error cargando borrador:', err);
      return null;
    }
  };

  const draft = loadDraft();

  const [titulo, setTitulo] = useState(draft?.titulo || "");
  const [tipoExamen, setTipoExamen] = useState(draft?.tipoExamen || "multiple_choice"); // "multiple_choice" | "programming"
  const [ordenAleatorio, setOrdenAleatorio] = useState(draft?.ordenAleatorio || false); // Orden aleatorio de preguntas

  // Estados para exámenes de multiple choice
  const [preguntas, setPreguntas] = useState(draft?.preguntas || []);
  
  // Estados para exámenes de programación
  const [lenguajeProgramacion, setLenguajeProgramacion] = useState(draft?.lenguajeProgramacion || "python");
  const [intellisenseHabilitado, setIntellisenseHabilitado] = useState(draft?.intellisenseHabilitado || false);
  const [enunciadoProgramacion, setEnunciadoProgramacion] = useState(draft?.enunciadoProgramacion || "");
  const [codigoInicial, setCodigoInicial] = useState(draft?.codigoInicial || "");
  const [testCases, setTestCases] = useState(draft?.testCases || [
    { description: "", input: "", expectedOutput: "" }
  ]);
  
  // Estados para solución de referencia multi-archivo
  const [referenceFiles, setReferenceFiles] = useState(draft?.referenceFiles || [
    { filename: 'main.py', content: '' }
  ]);
  const [currentReferenceFile, setCurrentReferenceFile] = useState(draft?.currentReferenceFile || 'main.py');
  const [showNewReferenceFileModal, setShowNewReferenceFileModal] = useState(false);
  const [newReferenceFileName, setNewReferenceFileName] = useState('');
  const [referenceFileToDelete, setReferenceFileToDelete] = useState('');
  const [showDeleteReferenceFileModal, setShowDeleteReferenceFileModal] = useState(false);
  const [saveReferenceSolution, setSaveReferenceSolution] = useState(draft?.saveReferenceSolution || false);
  
  const [testResults, setTestResults] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  
  const [isPublishing, setIsPublishing] = useState(false);
  const [showBankSelector, setShowBankSelector] = useState(false);
  const [hasDraft, setHasDraft] = useState(!!draft);

  // Autoguardado: guardar en localStorage cuando cambien los estados importantes
  useEffect(() => {
    const draftData = {
      titulo,
      tipoExamen,
      ordenAleatorio,
      preguntas,
      lenguajeProgramacion,
      intellisenseHabilitado,
      enunciadoProgramacion,
      codigoInicial,
      testCases,
      referenceFiles,
      currentReferenceFile,
      saveReferenceSolution,
      savedAt: new Date().toISOString()
    };

    // Solo guardar si hay contenido
    const hasContent = titulo || preguntas.length > 0 || enunciadoProgramacion ||
                      testCases.some(tc => tc.description || tc.input || tc.expectedOutput) ||
                      referenceFiles.some(f => f.content);

    if (hasContent) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      setHasDraft(true);
    }
  }, [titulo, tipoExamen, ordenAleatorio, preguntas,
      lenguajeProgramacion, intellisenseHabilitado, enunciadoProgramacion,
      codigoInicial, testCases, referenceFiles, currentReferenceFile, saveReferenceSolution]);

  // Función para descartar borrador
  const handleDiscardDraft = () => {
    showModal(
      'confirm',
      '🗑️ Descartar Borrador',
      '¿Estás seguro de que deseas descartar el borrador actual? Esta acción no se puede deshacer.',
      () => {
        localStorage.removeItem(DRAFT_KEY);
        // Resetear todos los estados
        setTitulo("");
        setTipoExamen("multiple_choice");
        setOrdenAleatorio(false);
        setPreguntas([]);
        setLenguajeProgramacion("python");
        setIntellisenseHabilitado(false);
        setEnunciadoProgramacion("");
        setCodigoInicial("");
        setTestCases([{ description: "", input: "", expectedOutput: "" }]);
        setReferenceFiles([{ filename: 'main.py', content: '' }]);
        setCurrentReferenceFile('main.py');
        setSaveReferenceSolution(false);
        setHasDraft(false);
        closeModal();
      },
      true
    );
  };

  // Efecto para actualizar extensión de archivos cuando cambia el lenguaje
  React.useEffect(() => {
    const newExtension = lenguajeProgramacion === 'python' ? '.py' : '.js';
    const oldExtension = lenguajeProgramacion === 'python' ? '.js' : '.py';

    setReferenceFiles(prevFiles =>
      prevFiles.map(file => {
        if (file.filename.endsWith(oldExtension)) {
          return {
            ...file,
            filename: file.filename.replace(oldExtension, newExtension)
          };
        }
        return file;
      })
    );

    // Actualizar el archivo actual si cambió
    setCurrentReferenceFile(prev => {
      if (prev && prev.endsWith(oldExtension)) {
        return prev.replace(oldExtension, newExtension);
      }
      return prev;
    });
  }, [lenguajeProgramacion]);

  // Agregar pregunta al listado (callback para el componente hijo)
  const handleAddQuestion = (nuevaPregunta) => {
    setPreguntas([...preguntas, nuevaPregunta]);
  };

  // Agregar preguntas desde el banco
  const handleAddQuestionsFromBank = (selectedQuestions) => {
    setPreguntas([...preguntas, ...selectedQuestions]);
  };

  // Eliminar pregunta del examen
  const handleRemoveQuestion = (index) => {
    setPreguntas(preguntas.filter((_, i) => i !== index));
  };

  // Funciones para manejar archivos de referencia
  const handleAddReferenceFile = () => {
    if (!newReferenceFileName.trim()) {
      showModal(
        'error',
        'Error',
        'Por favor ingresa un nombre de archivo',
        null,
        false
      );
      return;
    }
    
    const extension = lenguajeProgramacion === 'python' ? '.py' : '.js';
    let filename = newReferenceFileName.trim();
    
    if (!filename.endsWith(extension)) {
      filename += extension;
    }
    
    if (referenceFiles.some(f => f.filename === filename)) {
      showModal(
        'error',
        'Error',
        'Ya existe un archivo con ese nombre',
        null,
        false
      );
      return;
    }
    
    setReferenceFiles([...referenceFiles, { filename, content: '' }]);
    setCurrentReferenceFile(filename);
    setNewReferenceFileName('');
    setShowNewReferenceFileModal(false);
  };
  
  const handleDeleteReferenceFile = () => {
    if (referenceFiles.length === 1) {
      showModal(
        'error',
        'Error',
        'Debe haber al menos un archivo',
        null,
        false
      );
      return;
    }
    
    const updatedFiles = referenceFiles.filter(f => f.filename !== referenceFileToDelete);
    setReferenceFiles(updatedFiles);
    
    if (currentReferenceFile === referenceFileToDelete) {
      setCurrentReferenceFile(updatedFiles[0].filename);
    }
    
    setShowDeleteReferenceFileModal(false);
    setReferenceFileToDelete('');
  };
  
  const handleReferenceFileContentChange = (filename, content) => {
    setReferenceFiles(referenceFiles.map(f => 
      f.filename === filename ? { ...f, content } : f
    ));
  };

  // Funciones para manejar test cases
  const handleAddTestCase = () => {
    setTestCases([...testCases, { description: "", input: "", expectedOutput: "" }]);
  };

  const handleRemoveTestCase = (index) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const handleTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...testCases];
    updatedTestCases[index][field] = value;
    setTestCases(updatedTestCases);
  };

  // Función para ejecutar tests contra la solución de referencia
  const handleRunTestsReference = async () => {
    console.log('Ejecutando tests con solución de referencia...');
    
    const currentFile = referenceFiles.find(f => f.filename === currentReferenceFile);
    if (!currentFile || !currentFile.content.trim()) {
      const errorMsg = "Debes ingresar código en el archivo actual para probar";
      console.error('Validación falló:', errorMsg);
      showModal(
        'error',
        'Error',
        errorMsg,
        null,
        false
      );
      return;
    }

    if (testCases.length === 0) {
      const errorMsg = "No hay test cases configurados";
      console.error('Validación falló:', errorMsg);
      showModal(
        'error',
        'Error',
        errorMsg,
        null,
        false
      );
      return;
    }

    const invalidTests = testCases.filter(tc => !tc.expectedOutput || !tc.expectedOutput.trim());
    if (invalidTests.length > 0) {
      const errorMsg = `Hay ${invalidTests.length} test case(s) sin output esperado. Por favor completa todos los test cases antes de ejecutar.`;
      console.error('Validación falló:', errorMsg);
      console.error('Test cases inválidos:', invalidTests);
      showModal(
        'error',
        '❌ Error de Validación',
        errorMsg,
        null,
        false
      );
      return;
    }

    setIsRunningTests(true);
    
    try {
      console.log('Llamando a testSolutionPreview...');
      const validTestCases = testCases.filter(tc => tc.expectedOutput && tc.expectedOutput.trim());
      // Por ahora usar el archivo actual, en el futuro se podría ejecutar con múltiples archivos
      const mainFile = referenceFiles.find(f => f.filename === currentReferenceFile) || referenceFiles[0];
      const results = await testSolutionPreview(mainFile.content, lenguajeProgramacion, validTestCases);
      console.log('Resultados:', results);
      setTestResults(results);
      setShowTestPanel(true);
    } catch (err) {
      console.error("Error ejecutando tests:", err);
      const errorMsg = err.message || "Error al ejecutar tests";
      showModal(
        'error',
        'Error',
        errorMsg,
        null,
        false
      );
    } finally {
      setIsRunningTests(false);
    }
  };

  // Función que realmente publica el examen
  const proceedWithPublishing = async () => {
    setIsPublishing(true);
    try {
      const examData = {
        titulo,
        tipo: tipoExamen,
        ordenAleatorio
      };

      // Agregar datos específicos según el tipo
      if (tipoExamen === "multiple_choice") {
        examData.preguntas = preguntas;
      } else if (tipoExamen === "programming") {
        examData.lenguajeProgramacion = lenguajeProgramacion;
        examData.intellisenseHabilitado = intellisenseHabilitado;
        examData.enunciadoProgramacion = enunciadoProgramacion;
        examData.codigoInicial = codigoInicial;
        examData.testCases = testCases;
        // Solo enviar archivos de referencia si el profesor eligió guardarlos
        if (saveReferenceSolution) {
          examData.referenceFiles = referenceFiles;
        }
      }

      await createExam(examData);
      
      // Limpiar borrador al publicar exitosamente
      localStorage.removeItem(DRAFT_KEY);
      
      // Volver a la Página Principal
      navigate("/mis-examenes");
    } catch (err) {
      console.error(err);
      showModal(
        'error',
        '❌ Error al Publicar',
        err.message || 'Ocurrió un error al publicar el examen',
        null,
        false
      );
    } finally {
      setIsPublishing(false);
    }
  };

  // Publicar examen
  const handlePublicarExamen = async () => {
    if (isPublishing) return; // Prevenir múltiples clicks
    
    if (!titulo) {
      showModal(
        'error',
        'Error',
        'Ingrese un título para el examen',
        null,
        false
      );
      return;
    }

    // Validaciones específicas según el tipo
    if (tipoExamen === "multiple_choice") {
      if (preguntas.length === 0) {
        showModal(
          'warning',
          'No se puede publicar el examen',
          'No se puede publicar un examen sin preguntas. Por favor, agrega al menos una pregunta antes de continuar.',
          null,
          false
        );
        return;
      }
    } else if (tipoExamen === "programming") {
      if (!enunciadoProgramacion.trim()) {
        showModal(
          'warning',
          'No se puede publicar el examen',
          'No se puede publicar un examen de programación sin consigna. Por favor, ingresa el enunciado del problema antes de continuar.',
          null,
          false
        );
        return;
      }
    }

    // Si llegamos aquí, todo está bien, publicar directamente
    proceedWithPublishing();
  };

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="exam-creator-header">
            <div className="exam-creator-title-section">
              <h1 className="page-title mb-1">
                <i className="fas fa-plus-circle me-2" style={{ color: 'var(--primary-color)' }}></i>
                <span className="title-text">Crear Examen</span>
                {hasDraft && (
                  <span className="badge bg-info ms-2" style={{ fontSize: '0.6em', verticalAlign: 'middle' }}>
                    <i className="fas fa-save me-1"></i>
                    Borrador guardado
                  </span>
                )}
              </h1>
              <p className="page-subtitle mb-0">Diseña un nuevo examen con preguntas personalizadas</p>
            </div>
            <div className="exam-creator-actions" style={{ display: 'flex', gap: '0.5rem' }}>
              {hasDraft && (
                <button
                  className="modern-btn modern-btn-danger compact-btn"
                  onClick={handleDiscardDraft}
                  disabled={isPublishing}
                  title="Descartar borrador"
                >
                  <i className="fas fa-trash me-2"></i>
                  <span className="btn-text">Descartar</span>
                </button>
              )}
              <BackToMainButton 
                customPath="/mis-examenes"
                customLabel={<><i className="fas fa-arrow-left me-2"></i>Volver a Mis Exámenes</>}
              />
            </div>
          </div>
        </div>
      </div>




        {/* Información del examen */}
        <div className="modern-card mb-4">
          <div className="modern-card-header">
            <h3 className="modern-card-title">
              <i className="fas fa-edit me-2"></i>
              Información del Examen
            </h3>
          </div>
          <div className="modern-card-body">
            <div className="mb-3">
              <label className="form-label d-flex align-items-center gap-2">
                <i className="fas fa-heading text-muted"></i>
                Título del Examen
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ingresa el título del examen"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                disabled={isPublishing}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label d-flex align-items-center gap-2">
                <i className="fas fa-clipboard-list text-muted"></i>
                Tipo de Examen
              </label>
              <select
                className="form-select"
                value={tipoExamen}
                onChange={(e) => setTipoExamen(e.target.value)}
                disabled={isPublishing}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <option value="multiple_choice">Preguntas</option>
                <option value="programming">Programación</option>
              </select>
            </div>
            
            <div className="mb-0">
              <label className="form-label d-flex align-items-center gap-2">
                <i className="fas fa-random text-muted"></i>
                Orden Aleatorio de Preguntas
              </label>
              <div className="form-check form-switch mt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="ordenAleatorioSwitch"
                  checked={ordenAleatorio}
                  onChange={(e) => setOrdenAleatorio(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="ordenAleatorioSwitch">
                  {ordenAleatorio ? "Las preguntas aparecerán en orden aleatorio para cada estudiante" : "Las preguntas aparecerán en el orden definido"}
                </label>
              </div>
              <small className="form-text text-muted">
                {ordenAleatorio 
                  ? "✓ Cada estudiante verá las preguntas en un orden diferente"
                  : "Las preguntas siempre aparecerán en el mismo orden"}
              </small>
            </div>
          </div>
        </div>

        {/* Configuración de examen de programación */}
        {tipoExamen === "programming" && (
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-code me-2"></i>
                Configuración de Programación
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label d-flex align-items-center gap-2">
                    <i className="fas fa-terminal text-muted"></i>
                    Lenguaje de Programación
                  </label>
                  <select
                    className="form-select"
                    value={lenguajeProgramacion}
                    onChange={(e) => setLenguajeProgramacion(e.target.value)}
                    disabled={isPublishing}
                    style={{
                      padding: '0.75rem 1rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label d-flex align-items-center gap-2">
                    <i className="fas fa-lightbulb text-muted"></i>
                    Intellisense y Autocompletado
                  </label>
                  <div className="form-check form-switch mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="intellisenseSwitch"
                      checked={intellisenseHabilitado}
                      onChange={(e) => setIntellisenseHabilitado(e.target.checked)}
                      disabled={isPublishing}
                    />
                    <label className="form-check-label" htmlFor="intellisenseSwitch">
                      {intellisenseHabilitado ? "Habilitado" : "Deshabilitado"}
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label d-flex align-items-center gap-2">
                  <i className="fas fa-file-alt text-muted"></i>
                  Enunciado del Problema
                </label>
                <textarea
                  className="form-control"
                  rows="6"
                  placeholder="Describe detalladamente el problema que deben resolver los estudiantes..."
                  value={enunciadoProgramacion}
                  onChange={(e) => setEnunciadoProgramacion(e.target.value)}
                  disabled={isPublishing}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              
              <div className="mb-0">
                <label className="form-label d-flex align-items-center gap-2">
                  <i className="fas fa-code text-muted"></i>
                  Código Inicial (Opcional)
                </label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder={`Código inicial para ${lenguajeProgramacion}...`}
                  value={codigoInicial}
                  onChange={(e) => setCodigoInicial(e.target.value)}
                  disabled={isPublishing}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    backgroundColor: '#f8f9fa'
                  }}
                />
                <small className="form-text text-muted">
                  Código que aparecerá precargado en el editor del estudiante
                </small>
              </div>
            </div>
          </div>
        )}

        {/* Test Cases para exámenes de programación */}
        {tipoExamen === "programming" && (
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-vial me-2"></i>
                Test Cases (Evaluación Automática)
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="alert alert-info mb-3">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Define los casos de prueba que se ejecutarán automáticamente.</strong>
                <ul className="mb-0 mt-2">
                  <li>Los test cases NO son visibles para los estudiantes</li>
                  <li>El puntaje se calcula como: <strong>(tests pasados / total tests) × 100</strong></li>
                  <li>Ejemplo: 3 de 4 tests correctos = 75%</li>
                </ul>
              </div>

              {testCases.map((testCase, index) => (
                <div key={index} className="card mb-3" style={{ border: '1px solid var(--border-color)' }}>
                  <div className="card-header d-flex justify-content-between align-items-center" style={{ backgroundColor: '#f8f9fa' }}>
                    <strong>
                      <i className="fas fa-flask me-2"></i>
                      Test Case {index + 1}
                    </strong>
                    {testCases.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRemoveTestCase(index)}
                        disabled={isPublishing}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label">Descripción del Test</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: Suma de números positivos"
                        value={testCase.description}
                        onChange={(e) => handleTestCaseChange(index, 'description', e.target.value)}
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Input (una línea por entrada)</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="2&#10;3"
                          value={testCase.input}
                          onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                          disabled={isPublishing}
                          style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                        />
                        <small className="form-text text-muted">
                          Deja vacío si el código no requiere input. Cada línea será una entrada separada.
                        </small>
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Output Esperado</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="5"
                          value={testCase.expectedOutput}
                          onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                          disabled={isPublishing}
                          style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                        />
                        <small className="form-text text-muted">
                          Resultado exacto que debe producir el código
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={handleAddTestCase}
                disabled={isPublishing}
              >
                <i className="fas fa-plus me-2"></i>
                Agregar Test Case
              </button>

              <div className="alert alert-success mt-3 mb-0">
                <i className="fas fa-calculator me-2"></i>
                <strong>Total: {testCases.length} test case{testCases.length !== 1 ? 's' : ''}</strong>
                <br/>
                <small>
                  Cada test vale <strong>{testCases.length > 0 ? (100 / testCases.length).toFixed(1) : 0}%</strong> del puntaje final.
                  El puntaje se calcula automáticamente.
                </small>
              </div>
            </div>
          </div>
        )}

        {/* Solución de Referencia y Testing - Solo para exámenes de programación */}
        {tipoExamen === "programming" && testCases.length > 0 && (
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-check-double me-2"></i>
                Validación de Test Cases y Solución de Referencia
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="alert alert-info mb-3">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Prueba tu solución antes de publicar</strong>
                <ul className="mb-0 mt-2">
                  <li><strong>Ejecuta tests</strong> para verificar que funcionan correctamente</li>
                  <li><strong>Guarda tu solución</strong> como referencia o prueba sin guardar</li>
                  <li><strong>Múltiples archivos:</strong> Organiza tu código en varios archivos si lo necesitas</li>
                </ul>
              </div>

              {/* Solución de Referencia - Sistema Multi-archivo */}
              <div className="tab-pane-custom fade show active">
                <div style={{ 
                      border: '1px solid #dee2e6', 
                      borderRadius: '8px', 
                      overflow: 'hidden',
                      backgroundColor: '#1e1e1e'
                    }}>
                      {/* Toolbar superior: tabs y acciones */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 16px',
                        backgroundColor: '#2d2d30',
                        borderBottom: '1px solid #3e3e42',
                        color: '#cccccc',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        {/* Tabs de archivos */}
                        <div style={{ 
                          display: 'flex', 
                          gap: '4px', 
                          flexWrap: 'wrap',
                          flex: 1,
                          minWidth: 0
                        }}>
                          {referenceFiles.map((file) => (
                            <div
                              key={file.filename}
                              onClick={() => !isPublishing && setCurrentReferenceFile(file.filename)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                backgroundColor: currentReferenceFile === file.filename ? '#1e1e1e' : 'transparent',
                                borderRadius: '4px',
                                cursor: isPublishing ? 'not-allowed' : 'pointer',
                                opacity: isPublishing ? 0.6 : 1,
                                fontSize: '13px',
                                border: currentReferenceFile === file.filename ? '1px solid #3e3e42' : '1px solid transparent',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (!isPublishing && currentReferenceFile !== file.filename) {
                                  e.currentTarget.style.backgroundColor = '#3e3e42';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isPublishing && currentReferenceFile !== file.filename) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <i className="fas fa-file-code" style={{ 
                                color: currentReferenceFile === file.filename ? '#4ec9b0' : '#858585' 
                              }}></i>
                              <span>{file.filename}</span>
                              {referenceFiles.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReferenceFileToDelete(file.filename);
                                    setShowDeleteReferenceFileModal(true);
                                  }}
                                  disabled={isPublishing}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#858585',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    fontSize: '12px'
                                  }}
                                  title="Eliminar archivo"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => setShowNewReferenceFileModal(true)}
                            disabled={isPublishing}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              backgroundColor: 'transparent',
                              border: '1px solid #3e3e42',
                              borderRadius: '4px',
                              color: '#cccccc',
                              cursor: 'pointer',
                              fontSize: '13px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3e3e42'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Nuevo archivo"
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>

                        {/* Botón de ejecutar tests */}
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRunTestsReference();
                          }}
                          disabled={isRunningTests || isPublishing}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px'
                          }}
                        >
                          {isRunningTests ? (
                            <>
                              <div className="spinner-border spinner-border-sm" role="status"></div>
                              Ejecutando...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-play"></i>
                              Ejecutar Tests
                            </>
                          )}
                        </button>
                      </div>
                    
                      {/* Editor Monaco */}
                      <Editor
                        height="500px"
                        language={lenguajeProgramacion}
                        value={referenceFiles.find(f => f.filename === currentReferenceFile)?.content || ''}
                        onChange={(value) => handleReferenceFileContentChange(currentReferenceFile, value || '')}
                        theme="vs-dark"
                        options={{
                          selectOnLineNumbers: true,
                          roundedSelection: false,
                          readOnly: isPublishing,
                          cursorStyle: 'line',
                          automaticLayout: true,
                          scrollBeyondLastLine: false,
                          minimap: { enabled: true },
                          fontSize: 14,
                          lineNumbers: 'on',
                          wordWrap: 'on',
                          tabSize: lenguajeProgramacion === 'python' ? 4 : 2,
                          quickSuggestions: intellisenseHabilitado,
                          suggestOnTriggerCharacters: intellisenseHabilitado,
                          parameterHints: { enabled: intellisenseHabilitado },
                          suggest: {
                            showMethods: intellisenseHabilitado,
                            showFunctions: intellisenseHabilitado,
                            showConstructors: intellisenseHabilitado,
                            showFields: intellisenseHabilitado,
                            showVariables: intellisenseHabilitado,
                            showClasses: intellisenseHabilitado,
                            showKeywords: intellisenseHabilitado
                          }
                        }}
                      />
                    </div>
                    
                    {/* Opciones de radio para guardar solución de referencia */}
                    <div className="mt-3 p-3" style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '2px solid #dee2e6'
                    }}>
                      <div className="mb-2">
                        <strong style={{ fontSize: '0.95rem', color: '#495057' }}>
                          <i className="fas fa-save me-2"></i>
                          Solución de Referencia
                        </strong>
                      </div>
                      
                      {/* Opción 1: Guardar */}
                      <div 
                        className="form-check p-3 mb-2" 
                        style={{
                          backgroundColor: saveReferenceSolution ? '#d3f9d8' : 'white',
                          borderRadius: '6px',
                          border: `2px solid ${saveReferenceSolution ? '#2f9e44' : '#dee2e6'}`,
                          cursor: isPublishing ? 'not-allowed' : 'pointer',
                          opacity: isPublishing ? 0.6 : 1,
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => !isPublishing && setSaveReferenceSolution(true)}
                      >
                        <input
                          className="form-check-input"
                          type="radio"
                          name="saveReferenceSolution"
                          id="saveReferenceYes"
                          checked={saveReferenceSolution}
                          onChange={() => setSaveReferenceSolution(true)}
                          disabled={isPublishing}
                          style={{ cursor: isPublishing ? 'not-allowed' : 'pointer' }}
                        />
                        <label 
                          className="form-check-label ms-2" 
                          htmlFor="saveReferenceYes"
                          style={{ cursor: 'pointer', width: '100%' }}
                        >
                          <div className="d-flex align-items-start">
                            <div>
                              <strong style={{ 
                                color: saveReferenceSolution ? '#2f9e44' : '#495057'
                              }}>
                                <i className="fas fa-check-circle me-2"></i>
                                Guardar esta solución
                              </strong>
                              <div style={{ 
                                fontSize: '0.875rem',
                                color: saveReferenceSolution ? '#2b8a3e' : '#6c757d',
                                marginTop: '0.25rem'
                              }}>
                                Se guardará como solución de referencia
                              </div>
                            </div>
                          </div>
                        </label>
                      </div>
                      
                      {/* Opción 2: No guardar */}
                      <div 
                        className="form-check p-3" 
                        style={{
                          backgroundColor: !saveReferenceSolution ? '#ffe0e0' : 'white',
                          borderRadius: '6px',
                          border: `2px solid ${!saveReferenceSolution ? '#c92a2a' : '#dee2e6'}`,
                          cursor: isPublishing ? 'not-allowed' : 'pointer',
                          opacity: isPublishing ? 0.6 : 1,
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => !isPublishing && setSaveReferenceSolution(false)}
                      >
                        <input
                          className="form-check-input"
                          type="radio"
                          name="saveReferenceSolution"
                          id="saveReferenceNo"
                          checked={!saveReferenceSolution}
                          onChange={() => setSaveReferenceSolution(false)}
                          disabled={isPublishing}
                          style={{ cursor: isPublishing ? 'not-allowed' : 'pointer' }}
                        />
                        <label 
                          className="form-check-label ms-2" 
                          htmlFor="saveReferenceNo"
                          style={{ cursor: 'pointer', width: '100%' }}
                        >
                          <div className="d-flex align-items-start">
                            <div>
                              <strong style={{ 
                                color: !saveReferenceSolution ? '#c92a2a' : '#495057'
                              }}>
                                <i className="fas fa-times-circle me-2"></i>
                                No guardar esta solución
                              </strong>
                              <div style={{ 
                                fontSize: '0.875rem',
                                color: !saveReferenceSolution ? '#a61e4d' : '#6c757d',
                                marginTop: '0.25rem'
                              }}>
                                Solo para probar el código sin guardarlo como referencia
                              </div>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

              {/* Panel de Resultados de Tests */}
              {showTestPanel && testResults && (
                <div className="mt-4">
                  <h5 className="mb-3">
                    <i className="fas fa-chart-bar me-2"></i>
                    Resultados de la Ejecución
                  </h5>
                  
                  <div className={`alert ${testResults.score === 100 ? 'alert-success' : testResults.score >= 50 ? 'alert-warning' : 'alert-danger'}`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>Puntaje: {testResults.score.toFixed(1)}%</strong>
                        <br />
                        <small>
                          {testResults.passedTests} de {testResults.totalTests} tests pasados
                        </small>
                      </div>
                      <div>
                        {testResults.score === 100 ? (
                          <i className="fas fa-check-circle fa-2x text-success"></i>
                        ) : (
                          <i className="fas fa-exclamation-triangle fa-2x text-warning"></i>
                        )}
                      </div>
                    </div>
                  </div>

                  {testResults.testResults.map((result, index) => (
                    <div key={index} className="card mb-2" style={{ border: `2px solid ${result.passed ? '#28a745' : '#dc3545'}` }}>
                      <div className="card-header d-flex justify-content-between align-items-center" 
                           style={{ backgroundColor: result.passed ? '#d4edda' : '#f8d7da' }}>
                        <strong>
                          {result.passed ? (
                            <i className="fas fa-check-circle text-success me-2"></i>
                          ) : (
                            <i className="fas fa-times-circle text-danger me-2"></i>
                          )}
                          Test {index + 1}: {result.description || `Test Case ${index + 1}`}
                        </strong>
                        <span className="badge" style={{ 
                          backgroundColor: result.passed ? '#28a745' : '#dc3545',
                          color: 'white'
                        }}>
                          {result.passed ? 'PASÓ' : 'FALLÓ'}
                        </span>
                      </div>
                      <div className="card-body">
                        {result.input && (
                          <div className="mb-2">
                            <strong>Input:</strong>
                            <pre className="mb-0 p-2" style={{ 
                              backgroundColor: '#f8f9fa', 
                              borderRadius: '4px',
                              fontSize: '0.85rem'
                            }}>{result.input}</pre>
                          </div>
                        )}
                        <div className="row">
                          <div className="col-md-6 mb-2">
                            <strong>Output Esperado:</strong>
                            <pre className="mb-0 p-2" style={{ 
                              backgroundColor: '#e7f5e7', 
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              border: '1px solid #c3e6c3'
                            }}>{result.expectedOutput}</pre>
                          </div>
                          <div className="col-md-6 mb-2">
                            <strong>Output Obtenido:</strong>
                            <pre className="mb-0 p-2" style={{ 
                              backgroundColor: result.passed ? '#e7f5e7' : '#f8d7da', 
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              border: `1px solid ${result.passed ? '#c3e6c3' : '#f5c6cb'}`
                            }}>{result.actualOutput || '(sin output)'}</pre>
                          </div>
                        </div>
                        {result.error && (
                          <div className="mt-2">
                            <strong className="text-danger">Error:</strong>
                            <pre className="mb-0 p-2 text-danger" style={{ 
                              backgroundColor: '#fff3cd', 
                              borderRadius: '4px',
                              fontSize: '0.85rem'
                            }}>{result.error}</pre>
                          </div>
                        )}
                        <small className="text-muted d-block mt-2">
                          Tiempo de ejecución: {result.executionTime}ms
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agregar pregunta - Solo para múltiple choice */}
        {tipoExamen === "multiple_choice" && (
          <>
            <div className="modern-card mb-4">
              <div className="modern-card-header">
                <h3 className="modern-card-title">
                  <i className="fas fa-question-circle me-2"></i>
                  Agregar Preguntas al Examen
                </h3>
              </div>
              <div className="modern-card-body">
                <div className="alert alert-info mb-3">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Tienes dos opciones:</strong> crear una pregunta nueva desde cero o seleccionar preguntas guardadas en tu banco de preguntas.
                </div>
                <div className="d-flex gap-3 justify-content-center flex-wrap">
                  <button
                    className="modern-btn modern-btn-primary"
                    onClick={() => setShowBankSelector(true)}
                    style={{ minWidth: '250px' }}
                  >
                    <i className="fas fa-database me-2"></i>
                    <span className="button-text">Seleccionar del Banco</span>
                  </button>
                  <div className="text-muted d-flex align-items-center">
                    <strong>o</strong>
                  </div>
                  <button
                    className="modern-btn modern-btn-secondary"
                    onClick={() => {
                      const creator = document.getElementById('question-creator-section');
                      if (creator) creator.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{ minWidth: '250px' }}
                  >
                    <i className="fas fa-plus-circle me-2"></i>
                    <span className="button-text">Crear Pregunta Nueva</span>
                  </button>
                </div>
              </div>
            </div>

            <div id="question-creator-section">
              <QuestionCreator onAddQuestion={handleAddQuestion} />
            </div>
          </>
        )}

      {/* Lista de preguntas - Solo para múltiple choice */}
      {tipoExamen === "multiple_choice" && (
        <div className="modern-card">
          <div className="modern-card-header">
            <h3 className="modern-card-title">
              <i className="fas fa-clipboard-list me-2"></i>
              Preguntas Agregadas ({preguntas.length})
            </h3>
          </div>
        <div className="modern-card-body">
          {preguntas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-question-circle"></i>
              </div>
              <h4 className="empty-title">No hay preguntas aún</h4>
              <p className="empty-subtitle">
                Agrega tu primera pregunta usando el formulario de arriba
              </p>
            </div>
          ) : (
            <div className="exam-creator-questions-grid">
              {preguntas.map((p, idx) => (
                <div key={idx} className="exam-creator-question-card">
                  <div className="exam-card">
                    <div className="exam-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div className="d-flex align-items-center gap-2">
                        <h5 className="exam-title mb-0">
                          <span className="question-number">Pregunta {idx + 1}</span>
                        </h5>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: p.tipo === 'true_false' ? '#28a745' : p.tipo === 'fill_in_blank' ? '#ffc107' : p.tipo === 'matching' ? '#9c27b0' : '#007bff',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.7rem',
                            borderRadius: '4px'
                          }}
                        >
                          <i className={`fas ${p.tipo === 'true_false' ? 'fa-check-double' : p.tipo === 'fill_in_blank' ? 'fa-fill-drip' : p.tipo === 'matching' ? 'fa-arrows-alt-h' : 'fa-list-ul'} me-1`}></i>
                          {p.tipo === 'true_false' ? 'V/F' : p.tipo === 'fill_in_blank' ? 'Completar' : p.tipo === 'matching' ? 'Unir' : 'Múltiple'}
                        </span>
                        <span className="exam-badge">
                          <i className="fas fa-check-circle"></i>
                          <span className="badge-text">Lista</span>
                        </span>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRemoveQuestion(idx)}
                        disabled={isPublishing}
                        title="Eliminar pregunta"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                    <div className="exam-card-body">
                      <div className="question-text mb-3">
                        <strong>{p.texto}</strong>
                      </div>
                      <div className="exam-info">
                        {p.tipo === 'matching' ? (
                          p.opciones.slice(0, p.correcta).map((concepto, i) => {
                            const respuesta = p.opciones[p.correcta + i];
                            return (
                              <div key={i} className="exam-info-item d-flex align-items-center gap-2 mb-2">
                                <span className="badge bg-primary" style={{ fontSize: '0.7rem', minWidth: '25px' }}>
                                  {i + 1}
                                </span>
                                <span style={{ fontSize: '0.85rem' }}>{concepto}</span>
                                <i className="fas fa-arrow-right text-primary" style={{ fontSize: '0.7rem' }}></i>
                                <span className="badge bg-success" style={{ fontSize: '0.7rem', minWidth: '25px' }}>
                                  {String.fromCharCode(65 + i)}
                                </span>
                                <span style={{ fontSize: '0.85rem' }}>{respuesta}</span>
                              </div>
                            );
                          })
                        ) : p.tipo === 'fill_in_blank' ? (
                          <>
                            <div className="mb-2">
                              <small className="text-success fw-bold"><i className="fas fa-check-circle me-1"></i>Respuestas correctas (en orden):</small>
                            </div>
                            {p.opciones.slice(0, p.correcta).map((o, i) => (
                              <div key={i} className="exam-info-item">
                                <span className="badge bg-success me-2" style={{ fontSize: '0.7rem' }}>{i + 1}</span>
                                <span className="fw-bold text-success">{o}</span>
                              </div>
                            ))}
                            {p.opciones.length > p.correcta && (
                              <>
                                <div className="mt-2 mb-2">
                                  <small className="text-danger fw-bold"><i className="fas fa-times-circle me-1"></i>Distractores:</small>
                                </div>
                                {p.opciones.slice(p.correcta).map((o, i) => (
                                  <div key={i} className="exam-info-item">
                                    <i className="fas fa-times text-danger"></i>
                                    <span>{o}</span>
                                  </div>
                                ))}
                              </>
                            )}
                          </>
                        ) : (
                          p.opciones.map((o, i) => (
                            <div key={i} className="exam-info-item">
                              <i className={i === p.correcta ? "fas fa-check-circle text-success" : "fas fa-circle text-muted"}></i>
                              <span className={i === p.correcta ? "fw-bold text-success" : ""}>{o}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Botón de publicar examen - al final */}
      <div className="modern-card mt-5">
        <div className="modern-card-body">
          <div className="text-center">
            <button 
              className="modern-btn modern-btn-primary"
              onClick={handlePublicarExamen}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                  <span className="button-text">Publicando...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-2"></i>
                  <span className="button-text">Publicar Examen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Component */}
      <Modal
        show={modal.show}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        showCancel={modal.showCancel}
        confirmText={(modal.type === 'warning') ? 'Confirmar' : 'Entendido'}
        cancelText="Cancelar"
      />

      {/* Question Bank Selector Modal */}
      <QuestionBankSelector
        show={showBankSelector}
        onClose={() => setShowBankSelector(false)}
        onSelectQuestions={handleAddQuestionsFromBank}
      />

      {/* Modal para agregar archivo de referencia */}
      {showNewReferenceFileModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-file-plus me-2"></i>
                  Nuevo Archivo de Referencia
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowNewReferenceFileModal(false);
                    setNewReferenceFileName('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Nombre del archivo:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={`Ej: utils${lenguajeProgramacion === 'python' ? '.py' : '.js'}`}
                  value={newReferenceFileName}
                  onChange={(e) => setNewReferenceFileName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddReferenceFile();
                    }
                  }}
                  autoFocus
                />
                <small className="text-muted mt-2 d-block">
                  Se agregará automáticamente la extensión .{lenguajeProgramacion === 'python' ? 'py' : 'js'} si no la incluyes
                </small>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowNewReferenceFileModal(false);
                    setNewReferenceFileName('');
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleAddReferenceFile}
                >
                  <i className="fas fa-plus me-2"></i>
                  Crear Archivo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para eliminar archivo de referencia */}
      {showDeleteReferenceFileModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
                  Confirmar Eliminación
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowDeleteReferenceFileModal(false);
                    setReferenceFileToDelete('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro de que deseas eliminar el archivo <strong>{referenceFileToDelete}</strong>?</p>
                <p className="text-muted mb-0">Esta acción no se puede deshacer.</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDeleteReferenceFileModal(false);
                    setReferenceFileToDelete('');
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleDeleteReferenceFile}
                >
                  <i className="fas fa-trash me-2"></i>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamCreator;
