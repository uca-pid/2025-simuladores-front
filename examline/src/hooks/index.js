/**
 * Exportaciones centralizadas de hooks personalizados
 * Facilita la importación de múltiples hooks en los componentes
 * 
 * Ejemplo de uso:
 * import { useModal, useSEB } from '../hooks';
 */

export { useModal } from './useModal';
export { useSEB } from './useSEB';

// Exportar también como default para compatibilidad
export { default as useModalDefault } from './useModal';
export { default as useSEBDefault } from './useSEB';
