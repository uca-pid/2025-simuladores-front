import { useState, useCallback } from 'react';

/**
 * Hook personalizado para gestionar el estado de modales
 * Elimina la duplicación de lógica de modales en múltiples componentes
 * 
 * @returns {Object} Estado y funciones del modal
 * @property {Object} modal - Estado actual del modal
 * @property {Function} showModal - Función para mostrar el modal
 * @property {Function} closeModal - Función para cerrar el modal
 * @property {Function} showSuccess - Atajo para modal de éxito
 * @property {Function} showError - Atajo para modal de error
 * @property {Function} showWarning - Atajo para modal de advertencia
 * @property {Function} showConfirm - Atajo para modal de confirmación
 */
export const useModal = () => {
  const [modal, setModal] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false,
    confirmText: 'Aceptar', // Texto personalizable para el botón de confirmar
    isProcessing: false // Nuevo estado para prevenir múltiples clicks
  });

  /**
   * Muestra un modal con configuración personalizada
   */
  const showModal = useCallback((type, title, message, onConfirm = null, showCancel = false, confirmText = 'Aceptar') => {
    setModal({
      show: true,
      type,
      title,
      message,
      onConfirm,
      showCancel,
      confirmText,
      isProcessing: false
    });
  }, []);

  /**
   * Cierra el modal actual
   */
  const closeModal = useCallback(() => {
    setModal(prev => ({ ...prev, show: false, isProcessing: false }));
  }, []);

  /**
   * Marca el modal como procesando (deshabilita botones)
   */
  const setModalProcessing = useCallback((isProcessing) => {
    setModal(prev => ({ ...prev, isProcessing }));
  }, []);

  /**
   * Atajos para tipos de modales comunes
   */
  const showSuccess = useCallback((title, message, onConfirm = null) => {
    showModal('success', title, message, onConfirm, false);
  }, [showModal]);

  const showError = useCallback((title, message, onConfirm = null) => {
    showModal('error', title, message, onConfirm, false);
  }, [showModal]);

  const showWarning = useCallback((title, message, onConfirm = null, showCancel = false) => {
    showModal('warning', title, message, onConfirm, showCancel);
  }, [showModal]);

  const showConfirm = useCallback((title, message, onConfirm, showCancel = true) => {
    showModal('confirm', title, message, onConfirm, showCancel);
  }, [showModal]);

  const showInfo = useCallback((title, message, onConfirm = null) => {
    showModal('info', title, message, onConfirm, false);
  }, [showModal]);

  return {
    modal,
    showModal,
    closeModal,
    setModalProcessing,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
    showInfo
  };
};

export default useModal;
