import { useState } from 'react';
import BackToMainButton from '../components/BackToMainButton';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function ExamWindowsPage() {
  // Datos de ejemplo
  const exams = [
    { id: 1, titulo: 'Matemática 1' },
    { id: 2, titulo: 'Física 2' }
  ];

  // Estado de ventanas, para poder agregar nuevas visualmente
  const [examWindows, setExamWindows] = useState([
    {
      id: 1,
      exam: exams[0],
      fechaInicio: new Date().toISOString(),
      duracion: 120,
      modalidad: 'remoto',
      cupoMaximo: 30,
      inscripciones: [1, 2],
      activa: true,
      notas: 'Traer calculadora',
      estado: 'programada'
    },
    {
      id: 2,
      exam: exams[1],
      fechaInicio: new Date().toISOString(),
      duracion: 90,
      modalidad: 'presencial',
      cupoMaximo: 25,
      inscripciones: [],
      activa: false,
      notas: '',
      estado: 'cerrada_inscripciones'
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    examId: exams[0].id,
    fechaInicio: '',
    duracion: 120,
    modalidad: 'remoto',
    cupoMaximo: 30,
    notas: ''
  });

  const getStatusBadge = (estado) => {
    const badges = {
      programada: 'bg-primary',
      cerrada_inscripciones: 'bg-warning',
      en_curso: 'bg-success',
      finalizada: 'bg-secondary'
    };
    
    const labels = {
      programada: 'Programada',
      cerrada_inscripciones: 'Cerrada',
      en_curso: 'En Curso',
      finalizada: 'Finalizada'
    };

    return (
      <span className={`badge ${badges[estado] || 'bg-secondary'}`}>
        {labels[estado] || estado}
      </span>
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateWindow = () => {
    // Crear un id temporal para la ventana visual
    const newWindow = {
      id: examWindows.length + 1,
      exam: exams.find(e => e.id === parseInt(formData.examId)),
      fechaInicio: formData.fechaInicio || new Date().toISOString(),
      duracion: parseInt(formData.duracion),
      modalidad: formData.modalidad,
      cupoMaximo: parseInt(formData.cupoMaximo),
      inscripciones: [],
      activa: false,
      notas: formData.notas,
      estado: 'programada'
    };

    // Agregar visualmente
    setExamWindows(prev => [...prev, newWindow]);
    setShowCreateModal(false);
    // Reset form
    setFormData({
      examId: exams[0].id,
      fechaInicio: '',
      duracion: 120,
      modalidad: 'remoto',
      cupoMaximo: 30,
      notas: ''
    });
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">Ventanas de Examen</h1>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-success" 
            onClick={() => setShowCreateModal(true)}
          >
            + Nueva Ventana
          </button>
          <BackToMainButton />
        </div>
      </div>

      {examWindows.length === 0 ? (
        <div className="alert alert-secondary">
          No hay ventanas programadas. Crea tu primera ventana de examen.
        </div>
      ) : (
        <div className="row">
          {examWindows.map(window => (
            <div key={window.id} className="col-md-6 col-lg-4 mb-3">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">{window.exam.titulo}</h6>
                  {getStatusBadge(window.estado)}
                </div>
                <div className="card-body">
                  <p><strong>Fecha:</strong> {new Date(window.fechaInicio).toLocaleDateString()}</p>
                  <p><strong>Hora:</strong> {new Date(window.fechaInicio).toLocaleTimeString()}</p>
                  <p><strong>Duración:</strong> {window.duracion} minutos</p>
                  <p><strong>Modalidad:</strong> {window.modalidad}</p>
                  <p><strong>Cupo:</strong> {window.inscripciones.length}/{window.cupoMaximo}</p>
                  {window.notas && <p><strong>Notas:</strong> {window.notas}</p>}
                  
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={window.activa}
                      readOnly
                    />
                    <label className="form-check-label">
                      Ventana activa
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal visual */}
      {showCreateModal && (
        <div className="modal show" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Nueva Ventana de Examen</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Examen *</label>
                  <select 
                    className="form-select" 
                    name="examId"
                    value={formData.examId}
                    onChange={handleInputChange}
                  >
                    {exams.map(exam => (
                      <option key={exam.id} value={exam.id}>{exam.titulo}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Fecha y Hora de Inicio *</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    name="fechaInicio"
                    value={formData.fechaInicio}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Duración (minutos) *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      name="duracion"
                      value={formData.duracion}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Cupo Máximo *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      name="cupoMaximo"
                      value={formData.cupoMaximo}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Modalidad *</label>
                  <select 
                    className="form-select"
                    name="modalidad"
                    value={formData.modalidad}
                    onChange={handleInputChange}
                  >
                    <option value="remoto">Remoto</option>
                    <option value="presencial">Presencial</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Notas/Instrucciones</label>
                  <textarea 
                    className="form-control" 
                    rows="3"
                    name="notas"
                    value={formData.notas}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleCreateWindow}>
                  Crear Ventana
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

