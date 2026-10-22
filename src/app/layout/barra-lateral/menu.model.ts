// Estructura del menú de la barra lateral.

// Íconos disponibles (dibujados en barra-lateral.html)
export type IconoMenu = 'lista' | 'nuevo' | 'taller' | 'sede' | 'portal' | 'salir';

export interface OpcionMenu {
  texto: string;
  icono: IconoMenu;
  // Usar solo uno de los tres:
  ruta?: string;            // pantalla de esta aplicación (ej. '/pases')
  urlExterna?: string;      // otra aplicación (ej. el Portal)
  accion?: () => void;      // un botón (ej. cerrar sesión)
  rutaExacta?: boolean;
}

export interface SeccionMenu {
  titulo: string;
  opciones: OpcionMenu[];
}
