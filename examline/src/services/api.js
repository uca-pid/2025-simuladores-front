const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';

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
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function signupUser({ nombre, email, password, rol = "student" }) {
  try {
    const res = await fetch(`${API_BASE_URL}/users/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password, rol }),
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

// User management endpoints
export async function getAllUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/users`, {
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
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

// Exam endpoints
export async function createExam({ titulo, preguntas }) {
  try {
    const res = await fetch(`${API_BASE_URL}/exams/create`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ titulo, preguntas }),
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

export async function getExamById(examId) {
  try {
    const res = await fetch(`${API_BASE_URL}/exams/${examId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function getExamHistory(userId) {
  try {
    const res = await fetch(`${API_BASE_URL}/exams/history/${userId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(res);
  } catch (err) {
    throw err;
  }
}
