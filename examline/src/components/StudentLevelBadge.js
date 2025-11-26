import React from 'react';
import './StudentLevelBadge.css';

const StudentLevelBadge = ({ level, progress, stats, compact = false }) => {
  if (compact) {
    return (
      <div className="level-badge-compact" style={{ borderColor: level.current.color }}>
        <div className="level-badge-icon" style={{ background: level.current.color }}>
          <span className="level-emoji">{level.current.badge}</span>
        </div>
        <div className="level-badge-info">
          <div className="level-name" style={{ color: level.current.color }}>
            {level.current.name}
          </div>
          <div className="level-number">Nivel {level.current.level}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-level-card">
      <div className="level-header">
        <div className="level-badge-large" style={{ background: `linear-gradient(135deg, ${level.current.color}, ${level.current.color}dd)` }}>
          <span className="level-emoji-large">{level.current.badge}</span>
          <div className="level-number-large">Nivel {level.current.level}</div>
        </div>
        <div className="level-details">
          <h3 className="level-title" style={{ color: level.current.color }}>
            {level.current.name}
          </h3>
          <p className="level-subtitle">
            {stats.completedExams} examen{stats.completedExams !== 1 ? 'es' : ''} completado{stats.completedExams !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {level.next && (
        <div className="level-progress-section">
          <div className="progress-info">
            <span className="progress-label">Progreso al siguiente nivel</span>
            <span className="progress-count">
              {level.examsToNext} examen{level.examsToNext !== 1 ? 'es' : ''} más para <strong>{level.next.name}</strong> {level.next.badge}
            </span>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ 
                width: `${level.progress}%`,
                background: `linear-gradient(90deg, ${level.current.color}, ${level.next.color})`
              }}
            >
              <span className="progress-percentage">{Math.round(level.progress)}%</span>
            </div>
          </div>
        </div>
      )}

      {!level.next && (
        <div className="max-level-message">
          <i className="fas fa-trophy"></i>
          ¡Has alcanzado el nivel máximo! 🎉
        </div>
      )}

      <div className="level-stats-grid">
        <div className="stat-item">
          <i className="fas fa-code stat-icon"></i>
          <div className="stat-value">{stats.programmingExams}</div>
          <div className="stat-label">Programación</div>
        </div>
        <div className="stat-item">
          <i className="fas fa-list-check stat-icon"></i>
          <div className="stat-value">{stats.multipleChoiceExams}</div>
          <div className="stat-label">Múltiple Choice</div>
        </div>
        <div className="stat-item">
          <i className="fas fa-fire stat-icon"></i>
          <div className="stat-value">{stats.currentStreak}</div>
          <div className="stat-label">Racha (días)</div>
        </div>
        <div className="stat-item">
          <i className="fas fa-calendar-check stat-icon"></i>
          <div className="stat-value">{stats.totalDays}</div>
          <div className="stat-label">Días activo</div>
        </div>
      </div>
    </div>
  );
};

export default StudentLevelBadge;
