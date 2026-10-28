import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Encabezado } from './layout/encabezado/encabezado';
import { BarraLateral } from './layout/barra-lateral/barra-lateral';
import { OpcionMenu, SeccionMenu, UsuarioMenu } from './layout/barra-lateral/menu.model';
import { SesionService } from './core/services/sesion.service';
import { AutenticacionService } from './core/services/autenticacion.service';
import { environment } from '../environments/environment';

// Situaciones posibles al abrir la aplicación
type EstadoInicio = 'cargando' | 'listo' | 'sin-acceso' | 'sin-sesion' | 'sesion-cerrada' | 'error';

// Componente raíz: antes de mostrar cualquier pantalla
//   1. revisa que haya iniciado sesión con Microsoft (si no, lo envía a hacerlo)
//   2. pide el perfil al back para saber qué puede hacer en Pases de Salida.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Encabezado, BarraLateral],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private sesion = inject(SesionService);
  protected autenticacion = inject(AutenticacionService);

  protected estadoInicio = signal<EstadoInicio>('cargando');
  protected urlPortalTaller = environment.urlPortal + '/taller';

  // Panel del menú abierto (solo en celular)
  protected menuAbierto = signal(false);

  // Menú de la barra lateral: cada opción se muestra solo si tiene el permiso.
  // Se recalcula solo cuando carga el perfil (tienePermiso lee la señal del perfil).
  protected menu = computed<SeccionMenu[]>(() => {
    const secciones: SeccionMenu[] = [];

    const pases: OpcionMenu[] = [];
    if (this.sesion.tienePermiso('pases.ver')) {
      pases.push({ texto: 'Inicio', icono: 'inicio', ruta: '/inicio' });
      pases.push({ texto: 'Pases de salida', icono: 'lista', ruta: '/pases', rutaExacta: true });
    }
    if (this.sesion.tienePermiso('pases.crear')) {
      pases.push({ texto: 'Nuevo pase', icono: 'nuevo', ruta: '/pases/nuevo' });
    }
    if (pases.length > 0) {
      secciones.push({ titulo: 'Pases', opciones: pases });
    }

    if (this.sesion.tienePermiso('catalogos.ver')) {
      secciones.push({
        titulo: 'Catálogos',
        opciones: [
          { texto: 'Talleres', icono: 'taller', ruta: '/catalogos/talleres' },
          { texto: 'Sedes', icono: 'sede', ruta: '/catalogos/sedes' }
        ]
      });
    }

    return secciones;
  });

  // Usuario arriba de la barra lateral (nombre corto, iniciales y roles)
  protected usuarioMenu = computed<UsuarioMenu | null>(() => {
    const perfil = this.sesion.perfil();
    if (perfil === null) {
      return null;
    }

    return {
      nombre: this.sesion.nombreCorto(),
      nombreCompleto: perfil.nombre,
      iniciales: this.sesion.iniciales(),
      detalle: perfil.roles.join(', ')
    };
  });

  protected menuPie: OpcionMenu[] = [
    { texto: 'Volver al Portal', icono: 'portal', urlExterna: this.urlPortalTaller },
    { texto: 'Cerrar sesión', icono: 'salir', accion: () => this.cerrarSesion() }
  ];

  // Se avisa antes porque también cierra el Portal y Outlook en este navegador
  private cerrarSesion(): void {
    const confirmo = window.confirm(
      'Se cerrará su sesión de Microsoft en este navegador (también la del Portal y Outlook). ¿Desea salir?'
    );
    if (confirmo) {
      this.autenticacion.cerrarSesion();
    }
  }

  async ngOnInit(): Promise<void> {
    await this.iniciar();
  }

  protected async iniciar(): Promise<void> {
    this.estadoInicio.set('cargando');

    // Sin sesión de Microsoft: la primera vez se le envía directo a iniciar
    // sesión; si ya se intentó (o hubo un error) se muestra el botón.
    if (!this.autenticacion.haySesion()) {
      if (this.autenticacion.acabaDeCerrarSesion()) {
        this.estadoInicio.set('sesion-cerrada');
        return;
      }
      if (this.autenticacion.puedeIntentarAutomatico()) {
        await this.autenticacion.iniciarSesion();
        return;
      }
      this.estadoInicio.set('sin-sesion');
      return;
    }

    try {
      await this.sesion.cargarPerfil();
      this.estadoInicio.set('listo');
    } catch (error) {
      // 401: no ha iniciado sesión | 403: no tiene rol en Pases de Salida
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.estadoInicio.set('sin-sesion');
      } else if (error instanceof HttpErrorResponse && error.status === 403) {
        this.estadoInicio.set('sin-acceso');
      } else {
        this.estadoInicio.set('error');
      }
    }
  }
}
