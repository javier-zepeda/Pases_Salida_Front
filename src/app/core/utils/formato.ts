import { ESTADO_AUTORIZADO, ESTADO_ANULADO } from '../models/pase.model';

// Funciones pequeñas para mostrar datos de forma consistente en todas las pantallas.

// Número de pase con 7 dígitos, igual que en el PDF: 66420 → "0066420"
export function formatearNumeroPase(idPase: number): string {
  return String(idPase).padStart(7, '0');
}

// Clase CSS de la etiqueta de estado (ver .estado--* en styles.css)
export function claseDeEstado(estadoId: number): string {
  if (estadoId === ESTADO_AUTORIZADO) {
    return 'estado estado--autorizado';
  }
  if (estadoId === ESTADO_ANULADO) {
    return 'estado estado--anulado';
  }
  return 'estado estado--creado';
}
