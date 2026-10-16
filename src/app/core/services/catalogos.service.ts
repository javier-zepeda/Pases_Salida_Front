import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TipoPase, Taller } from '../models/catalogo.model';

// Catálogos para filtros y formularios (/api/catalogos).
@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private http = inject(HttpClient);
  private urlBase = environment.urlApi + '/api/catalogos';

  // Tipos de pase con sus reglas
  tiposPase(): Observable<TipoPase[]> {
    return this.http.get<TipoPase[]>(this.urlBase + '/tipos-pase');
  }

  // Talleres que el usuario puede usar
  talleres(): Observable<Taller[]> {
    return this.http.get<Taller[]>(this.urlBase + '/talleres');
  }
}
