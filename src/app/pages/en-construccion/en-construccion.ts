import { Component, input } from '@angular/core';

// Pantalla temporal para opciones del menú que todavía no se programan
// (ej. catálogos de talleres y sedes). El título viene de la ruta (data.titulo).
@Component({
  selector: 'app-en-construccion',
  template: `
    <div class="contenedor">
      <div class="pantalla-aviso tarjeta">
        <h1>{{ titulo() }}</h1>
        <p>Esta pantalla está en construcción.</p>
      </div>
    </div>
  `,
  styles: `
    .pantalla-aviso {
      max-width: 520px;
      margin: 64px auto;
      padding: 32px 28px;
      text-align: center;
      color: var(--texto-secundario);
    }
    .pantalla-aviso h1 {
      font-size: 22px;
      margin-bottom: 12px;
    }
  `
})
export class EnConstruccion {
  // Lo llena el router con data.titulo (withComponentInputBinding)
  readonly titulo = input('');
}
