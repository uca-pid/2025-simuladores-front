import React, { useEffect, useState } from 'react';

function Exam() {
  const [preguntas, setPreguntas] = useState([]);

  useEffect(() => {
    const data = localStorage.getItem('examData');
    if (data) {
      setPreguntas(JSON.parse(data));
    }
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Examen</h1>
      {preguntas.length === 0 ? (
        <p>No hay preguntas para este examen.</p>
      ) : (
        preguntas.map((p, idx) => (
          <div key={idx} style={{ marginBottom: '15px' }}>
            <strong>{idx + 1}. {p.texto}</strong>
            <div>
              {p.opciones.map((op, i) => (
                <div key={i}>
                  <input type="radio" name={`pregunta-${idx}`} /> {op}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Exam;
