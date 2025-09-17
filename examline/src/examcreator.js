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
       
        descargarSEB('12345');
    };

async function descargarSEB(contra) {
  // Genera SHA-256 en hexadecimal
  async function hashSHA256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  const hashedQuitPassword = await hashSHA256(contra);
  const hashedSettingsPassword = await hashSHA256(contra); // igual que quit, o otra contraseña

  const sebPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>startURL</key>
    <string>http://localhost:3000/exam</string>
    <key>hashedQuitPassword</key>
    <string>${hashedQuitPassword}</string>
    <key>hashedAdminPassword</key>
    <string>${hashedSettingsPassword}</string>
    <key>allowQuit</key>
    <true/>
    <key>fullScreen</key>
    <true/>
    <key>kioskMode</key>
    <true/>
    <key>urlFilterEnable</key>
    <true/>
    <key>urlFilterRules</key>
    <array>
      <dict>
        <key>action</key>
        <string>allow</string>
        <key>url</key>
        <string>http://localhost:3000/*</string>
      </dict>
      <dict>
        <key>action</key>
        <string>allow</string>
        <key>url</key>
        <string>http://127.0.0.1:3000/*</string>
      </dict>
    </array>
  </dict>
</plist>
`;

  const blob = new Blob([sebPlist], { type: "application/xml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "examen_local.seb";
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
