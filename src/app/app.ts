import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Encabezado } from './layout/encabezado/encabezado';
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
  imports: [RouterOutlet, Encabezado],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private sesion = inject(SesionService);
  protected autenticacion = inject(AutenticacionService);

  protected estadoInicio = signal<EstadoInicio>('cargando');
  protected urlPortalTaller = environment.urlPortal + '/taller';

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
