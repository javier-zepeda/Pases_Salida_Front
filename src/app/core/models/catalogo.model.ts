// Tipo de pase con sus reglas (GET /api/catalogos/tipos-pase)
export interface TipoPase {
  id_tipo: number;
  codigo: string;
  nombre: string;
  requiere_orden: boolean;     // lleva número de orden y cliente
  valida_pendientes: boolean;  // revisa órdenes sin facturar
  lleva_detalle: boolean;      // lleva lista de artículos (suministros)
  lleva_destino: boolean;      // pide el taller de destino (traslado)
}

// Taller que el usuario puede usar (GET /api/catalogos/talleres)
export interface Taller {
  id_taller: number;
  nombre: string;
  codigo: string | null;
  sede: string | null;
}
