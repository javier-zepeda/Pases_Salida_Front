import { Component, input, model, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { OpcionMenu, SeccionMenu } from './menu.model';

const CLAVE_COLAPSADA = 'barra_lateral_colapsada';

// Barra lateral de navegación (estándar Codaca).
//
// Uso:
//   <app-barra-lateral [secciones]="menu()" [pie]="menuPie()" [(abiertaEnCelular)]="menuAbierto" />
//
//   - secciones: opciones principales, agrupadas con un título.
//   - pie: opciones que van abajo (volver al Portal, cerrar sesión).
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
