import { Component, input, model, signal } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { OpcionMenu, SeccionMenu, UsuarioMenu } from './menu.model';

const CLAVE_COLAPSADA = 'barra_lateral_colapsada';

// rutaExacta: /pases se marca, /pases/nuevo no
const ACTIVA_EXACTA: IsActiveMatchOptions = {
  paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored'
};
// Sin rutaExacta: /catalogos/sedes también se marca en sus subrutas
const ACTIVA_INCLUYE_SUBRUTAS: IsActiveMatchOptions = {
  paths: 'subset', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored'
};

// Barra lateral de navegación (estándar Codaca).
//
// Uso:
//   <app-barra-lateral [secciones]="menu()" [pie]="menuPie()" [(abiertaEnCelular)]="menuAbierto" />
//
//   - secciones: opciones principales, agrupadas con un título.
//   - pie: opciones que van abajo (volver al Portal, cerrar sesión).
//   - usuario: (opcional) iniciales, nombre y rol que se ven arriba.
//   - En computadora se puede colapsar a solo íconos (se recuerda en este navegador).
//   - En celular se oculta y se abre como panel con el botón ☰ del encabezado.
@Component({
  selector: 'app-barra-lateral',
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './barra-lateral.html',
  styleUrl: './barra-lateral.css'
})
export class BarraLateral {
  readonly secciones = input.required<SeccionMenu[]>();
  readonly pie = input<OpcionMenu[]>([]);
  readonly usuario = input<UsuarioMenu | null>(null);
  readonly abiertaEnCelular = model(false);

  protected colapsada = signal(leerColapsada());

  protected alternarColapsada(): void {
    const nuevoValor = !this.colapsada();
    this.colapsada.set(nuevoValor);
    try {
      localStorage.setItem(CLAVE_COLAPSADA, nuevoValor ? '1' : '0');
    } catch {
      // Sin acceso a localStorage (modo privado): solo no se recuerda
    }
  }

  // Cuándo una opción se marca como activa. Los filtros de la URL (?estado=0)
  // no cuentan: /pases?estado=0 sigue marcando "Pases de salida".
  protected opcionesActiva(opcion: OpcionMenu): IsActiveMatchOptions {
    if (opcion.rutaExacta === true) {
      return ACTIVA_EXACTA;
    }
    return ACTIVA_INCLUYE_SUBRUTAS;
  }

  // Al elegir una opción en celular, el panel se cierra
  protected elegir(opcion: OpcionMenu): void {
    this.abiertaEnCelular.set(false);
    if (opcion.accion) {
      opcion.accion();
    }
  }
}

function leerColapsada(): boolean {
  try {
    return localStorage.getItem(CLAVE_COLAPSADA) === '1';
  } catch {
    return false;
  }
}
