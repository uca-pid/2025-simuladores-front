import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Componente que hace scroll al top de la página cuando cambia la ruta.
 * Debe colocarse dentro del Router pero fuera de Routes.
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Hacer scroll al top de la página cuando cambia la ruta
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default ScrollToTop;
