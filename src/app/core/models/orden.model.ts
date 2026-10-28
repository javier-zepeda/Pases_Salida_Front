import { OrdenPendiente } from './pase.model';

//Orden de trabajo tal como la devuelve Integra
export interface OrdenIntegra {
  numero_orden: string;
  taller: string | null;           // código del taller en Integra (CEN, REU, ...)
  codigo_cliente: string | null;
  cliente: string | null;
  placa: string | null;
  chasis: string | null;
  marca: string | null;
  tipo_vehiculo: string | null;
  estado: string | null;
}

// Respuesta de GET /api/ordenes/:numero
// disponible = false → Integra no respondió: el usuario llena los datos a mano
export interface ConsultaOrden {
  disponible: boolean;
  mensaje?: string;
  orden: OrdenIntegra | null;
  ordenes_pendientes: OrdenPendiente[];
}

