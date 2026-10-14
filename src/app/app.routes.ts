import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';

export const routes: Routes = [
    {path: '', component: Inicio},
    // Cualquier URL desconocida regresa al inicio
  { path: '**', redirectTo: '' }
];
