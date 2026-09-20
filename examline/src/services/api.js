import { hashPassword } from '../utils/password';

// Exportar API_BASE_URL para uso en otros componentes
export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  // Si es 401 (no autorizado) o 403 y el error es por token expirado, limpiar sesión
  if (response.status === 401 || response.status === 403) {
    try {
      const data = await response.json();
      
      // Si el error menciona token expirado, limpiar todo
      if (data.error && (
        data.error.toLowerCase().includes('token') || 
        data.error.toLowerCase().includes('expired') ||
        data.error.toLowerCase().includes('unauthorized')
      )) {
        console.log('Token expirado detectado en respuesta API, limpiando sesión...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirigir al login si no estamos ya ahí
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      
      // Mensaje más específico para errores 403
      let errorMessage = data.error;
      if (!errorMessage && response.status === 403) {
        errorMessage = 'No está autorizado para ver este recurso';
      }
      
      const error = new Error(errorMessage || `HTTP error! status: ${response.status}`);
      error.status = response.status;
      error.code = data.code;
      throw error;
    } catch (parseError) {
      // Si no se puede parsear el JSON, crear error con mensaje apropiado
      const errorMessage = response.status === 403 
        ? 'No está autorizado para ver este recurso'
        : `HTTP error! status: ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  
  return data;
};

// Auth endpoints
export async function loginUser({ email, password }) {
  try {
    // Hash password on client-side before sending
    const hashedPassword = hashPassword(password, email);
    
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: hashedPassword }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function signupUser({ nombre, email, password, rol = "student" }) {
  try {
    // Hash password on client-side before sending
    const hashedPassword = hashPassword(password, email);
    
    const res = await fetch(`${API_BASE_URL}/users/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password: hashedPassword, rol }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function refreshToken() {
  try {
    const res = await fetch(`${API_BASE_URL}/users/refresh-token`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function getCurrentUser() {
  try {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function getUserById(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function updateUser(id, userData) {
  try {
    // If we're updating password, we need to hash it first
    // But we need the user's email for hashing, so let's get it
    let processedData = { ...userData };
    
    if (userData.password) {
      // Get user's email first
      const userRes = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      
      if (!userRes.ok) {
        throw new Error('No se pudo obtener la información del usuario');
      }
      
      const userInfo = await userRes.json();
      
      // Hash both passwords if they exist
      if (userData.password) {
        processedData.password = hashPassword(userData.password, userInfo.email);
      }
      if (userData.currentPassword) {
        processedData.currentPassword = hashPassword(userData.currentPassword, userInfo.email);
      }
    }
    
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(processedData),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

// Exam endpoints
export async function createExam(examData) {
  try {
    // Extraer archivos de referencia si existen
    const { referenceFiles, ...examDataWithoutFiles } = examData;
    
    const res = await fetch(`${API_BASE_URL}/exams/create`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(examDataWithoutFiles),
    });

    const createdExam = await handleResponse(res);
    
    // Si hay archivos de referencia y el examen se creó correctamente, guardarlos
    if (referenceFiles && referenceFiles.length > 0 && createdExam.id) {
      try {
        await saveReferenceFiles(createdExam.id, referenceFiles);
      } catch (fileError) {
        console.error('Error guardando archivos de referencia:', fileError);
        // No fallar la creación del examen si falla el guardado de archivos
      }
    }
    
    return createdExam;
  } catch (err) {
    throw err;
  }
}

export async function uploadEnunciado(file) {
  try {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('archivo', file);

    const res = await fetch(`${API_BASE_URL}/exams/upload-enunciado`, {
      method: "POST",
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
        // No seteamos Content-Type: el browser lo define con el boundary correcto para FormData
      },
      body: formData,
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function getExams() {
  try {
    const res = await fetch(`${API_BASE_URL}/exams`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function getExamById(examId, windowId = null) {
  try {
    let url = `${API_BASE_URL}/exams/${examId}`;
    
    // 🔒 Agregar windowId para validación de seguridad si se proporciona
    if (windowId) {
      url += `?windowId=${windowId}`;
    }
    
    const res = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

// Exam window endpoints
export async function getExamWindowsProfesor() {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-windows/profesor`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function createExamWindow(payload) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-windows`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function updateExamWindow(windowId, payload) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-windows/${windowId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function toggleExamWindowActive(windowId) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-windows/${windowId}/toggle-active`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

// Exam attempt endpoints
export async function getExamAttemptResults(attemptId) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-attempts/${attemptId}/results`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

// Exam attempt endpoints (continued)
export async function checkExamAttempt(examId, windowId) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-attempts/check/${examId}?windowId=${windowId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function startExamAttempt({ examId, examWindowId }) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-attempts/start`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ examId, examWindowId }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function saveAttemptCode(attemptId, codigoProgramacion) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-attempts/${attemptId}/save-code`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ codigoProgramacion }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function finishExamAttempt(attemptId, body = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-attempts/${attemptId}/finish`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

// Exam files endpoints
export async function getExamAttemptFiles(examId) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-files/${examId}/files`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function saveExamAttemptFile(examId, filename, content) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-files/${examId}/files`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ filename, content }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function deleteExamAttemptFile(examId, filename) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-files/${examId}/files/${filename}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function saveSubmissionFiles(examId, files) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-files/${examId}/files/submission`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ files }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

// Code execution endpoint
export async function runCode({ code, language, examId, input }) {
  try {
    const res = await fetch(`${API_BASE_URL}/code-execution/run`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ code, language, examId, input }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function getExamFiles(examId, version) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-files/${examId}/files?version=${version}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

// Moodle Integration endpoints
export async function verifyMoodleConnection({ moodleUrl, moodleToken }) {
  try {
    const res = await fetch(`${API_BASE_URL}/moodle/verify`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ moodleUrl, moodleToken }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function getMoodleCourseInfo(courseId, moodleUrl, moodleToken) {
  try {
    const res = await fetch(`${API_BASE_URL}/moodle/courses/${courseId}?moodleUrl=${encodeURIComponent(moodleUrl)}&moodleToken=${encodeURIComponent(moodleToken)}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function getMoodleCourseAssignments(courseId, moodleUrl, moodleToken) {
  try {
    const res = await fetch(`${API_BASE_URL}/moodle/courses/${courseId}/assignments?moodleUrl=${encodeURIComponent(moodleUrl)}&moodleToken=${encodeURIComponent(moodleToken)}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function updateWindowMoodleConfig(windowId, config) {
  try {
    const res = await fetch(`${API_BASE_URL}/moodle/exam-windows/${windowId}/config`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function syncGradesToMoodle(windowId) {
  try {
    const res = await fetch(`${API_BASE_URL}/moodle/exam-windows/${windowId}/sync-grades`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function getMoodleSyncStatus(windowId) {
  try {
    const res = await fetch(`${API_BASE_URL}/moodle/exam-windows/${windowId}/sync-status`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

// Exam testing and reference solution endpoints
export async function testExamSolution(examId, code, useReferenceSolution = false) {
  try {
    const res = await fetch(`${API_BASE_URL}/exams/${examId}/test-solution`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ code, useReferenceSolution }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function testSolutionPreview(code, language, testCases) {
  try {
    const res = await fetch(`${API_BASE_URL}/exams/test-solution-preview`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ code, language, testCases }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function saveReferenceSolution(examId, solucionReferencia) {
  try {
    const res = await fetch(`${API_BASE_URL}/exams/${examId}/reference-solution`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ solucionReferencia }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

// Reference solution files endpoints (multi-file support)
export async function getReferenceFiles(examId) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-files/${examId}/reference-solution`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function saveReferenceFiles(examId, files) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-files/${examId}/reference-solution`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ files }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function deleteReferenceFile(examId, filename) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-files/${examId}/reference-solution/${filename}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

// Manual grading endpoints
export async function getAttemptProfessorView(attemptId) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-attempts/${attemptId}/professor-view`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function executeCodeForGrading({ code, language, filename, customInput, testCases }) {
  try {
    const payload = {
      code,
      language,
      filename,
      ...(customInput !== undefined && { customInput }),
      ...(testCases !== undefined && { testCases }),
    };

    const res = await fetch(`${API_BASE_URL}/code-execution/execute`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function saveManualGrade(attemptId, calificacionManual) {
  try {
    const res = await fetch(`${API_BASE_URL}/exam-attempts/${attemptId}/manual-grade`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ calificacionManual }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}
