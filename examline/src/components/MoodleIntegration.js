import React, { useState, useEffect, useCallback } from 'react';
import { 
  verifyMoodleConnection, 
  getMoodleCourseAssignments,
  updateWindowMoodleConfig,
  syncGradesToMoodle,
  getMoodleSyncStatus
} from '../services/api';
import './MoodleIntegration.css';

const MoodleIntegration = ({ windowId, onClose }) => {
  const [moodleUrl, setMoodleUrl] = useState('');
  const [moodleToken, setMoodleToken] = useState('');
  const [moodleCourseId, setMoodleCourseId] = useState('');
  const [moodleActivityId, setMoodleActivityId] = useState('');
  
  const [assignments, setAssignments] = useState([]);
  const [connectionVerified, setConnectionVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Mensajes separados por paso
  const [connectionError, setConnectionError] = useState('');
  const [connectionSuccess, setConnectionSuccess] = useState('');
  const [assignmentsError, setAssignmentsError] = useState('');
  const [assignmentsSuccess, setAssignmentsSuccess] = useState('');
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');
  
  const [syncStatus, setSyncStatus] = useState(null);

  // Cargar configuración existente
  const loadSyncStatus = useCallback(async () => {
    try {
      const status = await getMoodleSyncStatus(windowId);
      setSyncStatus(status);
      
      if (status.moodleConfigured) {
        setMoodleUrl(status.moodleUrl || '');
        setMoodleCourseId(status.moodleCourseId || '');
        setMoodleActivityId(status.moodleActivityId || '');
        setConnectionVerified(true);
      }
    } catch (err) {
      console.error('Error loading sync status:', err);
    }
  }, [windowId]);

  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus]);

  const handleVerifyConnection = async () => {
    if (loading) return; // Evitar spam
    
    if (!moodleUrl || !moodleToken) {
      setConnectionError('Por favor ingrese URL y token de Moodle');
      return;
    }

    setLoading(true);
    setConnectionError('');
    setConnectionSuccess('');

    try {
      const result = await verifyMoodleConnection({ moodleUrl, moodleToken });
      
      if (result.success) {
        setConnectionVerified(true);
        setConnectionSuccess(`✓ Conexión exitosa con ${result.details.sitename}`);
      } else {
        setConnectionError(result.error || 'Error verificando conexión');
        setConnectionVerified(false);
      }
    } catch (err) {
      setConnectionError(err.message || 'Error verificando conexión con Moodle');
      setConnectionVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAssignments = async () => {
    if (loading) return; // Evitar spam
    
    if (!moodleCourseId) {
      setAssignmentsError('Por favor ingrese el ID del curso');
      return;
    }

    setLoading(true);
    setAssignmentsError('');
    setAssignmentsSuccess('');

    try {
      const result = await getMoodleCourseAssignments(
        moodleCourseId, 
        moodleUrl, 
        moodleToken
      );
      
      setAssignments(result);
      setAssignmentsSuccess(`✓ Se encontraron ${result.length} tareas en el curso`);
    } catch (err) {
      setAssignmentsError(err.message || 'Error cargando tareas del curso');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (loading) return; // Evitar spam
    
    setLoading(true);
    setConfigError('');
    setConfigSuccess('');

    try {
      const config = {
        moodleUrl,
        moodleToken,
        moodleCourseId: moodleCourseId ? parseInt(moodleCourseId) : null,
        moodleActivityId: moodleActivityId ? parseInt(moodleActivityId) : null,
        moodleSyncEnabled: true
      };

      await updateWindowMoodleConfig(windowId, config);
      setConfigSuccess('✓ Configuración guardada exitosamente');
      await loadSyncStatus();
    } catch (err) {
      setConfigError(err.message || 'Error guardando configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGrades = async () => {
    if (syncing) return; // Evitar spam

    setSyncing(true);
    setSyncError('');
    setSyncSuccess('');

    try {
      const result = await syncGradesToMoodle(windowId);
      setSyncSuccess(`✓ ${result.message}`);
      await loadSyncStatus();
      
      // Cerrar el modal después de 1.5 segundos
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setSyncError(err.message || 'Error sincronizando calificaciones');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="moodle-integration-container">
      <div className="moodle-integration-header">
        <h2>🎓 Integración con Moodle</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      {syncStatus && syncStatus.lastMoodleSync && (
        <div className="sync-info">
          <p>📅 Última sincronización: {new Date(syncStatus.lastMoodleSync).toLocaleString('es-AR')}</p>
          <p>📊 Calificaciones disponibles: {syncStatus.totalGrades}</p>
        </div>
      )}

      <div className="moodle-form">
        <div className="form-section">
          <h3>1. Configuración de Conexión</h3>
          
          <div className="form-group">
            <label>URL de Moodle:</label>
            <input
              type="url"
              value={moodleUrl}
              onChange={(e) => setMoodleUrl(e.target.value)}
              placeholder="https://moodle.ejemplo.com"
              disabled={loading}
            />
            <small>Ejemplo: https:/eva.uca.edu.ar</small>
          </div>

          <div className="form-group">
            <label>Token de Web Services:</label>
            <input
              type="password"
              value={moodleToken}
              onChange={(e) => setMoodleToken(e.target.value)}
              placeholder="Token de acceso de Moodle"
              disabled={loading}
            />
          </div>

          <button 
            onClick={handleVerifyConnection}
            disabled={loading || !moodleUrl || !moodleToken}
            className="btn-primary"
          >
            {loading ? '⏳ Verificando...' : '🔍 Verificar Conexión'}
          </button>

          {connectionVerified && <span className="verified-badge">✓ Verificado</span>}
          
          {connectionError && <div className="alert alert-error">{connectionError}</div>}
          {connectionSuccess && <div className="alert alert-success">{connectionSuccess}</div>}
        </div>

        {connectionVerified && (
          <>
            <div className="form-section">
              <h3>2. Configuración del Curso</h3>
              
              <div className="form-group">
                <label>ID del Curso en Moodle:</label>
                <input
                  type="number"
                  value={moodleCourseId}
                  onChange={(e) => setMoodleCourseId(e.target.value)}
                  placeholder="123"
                  disabled={loading}
                />
                <small>El ID numérico del curso (visible en la URL del curso)</small>
              </div>

              <button 
                onClick={handleLoadAssignments}
                disabled={loading || !moodleCourseId}
                className="btn-secondary"
              >
                {loading ? '⏳ Cargando...' : '📚 Cargar Tareas del Curso'}
              </button>
              
              {assignmentsError && <div className="alert alert-error">{assignmentsError}</div>}
              {assignmentsSuccess && <div className="alert alert-success">{assignmentsSuccess}</div>}
            </div>

            {assignments.length > 0 && (
              <div className="form-section">
                <h3>3. Seleccionar Tarea/Actividad</h3>
                
                <div className="form-group">
                  <label>Tarea de Moodle:</label>
                  <select
                    value={moodleActivityId}
                    onChange={(e) => setMoodleActivityId(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">-- Seleccione una tarea --</option>
                    {assignments.map(assignment => (
                      <option key={assignment.id} value={assignment.id}>
                        {assignment.name} (ID: {assignment.id})
                      </option>
                    ))}
                  </select>
                  <small>Las calificaciones se enviarán a esta tarea específica</small>
                </div>
              </div>
            )}

            <div className="form-section">
              <h3>4. Guardar Configuración</h3>

              <button 
                onClick={handleSaveConfiguration}
                disabled={loading || syncing}
                className="btn-primary btn-large"
              >
                {loading ? '⏳ Guardando...' : '💾 Guardar Configuración'}
              </button>
              
              {configError && <div className="alert alert-error">{configError}</div>}
              {configSuccess && <div className="alert alert-success">{configSuccess}</div>}
            </div>
          </>
        )}

        {moodleActivityId && (
          <div className="form-section sync-section">
            <h3>5. Sincronizar Calificaciones</h3>
            
            <p className="sync-description">
              Esto enviará todas las calificaciones finalizadas de esta ventana de examen a Moodle.
            </p>

            <button 
              onClick={handleSyncGrades}
              disabled={syncing || loading}
              className="btn-sync"
            >
              {syncing ? '⏳ Sincronizando...' : '🔄 Sincronizar Ahora'}
            </button>
            
            {syncError && <div className="alert alert-error">{syncError}</div>}
            {syncSuccess && <div className="alert alert-success">{syncSuccess}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodleIntegration;
