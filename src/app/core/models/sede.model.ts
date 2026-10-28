export interface Sede {
    id_sede: number;
    nombre: string;
    direccion: string | null;
    mapa: string | null;
    activo: boolean;
    talleres_activos: number;
}

export interface DatosSede {
    nombre: string;
    direccion: string;
    mapa: string;

}

export interface RespuestaSede{
    mensaje: string;
    id_sede: number;
}