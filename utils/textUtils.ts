/**
 * Utilidades de manipulación y normalización de texto para Auralib
 */

/**
 * Normaliza una cadena de texto quitando acentos, diacríticos y convirtiéndola a minúsculas.
 * Ideal para búsquedas insensibles a mayúsculas y acentos.
 */
export const normalizarTexto = (texto: string): string => {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

/**
 * Limpia la puntuación inicial y final estándar en catalogación (ej: " /", " ,", " :", etc.),
 * conservando el guion medio al final cuando se trate de fechas abiertas de autores vivos (ej: "1968-", "ca. 1950-").
 */
export const cleanPunctuation = (str?: string): string | undefined => {
  if (!str) return undefined;
  let s = str.trim();
  
  // Limpiar puntuación/espacios iniciales
  s = s.replace(/^[\s\/\,;:._\-]+/, '').trim();
  
  // Proteger fechas abiertas de personas vivas (ej: "1968-", "ca. 1950-", "Alcoba, Laura, 1968-")
  const hasOpenDate = /(?:\b|\()(?:\d{1,4}|ca\.\s*\d{1,4}|fl\.\s*\d{1,4})\s*-\s*[\s\/\,;:._]*$/i.test(s);

  if (hasOpenDate) {
    // Quitar únicamente puntuación externa como comas o puntos tras el guion (ej: "1968-." o "1968-,")
    s = s.replace(/[\s\/\,;:._]+$/, '').trim();
    s = s.replace(/((?:\b|\()(?:\d{1,4}|ca\.\s*\d{1,4}|fl\.\s*\d{1,4}))\s*-\s*$/, '$1-');
    if (!s.endsWith('-')) {
      s = s.replace(/((?:\b|\()(?:\d{1,4}|ca\.\s*\d{1,4}|fl\.\s*\d{1,4})-).*$/, '$1').trim();
    }
  } else {
    // Limpiar puntuación/espacios finales que no sean puntos
    s = s.replace(/[\s\/\,;:_\-]+$/, '').trim();
    
    // Manejo especial del punto final para proteger abreviaturas de catalogación (ej: p., il., col., cm., ed., vol., etc.)
    if (s.endsWith('.')) {
      const isAbbreviation = /\b[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]{1,4}\.$/.test(s);
      if (!isAbbreviation) {
        s = s.slice(0, -1).trim();
        s = s.replace(/[\s\/\,;:_\-]+$/, '').trim();
      }
    }
  }
  
  return s || undefined;
};

/**
 * Limpia y normaliza fechas asociadas a autoridades o responsabilidades (MARC 21 subcampo $d),
 * conservando estrictamente el guion medio para autores vivos (ej: "1968-", "ca. 1950-").
 */
export const cleanAuthorDate = (str?: string): string | undefined => {
  if (!str) return undefined;
  let s = str.trim();
  // Limpiar puntuación inicial no deseada (comas, dos puntos, barras, etc.)
  s = s.replace(/^[\s\/\,;:._]+/, '').trim();
  
  // Proteger y normalizar fechas con guion abierto (autor vivo)
  const hasOpenDate = /(?:\b|\()(?:\d{1,4}|ca\.\s*\d{1,4}|fl\.\s*\d{1,4})\s*-\s*[\s\/\,;:._]*$/i.test(s);
  if (hasOpenDate) {
    s = s.replace(/[\s\/\,;:._]+$/, '').trim();
    s = s.replace(/((?:\b|\()(?:\d{1,4}|ca\.\s*\d{1,4}|fl\.\s*\d{1,4}))\s*-\s*$/, '$1-');
    if (!s.endsWith('-')) {
      s = s.replace(/((?:\b|\()(?:\d{1,4}|ca\.\s*\d{1,4}|fl\.\s*\d{1,4})-).*$/, '$1').trim();
    }
  } else {
    // Si no es fecha abierta, limpiar puntuación final estándar
    s = s.replace(/[\s\/\,;:_\-]+$/, '').trim();
    if (s.endsWith('.')) {
      const isAbbreviation = /\b(ca|c|fl|aprox|a\.C|d\.C)\.$/i.test(s);
      if (!isAbbreviation) {
        s = s.slice(0, -1).trim();
        s = s.replace(/[\s\/\,;:_\-]+$/, '').trim();
      }
    }
  }
  return s || undefined;
};

/**
 * Normaliza y compara dos nombres de autor para detectar si son el mismo.
 */
export const esAutorDuplicado = (nombre1?: string, nombre2?: string): boolean => {
  if (!nombre1 || !nombre2) return false;
  
  const normalizar = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\((autor|coautor|editor|compilador|director|colaborador|otro|corporativa|geografica)\)/gi, "")
      .replace(/[^a-z0-9]/gi, "")
      .trim();
  };

  const n1 = normalizar(nombre1);
  const n2 = normalizar(nombre2);

  if (!n1 || !n2) return false;
  return n1 === n2;
};
