import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { ListadoPases } from './pages/listado-pases/listado-pases';
import { DetallePase } from './pages/detalle-pase/detalle-pase';
import { FormularioPase } from './pages/formulario-pase/formulario-pase';
import { MantenimientoSedes } from './pages/mantenimientos/sedes/mantenimiento-sedes';
import { MantenimientoTalleres } from './pages/mantenimientos/talleres/mantenimiento-talleres';
import { confirmarSalidaSinGuardar } from './core/guards/cambios-sin-guardar.guard';

export const routes: Routes = [
  // Al entrar, se muestra la página de Inicio
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: Inicio },
  { path: 'pases', component: ListadoPases },
  // El formulario pregunta antes de salir si hay datos sin guardar
  { path: 'pases/nuevo', component: FormularioPase, canDeactivate: [confirmarSalidaSinGuardar] },
  { path: 'pases/:id', component: DetallePase },
  { path: 'pases/:id/editar', component: FormularioPase, canDeactivate: [confirmarSalidaSinGuardar] },

  // Mantenimientos (el back revisa los permisos catalogos.ver / catalogos.editar)
  { path: 'catalogos/talleres', component: MantenimientoTalleres },
  { path: 'catalogos/sedes', component: MantenimientoSedes },

  // Cualquier URL desconocida regresa a Inicio
  { path: '**', redirectTo: 'inicio' }
];
