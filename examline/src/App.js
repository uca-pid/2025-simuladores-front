import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Principal from "./pages/Principal";
import ExamCreator from "./pages/ExamCreator";
import ExamView from "./pages/ExamView";
import UserSettingsPage from "./pages/userSettings";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/principal" element={<Principal />} />
        <Route path="/exam-creator" element={<ExamCreator />} />
        <Route path="/examen/:examId" element={<ExamView />} />
        <Route path="/user-settings" element={<UserSettingsPage />} />
        <Route path="*" element={<Login />} /> {/* default */}
      </Routes>
    </Router>
  );
}

export default App;




