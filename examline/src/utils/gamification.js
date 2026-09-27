// Sistema de niveles y gamificación

export const levels = [
  { level: 1, name: 'Principiante', minExams: 0, maxExams: 2, color: '#94a3b8', icon: 'fas fa-seedling', badge: '🌱' },
  { level: 2, name: 'Aprendiz', minExams: 3, maxExams: 5, color: '#60a5fa', icon: 'fas fa-book-reader', badge: '📚' },
  { level: 3, name: 'Estudiante', minExams: 6, maxExams: 10, color: '#34d399', icon: 'fas fa-user-graduate', badge: '🎓' },
  { level: 4, name: 'Avanzado', minExams: 11, maxExams: 15, color: '#fbbf24', icon: 'fas fa-medal', badge: '🏅' },
  { level: 5, name: 'Experto', minExams: 16, maxExams: 25, color: '#f97316', icon: 'fas fa-trophy', badge: '🏆' },
  { level: 6, name: 'Maestro', minExams: 26, maxExams: 40, color: '#ec4899', icon: 'fas fa-crown', badge: '👑' },
  { level: 7, name: 'Leyenda', minExams: 41, maxExams: Infinity, color: '#172147', icon: 'fas fa-star', badge: '⭐' }
];

// Calcular el nivel actual basado en la cantidad de exámenes completados
export const calculateLevel = (completedExams) => {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (completedExams >= levels[i].minExams) {
      return levels[i];
    }
  }
  return levels[0];
};

// Calcular el progreso hacia el próximo nivel
export const calculateProgress = (completedExams) => {
  const currentLevel = calculateLevel(completedExams);
  const nextLevel = levels.find(l => l.level === currentLevel.level + 1);
  
  if (!nextLevel) {
    // Ya está en el nivel máximo
    return {
      current: currentLevel,
      next: null,
      progress: 100,
      examsToNext: 0,
      examsInCurrentLevel: completedExams - currentLevel.minExams
    };
  }
  
  const examsInCurrentLevel = completedExams - currentLevel.minExams;
  const examsNeededForNextLevel = nextLevel.minExams - currentLevel.minExams;
  const progress = (examsInCurrentLevel / examsNeededForNextLevel) * 100;
  
  return {
    current: currentLevel,
    next: nextLevel,
    progress: Math.min(progress, 100),
    examsToNext: nextLevel.minExams - completedExams,
    examsInCurrentLevel
  };
};

// Obtener título descriptivo basado en cantidad de exámenes (sin notas)
export const getPerformanceTitle = (completedExams) => {
  if (completedExams >= 30) return { title: 'Dedicación Máxima', icon: '🌟', color: '#172147' };
  if (completedExams >= 20) return { title: 'Muy Activo', icon: '✨', color: '#ec4899' };
  if (completedExams >= 10) return { title: 'En Progreso', icon: '💪', color: '#10b981' };
  if (completedExams >= 5) return { title: 'Iniciando', icon: '📈', color: '#f59e0b' };
  return { title: 'Primer Paso', icon: '🎯', color: '#3b82f6' };
};

// Logros desbloqueables (sin requerir notas)
export const achievements = [
  {
    id: 'first_exam',
    name: 'Primera vez',
    description: 'Completaste tu primer examen',
    icon: '🎯',
    condition: (stats) => stats.completedExams >= 1
  },
  {
    id: 'five_exams',
    name: 'Constante',
    description: 'Completaste 5 exámenes',
    icon: '�',
    condition: (stats) => stats.completedExams >= 5
  },
  {
    id: 'ten_exams',
    name: 'Dedicado',
    description: 'Completaste 10 exámenes',
    icon: '�',
    condition: (stats) => stats.completedExams >= 10
  },
  {
    id: 'fifteen_exams',
    name: 'Comprometido',
    description: 'Completaste 15 exámenes',
    icon: '⭐',
    condition: (stats) => stats.completedExams >= 15
  },
  {
    id: 'twenty_exams',
    name: 'Incansable',
    description: 'Completaste 20 exámenes',
    icon: '🚀',
    condition: (stats) => stats.completedExams >= 20
  },
  {
    id: 'programming_master',
    name: 'Programador',
    description: 'Completaste 5 exámenes de programación',
    icon: '👨‍�',
    condition: (stats) => stats.programmingExams >= 5
  },
  {
    id: 'multiple_choice_master',
    name: 'Evaluador',
    description: 'Completaste 5 exámenes múltiple choice',
    icon: '✅',
    condition: (stats) => stats.multipleChoiceExams >= 5
  },
  {
    id: 'streak_week',
    name: 'Racha semanal',
    description: 'Completaste exámenes durante 7 días seguidos',
    icon: '📅',
    condition: (stats) => stats.currentStreak >= 7
  }
];

// Verificar qué logros ha desbloqueado el usuario
export const getUnlockedAchievements = (stats) => {
  return achievements.filter(achievement => achievement.condition(stats));
};

// Calcular estadísticas del estudiante
export const calculateStudentStats = (attempts) => {
  if (!attempts || attempts.length === 0) {
    return {
      completedExams: 0,
      programmingExams: 0,
      multipleChoiceExams: 0,
      currentStreak: 0,
      totalDays: 0
    };
  }

  const completedAttempts = attempts.filter(a => a.estado === 'finalizado');
  
  const programmingExams = completedAttempts.filter(a => a.exam?.tipo === 'programming').length;
  const multipleChoiceExams = completedAttempts.filter(a => a.exam?.tipo === 'multiple_choice').length;

  // Calcular racha (días consecutivos con exámenes)
  const sortedDates = completedAttempts
    .map(a => new Date(a.startedAt).toDateString())
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => new Date(b) - new Date(a));

  let currentStreak = 0;
  if (sortedDates.length > 0) {
    currentStreak = 1;
    const today = new Date().toDateString();
    const lastExamDate = sortedDates[0];
    
    // Verificar si el último examen fue hoy o ayer
    const diffDays = (new Date(today) - new Date(lastExamDate)) / (1000 * 60 * 60 * 24);
    
    if (diffDays <= 1) {
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const diff = (new Date(sortedDates[i]) - new Date(sortedDates[i + 1])) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else {
      currentStreak = 0; // La racha se rompió
    }
  }

  return {
    completedExams: completedAttempts.length,
    programmingExams,
    multipleChoiceExams,
    currentStreak,
    totalDays: sortedDates.length
  };
};
