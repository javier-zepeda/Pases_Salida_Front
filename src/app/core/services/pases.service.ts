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

  // GET /api/pases/:id/pdf → el PDF llega como archivo (Blob), no como JSON
  obtenerPdf(idPase: number): Observable<Blob> {
    return this.http.get(this.urlBase + '/' + idPase + '/pdf', { responseType: 'blob' });
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

  // POST /api/pases/:id/adjuntos
  // Los archivos viajan en un FormData (como un formulario HTML), campo "imagenes".
  // No se pone Content-Type: el navegador lo arma solo con el separador correcto.
  subirAdjuntos(idPase: number, archivos: File[]): Observable<{ mensaje: string }> {
    const formulario = new FormData();
    for (const archivo of archivos) {
      formulario.append('imagenes', archivo, archivo.name);
    }
    return this.http.post<{ mensaje: string }>(this.urlBase + '/' + idPase + '/adjuntos', formulario);
  }

  // GET /api/pases/:id/adjuntos/:idAdjunto → la imagen llega como archivo (Blob).
  // No se usa <img src="..."> directo porque así no se manda el token.
  obtenerImagen(idPase: number, idAdjunto: number): Observable<Blob> {
    return this.http.get(this.urlBase + '/' + idPase + '/adjuntos/' + idAdjunto, { responseType: 'blob' });
  }

  // DELETE /api/pases/:id/adjuntos/:idAdjunto → la quita del pase (queda guardada como inactiva)
  quitarAdjunto(idPase: number, idAdjunto: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(this.urlBase + '/' + idPase + '/adjuntos/' + idAdjunto);
  }

}
