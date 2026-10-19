import { Routes } from '@angular/router';
import { ListadoPases } from './pages/listado-pases/listado-pases';
import { DetallePase } from './pages/detalle-pase/detalle-pase';
import { FormularioPase } from './pages/formulario-pase/formulario-pase';
import { confirmarSalidaSinGuardar } from './core/guards/cambios-sin-guardar.guard';

export const routes: Routes = [
  // Al entrar, se muestra el listado de pases
  { path: '', redirectTo: 'pases', pathMatch: 'full' },
  { path: 'pases', component: ListadoPases },
  // El formulario pregunta antes de salir si hay datos sin guardar
  { path: 'pases/nuevo', component: FormularioPase, canDeactivate: [confirmarSalidaSinGuardar] },
  { path: 'pases/:id', component: DetallePase },
  { path: 'pases/:id/editar', component: FormularioPase, canDeactivate: [confirmarSalidaSinGuardar] },

  // Cualquier URL desconocida regresa al listado
  { path: '**', redirectTo: 'pases' }
];
