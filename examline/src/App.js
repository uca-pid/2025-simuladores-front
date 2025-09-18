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





