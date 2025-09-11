import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Registro from "./pages/Registro";
import Login from "./pages/Login";
import Principal from "./pages/Principal";

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirige la raíz al login */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/principal" element={<Principal />} />
      </Routes>
    </Router>
  );
}

export default App;





