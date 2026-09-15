/**
 * Exportaciones centralizadas de hooks personalizados
 * Facilita la importación de múltiples hooks en los componentes
 * 
 * Ejemplo de uso:
 * import { useModal, useSEB } from '../hooks';
 */

export { useModal } from './useModal';
export { useSEB } from './useSEB';
export { useExamAttempt } from './useExamAttempt';
export { useExamFiles } from './useExamFiles';
export { useCodeCompiler } from './useCodeCompiler';
export { useExamFinish } from './useExamFinish';
export { useMultipleChoiceAttempt } from './useMultipleChoiceAttempt';

// Exportar también como default para compatibilidad
export { default as useModalDefault } from './useModal';
export { default as useSEBDefault } from './useSEB';
export { default as useExamAttemptDefault } from './useExamAttempt';
export { default as useExamFilesDefault } from './useExamFiles';
export { default as useCodeCompilerDefault } from './useCodeCompiler';
export { default as useExamFinishDefault } from './useExamFinish';
export { default as useMultipleChoiceAttemptDefault } from './useMultipleChoiceAttempt';
