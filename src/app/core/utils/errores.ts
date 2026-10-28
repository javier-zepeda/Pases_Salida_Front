import { HttpErrorResponse } from '@angular/common/http';

// Mensajes de error que manda el back. Puede mandar:
//   { mensaje, errores: [...] }  → validación (400): se muestra la lista
//   { mensaje }                  → cualquier otro error (404, 409...)
// Si no trae nada (sin conexión), se usa mensajeGeneral.
export function leerErrores(error: HttpErrorResponse, mensajeGeneral: string): string[] {
  const cuerpo = error.error;

  if (cuerpo && Array.isArray(cuerpo.errores) && cuerpo.errores.length > 0) {
    return cuerpo.errores;
  }
  if (cuerpo && typeof cuerpo.mensaje === 'string') {
    return [cuerpo.mensaje];
  }
  if (error.status === 403) {
    return ['No tiene permiso para realizar esta acción.'];
  }
  return [mensajeGeneral];
}
