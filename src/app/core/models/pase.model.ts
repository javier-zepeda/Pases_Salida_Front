// Plantilla de datos para enviar al Backend 

// Estados del pase (Pases_Taller.estado_pase)
export const ESTADO_CREADO = 0;
export const ESTADO_AUTORIZADO = 1;
export const ESTADO_ANULADO = 2;

// Una fila del listado (GET /api/pases)
export interface PaseResumen {
  id_pase: number;
  tipo_pase_id: number;
  tipo_pase: string;
  numero_orden: string | null;
  cliente: string | null;
  tipo_vehiculo: string | null;
  marca: string | null;
  placa: string | null;
  piloto: string | null;
  taller: string | null;
  estado_id: number;
  estado: string;
  creado_por_nombre: string | null;
  fecha_creacion: string;
  autorizado_por_nombre: string | null;
  fecha_autorizacion: string | null;
}

// Respuesta del listado con paginación
export interface RespuestaListado {
  pases: PaseResumen[];
  total: number;
  pagina: number;
  tamanoPagina: number;
}

// Filtros del listado
export interface FiltrosListado {
  pagina: number;
  tamanoPagina: number;
  estado: number | null;
  tipo: number | null;
  busqueda: string;
}

// Una línea de artículos de un pase de suministros
export interface LineaSuministro {
  linea: number;
  descripcion: string;
  cantidad: number;
  unidad: string | null;
}

// Foto o archivo adjunto al pase
export interface Adjunto {
  id_adjunto: number;
  nombre_archivo: string | null;
  ruta: string;
  content_type: string | null;
  fecha_subida: string;
}

// Un movimiento del historial del pase (crear, editar, autorizar, anular…)
export interface RegistroBitacora {
  accion: string;
  usuario_nombre: string | null;
  detalle: string | null;   // JSON en texto, depende de la acción
  fecha: string;
}

// Pase completo (GET /api/pases/:id)
export interface PaseDetalle extends PaseResumen {
  tipo_pase_codigo: string;
  requiere_orden: boolean;
  valida_pendientes: boolean;
  lleva_detalle: boolean;
  origen_orden: string | null;
  codigo_cliente: string | null;
  chasis: string | null;
  supervisor: string | null;
  observaciones: string | null;
  facturar_orden: boolean;
  taller_id: number | null;
  anulado_por_nombre: string | null;
  fecha_anulacion: string | null;
  motivo_anulacion: string | null;
  detalle: LineaSuministro[];
  adjuntos: Adjunto[];
  bitacora: RegistroBitacora[];
}

// Otra orden abierta sin facturar del mismo vehículo o del mismo cliente
export interface OrdenPendiente {
  numero_orden: string;
  cliente: string | null;
  placa: string | null;
  estado: string | null;
  fecha_apertura: string | null;
  relacion: 'VEHICULO' | 'CLIENTE';
}

// Respuesta al autorizar (POST /api/pases/:id/autorizar)
export interface RespuestaAutorizar {
  mensaje: string;
  id_pase: number;
  advertencias: OrdenPendiente[];   // órdenes del mismo cliente (no bloquean)
}

// Respuesta de error del back cuando no se puede autorizar (409)
export interface ErrorAutorizar {
  mensaje: string;
  requiere_confirmacion?: boolean;
  ordenes_pendientes?: OrdenPendiente[];
}
// El back ya valida los vacios y los transforma en null, no hace falta colocar string o null aca
export interface DatosPase {
  tipo_pase_id: number;
  taller_id: number;
  numero_orden: string;
  codigo_cliente: string;
  cliente: string;
  tipo_vehiculo: string;
  marca: string;
  placa: string;
  chasis: string;
  piloto: string;
  supervisor: string;
  observaciones: string;
  facturar_orden: boolean;
  detalle: LineaSuministro[];
}

// Respuesta al crear un pase
export interface RespuestaCrear {
  mensaje: string;
  id_pase: number;
  estado_id: number;                       // 1 si quedó autorizado al crearlo (cajero)
  ordenes_pendientes: OrdenPendiente[];
}

// Respuesta al editar un pase
export interface RespuestaEditar {
  mensaje: string;
  id_pase: number;
  campos_modificados: string[];
}

// Respuesta del back cuando los datos no son válidos (400)
export interface ErrorValidacion {
  mensaje: string;
  errores?: string[];                      // ej. ['El campo «placa» es obligatorio']
}

// Aviso que una pantalla le pasa al detalle al abrirlo (ej. "Los cambios se guardaron")
export interface AvisoAlAbrir {
  texto: string;
  tipo: 'exito' | 'advertencia' | 'info';
}
