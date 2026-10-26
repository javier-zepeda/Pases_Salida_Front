import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PasesService } from '../../core/services/pases.service';
import { SesionService } from '../../core/services/sesion.service';
import { PaseDetalle, OrdenPendiente, ErrorAutorizar, AvisoAlAbrir, ESTADO_CREADO, ESTADO_AUTORIZADO, ESTADO_ANULADO } from '../../core/models/pase.model';
import { formatearNumeroPase, claseDeEstado } from '../../core/utils/formato';
import { describirMovimiento, MovimientoLegible } from '../../core/utils/bitacora';
import { ImagenAdjunta } from '../../compartido/imagen-adjunta/imagen-adjunta';

// Qué ventana de confirmación está abierta
type Dialogo = 'ninguno' | 'autorizar' | 'pendientes' | 'anular';

// Mismos límites que valida el back
const LARGO_MINIMO_MOTIVO = 5;
const LARGO_MAXIMO_MOTIVO = 500;

@Component({
  selector: 'app-detalle-pase',
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe, ImagenAdjunta],
  templateUrl: './detalle-pase.html',
  styleUrl: './detalle-pase.css'
})

export class DetallePase implements OnInit {
  private ruta = inject(ActivatedRoute);
  private router = inject(Router);
  private pasesService = inject(PasesService);
  protected sesion = inject(SesionService);

  protected formatearNumeroPase = formatearNumeroPase;
  protected claseDeEstado = claseDeEstado;
  protected largoMaximoMotivo = LARGO_MAXIMO_MOTIVO;
  protected estadoAnulado = ESTADO_ANULADO;

  protected idPase = 0;

  // --- Datos del pase ---
  protected pase = signal<PaseDetalle | null>(null);
  protected cargando = signal(true);
  protected mensajeError = signal('');

  // --- Acciones ---
  protected dialogo = signal<Dialogo>('ninguno');
  protected procesando = signal(false);
  protected errorDialogo = signal('');
  protected mensajeExito = signal('');
  protected tipoMensaje = signal<AvisoAlAbrir['tipo']>('exito');   // color del aviso de arriba
  protected ordenesPendientes = signal<OrdenPendiente[]>([]);   // las que muestra el diálogo
  protected motivoAnulacion = '';                               // enlazado con [(ngModel)]
  protected generandoPdf = signal(false);

  // Historial en texto legible, del más reciente al más antiguo
  protected historial = computed(() => {
    const pase = this.pase();
    if (pase === null) {
      return [];
    }

    const movimientos: { fecha: string; usuario: string | null; movimiento: MovimientoLegible }[] = [];
    for (const registro of pase.bitacora) {
      movimientos.push({
        fecha: registro.fecha,
        usuario: registro.usuario_nombre,
        movimiento: describirMovimiento(registro)
      });
    }
    return movimientos.reverse();
  });

  // --- Qué botones se muestran (el back vuelve a validar todo) ---
  protected puedeAutorizar = computed(() => {
    const pase = this.pase();
    return pase !== null
      && pase.estado_id === ESTADO_CREADO
      && this.sesion.tienePermiso('pases.autorizar');
  });

  // Editar: no anulados; los autorizados solo con 'pases.editar_autorizado'
  protected puedeEditar = computed(() => {
    const pase = this.pase();
    if (pase === null || pase.estado_id === ESTADO_ANULADO) {
      return false;
    }
    if (!this.sesion.tienePermiso('pases.editar')) {
      return false;
    }
    if (pase.estado_id === ESTADO_AUTORIZADO) {
      return this.sesion.tienePermiso('pases.editar_autorizado');
    }
    return true;
  });

  protected puedeAnular = computed(() => {
    const pase = this.pase();
    return pase !== null
      && pase.estado_id !== ESTADO_ANULADO
      && this.sesion.tienePermiso('pases.anular');
  });

  // Imprimir: solo autorizados y anulados (el back también lo valida)
  protected puedeImprimir = computed(() => {
    const pase = this.pase();
    return pase !== null
      && pase.estado_id !== ESTADO_CREADO
      && this.sesion.tienePermiso('pases.imprimir');
  });

  // Las órdenes del diálogo separadas por motivo
  protected pendientesDelVehiculo = computed(() =>
    this.ordenesPendientes().filter((orden) => orden.relacion === 'VEHICULO')
  );
  protected pendientesDelCliente = computed(() =>
    this.ordenesPendientes().filter((orden) => orden.relacion === 'CLIENTE')
  );

  protected puedeConfirmarPendientes = signal(false);

  ngOnInit(): void {
    // Se escucha la URL y no solo se lee una vez: si el usuario pasa de un
    // pase a otro (por ejemplo con "atrás" del navegador), Angular reutiliza
    // esta misma pantalla y solo cambia el número.
    this.ruta.paramMap.subscribe((parametros) => {
      this.abrirPase(Number(parametros.get('id')));
    });
  }

  private abrirPase(idPase: number): void {
    this.idPase = idPase;
    this.pase.set(null);
    this.dialogo.set('ninguno');
    this.prepararDialogo();
    this.mostrarAvisoDeNavegacion();

    // La URL debe traer un número de pase (ej. /pases/66427)
    if (!Number.isInteger(idPase) || idPase <= 0) {
      this.cargando.set(false);
      this.mensajeError.set('La dirección no corresponde a un pase de salida.');
      return;
    }

    this.cargarPase();
  }

  // ---------------------------------------------------------------------
  // Carga
  // ---------------------------------------------------------------------

  protected cargarPase(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    this.pasesService.obtener(this.idPase).subscribe({
      next: (pase) => {
        this.pase.set(pase);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.pase.set(null);
        this.mensajeError.set(this.mensajeDeCarga(error));
        this.cargando.set(false);
      }
    });
  }

  private mensajeDeCarga(error: HttpErrorResponse): string {
    if (error.status === 404 || error.status === 400) {
      return 'No encontramos el pase número ' + formatearNumeroPase(this.idPase) + '.';
    }
    if (error.status === 403) {
      return 'Este pase pertenece a un taller que usted no tiene asignado.';
    }
    return 'No se pudo cargar el pase. Revise su conexión e intente de nuevo.';
  }

  // ---------------------------------------------------------------------
  // Autorizar
  // ---------------------------------------------------------------------

  protected abrirAutorizar(): void {
    this.prepararDialogo();
    this.dialogo.set('autorizar');
  }

  // conPendientes = true cuando el usuario confirmó en la ventana de órdenes pendientes
  protected autorizar(conPendientes: boolean): void {
    this.procesando.set(true);
    this.errorDialogo.set('');

    this.pasesService.autorizar(this.idPase, conPendientes).subscribe({
      next: (respuesta) => {
        this.procesando.set(false);
        this.cerrarDialogo();
        this.mostrarMensaje('El pase quedó autorizado.', 'exito');
        this.cargarPase();
      },
      error: (error: HttpErrorResponse) => {
        this.procesando.set(false);
        this.manejarErrorAutorizar(error);
      }
    });
  }

  // El back responde 409 con la lista de órdenes cuando el vehículo o el cliente tiene pendientes:
  //   - requiere_confirmacion = true → el usuario puede autorizar de todas formas
  //   - sin requiere_confirmacion   → el usuario no tiene permiso para hacerlo
  private manejarErrorAutorizar(error: HttpErrorResponse): void {
    const cuerpo = error.error as ErrorAutorizar | null;

    if (error.status === 409 && cuerpo && cuerpo.ordenes_pendientes) {
      this.ordenesPendientes.set(cuerpo.ordenes_pendientes);
      this.puedeConfirmarPendientes.set(cuerpo.requiere_confirmacion === true);
      this.errorDialogo.set('');
      this.dialogo.set('pendientes');
      return;
    }

    this.errorDialogo.set(this.mensajeDeAccion(error, 'autorizar'));
  }

  // ---------------------------------------------------------------------
  // Anular
  // ---------------------------------------------------------------------

  protected abrirAnular(): void {
    this.prepararDialogo();
    this.motivoAnulacion = '';
    this.dialogo.set('anular');
  }

  protected motivoValido(): boolean {
    const largo = this.motivoAnulacion.trim().length;
    return largo >= LARGO_MINIMO_MOTIVO && largo <= LARGO_MAXIMO_MOTIVO;
  }

  protected anular(): void {
    if (!this.motivoValido()) {
      this.errorDialogo.set('Escriba el motivo de la anulación (mínimo ' + LARGO_MINIMO_MOTIVO + ' letras).');
      return;
    }

    this.procesando.set(true);
    this.errorDialogo.set('');

    this.pasesService.anular(this.idPase, this.motivoAnulacion.trim()).subscribe({
      next: () => {
        this.procesando.set(false);
        this.cerrarDialogo();
        this.mostrarMensaje('El pase quedó anulado.', 'exito');
        this.cargarPase();
      },
      error: (error: HttpErrorResponse) => {
        this.procesando.set(false);
        this.errorDialogo.set(this.mensajeDeAccion(error, 'anular'));
      }
    });
  }

  // ---------------------------------------------------------------------
  // Imprimir
  // ---------------------------------------------------------------------

  // Pide el PDF al back y lo abre en una pestaña nueva.
  // El PDF no se abre con un enlace normal porque la petición necesita el
  // token de la sesión; por eso se descarga como archivo y se le crea una
  // dirección temporal (blob:) que la pestaña sí puede abrir.
  protected imprimir(): void {
    // La pestaña se abre antes de pedir el PDF: si se abriera al llegar la
    // respuesta, el navegador la bloquearía como ventana emergente.
    const pestana = window.open('', '_blank');
    if (pestana) {
      pestana.document.title = 'Generando PDF…';
      pestana.document.body.textContent = 'Generando el PDF del pase…';
    }

    this.generandoPdf.set(true);
    this.pasesService.obtenerPdf(this.idPase).subscribe({
      next: (archivo) => {
        this.generandoPdf.set(false);
        const direccion = URL.createObjectURL(archivo);

        if (pestana) {
          pestana.location.href = direccion;
        } else {
          window.location.href = direccion;   // el navegador bloqueó la pestaña nueva
        }

        // La dirección temporal se libera cuando la pestaña ya cargó el PDF
        setTimeout(() => URL.revokeObjectURL(direccion), 60000);
      },
      error: () => {
        this.generandoPdf.set(false);
        if (pestana) {
          pestana.close();
        }
        this.mostrarMensaje('No se pudo generar el PDF. Intente de nuevo.', 'advertencia');
      }
    });
  }

  // ---------------------------------------------------------------------
  // Ventanas de confirmación
  // ---------------------------------------------------------------------

  protected cerrarDialogo(): void {
    if (this.procesando()) {
      return;   // no se cierra mientras se espera la respuesta
    }
    this.dialogo.set('ninguno');
  }

  private prepararDialogo(): void {
    this.errorDialogo.set('');
    this.mensajeExito.set('');
    this.ordenesPendientes.set([]);
    this.puedeConfirmarPendientes.set(false);
  }

  // Mensaje del back si lo trae; si no, uno general
  private mensajeDeAccion(error: HttpErrorResponse, accion: string): string {
    if (error.error && typeof error.error.mensaje === 'string') {
      return error.error.mensaje;
    }
    if (error.status === 403) {
      return 'No tiene permiso para ' + accion + ' este pase.';
    }
    return 'No se pudo ' + accion + ' el pase. Intente de nuevo.';
  }

  // ---------------------------------------------------------------------
  // Aviso de arriba (resultado de la última acción)
  // ---------------------------------------------------------------------

  private mostrarMensaje(texto: string, tipo: AvisoAlAbrir['tipo']): void {
    this.mensajeExito.set(texto);
    this.tipoMensaje.set(tipo);
  }
  //
  // - currentNavigation(): la navegación en curso. Puede ser null porque laapp no usa zone.js y ngOnInit corre cuando la navegación ya terminó;
  // - Solo se muestra si la navegación la hizo el código ('imperative'). Si
  //   el usuario usó "atrás" del navegador ('popstate'), el aviso ya se vio.
  // - Al recargar la página no hay state, así que no se repite.
  private mostrarAvisoDeNavegacion(): void {
    let navegacion = this.router.currentNavigation();
    if (navegacion === null) {
      navegacion = this.router.lastSuccessfulNavigation();
    }
    if (navegacion === null || navegacion.trigger !== 'imperative') {
      return;
    }

    const estado = navegacion.extras.state as { aviso?: AvisoAlAbrir } | undefined;
    if (estado && estado.aviso) {
      this.mostrarMensaje(estado.aviso.texto, estado.aviso.tipo);
    }
  }
}
