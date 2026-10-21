import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SesionService } from '../../core/services/sesion.service';
import { AutenticacionService } from '../../core/services/autenticacion.service';
import { environment } from '../../../environments/environment';

// Barra superior roja: logo de Codaca, nombre de la aplicación,
// usuario actual, enlace para volver al Portal (sección Taller) y "Salir".
@Component({
  selector: 'app-encabezado',
  imports: [RouterLink],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.css'
})
export class Encabezado {
  protected sesion = inject(SesionService);
  protected urlPortalTaller = environment.urlPortal + '/taller';
  private autenticacion = inject(AutenticacionService);

  // Se avisa antes porque también cierra el Portal y Outlook en este navegador
  protected salir(): void {
    const confirmo = window.confirm(
      'Se cerrará su sesión de Microsoft en este navegador (también la del Portal y Outlook). ¿Desea salir?'
    );
    if (confirmo) {
      this.autenticacion.cerrarSesion();
    }
  }
}
