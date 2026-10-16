// Perfil del usuario en Pases de Salida (GET /api/sesion/perfil)
export interface Perfil {
  id: number;
  nombre: string;
  correo: string;
  roles: string[];
  permisos: string[];
  talleres: { id_taller: number; nombre: string }[];
}
