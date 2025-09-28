import CryptoJS from 'crypto-js';

/**
 * Hash password on client-side using SHA-256 with salt
 * This provides an additional layer of security before sending to server
 * @param {string} password - The plain text password
 * @param {string} email - User's email (used as salt for consistency)
 * @returns {string} - Hashed password
 */
export const hashPassword = (password, email) => {
  // Use email as salt to ensure same password gives same hash for same user
  // but different hashes for different users
  const saltedPassword = password + email.toLowerCase();
  
  // Hash using SHA-256
  const hashedPassword = CryptoJS.SHA256(saltedPassword).toString(CryptoJS.enc.Hex);
  
  return hashedPassword;
};

/**
 * Validate password strength
 * @param {string} password - The plain text password to validate
 * @returns {object} - Validation result with isValid boolean and message
 */
export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return {
      isValid: false,
      message: `La contraseña debe tener al menos ${minLength} caracteres`
    };
  }

  if (!hasUpperCase) {
    return {
      isValid: false,
      message: 'La contraseña debe contener al menos una letra mayúscula'
    };
  }

  if (!hasLowerCase) {
    return {
      isValid: false,
      message: 'La contraseña debe contener al menos una letra minúscula'
    };
  }

  if (!hasNumbers) {
    return {
      isValid: false,
      message: 'La contraseña debe contener al menos un número'
    };
  }

  if (!hasSpecialChar) {
    return {
      isValid: false,
      message: 'La contraseña debe contener al menos un carácter especial'
    };
  }

  return {
    isValid: true,
    message: 'Contraseña segura'
  };
};