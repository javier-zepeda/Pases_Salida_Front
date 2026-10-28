// Estructura del menú de la barra lateral.

// Íconos disponibles (dibujados en barra-lateral.html)
export type IconoMenu = 'inicio' | 'lista' | 'nuevo' | 'taller' | 'sede' | 'portal' | 'salir';

export interface OpcionMenu {
  texto: string;
  icono: IconoMenu;
  // Usar solo uno de los tres:
  ruta?: string;            // pantalla de esta aplicación (ej. '/pases')
  urlExterna?: string;      // otra aplicación (ej. el Portal)
  accion?: () => void;      // un botón (ej. cerrar sesión)
  rutaExacta?: boolean;
}

// Usuario que se muestra arriba de la barra (opcional)
export interface UsuarioMenu {
  nombre: string;          // nombre corto que se ve (ej. "Javier Zepeda")
  nombreCompleto: string;  // aparece al pasar el mouse
  iniciales: string;       // dentro del círculo (ej. "JZ")
  detalle: string;         // debajo del nombre (ej. el rol)
}

export interface SeccionMenu {
  titulo: string;
  opciones: OpcionMenu[];
}
