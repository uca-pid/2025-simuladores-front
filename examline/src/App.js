import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider , useAuth } from "./contexts/AuthContext";
import { ProfessorRoute, StudentRoute, AuthenticatedRoute } from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Principal from "./pages/Principal";
import MisExamenes from "./pages/MisExamenes";
import ExamCreator from "./pages/ExamCreator";
import ExamView from "./pages/ExamView";
import UserSettingsPage from "./pages/userSettings";
import StudentExamPage from "./pages/StudentExamPage";
import StudentProgress from "./pages/StudentProgress";
import ExamAttempt from "./pages/ExamAttempt";
import ExamResults from "./pages/ExamResults";
import ProgrammingExamView from "./pages/ProgrammingExamView";
import ExamWindows from "./pages/ExamWindows";
import StudentInscriptions from "./pages/StudentInscriptions";
import ExamWindowResults from "./pages/ExamWindowResults";
import SEBExamLauncher from "./pages/SEBExamLauncher";
import "./modern-examline.css";


// Wrapper para login/registro: redirige si ya está logueado
function AuthRedirect({ children }) {
  const { user } = useAuth();

  if (user) {
    return user.rol === "professor" ? <Navigate to="/principal" /> : <Navigate to="/student-exam" />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Login y registro */}
          <Route path="/login" element={
            <AuthRedirect>
              <Login />
            </AuthRedirect>
          } />
          <Route path="/registro" element={
            <AuthRedirect>
              <Registro />
            </AuthRedirect>
          } />

          <Route path="/principal" element={
            <ProfessorRoute>
              <Principal />
            </ProfessorRoute>
          } />
          <Route path="/mis-examenes" element={
            <ProfessorRoute>
              <MisExamenes />
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
          <Route path="/student-progress" element={
            <StudentRoute>
              <StudentProgress />
            </StudentRoute>
          } />
          <Route path="/seb-exam-launcher" element={
            <StudentRoute>
              <SEBExamLauncher />
            </StudentRoute>
          } />
          <Route path="/exam-attempt/:examId" element={
            
              <ExamAttempt />
            
          } />
          <Route path="/programming-exam/:examId" element={
            
              <ProgrammingExamView />
           
          } />
          <Route path="/exam-windows" element={
            <ProfessorRoute>
              <ExamWindows />
            </ProfessorRoute>
          } />
          <Route path="/exam-windows/:windowId/results" element={
            <ProfessorRoute>
              <ExamWindowResults />
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
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;





