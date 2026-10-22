import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { agregarToken } from './core/interceptores/token.interceptor';
import { AutenticacionService } from './core/services/autenticacion.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Antes de arrancar: recibir la respuesta de Microsoft si venimos del login
    provideAppInitializer(() => inject(AutenticacionService).iniciar()),
    // withComponentInputBinding: los datos de la ruta llegan como input() al componente
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([agregarToken]))
  ]
};
