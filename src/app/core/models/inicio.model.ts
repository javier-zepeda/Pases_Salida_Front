// Números de las tarjetas de Inicio (GET /api/inicio/resumen)
export interface ResumenInicio {
  pases: number;               // pases de los talleres que el usuario puede ver
  por_autorizar: number;       // de esos, los que están en estado Creado
  sedes: number | null;        // sedes activas (null si no tiene catalogos.ver)
  talleres: number | null;     // talleres activos (null si no tiene catalogos.ver)
}
