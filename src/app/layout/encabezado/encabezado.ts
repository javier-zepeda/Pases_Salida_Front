import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SesionService } from '../../core/services/sesion.service';

// Barra superior roja: botón ☰ del menú (solo celular), logo de Codaca con el
// nombre de la aplicación, y el usuario (solo en celular: en computadora ya se ve
// en la barra lateral). "Volver al Portal" y "Cerrar sesión" están en la barra lateral.
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

  // true cuando la barra lateral ya muestra al usuario: en computadora se
  // oculta aquí para no repetirlo (en celular la barra está escondida y se deja)
  readonly usuarioEnBarra = input(false);
}
