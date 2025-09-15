import React, { useState } from "react";
import ExamView from "./ExamView";
import UserHeader from "../components/UserHeader";

const StudentExamPage = () => {
  const [examId, setExamId] = useState("");
  const [submittedId, setSubmittedId] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (examId.trim()) {
      setSubmittedId(examId.trim());
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
              Ver Examen
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

