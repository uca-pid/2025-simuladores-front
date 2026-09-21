import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../services/api';

/**
 * Parser simple de CSV: soporta campos entre comillas dobles (con comas o
 * comillas escapadas adentro) y campos sin comillas separados por coma.
 * Suficiente para datasets de examen (no busca cubrir el estándar RFC completo).
 */
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some(f => f !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some(f => f !== '')) rows.push(row);

  return rows;
};

/**
 * Muestra un CSV de examen como tabla, para que el alumno pueda inspeccionar
 * visualmente los datos con los que va a trabajar (mismo espíritu que una
 * función "imprimirVuelos" dada por el profesor, pero genérica y automática).
 *
 * `standalone`: cuando el llamador ya decide cuándo mostrar el componente
 * (ej. una tab dedicada "Datos"), se omite el botón propio de expandir/
 * colapsar y se carga y muestra la tabla directamente al montar.
 */
const CsvDatasetViewer = ({ url, nombre, standalone = false }) => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(standalone);

  const fullUrl = url?.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  useEffect(() => {
    if (!expanded || rows || !url) return;

    let cancelled = false;
    fetch(fullUrl)
      .then(res => res.text())
      .then(text => { if (!cancelled) setRows(parseCsv(text)); })
      .catch(err => { if (!cancelled) setError(err.message || 'No se pudo cargar el archivo'); });

    return () => { cancelled = true; };
  }, [expanded, fullUrl, rows, url]);

  if (!url) return null;

  const [header, ...body] = rows || [[]];

  const table = (
    <div className="dataset-csv-table-wrapper">
      {error && <div className="enunciado-archivo-error">No se pudo mostrar el archivo: {error}</div>}
      {!error && !rows && <div className="enunciado-archivo-loading">Cargando datos...</div>}
      {!error && rows && (
        <table className="dataset-csv-table">
          <thead>
            <tr>
              {header.map((col, i) => <th key={i}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {body.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => <td key={j}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  if (standalone) {
    return <div className="dataset-csv-viewer">{table}</div>;
  }

  return (
    <div className="dataset-csv-viewer">
      <button
        type="button"
        className="dataset-csv-toggle"
        onClick={() => setExpanded(e => !e)}
      >
        <i className={`fas fa-chevron-${expanded ? 'down' : 'right'} me-2`}></i>
        <i className="fas fa-table me-2"></i>
        Ver datos ({nombre || 'archivo.csv'})
      </button>

      {expanded && table}
    </div>
  );
};

export default CsvDatasetViewer;
