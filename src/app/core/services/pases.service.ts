import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FiltrosListado, RespuestaListado, PaseDetalle, RespuestaAutorizar,
  DatosPase, RespuestaCrear, RespuestaEditar
} from '../models/pase.model';

// Llamadas a la API de pases de salida (/api/pases).
@Injectable({ providedIn: 'root' })
export class PasesService {
  private http = inject(HttpClient);
  private urlBase = environment.urlApi + '/api/pases';

  // GET /api/pases?pagina=1&tamanoPagina=20&estado=0&tipo=1&busqueda=...
  // Solo se envían los filtros que tienen valor.
  listar(filtros: FiltrosListado): Observable<RespuestaListado> {
    let parametros = new HttpParams()
      .set('pagina', filtros.pagina)
      .set('tamanoPagina', filtros.tamanoPagina);

    if (filtros.estado !== null) {
      parametros = parametros.set('estado', filtros.estado);
    }
    if (filtros.tipo !== null) {
      parametros = parametros.set('tipo', filtros.tipo);
    }
    if (filtros.busqueda !== '') {
      parametros = parametros.set('busqueda', filtros.busqueda);
    }

    return this.http.get<RespuestaListado>(this.urlBase, { params: parametros });
  }

  // GET /api/pases/:id → pase completo con artículos, adjuntos e historial
  obtener(idPase: number): Observable<PaseDetalle> {
    return this.http.get<PaseDetalle>(this.urlBase + '/' + idPase);
  }

  // POST /api/pases/:id/autorizar
  // conPendientes = true cuando el usuario ya confirmó que desea autorizar
  // aunque el vehículo tenga otras órdenes sin facturar.
  autorizar(idPase: number, conPendientes: boolean): Observable<RespuestaAutorizar> {
    const cuerpo = { autorizar_con_pendientes: conPendientes };
    return this.http.post<RespuestaAutorizar>(this.urlBase + '/' + idPase + '/autorizar', cuerpo);
  }

  // POST /api/pases/:id/anular
  anular(idPase: number, motivo: string): Observable<{ mensaje: string }> {
    const cuerpo = { motivo: motivo };
    return this.http.post<{ mensaje: string }>(this.urlBase + '/' + idPase + '/anular', cuerpo);
  }
    // POST /api/pases
  crear(datos: DatosPase): Observable<RespuestaCrear> {
    return this.http.post<RespuestaCrear>(this.urlBase, datos);
  }

  // PUT /api/pases/:id
  editar(idPase: number, datos: DatosPase): Observable<RespuestaEditar> {
    return this.http.put<RespuestaEditar>(this.urlBase + '/' + idPase, datos);
  }

}
