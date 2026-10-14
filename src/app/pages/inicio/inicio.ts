import { Component, OnInit, inject, signal } from '@angular/core';
import { SaludService } from '../../core/services/salud.service';

@Component({
  imports: [],
  selector: 'app-inicio',
  styleUrl: './inicio.css',
  templateUrl: './inicio.html',
})
export class Inicio implements OnInit {
  private saludService = inject(SaludService);

  // Texto que se muestra en la pantalla
  estadoConexion = signal('Comprobando conexión con el servidor...');

  ngOnInit(): void {
    this.saludService.comprobar().subscribe({
      next: (respuesta) => {
        this.estadoConexion.set('Servidor: ' + respuesta.estado + ', Base de datos: ' + respuesta.baseDatos);
      },
      error: () => {
        this.estadoConexion.set('No se pudo conectar con el servidor. ¿Está corriendo el back en el puerto 3100?');
      }
    });
  }
}
