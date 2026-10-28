import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { MantenimientoService } from '../../../core/services/mantenimiento.service';
import { SesionService } from '../../../core/services/sesion.service';
import { TallerMantenimiento, DatosTaller } from '../../../core/models/taller.model';
import { Sede } from '../../../core/models/sede.model';
import { leerErrores } from '../../../core/utils/errores';

// Qué talleres se ven en la tabla
type FiltroEstado = 'activos' | 'inactivos' | 'todos';

// Mensaje de arriba con el resultado de la última acción
interface Aviso {
  tipo: 'exito' | 'error';
  texto: string;
}

// Mantenimiento de talleres: listar, crear, editar y activar/desactivar.
// Ver: catalogos.ver | Crear, editar y cambiar estado: catalogos.editar
@Component({
  selector: 'app-mantenimiento-talleres',
  imports: [FormsModule],
  templateUrl: './mantenimiento-talleres.html',
  styleUrl: '../mantenimiento.css'
})
export class MantenimientoTalleres implements OnInit {
  private mantenimiento = inject(MantenimientoService);
  private sesion = inject(SesionService);

  // Los botones de crear, editar y activar solo se muestran con este permiso
  protected puedeEditar = computed(() => this.sesion.tienePermiso('catalogos.editar'));

  // --- Datos y filtros ---
  protected talleres = signal<TallerMantenimiento[]>([]);
  protected sedes = signal<Sede[]>([]);
  protected cargando = signal(false);
  protected errorCarga = signal('');
  protected aviso = signal<Aviso | null>(null);
  protected filtroEstado = signal<FiltroEstado>('activos');
  protected busqueda = signal('');

  // Lo que se ve en la tabla: por estado y por nombre, código o sede
  protected talleresFiltrados = computed(() => {
    const texto = this.busqueda().trim().toUpperCase();

    return this.talleres().filter(taller => {
      if (this.filtroEstado() === 'activos' && !taller.activo) {
        return false;
      }
      if (this.filtroEstado() === 'inactivos' && taller.activo) {
        return false;
      }
      if (texto === '') {
        return true;
      }
      return taller.nombre.includes(texto)
        || (taller.codigo || '').includes(texto)
        || (taller.sede || '').includes(texto);
    });
  });

  // --- Formulario (ventana para crear o editar) ---
  protected formularioAbierto = signal(false);
  protected tallerEnEdicion = signal<TallerMantenimiento | null>(null);   // null = taller nuevo
  protected datos: DatosTaller = { nombre: '', codigo: '', sede_id: null };   // enlazado con [(ngModel)]
  protected erroresFormulario = signal<string[]>([]);
  protected guardando = signal(false);

  // Sedes que se pueden elegir: las activas, más la que ya tenía el taller
  // aunque esté inactiva (así se puede editar el nombre sin moverlo de sede)
  protected opcionesSede = computed(() => {
    const idSedeActual = this.tallerEnEdicion()?.sede_id ?? null;
    return this.sedes().filter(sede => sede.activo || sede.id_sede === idSedeActual);
  });

  // Mientras se activa o desactiva un taller, se bloquean sus botones
  protected idCambiandoEstado = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarDatos();
  }

  // ---------------------------------------------------------------------
  // Carga: talleres y sedes al mismo tiempo
  // ---------------------------------------------------------------------

  protected cargarDatos(): void {
    this.cargando.set(true);
    this.errorCarga.set('');

    forkJoin({
      talleres: this.mantenimiento.listarTalleres(),
      sedes: this.mantenimiento.listarSedes()
    }).subscribe({
      next: (respuesta) => {
        this.talleres.set(respuesta.talleres);
        this.sedes.set(respuesta.sedes);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorCarga.set(leerErrores(error, 'No se pudieron cargar los talleres. Intente de nuevo.')[0]);
        this.cargando.set(false);
      }
    });
  }

  // ---------------------------------------------------------------------
  // Crear y editar
  // ---------------------------------------------------------------------

  protected abrirNuevo(): void {
    this.tallerEnEdicion.set(null);
    this.datos = { nombre: '', codigo: '', sede_id: null };
    this.erroresFormulario.set([]);
    this.formularioAbierto.set(true);
  }

  protected abrirEdicion(taller: TallerMantenimiento): void {
    this.tallerEnEdicion.set(taller);
    this.datos = {
      nombre: taller.nombre,
      codigo: taller.codigo || '',
      sede_id: taller.sede_id
    };
    this.erroresFormulario.set([]);
    this.formularioAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }
    this.formularioAbierto.set(false);
  }

  protected guardar(): void {
    // Revisión rápida en el navegador; el back vuelve a revisar todo
    const errores: string[] = [];
    if (this.datos.nombre.trim() === '') {
      errores.push('Escriba el nombre del taller.');
    }
    if (this.datos.codigo.trim() === '') {
      errores.push('Escriba el código del taller.');
    }
    if (this.datos.sede_id === null) {
      errores.push('Seleccione la sede.');
    }
    if (errores.length > 0) {
      this.erroresFormulario.set(errores);
      return;
    }

    this.guardando.set(true);
    this.erroresFormulario.set([]);

    const taller = this.tallerEnEdicion();
    let peticion = this.mantenimiento.crearTaller(this.datos);
    if (taller !== null) {
      peticion = this.mantenimiento.editarTaller(taller.id_taller, this.datos);
    }

    peticion.subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.aviso.set({ tipo: 'exito', texto: respuesta.mensaje });
        this.cargarDatos();
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.erroresFormulario.set(leerErrores(error, 'No se pudo guardar el taller. Intente de nuevo.'));
      }
    });
  }

  // ---------------------------------------------------------------------
  // Activar y desactivar
  // ---------------------------------------------------------------------

  protected cambiarEstado(taller: TallerMantenimiento): void {
    const activar = !taller.activo;

    if (!activar) {
      let pregunta = '¿Desactivar el ' + taller.nombre + '?\n\nYa no se podrá elegir al crear pases.';
      if (taller.usuarios > 0) {
        pregunta += '\nTiene ' + taller.usuarios + ' usuario(s) asignado(s): dejarán de verlo en sus formularios.';
      }
      if (!window.confirm(pregunta)) {
        return;
      }
    }

    this.idCambiandoEstado.set(taller.id_taller);
    this.aviso.set(null);

    this.mantenimiento.cambiarEstadoTaller(taller.id_taller, activar).subscribe({
      next: (respuesta) => {
        this.idCambiandoEstado.set(null);
        this.aviso.set({ tipo: 'exito', texto: respuesta.mensaje + ': ' + taller.nombre });
        this.cargarDatos();
      },
      error: (error: HttpErrorResponse) => {
        this.idCambiandoEstado.set(null);
        this.aviso.set({ tipo: 'error', texto: leerErrores(error, 'No se pudo cambiar el estado del taller.')[0] });
      }
    });
  }

  // Texto del botón de activar cuando la sede del taller está inactiva
  protected motivoNoActivar(taller: TallerMantenimiento): string {
    if (!taller.activo && taller.sede_activa === false) {
      return 'Su sede está inactiva: actívela primero o cambie la sede';
    }
    return '';
  }
}
