import { useState } from 'react';
import { useParams } from 'react-router-dom';
import BackToMainButton from '../components/BackToMainButton';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function WindowInscriptionsPage() {
  const { windowId } = useParams();

  // Datos de ejemplo
  const examWindow = {
    id: windowId,
    exam: { titulo: 'Matemática 1' },
    fechaInicio: new Date().toISOString(),
    duracion: 120,
    modalidad: 'remoto',
    cupoMaximo: 30,
    activa: true,
    notas: 'Traer calculadora'
  };

  const inscriptions = [
    { id: 1, user: { nombre: 'Juan Pérez', email: 'juan@example.com' }, inscribedAt: new Date().toISOString(), presente: true },
    { id: 2, user: { nombre: 'María López', email: 'maria@example.com' }, inscribedAt: new Date().toISOString(), presente: false },
    { id: 3, user: { nombre: 'Carlos Gómez', email: 'carlos@example.com' }, inscribedAt: new Date().toISOString(), presente: null }
  ];

  const status = { text: 'Programada', class: 'bg-primary' };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">Inscripciones - {examWindow.exam.titulo}</h1>
        <BackToMainButton />
      </div>

      {/* Información de la ventana */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Información de la Ventana</h5>
          <span className={`badge ${status.class}`}>{status.text}</span>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p><strong>Fecha:</strong> {new Date(examWindow.fechaInicio).toLocaleDateString()}</p>
              <p><strong>Hora:</strong> {new Date(examWindow.fechaInicio).toLocaleTimeString()}</p>
              <p><strong>Duración:</strong> {examWindow.duracion} minutos</p>
            </div>
            <div className="col-md-6">
              <p><strong>Modalidad:</strong> {examWindow.modalidad}</p>
              <p><strong>Cupo:</strong> {inscriptions.length}/{examWindow.cupoMaximo}</p>
              <p><strong>Activa:</strong> {examWindow.activa ? 'Sí' : 'No'}</p>
            </div>
          </div>
          {examWindow.notas && (
            <div className="alert alert-info mt-2">
              <strong>Notas:</strong> {examWindow.notas}
            </div>
          )}
        </div>
      </div>

      {/* Lista de inscripciones */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            Estudiantes Inscriptos ({inscriptions.length})
          </h5>
        </div>
        <div className="card-body">
          {inscriptions.length === 0 ? (
            <div className="alert alert-info">
              No hay estudiantes inscriptos en esta ventana.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Email</th>
                    <th>Fecha Inscripción</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {inscriptions.map(inscription => (
                    <tr key={inscription.id}>
                      <td>{inscription.user.nombre}</td>
                      <td>{inscription.user.email}</td>
                      <td>{new Date(inscription.inscribedAt).toLocaleDateString()}</td>
                      <td>
                        {inscription.presente === true ? (
                          <span className="badge bg-success">Presente</span>
                        ) : (
                          <span className="badge bg-danger">Ausente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

