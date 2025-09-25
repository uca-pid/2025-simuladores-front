import { useState, useEffect } from 'react';
import BackToMainButton from '../components/BackToMainButton';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function StudentInscriptionsPage() {
  const [availableWindows, setAvailableWindows] = useState([]);
  const [myInscriptions, setMyInscriptions] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [filters, setFilters] = useState({ materia: '', profesor: '', fecha: '' });

  // Datos simulados
  const mockWindows = [
    {
      id: 1,
      exam: { titulo: 'Matemática 1', profesor: { nombre: 'Prof. Pérez' } },
      fechaInicio: new Date(Date.now() + 3600 * 1000).toISOString(),
      duracion: 120,
      modalidad: 'remoto',
      cupoMaximo: 30,
      cupoDisponible: 5,
      notas: 'Traer calculadora',
      yaInscrito: false
    },
    {
      id: 2,
      exam: { titulo: 'Física 2', profesor: { nombre: 'Prof. Gómez' } },
      fechaInicio: new Date(Date.now() + 7200 * 1000).toISOString(),
      duracion: 90,
      modalidad: 'presencial',
      cupoMaximo: 25,
      cupoDisponible: 0,
      notas: '',
      yaInscrito: true
    }
  ];

  useEffect(() => {
    // Carga inicial de datos mock
    setAvailableWindows(mockWindows);
    setMyInscriptions(mockWindows.filter(w => w.yaInscrito).map(w => ({
      id: w.id,
      examWindow: w,
      inscribedAt: new Date().toISOString(),
      presente: true
    })));
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    let filtered = mockWindows.filter(w => 
      (!filters.materia || w.exam.titulo.toLowerCase().includes(filters.materia.toLowerCase())) &&
      (!filters.profesor || w.exam.profesor.nombre.toLowerCase().includes(filters.profesor.toLowerCase()))
    );
    setAvailableWindows(filtered);
  };

  const clearFilters = () => {
    setFilters({ materia: '', profesor: '', fecha: '' });
    setAvailableWindows(mockWindows);
  };

  const handleInscription = (window) => {
    setAvailableWindows(prev => prev.map(w => w.id === window.id ? { ...w, yaInscrito: true, cupoDisponible: w.cupoDisponible - 1 } : w));
    setMyInscriptions(prev => [...prev, { id: window.id, examWindow: { ...window, yaInscrito: true }, inscribedAt: new Date().toISOString(), presente: true }]);
  };

  const handleCancelInscription = (inscription) => {
    setAvailableWindows(prev => prev.map(w => w.id === inscription.examWindow.id ? { ...w, yaInscrito: false, cupoDisponible: w.cupoDisponible + 1 } : w));
    setMyInscriptions(prev => prev.filter(i => i.id !== inscription.id));
  };

  const getTimeStatus = (fechaInicio, duracion) => {
    const now = new Date();
    const start = new Date(fechaInicio);
    const end = new Date(start.getTime() + duracion * 60 * 1000);
    if (now < start) return { text: 'Próximo', class: 'text-primary' };
    if (now <= end) return { text: 'En curso', class: 'text-success' };
    return { text: 'Finalizado', class: 'text-secondary' };
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">Inscripciones a Exámenes</h1>
        <BackToMainButton />
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'available' ? 'active' : ''}`} onClick={() => setActiveTab('available')}>
            Exámenes Disponibles ({availableWindows.length})
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'myInscriptions' ? 'active' : ''}`} onClick={() => setActiveTab('myInscriptions')}>
            Mis Inscripciones ({myInscriptions.length})
          </button>
        </li>
      </ul>

      {activeTab === 'available' && (
        <div>
          {/* Filtros */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <input type="text" className="form-control" placeholder="Buscar por materia" name="materia" value={filters.materia} onChange={handleFilterChange} />
                </div>
                <div className="col-md-3">
                  <input type="text" className="form-control" placeholder="Buscar por profesor" name="profesor" value={filters.profesor} onChange={handleFilterChange} />
                </div>
                <div className="col-md-3 d-flex align-items-end gap-2">
                  <button className="btn btn-primary" onClick={applyFilters}>Filtrar</button>
                  <button className="btn btn-outline-secondary" onClick={clearFilters}>Limpiar</button>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de exámenes */}
          <div className="row">
            {availableWindows.map(window => {
              const timeStatus = getTimeStatus(window.fechaInicio, window.duracion);
              return (
                <div key={window.id} className="col-md-6 col-lg-4 mb-3">
                  <div className="card h-100">
                    <div className="card-header">
                      <h6>{window.exam.titulo}</h6>
                      <small className="text-muted">Prof. {window.exam.profesor.nombre}</small>
                    </div>
                    <div className="card-body">
                      <p><strong>Fecha:</strong> {new Date(window.fechaInicio).toLocaleDateString()}</p>
                      <p><strong>Hora:</strong> {new Date(window.fechaInicio).toLocaleTimeString()}</p>
                      <p><strong>Duración:</strong> {window.duracion} min</p>
                      <p><strong>Modalidad:</strong> {window.modalidad}</p>
                      <p><strong>Cupos:</strong> {window.cupoDisponible}/{window.cupoMaximo}</p>
                      <p className={timeStatus.class}><strong>{timeStatus.text}</strong></p>
                      {window.notas && <div className="alert alert-light"><small><strong>Notas:</strong> {window.notas}</small></div>}
                    </div>
                    <div className="card-footer">
                      {window.yaInscrito ? (
                        <button className="btn btn-success" disabled>Ya inscrito ✓</button>
                      ) : window.cupoDisponible === 0 ? (
                        <button className="btn btn-secondary" disabled>Sin cupo</button>
                      ) : (
                        <button className="btn btn-primary" onClick={() => handleInscription(window)}>Inscribirse</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'myInscriptions' && (
        <div className="row">
          {myInscriptions.map(inscription => {
            const window = inscription.examWindow;
            const timeStatus = getTimeStatus(window.fechaInicio, window.duracion);
            return (
              <div key={inscription.id} className="col-md-6 col-lg-4 mb-3">
                <div className="card h-100">
                  <div className="card-header">
                    <h6>{window.exam.titulo}</h6>
                    <small className="text-muted">Prof. {window.exam.profesor.nombre}</small>
                  </div>
                  <div className="card-body">
                    <p><strong>Fecha:</strong> {new Date(window.fechaInicio).toLocaleDateString()}</p>
                    <p><strong>Hora:</strong> {new Date(window.fechaInicio).toLocaleTimeString()}</p>
                    <p><strong>Duración:</strong> {window.duracion} min</p>
                    <p className={timeStatus.class}><strong>{timeStatus.text}</strong></p>
                    <p><strong>Inscrito:</strong> {new Date(inscription.inscribedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="card-footer">
                    <button className="btn btn-outline-danger flex-fill" onClick={() => handleCancelInscription(inscription)}>Cancelar Inscripción</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
