import { Component, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SesionService } from '../../core/services/sesion.service';

// Barra superior roja: botón del menú (celular), logo de Codaca "Volver al Portal" y "Cerrar sesión" están en la barra lateral.
@Component({
  selector: 'app-encabezado',
  imports: [RouterLink],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.css'
})
export class Encabezado {
  protected sesion = inject(SesionService);

  // Avisa que se tocó ☰ (la barra lateral se abre en celular)
  readonly abrirMenu = output<void>();
}
