import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { TipoPase, Taller } from '../../core/models/catalogo.model';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CatalogosService } from '../../core/services/catalogos.service';
import { SesionService } from '../../core/services/sesion.service';
import { PasesService } from '../../core/services/pases.service';
import { OrdenesService } from '../../core/services/ordenes.service';
import {
  DatosPase,
  ErrorValidacion,
  OrdenPendiente,
  LineaSuministro,
  PaseDetalle,
  AvisoAlAbrir,
  RespuestaCrear,
  ESTADO_AUTORIZADO,
  ESTADO_ANULADO,
} from '../../core/models/pase.model';
import { OrdenIntegra } from '../../core/models/orden.model';
import { formatearNumeroPase } from '../../core/utils/formato';
import { forkJoin, of } from 'rxjs';
import { DatePipe } from '@angular/common';
import { ConCambiosSinGuardar } from '../../core/guards/cambios-sin-guardar.guard';

// Ícono y descripción de los tipos de pase
const DESCRIPCION_DE_TIPOS: Record<string, { icono: string; descripcion: string }> = {
  UNIDAD_TERMINADA: {
    icono: 'img/tipos/unidad_terminada.png',
    descripcion: 'Vehículo de un cliente que ya se reparó y se entrega',
  },
  PRUEBA_CARRETERA: {
    icono: 'img/tipos/prueba_carretera.png',
    descripcion: 'Vehículo de un cliente que sale a probarse y regresa',
  },
  VEHICULO_INTERNO: {
    icono: 'img/tipos/vehiculo_interno.png',
    descripcion: 'Vehículo de la empresa que usa un empleado',
  },
  SUMINISTROS: {
    icono: 'img/tipos/suministros.png',
    descripcion: 'Salen aceites, repuestos u otros artículos en un vehículo',
  },
  TRASLADO: {
    icono: 'img/tipos/traslado.png',
    descripcion: 'La unidad se mueve a otro taller o sede',
  },
};

// Los campos que el usuario llena. Es DatosPase sin el tipo ni el taller,
type CamposPase = Omit<DatosPase, 'tipo_pase_id' | 'taller_id'>;

// Resultado de buscar la orden en Integra, para mostrar el aviso correcto
//   ninguno        todavía no se ha buscado
//   encontrada     existe; se llenaron los datos
//   no-existe      Integra respondió que no existe
//   no-disponible  Integra no respondió; el usuario llena los datos a mano
//   error          falló la llamada al back
type ResultadoBusqueda = 'ninguno' | 'encontrada' | 'no-existe' | 'no-disponible' | 'error';

// Linea de artículos
interface LineaFormulario {
  descripcion: string;
  cantidad: number | null;
  unidad: string;
}

// Mismo límite que valida el back
const MAXIMO_ARTICULOS = 50;

function camposVacios(): CamposPase {
  return {
    numero_orden: '',
    codigo_cliente: '',
    cliente: '',
    tipo_vehiculo: '',
    marca: '',
    placa: '',
    chasis: '',
    piloto: '',
    supervisor: '',
    observaciones: '',
    facturar_orden: false,
    detalle: [],
  };
}

// Los datos del pase llegan con null en los campos vacíos; el formulario usa ''
function textoOVacio(valor: string | null): string {
  if (valor === null) {
    return '';
  }
  return valor;
}

// Devuelve el valor de Integra si trae algo; si no, el que ya estaba
function valorOActual(valorIntegra: string | null, valorActual: string): string {
  if (valorIntegra === null || valorIntegra.trim() === '') {
    return valorActual;
  }
  return valorIntegra;
}

@Component({
  imports: [FormsModule, RouterLink, DatePipe],
  selector: 'app-formulario-pase',
  styleUrl: './formulario-pase.css',
  templateUrl: './formulario-pase.html',
  // Cerrar la pestaña o recargar con cambios sin guardar: el navegador pregunta
  host: { '(window:beforeunload)': 'avisarAntesDeCerrar($event)' },
})
export class FormularioPase implements OnInit, ConCambiosSinGuardar {
  private catalogosService = inject(CatalogosService);
  protected sesion = inject(SesionService);
  private pasesService = inject(PasesService);
  private router = inject(Router);
  private ordenesService = inject(OrdenesService);
  private ruta = inject(ActivatedRoute);

  protected formatearNumeroPase = formatearNumeroPase;

  // --- Crear o editar ---
  // /pases/nuevo        → idPaseEditar = null  (crear)
  // /pases/66441/editar → idPaseEditar = 66441 (editar)
  protected idPaseEditar = signal<number | null>(null);
  protected modoEdicion = computed(() => this.idPaseEditar() !== null);
  protected paseOriginal = signal<PaseDetalle | null>(null);
  protected motivoNoEditable = signal('');   // si tiene texto, no se muestra el formulario

  // Crear pide 'pases.crear'; editar pide 'pases.editar'
  protected tienePermisoFormulario = computed(() => {
    if (this.modoEdicion()) {
      return this.sesion.tienePermiso('pases.editar');
    }
    return this.sesion.tienePermiso('pases.crear');
  });

  // Catálogos
  protected tiposPase = signal<TipoPase[]>([]);
  protected talleres = signal<Taller[]>([]);
  protected cargando = signal(true);
  protected mensajeError = signal('');

  // seleccionados del usuario
  protected idTipoSeleccionado = signal<number | null>(null);
  protected idTaller: number | null = null;

  // completo para tipo seleccionado
  protected tipoSeleccionado = computed(() => {
    const idTipo = this.idTipoSeleccionado();
    const tipo = this.tiposPase().find((t) => t.id_tipo === idTipo);
    if (tipo === undefined) {
      return null;
    }
    return tipo;
  });

  // Al editar, el tipo no se puede cambiar: solo se muestra su tarjeta
  protected tiposVisibles = computed(() => {
    if (!this.modoEdicion()) {
      return this.tiposPase();
    }
    return this.tiposPase().filter((tipo) => tipo.id_tipo === this.idTipoSeleccionado());
  });

  // --- Campos del pase (enlazados con [(ngModel)]) ---
  protected campos: CamposPase = camposVacios();

  // --- Artículos (solo en suministros) ---
  protected lineas: LineaFormulario[] = [];
  protected maximoArticulos = MAXIMO_ARTICULOS;

  // ¿El tipo elegido lleva lista de artículos?
  protected llevaDetalle = computed(() => {
    const tipo = this.tipoSeleccionado();
    return tipo !== null && tipo.lleva_detalle;
  });

  // --- Búsqueda de la orden en Integra ---
  protected buscandoOrden = signal(false);
  protected resultadoBusqueda = signal<ResultadoBusqueda>('ninguno');
  protected mensajeBusqueda = signal('');
  protected ordenesPendientes = signal<OrdenPendiente[]>([]); // se muestran en la parte 5

  // --- Guardar ---
  protected guardando = signal(false);

  // --- Cambios sin guardar ---
  // "Foto" de los datos al abrir el formulario. Si lo que hay ahora es
  // distinto, el usuario escribió algo que todavía no guardó.
  private fotoInicial = '';
  private guardadoConExito = false;
  protected erroresGuardar = signal<string[]>([]);

  // ¿El tipo elegido trabaja con orden de trabajo y cliente?
  protected llevaOrden = computed(() => {
    const tipo = this.tipoSeleccionado();
    return tipo !== null && tipo.requiere_orden;
  });

  // En "Vehículo interno" el piloto es el empleado que usa el vehículo
  protected etiquetaPiloto = computed(() => {
    const tipo = this.tipoSeleccionado();
    if (tipo !== null && tipo.codigo === 'VEHICULO_INTERNO') {
      return 'Empleado que lo usa';
    }
    return 'Piloto';
  });

  // Determina si el tipo elegido revisa órdenes pendientes de facturar en Integra
  protected revisaPendientes = computed(() => {
    const tipo = this.tipoSeleccionado();
    return tipo !== null && tipo.valida_pendientes;
  });

  // Busca ordenes que sean del mismo Vehiculo
  protected pendientesDelVehiculo = computed(() => {
    if (!this.revisaPendientes()) {
      return [];
    }

    return this.ordenesPendientes().filter((orden) => orden.relacion === 'VEHICULO');
  });

  // Busca ordenes del mismo cliente en otros vehiculos
  protected pendientesDelCliente = computed(() => {
    if (!this.revisaPendientes()) {
      return [];
    }
    return this.ordenesPendientes().filter((orden) => orden.relacion === 'CLIENTE');
  });

  ngOnInit(): void {
    // Se escucha la URL (y no solo se lee una vez) por la misma razón que en
    // el detalle: Angular reutiliza la pantalla si solo cambia el número.
    this.ruta.paramMap.subscribe((parametros) => {
      const id = parametros.get('id');
      if (id === null) {
        this.idPaseEditar.set(null);
      } else {
        this.idPaseEditar.set(Number(id));
      }
      this.cargarDatos();
    });
  }

  protected cargarDatos(): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.motivoNoEditable.set('');
    this.fotoInicial = '';
    this.guardadoConExito = false;

    const idPase = this.idPaseEditar();

    if (idPase !== null && (!Number.isInteger(idPase) || idPase <= 0)) {
      this.mensajeError.set('La dirección no corresponde a un pase de salida.');
      this.cargando.set(false);
      return;
    }

    // Al editar también se pide el pase. Al crear no hay pase que pedir:
    // of(null) es un Observable que responde null de inmediato, para que
    // forkJoin reciba siempre las mismas tres llamadas.
    let pedirPase = of<PaseDetalle | null>(null);
    if (idPase !== null) {
      pedirPase = this.pasesService.obtener(idPase);
    }

    // Pide todo a la vez y continúa cuando llegan las respuestas
    forkJoin({
      tipos: this.catalogosService.tiposPase(),
      talleres: this.catalogosService.talleres(),
      pase: pedirPase,
    }).subscribe({
      next: (respuesta) => {
        this.tiposPase.set(respuesta.tipos);
        this.talleres.set(respuesta.talleres);

        if (respuesta.pase !== null) {
          this.llenarConPase(respuesta.pase);
        } else if (respuesta.talleres.length === 1) {
          // Si solo tiene un taller asignarlo automaticamente
          this.idTaller = respuesta.talleres[0].id_taller;
        }
        // A partir de aquí, cualquier diferencia es un cambio del usuario
        this.fotoInicial = this.fotoDelFormulario();
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.mensajeError.set(this.mensajeDeCarga(error));
        this.cargando.set(false);
      },
    });
  }

  private mensajeDeCarga(error: HttpErrorResponse): string {
    if (this.modoEdicion() && (error.status === 404 || error.status === 400)) {
      return 'No encontramos el pase que desea editar.';
    }
    if (this.modoEdicion() && error.status === 403) {
      return 'Este pase pertenece a un taller que usted no tiene asignado.';
    }
    return 'No se pudieron cargar los datos del formulario. Intente de nuevo.';
  }

  // Pone en el formulario los datos del pase que se va a editar
  private llenarConPase(pase: PaseDetalle): void {
    this.paseOriginal.set(pase);

    // Mismas reglas que el back: un anulado no se edita, y un autorizado
    // solo con el permiso 'pases.editar_autorizado'
    if (pase.estado_id === ESTADO_ANULADO) {
      this.motivoNoEditable.set('Un pase anulado no se puede editar.');
      return;
    }
    const puedeEditarAutorizados = this.sesion.tienePermiso('pases.editar_autorizado');
    if (pase.estado_id === ESTADO_AUTORIZADO && !puedeEditarAutorizados) {
      this.motivoNoEditable.set('Este pase ya está autorizado y usted no tiene permiso para editarlo.');
      return;
    }

    this.idTipoSeleccionado.set(pase.tipo_pase_id);
    this.idTaller = pase.taller_id;

    this.campos = {
      numero_orden: textoOVacio(pase.numero_orden),
      codigo_cliente: textoOVacio(pase.codigo_cliente),
      cliente: textoOVacio(pase.cliente),
      tipo_vehiculo: textoOVacio(pase.tipo_vehiculo),
      marca: textoOVacio(pase.marca),
      placa: textoOVacio(pase.placa),
      chasis: textoOVacio(pase.chasis),
      piloto: textoOVacio(pase.piloto),
      supervisor: textoOVacio(pase.supervisor),
      observaciones: textoOVacio(pase.observaciones),
      facturar_orden: pase.facturar_orden,
      detalle: [],
    };

    this.lineas = [];
    for (const linea of pase.detalle) {
      this.lineas.push({
        descripcion: linea.descripcion,
        cantidad: linea.cantidad,
        unidad: textoOVacio(linea.unidad),
      });
    }
    if (pase.lleva_detalle && this.lineas.length === 0) {
      this.agregarLinea();
    }
  }

  protected elegirTipo(tipo: TipoPase): void {
    // Al editar, el tipo queda fijo (el back tampoco permite cambiarlo)
    if (this.modoEdicion()) {
      return;
    }
    this.idTipoSeleccionado.set(tipo.id_tipo);

    if (tipo.lleva_detalle && this.lineas.length === 0) {
      this.agregarLinea();
    }
  }

  // Ícono y descripción del tipo; si llega un tipo nuevo sin texto, no se rompe
  protected descripcionDe(tipo: TipoPase): { icono: string; descripcion: string } {
    const descripcion = DESCRIPCION_DE_TIPOS[tipo.codigo];
    if (descripcion === undefined) {
      return { icono: 'img/tipos/document.png', descripcion: '' };
    }
    return descripcion;
  }

  // ---------------------------------------------------------------------
  // Buscar la orden en Integra
  // ---------------------------------------------------------------------

  protected buscarOrden(): void {
    const numeroOrden = this.campos.numero_orden.trim();

    if (numeroOrden === '') {
      this.resultadoBusqueda.set('error');
      this.mensajeBusqueda.set('Escriba el número de orden para buscarla.');
      return;
    }

    this.buscandoOrden.set(true);
    this.resultadoBusqueda.set('ninguno');
    this.ordenesPendientes.set([]);

    this.ordenesService.consultar(numeroOrden).subscribe({
      next: (consulta) => {
        this.buscandoOrden.set(false);

        // Integra no respondió: se deja llenar a mano
        if (!consulta.disponible || consulta.orden === null) {
          this.resultadoBusqueda.set('no-disponible');
          this.mensajeBusqueda.set(
            'No se pudo consultar Integra en este momento. Llene los datos a mano.',
          );
          return;
        }

        this.llenarConOrden(consulta.orden);
        this.ordenesPendientes.set(consulta.ordenes_pendientes);
        this.resultadoBusqueda.set('encontrada');
        this.mensajeBusqueda.set('Orden encontrada en Integra. Revise los datos que se llenaron.');
      },
      error: (error: HttpErrorResponse) => {
        this.buscandoOrden.set(false);

        if (error.status === 404) {
          this.resultadoBusqueda.set('no-existe');
          this.mensajeBusqueda.set(
            'La orden ' + numeroOrden + ' no existe en Integra. Revise el número.',
          );
          return;
        }

        this.resultadoBusqueda.set('error');
        this.mensajeBusqueda.set(this.leerErrores(error)[0]);
      },
    });
  }

  // Si el usuario cambia el número después de buscar, el aviso anterior
  // ya no corresponde a lo que está escrito
  protected numeroOrdenCambio(): void {
    if (this.resultadoBusqueda() !== 'ninguno') {
      this.resultadoBusqueda.set('ninguno');
      this.mensajeBusqueda.set('');
      this.ordenesPendientes.set([]);
    }
  }

  // Copia a los campos los datos que trae Integra.
  // Si Integra no trae un dato, se conserva lo que el usuario ya escribió.
  private llenarConOrden(orden: OrdenIntegra): void {
    this.campos.numero_orden = orden.numero_orden;
    this.campos.cliente = valorOActual(orden.cliente, this.campos.cliente);
    this.campos.codigo_cliente = valorOActual(orden.codigo_cliente, this.campos.codigo_cliente);
    this.campos.placa = valorOActual(orden.placa, this.campos.placa);
    this.campos.chasis = valorOActual(orden.chasis, this.campos.chasis);
    this.campos.marca = valorOActual(orden.marca, this.campos.marca);
    this.campos.tipo_vehiculo = valorOActual(orden.tipo_vehiculo, this.campos.tipo_vehiculo);
  }

  // ---------------------------------------------------------------------
  // Bloque articulos
  // ---------------------------------------------------------------------

  protected agregarLinea(): void {
    if (this.lineas.length >= MAXIMO_ARTICULOS) {
      return;
    }
    this.lineas.push({ descripcion: '', cantidad: null, unidad: '' });
  }

  protected quitarLinea(linea: LineaFormulario): void {
    this.lineas = this.lineas.filter((otra) => otra !== linea);
  }

  // Formatear lineas para el Back
  private lineasParaEnviar(): LineaSuministro[] {
    const resultado: LineaSuministro[] = [];

    for (let i = 0; i < this.lineas.length; i++) {
      const linea = this.lineas[i];
      let cantidad = 0;
      if (linea.cantidad !== null) {
        cantidad = linea.cantidad;
      }

      resultado.push({
        linea: i + 1,
        descripcion: linea.descripcion,
        cantidad: cantidad,
        unidad: linea.unidad,
      });
    }
    return resultado;
  }

  // ---------------------------------------------------------------------
  // Guardar
  // ---------------------------------------------------------------------

  protected guardar(): void {
    const tipo = this.tipoSeleccionado();

    // Lo mínimo para poder enviar; el resto lo valida el back
    if (tipo === null) {
      this.erroresGuardar.set(['Seleccione qué va a salir (paso 1).']);
      return;
    }
    if (this.idTaller === null) {
      this.erroresGuardar.set(['Seleccione el taller (paso 2).']);
      return;
    }

    // Se arma lo que se envía: el tipo, el taller y los campos
    const datos: DatosPase = {
      ...this.campos,
      tipo_pase_id: tipo.id_tipo,
      taller_id: this.idTaller,
    };

    // Si el tipo no lleva orden, no se envían datos de orden aunque el
    // usuario los haya escrito antes de cambiar de tipo
    if (!tipo.requiere_orden) {
      datos.numero_orden = '';
      datos.cliente = '';
      datos.codigo_cliente = '';
      datos.facturar_orden = false;
    }

    // llenar articulos solo se envian en el tipo suministros
    if (tipo.lleva_detalle) {
      datos.detalle = this.lineasParaEnviar();
    } else {
      datos.detalle = [];
    }

    this.guardando.set(true);
    this.erroresGuardar.set([]);

    const idPase = this.idPaseEditar();
    if (idPase === null) {
      this.crearPase(datos);
    } else {
      this.editarPase(idPase, datos);
    }
  }

  private crearPase(datos: DatosPase): void {
    this.pasesService.crear(datos).subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        this.abrirDetalle(respuesta.id_pase, this.avisoAlCrear(respuesta));
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.erroresGuardar.set(this.leerErrores(error));
      },
    });
  }

  private editarPase(idPase: number, datos: DatosPase): void {
    this.pasesService.editar(idPase, datos).subscribe({
      next: (respuesta) => {
        this.guardando.set(false);

        let aviso: AvisoAlAbrir = { texto: 'Los cambios se guardaron.', tipo: 'exito' };
        if (respuesta.campos_modificados.length === 0) {
          aviso = { texto: 'No hubo cambios en el pase.', tipo: 'info' };
        }
        this.abrirDetalle(idPase, aviso);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.erroresGuardar.set(this.leerErrores(error));
      },
    });
  }

  // Qué se le dice al usuario después de crear el pase
  private avisoAlCrear(respuesta: RespuestaCrear): AvisoAlAbrir {
    if (respuesta.estado_id === ESTADO_AUTORIZADO) {
      return { texto: 'El pase se creó y quedó autorizado.', tipo: 'exito' };
    }

    const hayPendientesDelVehiculo = respuesta.ordenes_pendientes.some(
      (orden) => orden.relacion === 'VEHICULO',
    );
    if (hayPendientesDelVehiculo) {
      return {
        texto: 'El pase se creó, pero no se podrá autorizar mientras el vehículo tenga otras órdenes sin facturar.',
        tipo: 'advertencia',
      };
    }

    return { texto: 'El pase se creó. Queda pendiente de autorizar.', tipo: 'exito' };
  }

  // Abre el detalle del pase y le pasa el aviso para que lo muestre arriba.
  // "state" viaja con la navegación sin aparecer en la URL.
  private abrirDetalle(idPase: number, aviso: AvisoAlAbrir): void {
    this.guardadoConExito = true;   // ya se guardó: el guard de salida no debe preguntar
    this.router.navigate(['/pases', idPase], { state: { aviso: aviso } });
  }

  // Convierte la respuesta de error del back en una lista de mensajes
  private leerErrores(error: HttpErrorResponse): string[] {
    const cuerpo = error.error as ErrorValidacion | null;

    if (cuerpo && cuerpo.errores && cuerpo.errores.length > 0) {
      return cuerpo.errores;
    }
    if (cuerpo && typeof cuerpo.mensaje === 'string') {
      return [cuerpo.mensaje];
    }
    return ['No se pudo guardar el pase. Revise su conexión e intente de nuevo.'];
  }

  // ---------------------------------------------------------------------
  // Cambios sin guardar
  // ---------------------------------------------------------------------

  // La usa el guard de salida (confirmarSalidaSinGuardar) y el beforeunload
  hayCambiosSinGuardar(): boolean {
    // Aún cargando, con error, o ya guardado: no hay nada que perder
    if (this.fotoInicial === '' || this.guardadoConExito) {
      return false;
    }
    return this.fotoDelFormulario() !== this.fotoInicial;
  }

  // Todo lo que el usuario puede cambiar, convertido en texto para compararlo
  private fotoDelFormulario(): string {
    return JSON.stringify({
      tipo: this.idTipoSeleccionado(),
      taller: this.idTaller,
      campos: this.campos,
      lineas: this.lineas,
    });
  }

  // Al cerrar la pestaña o recargar. El navegador muestra su propio mensaje
  // (no se puede personalizar); basta con "prevenir" el cierre.
  protected avisarAntesDeCerrar(evento: BeforeUnloadEvent): void {
    if (this.hayCambiosSinGuardar()) {
      evento.preventDefault();
    }
  }
}
