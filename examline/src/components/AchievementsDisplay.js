import React, { useState } from 'react';
import './AchievementsDisplay.css';

const AchievementsDisplay = ({ achievements, unlockedAchievements }) => {
  const [showAll, setShowAll] = useState(false);

  const displayAchievements = showAll ? achievements : achievements.slice(0, 4);
  const unlockedIds = unlockedAchievements.map(a => a.id);

  return (
    <div className="achievements-card">
      <div className="achievements-header">
        <h3 className="achievements-title">
          <i className="fas fa-trophy me-2"></i>
          Logros
        </h3>
        <span className="achievements-count">
          {unlockedAchievements.length} / {achievements.length}
        </span>
      </div>

      <div className="achievements-grid">
        {displayAchievements.map((achievement) => {
          const isUnlocked = unlockedIds.includes(achievement.id);
          return (
            <div
              key={achievement.id}
              className={`achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`}
              title={achievement.description}
            >
              <div className="achievement-icon">
                {isUnlocked ? achievement.icon : '🔒'}
              </div>
              <div className="achievement-info">
                <div className="achievement-name">
                  {achievement.name}
                </div>
                <div className="achievement-description">
                  {achievement.description}
                </div>
              </div>
              {isUnlocked && (
                <div className="achievement-unlocked-badge">
                  <i className="fas fa-check"></i>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {achievements.length > 4 && (
        <button
          className="show-more-btn"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <i className="fas fa-chevron-up me-2"></i>
              Ver menos
            </>
          ) : (
            <>
              <i className="fas fa-chevron-down me-2"></i>
              Ver todos los logros ({achievements.length - 4} más)
            </>
          )}
        </button>
      )}

      {unlockedAchievements.length === achievements.length && (
        <div className="all-achievements-message">
          <i className="fas fa-crown"></i>
          ¡Has desbloqueado todos los logros! 🎉
        </div>
      )}
    </div>
  );
};

export default AchievementsDisplay;
