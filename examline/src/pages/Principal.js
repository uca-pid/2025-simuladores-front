import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Principal = () => {
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();
  const userId = Number(localStorage.getItem("userId"));

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch(`http://localhost:4000/exams?profesorId=${userId}`);
        const data = await res.json();
        setExams(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchExams();
  }, [userId]);

  const handleCrearExamen = () => navigate("/exam-creator");
  const handleUserSettings = () => navigate("/user-settings");
  const handleVerExamen = (examId) => navigate(`/examen/${examId}`);
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">Bienvenido, {localStorage.getItem("name")}</h1>
        <div>
          <button className="btn btn-success me-2" onClick={handleCrearExamen}>
            Crear Examen
          </button>
          <button className="btn btn-success me-2" onClick={handleUserSettings}>
            Configuración
          </button>
          <button className="btn btn-outline-danger" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </div>

      <h2 className="mb-3">Exámenes creados</h2>
      {exams.length === 0 ? (
        <p className="text-muted">No hay exámenes creados.</p>
      ) : (
        <div className="row g-3">
          {exams.map(exam => (
            <div key={exam.id} className="col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{exam.titulo}</h5>
                  <p className="card-text">Preguntas: {exam.preguntas.length}</p>
                  <button
                    className="btn btn-primary mt-auto"
                    onClick={() => handleVerExamen(exam.id)}
                  >
                    Ver preguntas
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Principal;

