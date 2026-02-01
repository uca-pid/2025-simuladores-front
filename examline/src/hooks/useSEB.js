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
   * Primero intenta usar la API nativa de SEB si está disponible
   * @param {string} redirectUrl - URL a la que redireccionar (default: ferrocarriloeste.com.ar)
   * @returns {Promise<boolean>} true si logró cerrar/redireccionar, false si fue cancelado
   */
  const closeSEB = useCallback(async (redirectUrl = 'https://ferrocarriloeste.com.ar/') => {
    try {
      console.log('Intentando cerrar SEB y redireccionar a:', redirectUrl);
      
      // Intenta usar la API nativa de SEB para cerrar (si está disponible)
      if (window.SafeExamBrowser?.security?.closeApplication) {
        window.SafeExamBrowser.security.closeApplication();
        return true;
      }
      
      // Si no hay API nativa, redirigir a URL
      window.location.href = redirectUrl;
      return true;
    } catch (error) {
      console.error('Error al redireccionar desde SEB:', error);
      return false;
    }
  }, []);

  /**
   * Intenta cerrar SEB con una confirmación y retorna si tuvo éxito
   * Usa un timeout para detectar si el usuario canceló el cierre
   * @returns {Promise<boolean>} true si el usuario confirmó y se cerró, false si canceló
   */
  const tryCloseSEB = useCallback(async () => {
    try {
      // Crear una promesa que se resuelve después de un timeout
      // Si la página sigue activa después del timeout, significa que el usuario canceló
      const closePromise = new Promise((resolve) => {
        // Intentar cerrar SEB
        if (window.SafeExamBrowser?.security?.closeApplication) {
          window.SafeExamBrowser.security.closeApplication();
        } else {
          window.location.href = 'https://ferrocarriloeste.com.ar/';
        }
        
        // Si después de 1 segundo la página sigue activa, el usuario canceló
        setTimeout(() => {
          resolve(false); // El usuario canceló o el cierre falló
        }, 1000);
      });
      
      return await closePromise;
    } catch (error) {
      console.error('Error al cerrar SEB:', error);
      return false;
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
    tryCloseSEB,
    checkSEB
  };
};

export default useSEB;
