import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MantenimientoService } from '../../../core/services/mantenimiento.service';
import { SesionService } from '../../../core/services/sesion.service';
import { Sede, DatosSede } from '../../../core/models/sede.model';
import { leerErrores } from '../../../core/utils/errores';

// Qué sedes se ven en la tabla
type FiltroEstado = 'activas' | 'inactivas' | 'todas';

// Mensaje de arriba con el resultado de la última acción
interface Aviso {
  tipo: 'exito' | 'error';
  texto: string;
}

// Mantenimiento de sedes: listar, crear, editar y activar/desactivar.
// Ver: catalogos.ver | Crear, editar y cambiar estado: catalogos.editar
@Component({
  selector: 'app-mantenimiento-sedes',
  imports: [FormsModule],
  templateUrl: './mantenimiento-sedes.html',
  styleUrl: '../mantenimiento.css'
})
export class MantenimientoSedes implements OnInit {
  private mantenimiento = inject(MantenimientoService);
  private sesion = inject(SesionService);

  // Los botones de crear, editar y activar solo se muestran con este permiso
  protected puedeEditar = computed(() => this.sesion.tienePermiso('catalogos.editar'));

  // --- Datos y filtros ---
  protected sedes = signal<Sede[]>([]);
  protected cargando = signal(false);
  protected errorCarga = signal('');
  protected aviso = signal<Aviso | null>(null);
  protected filtroEstado = signal<FiltroEstado>('activas');
  protected busqueda = signal('');

  // Lo que se ve en la tabla según el estado elegido y lo que se escribió
  protected sedesFiltradas = computed(() => {
    const texto = this.busqueda().trim().toUpperCase();

    return this.sedes().filter(sede => {
      if (this.filtroEstado() === 'activas' && !sede.activo) {
        return false;
      }
      if (this.filtroEstado() === 'inactivas' && sede.activo) {
        return false;
      }
      if (texto !== '' && !sede.nombre.includes(texto)) {
        return false;
      }
      return true;
    });
  });

  // --- Formulario (ventana para crear o editar) ---
  protected formularioAbierto = signal(false);
  protected sedeEnEdicion = signal<Sede | null>(null);   // null = sede nueva
  protected datos: DatosSede = { nombre: '', direccion: '', mapa: '' };   // enlazado con [(ngModel)]
  protected erroresFormulario = signal<string[]>([]);
  protected guardando = signal(false);

  // Mientras se activa o desactiva una sede, se bloquean sus botones
  protected idCambiandoEstado = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarSedes();
  }

  // ---------------------------------------------------------------------
  // Carga
  // ---------------------------------------------------------------------

  protected cargarSedes(): void {
    this.cargando.set(true);
    this.errorCarga.set('');

    this.mantenimiento.listarSedes().subscribe({
      next: (sedes) => {
        this.sedes.set(sedes);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorCarga.set(leerErrores(error, 'No se pudieron cargar las sedes. Intente de nuevo.')[0]);
        this.cargando.set(false);
      }
    });
  }

  // ---------------------------------------------------------------------
  // Crear y editar
  // ---------------------------------------------------------------------

  protected abrirNueva(): void {
    this.sedeEnEdicion.set(null);
    this.datos = { nombre: '', direccion: '', mapa: '' };
    this.erroresFormulario.set([]);
    this.formularioAbierto.set(true);
  }

  protected abrirEdicion(sede: Sede): void {
    this.sedeEnEdicion.set(sede);
    // Las sedes del sistema anterior traen '' o null: en el formulario siempre ''
    this.datos = {
      nombre: sede.nombre,
      direccion: sede.direccion || '',
      mapa: sede.mapa || ''
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
    if (this.datos.nombre.trim() === '') {
      this.erroresFormulario.set(['Escriba el nombre de la sede.']);
      return;
    }

    this.guardando.set(true);
    this.erroresFormulario.set([]);

    const sede = this.sedeEnEdicion();
    let peticion = this.mantenimiento.crearSede(this.datos);
    if (sede !== null) {
      peticion = this.mantenimiento.editarSede(sede.id_sede, this.datos);
    }

    peticion.subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        this.formularioAbierto.set(false);
        this.aviso.set({ tipo: 'exito', texto: respuesta.mensaje });
        this.cargarSedes();
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.erroresFormulario.set(leerErrores(error, 'No se pudo guardar la sede. Intente de nuevo.'));
      }
    });
  }

  // ---------------------------------------------------------------------
  // Activar y desactivar
  // ---------------------------------------------------------------------

  protected cambiarEstado(sede: Sede): void {
    const activar = !sede.activo;

    if (!activar) {
      const confirmo = window.confirm(
        '¿Desactivar la sede ' + sede.nombre + '?\n\nYa no se podrá elegir al crear o editar talleres.'
      );
      if (!confirmo) {
        return;
      }
    }

    this.idCambiandoEstado.set(sede.id_sede);
    this.aviso.set(null);

    this.mantenimiento.cambiarEstadoSede(sede.id_sede, activar).subscribe({
      next: (respuesta) => {
        this.idCambiandoEstado.set(null);
        this.aviso.set({ tipo: 'exito', texto: respuesta.mensaje + ': ' + sede.nombre });
        this.cargarSedes();
      },
      error: (error: HttpErrorResponse) => {
        this.idCambiandoEstado.set(null);
        this.aviso.set({ tipo: 'error', texto: leerErrores(error, 'No se pudo cambiar el estado de la sede.')[0] });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Ayudas para el HTML
  // ---------------------------------------------------------------------

  // Solo se ofrece "Ver en el mapa" si es un enlace (no un <iframe> del sistema anterior)
  protected tieneMapa(sede: Sede): boolean {
    return !!sede.mapa && sede.mapa.startsWith('https://');
  }

  // Texto del botón de desactivar cuando la sede todavía tiene talleres activos
  protected motivoNoDesactivar(sede: Sede): string {
    if (sede.activo && sede.talleres_activos > 0) {
      return 'Tiene talleres activos: desactívelos primero';
    }
    return '';
  }
}
