import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sede, DatosSede, RespuestaSede } from '../models/sede.model';
import { TallerMantenimiento, DatosTaller, RespuestaTaller } from '../models/taller.model';

// Mantenimientos de sedes y talleres (/api/mantenimiento).
// Solo los usa quien tiene catalogos.ver / catalogos.editar (Administrador).
@Injectable({ providedIn: 'root' })
export class MantenimientoService {
  private http = inject(HttpClient);
  private urlBase = environment.urlApi + '/api/mantenimiento';

  // --- Sedes ---

  // GET /api/mantenimiento/sedes → todas, activas e inactivas
  listarSedes(): Observable<Sede[]> {
    return this.http.get<Sede[]>(this.urlBase + '/sedes');
  }

  // POST /api/mantenimiento/sedes
  crearSede(datos: DatosSede): Observable<RespuestaSede> {
    return this.http.post<RespuestaSede>(this.urlBase + '/sedes', datos);
  }

  // PUT /api/mantenimiento/sedes/:id
  editarSede(idSede: number, datos: DatosSede): Observable<RespuestaSede> {
    return this.http.put<RespuestaSede>(this.urlBase + '/sedes/' + idSede, datos);
  }

  // PATCH /api/mantenimiento/sedes/:id/estado
  cambiarEstadoSede(idSede: number, activo: boolean): Observable<RespuestaSede> {
    const cuerpo = { activo: activo };
    return this.http.patch<RespuestaSede>(this.urlBase + '/sedes/' + idSede + '/estado', cuerpo);
  }

  // --- Talleres ---

  // GET /api/mantenimiento/talleres → todos, activos e inactivos
  listarTalleres(): Observable<TallerMantenimiento[]> {
    return this.http.get<TallerMantenimiento[]>(this.urlBase + '/talleres');
  }

  // POST /api/mantenimiento/talleres
  crearTaller(datos: DatosTaller): Observable<RespuestaTaller> {
    return this.http.post<RespuestaTaller>(this.urlBase + '/talleres', datos);
  }

  // PUT /api/mantenimiento/talleres/:id
  editarTaller(idTaller: number, datos: DatosTaller): Observable<RespuestaTaller> {
    return this.http.put<RespuestaTaller>(this.urlBase + '/talleres/' + idTaller, datos);
  }

  // PATCH /api/mantenimiento/talleres/:id/estado
  cambiarEstadoTaller(idTaller: number, activo: boolean): Observable<RespuestaTaller> {
    const cuerpo = { activo: activo };
    return this.http.patch<RespuestaTaller>(this.urlBase + '/talleres/' + idTaller + '/estado', cuerpo);
  }
}
