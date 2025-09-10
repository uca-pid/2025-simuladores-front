import React, { useState } from 'react';

function ExamCreator() {
    const [preguntas, setPreguntas] = useState([]);
    const [textoPregunta, setTextoPregunta] = useState("");
    const [opciones, setOpciones] = useState(["", "", "", ""]);
    const [correcta, setCorrecta] = useState(0);

    const handleAgregarPregunta = () => {
        setPreguntas([
            ...preguntas,
            { texto: textoPregunta, opciones: [...opciones], correcta }
        ]);
        setTextoPregunta("");
        setOpciones(["", "", "", ""]);
        setCorrecta(0);
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Crear Examen</h1>

            <div>
                <h3>Pregunta:</h3>
                <input 
                    type="text" 
                    value={textoPregunta} 
                    onChange={e => setTextoPregunta(e.target.value)} 
                    placeholder="Escribe la pregunta" 
                />
            </div>

            <div>
                <h3>Opciones:</h3>
                {opciones.map((op, i) => (
                    <input
                        key={i}
                        type="text"
                        value={op}
                        onChange={e => {
                            const nuevasOpciones = [...opciones];
                            nuevasOpciones[i] = e.target.value;
                            setOpciones(nuevasOpciones);
                        }}
                        placeholder={`Opción ${i + 1}`}
                        style={{ display: 'block', margin: '5px 0' }}
                    />
                ))}
            </div>

            <div>
                <h3>Opción correcta:</h3>
                <select value={correcta} onChange={e => setCorrecta(Number(e.target.value))}>
                    {opciones.map((_, i) => (
                        <option key={i} value={i}>Opción {i + 1}</option>
                    ))}
                </select>
            </div>

            <button onClick={handleAgregarPregunta} style={{ marginTop: '10px' }}>
                Agregar Pregunta
            </button>

            <hr />

            <h2>Examen Creado:</h2>
            {preguntas.map((p, idx) => (
                <div key={idx} style={{ marginBottom: '15px' }}>
                    <strong>{idx + 1}. {p.texto}</strong>
                    <div>
                        {p.opciones.map((op, i) => (
                            <div key={i}>
                                <input 
                                    type="radio" 
                                    name={`pregunta-${idx}`} 
                                    enabled
                                /> {op}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ExamCreator;
