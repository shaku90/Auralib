/**
 * Utilidades de manipulación y formateo de fechas para Auralib
 */

/**
 * Formatea una cadena ISO a fecha legible en formato argentino (DD/MM/YYYY).
 */
export const formatFecha = (isoString?: string): string => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Determina si una fecha dada en formato ISO ya venció respecto del inicio del día de hoy.
 */
export const isVencido = (isoString: string): boolean => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(isoString);
  fecha.setHours(0, 0, 0, 0);
  return fecha < hoy;
};

/**
 * Calcula la edad en años a partir de una cadena de fecha de nacimiento (YYYY-MM-DD).
 */
export const calculateAge = (birthDate?: string): string => {
  if (!birthDate) return '-';
  const birthDateObj = new Date(birthDate.includes('T') ? birthDate : `${birthDate}T00:00:00`);
  if (isNaN(birthDateObj.getTime())) return '-';
  
  const today = new Date();
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const m = today.getMonth() - birthDateObj.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  return `${age} años`;
};

/**
 * Calcula la diferencia en días entre la fecha de hoy y una fecha objetivo.
 * Devuelve un número positivo de días vencidos si hoy es mayor a la fecha objetivo.
 */
export const calcularDiasVencidos = (fechaObjetivoIso: string): number => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaObjetivoIso);
  fecha.setHours(0, 0, 0, 0);
  
  const diffTime = hoy.getTime() - fecha.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};
