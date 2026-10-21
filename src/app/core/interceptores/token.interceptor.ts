import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AutenticacionService } from '../services/autenticacion.service';
import { environment } from '../../../environments/environment';

// Agrega el token de Microsoft a cada petición que va a nuestro back:
//   Authorization: Bearer <token>
// Así ningún servicio tiene que acordarse de mandarlo.
// Las peticiones a otros sitios salen sin token.
export const agregarToken: HttpInterceptorFn = (peticion, siguiente) => {
  if (!peticion.url.startsWith(environment.urlApi)) {
    return siguiente(peticion);
  }

  const autenticacion = inject(AutenticacionService);

  // obtenerToken() es una promesa; "from" la convierte en Observable
  return from(autenticacion.obtenerToken()).pipe(
    switchMap((token) => {
      if (token === null) {
        return siguiente(peticion);   // el back responderá 401
      }
      const conToken = peticion.clone({ setHeaders: { Authorization: 'Bearer ' + token } });
      return siguiente(conToken);
    })
  );
};
