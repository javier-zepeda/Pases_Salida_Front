import { RegistroBitacora } from '../models/pase.model';

// Convierte un registro de la bitácora (acción + JSON) en texto fácil de leer
// para el historial del pase. Ejemplo:
//   { accion: 'EDITAR', detalle: '{"cambios":{"placa":{"antes":"A","despues":"B"}}}' }
//   → { titulo: 'Editó el pase', lineas: ['Placa: A → B'] }

export interface MovimientoLegible {
  titulo: string;
  lineas: string[];
  tipo: 'crear' | 'editar' | 'autorizar' | 'anular' | 'sistema';  // para el color del punto
}

// Nombre para mostrar de cada campo que se puede editar
const NOMBRES_DE_CAMPOS: Record<string, string> = {
  codigo_cliente: 'Código de cliente',
  cliente: 'Cliente',
  tipo_vehiculo: 'Tipo de vehículo',
  marca: 'Marca',
  placa: 'Placa',
  chasis: 'Chasis',
  piloto: 'Piloto',
  supervisor: 'Supervisor',
  observaciones: 'Observaciones',
  facturar_orden: 'Facturar orden',
  taller_destino: 'Taller de destino',
  detalle: 'Artículos'
};

export function describirMovimiento(registro: RegistroBitacora): MovimientoLegible {
  const detalle = leerDetalle(registro.detalle);

  if (registro.accion === 'CREAR') {
    return describirCreacion(detalle);
  }
  if (registro.accion === 'EDITAR') {
    return describirEdicion(detalle);
  }
  if (registro.accion === 'AUTORIZAR') {
    return describirAutorizacion(detalle);
  }
  if (registro.accion === 'ANULAR') {
    const lineas: string[] = [];
    if (detalle.motivo) {
      lineas.push('Motivo: ' + detalle.motivo);
    }
    return { titulo: 'Anuló el pase', lineas: lineas, tipo: 'anular' };
  }
  if (registro.accion === 'ADJUNTAR') {
    const archivos = Array.isArray(detalle.archivos) ? detalle.archivos : [];
    let titulo = 'Adjuntó ' + archivos.length + ' imágenes';
    if (archivos.length === 1) {
      titulo = 'Adjuntó una imagen';
    }
    return { titulo: titulo, lineas: archivos, tipo: 'editar' };
  }
  if (registro.accion === 'QUITAR_ADJUNTO') {
    const lineas: string[] = [];
    if (detalle.archivo) {
      lineas.push(detalle.archivo);
    }
    return { titulo: 'Quitó una imagen', lineas: lineas, tipo: 'editar' };
  }
  if (registro.accion === 'MIGRACION') {
    return { titulo: 'Pase traído del sistema anterior', lineas: [], tipo: 'sistema' };
  }
  if (registro.accion === 'RECLASIFICAR') {
    return {
      titulo: 'Se ajustó el tipo de pase',
      lineas: ['El pase no tenía una orden de trabajo válida y se cambió de tipo al migrar los datos.'],
      tipo: 'sistema'
    };
  }

  return { titulo: registro.accion, lineas: [], tipo: 'sistema' };
}

function describirCreacion(detalle: any): MovimientoLegible {
  const lineas: string[] = [];

  if (detalle.autorizado_al_crear === true) {
    lineas.push('Quedó autorizado al crearlo.');
  }
  agregarOrdenesPendientes(lineas, detalle.ordenes_pendientes);

  return { titulo: 'Creó el pase', lineas: lineas, tipo: 'crear' };
}

function describirEdicion(detalle: any): MovimientoLegible {
  const lineas: string[] = [];
  const cambios = detalle.cambios || {};

  for (const campo of Object.keys(cambios)) {
    let nombre = NOMBRES_DE_CAMPOS[campo];
    if (!nombre) {
      nombre = campo;
    }

    if (campo === 'detalle') {
      lineas.push('Cambió la lista de artículos.');
    } else {
      const antes = mostrarValor(cambios[campo].antes);
      const despues = mostrarValor(cambios[campo].despues);
      lineas.push(nombre + ': ' + antes + ' → ' + despues);
    }
  }

  return { titulo: 'Editó el pase', lineas: lineas, tipo: 'editar' };
}

function describirAutorizacion(detalle: any): MovimientoLegible {
  const lineas: string[] = [];

  if (detalle.autorizado_con_pendientes === true) {
    lineas.push('Se autorizó aunque el vehículo tenía otras órdenes sin facturar.');
  }
  if (detalle.validacion_integra === 'NO_DISPONIBLE') {
    lineas.push('No se pudo revisar Integra en ese momento.');
  }
  agregarOrdenesPendientes(lineas, detalle.ordenes_pendientes);

  return { titulo: 'Autorizó el pase', lineas: lineas, tipo: 'autorizar' };
}

// "Órdenes sin facturar: SIM-01, SIM-02"
function agregarOrdenesPendientes(lineas: string[], ordenes: any): void {
  if (!Array.isArray(ordenes) || ordenes.length === 0) {
    return;
  }
  const numeros = ordenes.map((orden) => orden.numero_orden);
  lineas.push('Órdenes sin facturar en ese momento: ' + numeros.join(', '));
}

function mostrarValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') {
    return '(vacío)';
  }
  if (valor === true) {
    return 'Sí';
  }
  if (valor === false) {
    return 'No';
  }
  return String(valor);
}

// El detalle viene como texto JSON; si no se puede leer se ignora
function leerDetalle(texto: string | null): any {
  if (!texto) {
    return {};
  }
  try {
    return JSON.parse(texto);
  } catch {
    return {};
  }
}
