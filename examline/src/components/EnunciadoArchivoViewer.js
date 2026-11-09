import React, { useEffect, useRef, useState, useCallback } from 'react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import { API_BASE_URL } from '../services/api';

// Worker propio (bundleado), sin depender de un CDN externo ni del visor
// nativo del navegador (que puede traer extensiones de terceros como
// "Abrir en Acrobat" superpuestas, o controles que navegan fuera de la app).
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Renderiza un PDF a canvas, página por página, en un contenedor con scroll
 * vertical únicamente. Sin toolbar, sin links, sin forma de navegar afuera:
 * es solo una imagen del documento que el alumno puede leer y scrollear.
 */
const MIN_ZOOM = 0.5; // relativo al "ajustar al ancho"
const MAX_ZOOM = 3;

const PdfCanvasViewer = ({ url }) => {
  const containerRef = useRef(null);
  const pdfRef = useRef(null);
  const fitScaleRef = useRef(null); // escala que hace que la página entre en el ancho del panel, referencia para calcular el % mostrado
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(null); // escala real usada para renderizar

  const zoomPercent = fitScaleRef.current && scale ? Math.round((scale / fitScaleRef.current) * 100) : 100;

  const renderPages = useCallback(async (pdf, currentScale) => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: currentScale });

      const pageWrapper = document.createElement('div');
      pageWrapper.style.position = 'relative';
      pageWrapper.style.width = `${viewport.width}px`;
      pageWrapper.style.height = `${viewport.height}px`;
      pageWrapper.style.margin = '0 auto 12px auto';
      pageWrapper.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';

      // Renderizamos el canvas a la resolución real de píxeles del dispositivo
      // (devicePixelRatio) para que no se vea borroso en pantallas de alta
      // densidad o con escalado de Windows >100%, y lo achicamos visualmente
      // con CSS al tamaño "lógico" que corresponde (viewport.width/height).
      const dpr = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      canvas.style.display = 'block';

      const context = canvas.getContext('2d');
      context.scale(dpr, dpr);
      await page.render({ canvasContext: context, viewport }).promise;

      // Capa de texto invisible superpuesta al canvas: permite seleccionar y
      // copiar el texto real del PDF, alineada pixel a pixel con la imagen.
      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'textLayer';
      textLayerDiv.style.position = 'absolute';
      textLayerDiv.style.top = '0';
      textLayerDiv.style.left = '0';

      const textContent = await page.getTextContent();
      const textLayer = new pdfjsLib.TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport
      });
      await textLayer.render();

      pageWrapper.appendChild(canvas);
      pageWrapper.appendChild(textLayerDiv);
      containerRef.current.appendChild(pageWrapper);
    }
  }, []);

  // Carga el documento y calcula la escala inicial para que la página entre
  // exactamente en el ancho disponible del panel (sin scroll horizontal).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    pdfRef.current = null;
    fitScaleRef.current = null;
    setScale(null);

    pdfjsLib.getDocument(url).promise
      .then(async (pdf) => {
        if (cancelled) return;
        pdfRef.current = pdf;

        const firstPage = await pdf.getPage(1);
        const nativeWidth = firstPage.getViewport({ scale: 1 }).width;
        const availableWidth = (containerRef.current?.clientWidth || 360) - 4; // margen por el borde
        const computedFitScale = availableWidth / nativeWidth;

        if (cancelled) return;
        fitScaleRef.current = computedFitScale;
        setScale(computedFitScale); // dispara el efecto de render de abajo
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'No se pudo abrir el PDF');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [url]);

  // Renderiza (o re-renderiza) las páginas cada vez que la escala cambia:
  // tanto en la carga inicial como al usar los botones de zoom.
  useEffect(() => {
    if (!pdfRef.current || !scale) return;
    let cancelled = false;

    renderPages(pdfRef.current, scale).then(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [scale, renderPages]);

  const zoomOut = () => setScale(s => Math.max(fitScaleRef.current * MIN_ZOOM, s - fitScaleRef.current * 0.2));
  const zoomIn = () => setScale(s => Math.min(fitScaleRef.current * MAX_ZOOM, s + fitScaleRef.current * 0.2));

  if (error) {
    return <div className="enunciado-archivo-error">No se pudo mostrar el PDF: {error}</div>;
  }

  return (
    <div>
      <div className="enunciado-archivo-toolbar">
        <button
          type="button"
          onClick={zoomOut}
          disabled={!scale || scale <= fitScaleRef.current * MIN_ZOOM}
          aria-label="Alejar"
        >
          <i className="fas fa-search-minus"></i>
        </button>
        <span>{zoomPercent}%</span>
        <button
          type="button"
          onClick={zoomIn}
          disabled={!scale || scale >= fitScaleRef.current * MAX_ZOOM}
          aria-label="Acercar"
        >
          <i className="fas fa-search-plus"></i>
        </button>
      </div>
      {loading && <div className="enunciado-archivo-loading">Cargando PDF...</div>}
      <div ref={containerRef} className="enunciado-archivo-pdf" />
    </div>
  );
};

/**
 * Muestra embebido un archivo de consigna (PDF o DOCX) a partir de la ruta
 * relativa devuelta por el backend al subirlo (ej. "/uploads/enunciados/x.pdf").
 * PDF se renderiza a canvas con pdf.js (solo lectura, solo scroll, sin salir
 * de la app); DOCX se convierte a HTML en el cliente con mammoth.
 */
const EnunciadoArchivoViewer = ({ url, nombre }) => {
  const [docxHtml, setDocxHtml] = useState(null);
  const [error, setError] = useState(null);

  const fullUrl = url?.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const isDocx = /\.docx$/i.test(url || '');

  useEffect(() => {
    if (!isDocx || !url) return;

    let cancelled = false;
    setDocxHtml(null);
    setError(null);

    fetch(fullUrl)
      .then(res => res.arrayBuffer())
      .then(buffer => mammoth.convertToHtml({ arrayBuffer: buffer }))
      .then(result => { if (!cancelled) setDocxHtml(result.value); })
      .catch(err => { if (!cancelled) setError(err.message || 'No se pudo abrir el archivo'); });

    return () => { cancelled = true; };
  }, [fullUrl, isDocx, url]);

  if (!url) return null;

  if (isDocx) {
    if (error) {
      return (
        <div className="enunciado-archivo-error">
          No se pudo mostrar {nombre || 'el archivo'}: {error}
        </div>
      );
    }
    if (!docxHtml) {
      return <div className="enunciado-archivo-loading">Cargando {nombre || 'documento'}...</div>;
    }
    return (
      <div
        className="enunciado-archivo-docx"
        dangerouslySetInnerHTML={{ __html: docxHtml }}
      />
    );
  }

  return <PdfCanvasViewer url={fullUrl} />;
};

export default EnunciadoArchivoViewer;
