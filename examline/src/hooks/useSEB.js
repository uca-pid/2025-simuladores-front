import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para gestionar Safe Exam Browser (SEB)
 * Centraliza la lógica de detección y cierre de SEB
 * 
 * @returns {Object} Estado y funciones relacionadas con SEB
 * @property {boolean} isInSEB - Indica si la aplicación está corriendo en SEB
 * @property {Function} closeSEB - Función para cerrar/redireccionar desde SEB
 * @property {Function} checkSEB - Función para verificar si está en SEB
 */
export const useSEB = () => {
  const [isInSEB, setIsInSEB] = useState(false);

  /**
   * Verifica si la aplicación está ejecutándose en Safe Exam Browser
   * @returns {boolean} true si está en SEB, false en caso contrario
   */
  const checkSEB = useCallback(() => {
    const userAgent = navigator.userAgent || '';
    return (
      userAgent.includes('SEB') ||
      userAgent.includes('SafeExamBrowser') ||
      window.SafeExamBrowser !== undefined
    );
  }, []);

  /**
   * Cierra SEB redireccionando a una URL específica
   * Esta es la forma estándar de "cerrar" SEB después de un examen
   * @param {string} redirectUrl - URL a la que redireccionar (default: ferrocarriloeste.com.ar)
   */
  const closeSEB = useCallback((redirectUrl = 'https://ferrocarriloeste.com.ar/') => {
    try {
      console.log('Intentando cerrar SEB y redireccionar a:', redirectUrl);
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Error al redireccionar desde SEB:', error);
    }
  }, []);

  /**
   * Detectar SEB al montar el componente
   */
  useEffect(() => {
    const inSEB = checkSEB();
    setIsInSEB(inSEB);
    
    if (inSEB) {
      console.log('Aplicación ejecutándose en Safe Exam Browser');
    }
  }, [checkSEB]);

  return {
    isInSEB,
    closeSEB,
    checkSEB
  };
};

export default useSEB;
