/**
 * EJEMPLO: Cómo integrar MoodleIntegration en WindowInscriptions.js
 * 
 * Copia y adapta este código a tu archivo WindowInscriptions.js existente
 */

// 1. AGREGAR IMPORTS AL INICIO DEL ARCHIVO
import MoodleIntegration from '../components/MoodleIntegration';

// 2. AGREGAR ESTADO PARA EL MODAL DE MOODLE (dentro del componente)
const [showMoodleModal, setShowMoodleModal] = useState(false);

// 3. AGREGAR BOTÓN EN LA INTERFAZ (donde quieras que aparezca)
// Sugerencia: Agregarlo cerca de los botones de acciones de la ventana

<div className="moodle-actions">
  <button 
    onClick={() => setShowMoodleModal(true)}
    className="btn btn-primary"
    style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'none',
      marginLeft: '10px'
    }}
  >
    🎓 Sincronizar con Moodle
  </button>
</div>

// 4. AGREGAR EL MODAL AL FINAL DEL RETURN (antes del </div> final)

{showMoodleModal && (
  <>
    <div 
      className="moodle-overlay" 
      onClick={() => setShowMoodleModal(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999,
        backdropFilter: 'blur(4px)'
      }}
    />
    <MoodleIntegration 
      windowId={parseInt(windowId)}
      onClose={() => setShowMoodleModal(false)}
    />
  </>
)}

// =============================================================================
// CÓDIGO COMPLETO EJEMPLO - WindowInscriptions.js con Moodle
// =============================================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackToMainButton from '../components/BackToMainButton';
import Modal from '../components/Modal';
import MoodleIntegration from '../components/MoodleIntegration'; // ← NUEVO
import 'bootstrap/dist/css/bootstrap.min.css';
import '../modern-examline.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export default function WindowInscriptionsPage() {
  const { windowId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [examWindow, setExamWindow] = useState(null);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMoodleModal, setShowMoodleModal] = useState(false); // ← NUEVO
  
  const [modal, setModal] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  });

  // ... resto del código existente ...

  return (
    <div className="container mt-4">
      <BackToMainButton />
      
      <div className="exam-window-header">
        <h1>Gestión de Inscripciones</h1>
        
        {/* BOTÓN DE MOODLE - Agregarlo aquí o donde prefieras */}
        <div className="header-actions">
          <button 
            onClick={() => setShowMoodleModal(true)}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              marginLeft: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>🎓</span>
            <span>Sincronizar con Moodle</span>
          </button>
        </div>
      </div>

      {/* ... resto del contenido de la página ... */}

      {/* MODAL DE MOODLE - Al final del componente */}
      {showMoodleModal && (
        <>
          <div 
            className="moodle-overlay" 
            onClick={() => setShowMoodleModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
              backdropFilter: 'blur(4px)'
            }}
          />
          <MoodleIntegration 
            windowId={parseInt(windowId)}
            onClose={() => setShowMoodleModal(false)}
          />
        </>
      )}
    </div>
  );
}

// =============================================================================
// ALTERNATIVA: Integrar en ExamWindows.js (lista de ventanas)
// =============================================================================

/**
 * Si prefieres agregar el botón en la lista de ventanas (ExamWindows.js),
 * agrega un botón por cada ventana:
 */

<div className="window-card">
  <h3>{window.exam.titulo}</h3>
  
  <div className="window-actions">
    <button onClick={() => handleViewInscriptions(window.id)}>
      Ver Inscripciones
    </button>
    
    {/* BOTÓN DE MOODLE */}
    <button 
      onClick={() => handleOpenMoodleConfig(window.id)}
      className="btn-moodle"
    >
      🎓 Moodle
    </button>
  </div>
</div>

// Y el handler:
const handleOpenMoodleConfig = (windowId) => {
  setSelectedWindowForMoodle(windowId);
  setShowMoodleModal(true);
};

// =============================================================================
// ESTILOS ADICIONALES (opcional - agregar a modern-examline.css)
// =============================================================================

/*
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-moodle {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-moodle:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
*/
