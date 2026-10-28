// Taller tal como lo devuelve GET /api/mantenimiento/talleres
// (distinto de Taller en catalogo.model.ts, que es el que se usa en los formularios de pases)
export interface TallerMantenimiento {
  id_taller: number;
  nombre: string;
  codigo: string | null;        // código del taller en Integra (ej. CEN, Z18)
  sede_id: number | null;
  sede: string | null;          // nombre de la sede
  sede_activa: boolean | null;
  activo: boolean;
  usuarios: number;             // usuarios que tienen asignado este taller
}

// Lo que se manda al crear (POST) o editar (PUT).
// Al editar se mandan siempre los tres campos: el back los reemplaza todos.
export interface DatosTaller {
  nombre: string;
  codigo: string;
  sede_id: number | null;
}

// Respuesta de crear, editar y cambiar estado
export interface RespuestaTaller {
  mensaje: string;
  id_taller: number;
}
