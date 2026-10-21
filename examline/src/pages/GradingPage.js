import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AttemptsSidebar from '../components/AttemptsSidebar';
import ManualGradingModal from '../components/ManualGradingModal';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export default function GradingPage() {
  const { windowId, attemptId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAttempts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/exam-attempts/window/${windowId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setAttempts(await response.json());
      }
    } catch (error) {
      console.error('Error fetching attempts:', error);
    } finally {
      setLoading(false);
    }
  }, [windowId, token]);

  useEffect(() => {
    if (!user || user.rol !== 'professor') {
      navigate('/');
      return;
    }
    loadAttempts();
  }, [user, navigate, loadAttempts]);

  const currentIndex = attempts.findIndex(a => String(a.id) === String(attemptId));
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < attempts.length - 1;

  const goToAttempt = (id) => navigate(`/exam-windows/${windowId}/results/${id}`);
  const handleBack = () => navigate(`/exam-windows/${windowId}/results`);
  const handlePrev = () => hasPrev && goToAttempt(attempts[currentIndex - 1].id);
  const handleNext = () => hasNext && goToAttempt(attempts[currentIndex + 1].id);

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div style={{ display: 'flex', gap: '20px' }}>
        <AttemptsSidebar
          attempts={attempts}
          activeAttemptId={attemptId}
          onSelect={goToAttempt}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onBack={handleBack}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <ManualGradingModal
            attemptId={attemptId}
            onBack={handleBack}
            onSave={loadAttempts}
          />
        </div>
      </div>
    </div>
  );
}
