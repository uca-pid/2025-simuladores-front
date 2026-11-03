const SIN_TITULO = "Sin título";

export const autoTitulo = (texto) => {
  const limpio = (texto || "").replace(/\s+/g, " ").trim();
  if (!limpio) return SIN_TITULO;
  return limpio.length > 60 ? `${limpio.slice(0, 57)}…` : limpio;
};

export const displayTitulo = (question) =>
  question.titulo && question.titulo !== SIN_TITULO ? question.titulo : autoTitulo(question.texto);
