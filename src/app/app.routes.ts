import { Routes } from '@angular/router';
import { ListadoPases } from './pages/listado-pases/listado-pases';
import { DetallePase } from './pages/detalle-pase/detalle-pase';

export const routes: Routes = [
  // Al entrar, se muestra el listado de pases
  { path: '', redirectTo: 'pases', pathMatch: 'full' },
  { path: 'pases', component: ListadoPases },
  { path: 'pases/:id', component: DetallePase },

  // Cualquier URL desconocida regresa al listado
  { path: '**', redirectTo: 'pases' }
];
