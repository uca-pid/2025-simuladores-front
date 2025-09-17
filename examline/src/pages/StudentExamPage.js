import React, { useState } from "react";
import ExamView from "./ExamView";
import UserHeader from "../components/UserHeader";

const StudentExamPage = () => {
  const [examId, setExamId] = useState("");
  const [submittedId, setSubmittedId] = useState(null);

  // Función para generar y descargar archivo SEB apuntando ald examen
  async function descargarSEB(contra, id) {
    async function hashSHA256(text) {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }

    const hashedQuitPassword = await hashSHA256(contra);
    const hashedSettingsPassword = await hashSHA256(contra);

    const sebPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>startURL</key>
    <string>http://localhost:3000/examen/${id}</string>
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
        <string>http://localhost:3000/exams/${id}</string>
      </dict>
      <dict>
        <key>action</key>
        <string>allow</string>
        <key>url</key>
        <string>http://127.0.0.1:3000/exams/${id}</string>
      </dict>
    </array>
  </dict>
</plist>
`;

    const blob = new Blob([sebPlist], { type: "application/xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `examen_${id}.seb`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (examId.trim()) {
      setSubmittedId(examId.trim());
      await descargarSEB("12345", examId.trim()); // Genera SEB automáticamente
    }
  };

  return (
    <div className="container py-5">
      <UserHeader />
      {!submittedId ? (
        <>
          <h2 className="mb-4 text-primary">Ingresar examen</h2>
          <form onSubmit={handleSubmit} className="d-flex gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Ingrese el ID del examen"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
            />
            <button type="submit" className="btn btn-success">
              Ver Examen y Abrir SEB
            </button>
          </form>
        </>
      ) : (
        <ExamView examId={submittedId} onBack={() => setSubmittedId(null)} />
      )}
    </div>
  );
};

export default StudentExamPage;
