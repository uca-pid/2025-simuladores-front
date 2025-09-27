import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProfessorRoute, StudentRoute, AuthenticatedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Principal from "./pages/Principal";
import ExamCreator from "./pages/ExamCreator";
import ExamView from "./pages/ExamView";
import UserSettingsPage from "./pages/userSettings";
import StudentExamPage from "./pages/StudentExamPage"; // 👈 NUEVO
import ExamWindows from "./pages/ExamWindows";
import StudentInscriptions from "./pages/StudentInscriptions";
import WindowInscriptions from "./pages/WindowInscriptions";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/principal" element={
            <ProfessorRoute>
              <Principal />
            </ProfessorRoute>
          } />
          <Route path="/exam-creator" element={
            <ProfessorRoute>
              <ExamCreator />
            </ProfessorRoute>
          } />
          <Route path="/examen/:examId" element={
            <ProfessorRoute>
              <ExamView />
            </ProfessorRoute>
          } />
          <Route path="/student-exam" element={
            <StudentRoute>
              <StudentExamPage />
            </StudentRoute>
          } />
          <Route path="/exam-windows" element={
            <ProfessorRoute>
              <ExamWindows />
            </ProfessorRoute>
          } />
          <Route path="/exam-windows-inscriptions" element={
            <ProfessorRoute>
              <WindowInscriptions />
            </ProfessorRoute>
          } />
          <Route path="/student-inscriptions" element={
            <StudentRoute>
              <StudentInscriptions />
            </StudentRoute>
          } />
          <Route path="/user-settings" element={
            <AuthenticatedRoute>
              <UserSettingsPage />
            </AuthenticatedRoute>
          } />
          <Route path="*" element={<Login />} /> {/* default */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;





