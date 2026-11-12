import React from "react";

/**
 * Imagen opcional de una opción de multiple choice / multiple response
 * (`pregunta.imagenesOpciones[i]`). No renderiza nada si la opción no tiene.
 */
const OptionImage = ({ url, maxHeight = 160 }) => {
  if (!url) return null;

  return (
    <img
      src={url}
      alt=""
      style={{
        display: 'block',
        maxWidth: '100%',
        maxHeight: `${maxHeight}px`,
        borderRadius: '6px',
        border: '1px solid var(--border-color, #dee2e6)',
        marginTop: '0.4rem'
      }}
    />
  );
};

export default OptionImage;
