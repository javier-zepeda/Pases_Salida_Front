import { Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { PasesService } from '../../core/services/pases.service';
import { Adjunto } from '../../core/models/pase.model';

// Miniatura de una imagen adjunta al pase. Al tocarla se abre en grande.
//
// Por qué no basta con <img src="http://.../adjuntos/5">:
//   el back pide el token de Microsoft y un <img> no puede mandarlo.
//   Entonces la imagen se pide con HttpClient (el interceptor pone el token),
//   llega como Blob y se convierte en una dirección temporal "blob:..."
//   que sí se puede usar en el <img>.
//
// Uso: <app-imagen-adjunta [idPase]="pase.id_pase" [adjunto]="adjunto" />
@Component({
  selector: 'app-imagen-adjunta',
  templateUrl: './imagen-adjunta.html',
  styleUrl: './imagen-adjunta.css'
})
export class ImagenAdjunta implements OnInit, OnDestroy {
  private pasesService = inject(PasesService);

  readonly idPase = input.required<number>();
  readonly adjunto = input.required<Adjunto>();

  protected direccion = signal('');   // "blob:http://localhost:4300/…"
  protected estado = signal<'cargando' | 'lista' | 'error' | 'anterior'>('cargando');

  private pedido: Subscription | null = null;

  ngOnInit(): void {
    if (this.adjunto().del_sistema_anterior) {
      this.estado.set('anterior');
      return;
    }

    this.pedido = this.pasesService.obtenerImagen(this.idPase(), this.adjunto().id_adjunto).subscribe({
      next: (imagen) => {
        this.direccion.set(URL.createObjectURL(imagen));
        this.estado.set('lista');
      },
      error: () => this.estado.set('error')
    });
  }

  // La dirección temporal ocupa memoria hasta que se libera
  ngOnDestroy(): void {
    if (this.pedido !== null) {
      this.pedido.unsubscribe();
    }
    if (this.direccion() !== '') {
      URL.revokeObjectURL(this.direccion());
    }
  }

  protected abrirEnGrande(): void {
    window.open(this.direccion(), '_blank');
  }
}
