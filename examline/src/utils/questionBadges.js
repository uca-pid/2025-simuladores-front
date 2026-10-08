// Fuente única de verdad para los colores/íconos de badges de tipo y
// dificultad de pregunta, compartida entre ExamPartBuilder y
// QuestionBankSelector (antes cada uno tenía su propia copia parcial).
export const TIPO_BADGE = {
  multiple_choice: { label: 'Múltiple', color: '#007bff', icon: 'fa-list-ul' },
  multiple_response: { label: 'Múltiple (varias)', color: '#0dcaf0', icon: 'fa-check-square' },
  true_false: { label: 'V/F', color: '#28a745', icon: 'fa-check-double' },
  fill_in_blank: { label: 'Completar', color: '#ffc107', icon: 'fa-fill-drip' },
  matching: { label: 'Unir', color: '#9c27b0', icon: 'fa-arrows-alt-h' },
  short_answer: { label: 'Resp. Corta', color: '#17a2b8', icon: 'fa-font' },
  numeric: { label: 'Numérica', color: '#fd7e14', icon: 'fa-calculator' },
  essay: { label: 'Desarrollo', color: '#6c757d', icon: 'fa-pen-fancy' },
  file_upload: { label: 'Archivo', color: '#20c997', icon: 'fa-paperclip' },
};

export const DIFICULTAD_BADGE = {
  facil: { label: 'Fácil', color: '#28a745' },
  media: { label: 'Media', color: '#fd7e14' },
  dificil: { label: 'Difícil', color: '#dc3545' },
};

export const getTipoBadge = (tipo) => TIPO_BADGE[tipo] || TIPO_BADGE.multiple_choice;
export const getDificultadBadge = (dificultad) => DIFICULTAD_BADGE[dificultad] || DIFICULTAD_BADGE.media;
