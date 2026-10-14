import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Forma de la respuesta de la API
export interface RespuestaSalud {
  estado: string;
  baseDatos: string;
}

@Injectable({ providedIn: 'root' })
export class SaludService {
    private http = inject(HttpClient);

    comprobar(): Observable<RespuestaSalud> {
        return this.http.get<RespuestaSalud>(`${environment.urlApi}/api/salud`);
    }
}