import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Perfil } from '../models/sesion.model';

// Guarda quién es el usuario y qué puede hacer en Pases de Salida.
// Las pantallas lo usan para mostrar u ocultar botones:
//   if (sesion.tienePermiso('pases.crear')) { ... }
//
// OJO: ocultar un botón es solo comodidad. La seguridad real está en el
// back, que vuelve a revisar el permiso en cada petición.
@Injectable({ providedIn: 'root' })
export class SesionService {
  private http = inject(HttpClient);

  // Perfil del usuario; null mientras no se ha cargado
  readonly perfil = signal<Perfil | null>(null);

  // Nombre para mostrar en el encabezado
  readonly nombreUsuario = computed(() => {
    const perfil = this.perfil();
    if (perfil === null) {
      return '';
    }
    return perfil.nombre;
  });

  // Pide el perfil al back. Devuelve una promesa para poder esperarla
  // antes de mostrar la aplicación.
  async cargarPerfil(): Promise<void> {
    const perfil = await firstValueFrom(
      this.http.get<Perfil>(environment.urlApi + '/api/sesion/perfil')
    );
    this.perfil.set(perfil);
  }

  // true si el usuario tiene el permiso indicado (ej. 'pases.autorizar')
  tienePermiso(permiso: string): boolean {
    const perfil = this.perfil();
    if (perfil === null) {
      return false;
    }
    return perfil.permisos.includes(permiso);
  }
}
