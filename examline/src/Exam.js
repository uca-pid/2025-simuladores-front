import React, { useEffect, useState } from 'react';

function Exam() {
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({}); // {pregIdx: opcionIdx}

  useEffect(() => {
    const data = localStorage.getItem('examData');
    if (data) setPreguntas(JSON.parse(data));
  }, []);

  const handleChange = (pregIdx, opcionIdx) => {
    setRespuestas({...respuestas, [pregIdx]: opcionIdx});
  };

  const handleSubmit = () => {
    let correctas = 0;
    preguntas.forEach((p, i) => {
      if (respuestas[i] === p.correcta) correctas++;
    });
    alert(`Terminaste el examen. Correctas: ${correctas} de ${preguntas.length}`);
  };

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
                <label key={i} style={{ display: 'block' }}>
                  <input
                    type="radio"
                    name={`pregunta-${idx}`}
                    checked={respuestas[idx] === i}
                    onChange={() => handleChange(idx, i)}
                  /> {op}
                </label>
              ))}
            </div>
          </div>
        ))
      )}
      {preguntas.length > 0 && <button onClick={handleSubmit}>Enviar</button>}
    </div>
  );
}

export default Exam;
