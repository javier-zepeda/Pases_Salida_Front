import { Injectable, signal } from '@angular/core';
import { AccountInfo, InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

// Lo que se le pide a Microsoft al iniciar sesión: solo identificar al usuario
// (nombre y correo). La aplicación no lee su correo ni sus archivos.
const PERMISOS_LOGIN = ['openid', 'profile', 'email'];

// El token se renueva si le quedan menos de 5 minutos
const MARGEN_VENCIMIENTO_SEGUNDOS = 5 * 60;

// Marcas en sessionStorage (duran mientras la pestaña esté abierta)
const CLAVE_INTENTO_AUTOMATICO = 'pases_login_automatico';  // evita un ciclo de redirecciones
const CLAVE_SESION_CERRADA = 'pases_sesion_cerrada';        // el usuario tocó "Salir"

// Inicio de sesión con Microsoft (Entra ID) usando MSAL.
//
// Cómo funciona:
//   1. Al abrir la app, si no hay sesión, se envía al usuario a la página de
//      Microsoft (redirección). Si ya entró al Portal o a Outlook en este
//      navegador, Microsoft lo reconoce y regresa casi de inmediato.
//   2. Microsoft lo devuelve a la app con un token que dice quién es.
//   3. Cada petición al back lleva ese token (ver token.interceptor.ts);
//      el back revisa la firma y saca el correo del token.
@Injectable({ providedIn: 'root' })
export class AutenticacionService {
  private msal = new PublicClientApplication({
    auth: {
      clientId: environment.azure.idCliente,
      authority: 'https://login.microsoftonline.com/' + environment.azure.idTenant,
      redirectUri: window.location.origin + '/'
    },
    cache: { cacheLocation: 'localStorage' }
  });

  private cuenta: AccountInfo | null = null;

  // El token se guarda aquí para no pedírselo a MSAL en cada petición
  private token: string | null = null;
  // Si varias peticiones salen juntas, todas esperan la misma renovación
  private renovacionEnCurso: Promise<string | null> | null = null;

  // Mensaje si Microsoft respondió con un error al volver del login
  readonly errorLogin = signal('');

  // Se llama una sola vez al abrir la aplicación (app.config.ts), antes de
  // que el router muestre cualquier pantalla: así MSAL lee la respuesta de
  // Microsoft que viene en la dirección antes de que Angular la cambie.
  async iniciar(): Promise<void> {
    try {
      await this.msal.initialize();

      // Si venimos de la página de Microsoft, aquí se recibe el resultado
      const respuesta = await this.msal.handleRedirectPromise();

      if (respuesta !== null && respuesta.account) {
        this.cuenta = respuesta.account;
        this.token = respuesta.idToken;
        sessionStorage.removeItem(CLAVE_INTENTO_AUTOMATICO);
        volverARuta(respuesta.state);
      } else {
        const cuentas = this.msal.getAllAccounts();
        this.cuenta = cuentas.length > 0 ? cuentas[0] : null;
      }

      if (this.cuenta !== null) {
        this.msal.setActiveAccount(this.cuenta);
      }
    } catch (error) {
      console.error('Error al iniciar sesión con Microsoft:', error);
      this.errorLogin.set('Microsoft no pudo completar el inicio de sesión. Intente de nuevo.');
    }
  }

  haySesion(): boolean {
    return this.cuenta !== null;
  }

  // Correo con el que entró (para mostrarlo si no tiene acceso)
  correo(): string {
    return this.cuenta !== null ? this.cuenta.username : '';
  }

  // true la primera vez en esta pestaña; después el usuario debe usar el botón.
  // Evita un ciclo infinito de redirecciones si el login falla.
  puedeIntentarAutomatico(): boolean {
    if (this.errorLogin() !== '' || sessionStorage.getItem(CLAVE_INTENTO_AUTOMATICO) !== null) {
      return false;
    }
    sessionStorage.setItem(CLAVE_INTENTO_AUTOMATICO, '1');
    return true;
  }

  // true si el usuario acaba de cerrar sesión (para no mandarlo a Microsoft otra vez)
  acabaDeCerrarSesion(): boolean {
    return sessionStorage.getItem(CLAVE_SESION_CERRADA) !== null;
  }

  // Envía al usuario a la página de Microsoft.
  //
  // Microsoft siempre regresa a la página principal (la dirección registrada
  // en Azure). La ruta en la que estaba el usuario (ej. /pases/66407) viaja en
  // "state" y al volver se coloca antes de que arranque el router. Así la app
  // carga una sola vez, en lugar de cargar en "/" y recargar en la ruta.
  async iniciarSesion(): Promise<void> {
    sessionStorage.removeItem(CLAVE_SESION_CERRADA);
    await this.msal.loginRedirect({
      scopes: PERMISOS_LOGIN,
      redirectStartPage: window.location.origin + '/',
      state: window.location.pathname + window.location.search
    });
  }

  // Cierra la sesión de Microsoft en este navegador (también la del Portal
  // y Outlook) y regresa a la app, que muestra "Cerró sesión".
  async cerrarSesion(): Promise<void> {
    sessionStorage.setItem(CLAVE_SESION_CERRADA, '1');
    this.token = null;
    await this.msal.logoutRedirect({
      account: this.cuenta,
      postLogoutRedirectUri: window.location.origin + '/'
    });
  }

  // Token para mandar al back.
  // Se usa el guardado mientras le quede más de 5 minutos; si no, se renueva
  // con MSAL (sin molestar al usuario).
  async obtenerToken(): Promise<string | null> {
    if (this.cuenta === null) {
      return null;
    }
    if (this.token !== null && !tokenPorVencer(this.token)) {
      return this.token;
    }

    if (this.renovacionEnCurso === null) {
      this.renovacionEnCurso = this.renovarToken().finally(() => {
        this.renovacionEnCurso = null;
      });
    }
    return this.renovacionEnCurso;
  }

  private async renovarToken(): Promise<string | null> {
    try {
      const pedido = { scopes: PERMISOS_LOGIN, account: this.cuenta! };
      let respuesta = await this.msal.acquireTokenSilent(pedido);

      // MSAL puede devolver el que tiene guardado aunque esté por vencer
      if (tokenPorVencer(respuesta.idToken)) {
        respuesta = await this.msal.acquireTokenSilent({ ...pedido, forceRefresh: true });
      }

      this.token = respuesta.idToken;
      return this.token;
    } catch (error) {
      this.token = null;
      if (error instanceof InteractionRequiredAuthError) {
        await this.iniciarSesion();   // la sesión de Microsoft venció
      } else {
        console.error('No se pudo obtener el token de Microsoft:', error);
      }
      return null;
    }
  }
}

// Lee la fecha de vencimiento (exp) que viene dentro del token
function tokenPorVencer(token: string): boolean {
  try {
    const contenido = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const datos = JSON.parse(atob(contenido)) as { exp?: number };
    if (typeof datos.exp !== 'number') {
      return true;
    }
    const ahora = Math.floor(Date.now() / 1000);
    return datos.exp - ahora < MARGEN_VENCIMIENTO_SEGUNDOS;
  } catch {
    return true;
  }
}

// Coloca en la barra de direcciones la ruta donde estaba el usuario antes de
// ir a Microsoft (sin recargar). Solo rutas internas: "/pases/1", nunca
// "//otro-sitio.com" ni "https://...".
function volverARuta(ruta: string | undefined): void {
  if (!ruta || !ruta.startsWith('/') || ruta.startsWith('//')) {
    return;
  }
  history.replaceState(null, '', ruta);
}
