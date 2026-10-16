import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SesionService } from '../../core/services/sesion.service';
import { environment } from '../../../environments/environment';

// Barra superior roja: logo de Codaca, nombre de la aplicación,
// usuario actual y enlace para volver al Portal (sección Taller).
@Component({
  selector: 'app-encabezado',
  imports: [RouterLink],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.css'
})
export class Encabezado {
  protected sesion = inject(SesionService);
  protected urlPortalTaller = environment.urlPortal + '/taller';
}
