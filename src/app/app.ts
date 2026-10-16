import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Encabezado } from './layout/encabezado/encabezado';
import { SesionService } from './core/services/sesion.service';
import { environment } from '../environments/environment';

// Situaciones posibles al abrir la aplicación
type EstadoInicio = 'cargando' | 'listo' | 'sin-acceso' | 'sin-sesion' | 'error';

// Componente raíz: antes de mostrar cualquier pantalla, pide el perfil
// del usuario al back para saber quién es y qué puede hacer.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Encabezado],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private sesion = inject(SesionService);

  protected estadoInicio = signal<EstadoInicio>('cargando');
  protected urlPortalTaller = environment.urlPortal + '/taller';

  async ngOnInit(): Promise<void> {
    await this.iniciar();
  }

  protected async iniciar(): Promise<void> {
    this.estadoInicio.set('cargando');

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
