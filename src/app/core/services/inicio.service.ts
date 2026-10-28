import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResumenInicio } from '../models/inicio.model';

// Datos de la página de Inicio (/api/inicio).
@Injectable({ providedIn: 'root' })
export class InicioService {
  private http = inject(HttpClient);
  private urlBase = environment.urlApi + '/api/inicio';

  // GET /api/inicio/resumen → números de las tarjetas
  resumen(): Observable<ResumenInicio> {
    return this.http.get<ResumenInicio>(this.urlBase + '/resumen');
  }
}
