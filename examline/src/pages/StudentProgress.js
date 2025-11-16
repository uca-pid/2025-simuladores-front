import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StudentLevelBadge from "../components/StudentLevelBadge";
import AchievementsDisplay from "../components/AchievementsDisplay";
import AchievementUnlocked from "../components/AchievementUnlocked";
import BackToMainButton from "../components/BackToMainButton";
import { useAuth } from "../contexts/AuthContext";
import {
  calculateProgress,
  calculateStudentStats,
  achievements,
  getUnlockedAchievements,
} from "../utils/gamification";
import "bootstrap/dist/css/bootstrap.min.css";
import "../modern-examline.css";

const API_BASE_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://two025-simuladores-back-1.onrender.com";

const StudentProgress = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [studentStats, setStudentStats] = useState(null);
  const [levelInfo, setLevelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newAchievement, setNewAchievement] = useState(null);

  // Cargar estadísticas del estudiante
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user || !token) return;

      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/exam-attempts/my-attempts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const attempts = await response.json();
          const stats = calculateStudentStats(attempts);
          const progress = calculateProgress(stats.completedExams);

          // Verificar nuevos logros desbloqueados
          const currentUnlocked = getUnlockedAchievements(stats);
          const previousUnlockedIds = JSON.parse(
            localStorage.getItem(`unlockedAchievements_${user.id}`) || "[]"
          );

          // Encontrar logros recién desbloqueados
          const newUnlocked = currentUnlocked.find(
            (achievement) => !previousUnlockedIds.includes(achievement.id)
          );

          if (newUnlocked) {
            setNewAchievement(newUnlocked);
            // Guardar logros desbloqueados
            localStorage.setItem(
              `unlockedAchievements_${user.id}`,
              JSON.stringify(currentUnlocked.map((a) => a.id))
            );
          }

          setStudentStats(stats);
          setLevelInfo(progress);
        }
      } catch (error) {
        console.error("Error cargando estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user, token]);

  const unlockedAchievements = studentStats
    ? getUnlockedAchievements(studentStats)
    : [];

  return (
    <div className="container py-5">
      {/* Notificación de logro desbloqueado */}
      {newAchievement && (
        <AchievementUnlocked
          achievement={newAchievement}
          onClose={() => setNewAchievement(null)}
        />
      )}

      {/* Título de la página */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h2 className="page-title mb-1">
                <i className="fas fa-chart-line me-2"></i>
                Mi Progreso
              </h2>
              <p className="page-subtitle mb-0">
                Visualiza tu nivel, logros y estadísticas de rendimiento
              </p>
            </div>
            <BackToMainButton />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando tu progreso...</p>
        </div>
      ) : studentStats && levelInfo ? (
        <>
          {/* Sistema de Gamificación */}
          <StudentLevelBadge
            level={levelInfo}
            progress={levelInfo.progress}
            stats={studentStats}
          />

          {/* Logros */}
          <AchievementsDisplay
            achievements={achievements}
            unlockedAchievements={unlockedAchievements}
          />
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <h4 className="empty-title">No hay datos disponibles</h4>
          <p className="empty-subtitle">
            Completa algunos exámenes para ver tu progreso y estadísticas
          </p>
          <button
            className="modern-btn modern-btn-primary"
            onClick={() => navigate("/student-exam")}
          >
            <i className="fas fa-clipboard-list me-2"></i>
            Ver exámenes disponibles
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentProgress;
