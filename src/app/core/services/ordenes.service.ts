import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConsultaOrden } from '../models/orden.model';

// Consulta de órdenes de trabajo en Integra (/api/ordenes).
@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private http = inject(HttpClient);
  private urlBase = environment.urlApi + '/api/ordenes';

  // GET /api/ordenes/:numero
  consultar(numeroOrden: string): Observable<ConsultaOrden> {
    return this.http.get<ConsultaOrden>(this.urlBase + '/' + encodeURIComponent(numeroOrden));
  }
}