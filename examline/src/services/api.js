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
