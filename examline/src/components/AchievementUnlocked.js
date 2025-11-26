import React, { useEffect, useState } from 'react';
import './AchievementUnlocked.css';

const AchievementUnlocked = ({ achievement, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Mostrar con animación
    setTimeout(() => setIsVisible(true), 100);

    // Auto cerrar después de 5 segundos
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!achievement) return null;

  return (
    <div className={`achievement-unlock-overlay ${isVisible ? 'visible' : ''}`}>
      <div className={`achievement-unlock-card ${isVisible ? 'visible' : ''}`}>
        <div className="unlock-sparkles">✨</div>
        <div className="unlock-title">¡Logro Desbloqueado!</div>
        <div className="unlock-icon">{achievement.icon}</div>
        <div className="unlock-name">{achievement.name}</div>
        <div className="unlock-description">{achievement.description}</div>
        <button className="unlock-close-btn" onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}>
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default AchievementUnlocked;
