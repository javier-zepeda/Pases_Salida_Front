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

  // Nombre corto e iniciales: "Javier Alberto Zepeda Aguirre" → "Javier Zepeda" y "JZ".
  // Con 4 o más palabras (dos nombres y dos apellidos) el primer apellido es la tercera;
  // con 2 o 3, la última.
  readonly nombreCorto = computed(() => {
    const partes = partesDelNombre(this.nombreUsuario());
    return (partes.nombre + ' ' + partes.apellido).trim();
  });

  readonly iniciales = computed(() => {
    const partes = partesDelNombre(this.nombreUsuario());
    return (partes.nombre.charAt(0) + partes.apellido.charAt(0)).toUpperCase();
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

// "Javier Alberto Zepeda Aguirre" → { nombre: 'Javier', apellido: 'Zepeda' }
function partesDelNombre(nombreCompleto: string): { nombre: string; apellido: string } {
  const palabras = nombreCompleto.trim().split(/\s+/).filter(palabra => palabra !== '');

  if (palabras.length === 0) {
    return { nombre: '', apellido: '' };
  }
  if (palabras.length >= 4) {
    return { nombre: palabras[0], apellido: palabras[2] };
  }
  if (palabras.length > 1) {
    return { nombre: palabras[0], apellido: palabras[palabras.length - 1] };
  }
  return { nombre: palabras[0], apellido: '' };
}
