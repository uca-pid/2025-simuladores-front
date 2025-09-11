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

   
    const handleAbrirExamen = () => {
      
        localStorage.setItem('examData', JSON.stringify(preguntas));
     
        window.open('/exam', '_blank');
       
        descargarSEB();
    };

function descargarSEB() {
  const sebPlist = `<?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
   "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
    <dict>
      <key>startUrl</key>
      <string>http://localhost:3000/exam</string>

      <!-- Contraseña para salir de SEB -->
      <key>quitPassword</key>
      <string>1234</string>

      <!-- Contraseña para proteger configuración -->
      <key>settingsPassword</key>
      <string>1234</string>

      <!-- Opciones básicas -->
      <key>browserWindowAllowReload</key>
      <true/>
      <key>allowQuit</key>
      <true/>
      <key>showReloadButton</key>
      <false/>
      <key>showURL</key>
      <false/>
      <key>fullScreen</key>
      <true/>
      <key>kioskMode</key>
      <true/>
    </dict>
  </plist>`;

  const blob = new Blob([sebPlist], { type: "application/xml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "examen.seb";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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

            <button onClick={handleAbrirExamen} style={{ marginTop: '10px', marginLeft: '10px' }} disabled={preguntas.length === 0}>
                Finalizar Exameen
            </button>

            <hr />

            <h2>Examen Creado:</h2>
            {preguntas.map((p, idx) => (
                <div key={idx} style={{ marginBottom: '156px' }}>
                    <strong>{idx + 1}. {p.texto}</strong>
                    <div>
                        {p.opciones.map((op, i) => (
                            <div key={i}>
                                <input 
                                    type="radio" 
                                    name={`pregunta-${idx}`} 
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
