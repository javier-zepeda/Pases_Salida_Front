import { CanDeactivateFn } from '@angular/router';

// Una pantalla que puede tener datos escritos sin guardar (ej. el formulario del pase)
export interface ConCambiosSinGuardar {
  hayCambiosSinGuardar(): boolean;
}

// Guard de salida: antes de dejar la pantalla
export const confirmarSalidaSinGuardar: CanDeactivateFn<ConCambiosSinGuardar> = (pantalla) => {
  if (!pantalla.hayCambiosSinGuardar()) {
    return true;
  }
  return window.confirm('Tiene cambios sin guardar. ¿Desea salir y perderlos?');
};
