import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { InicioService } from '../../core/services/inicio.service';
import { PasesService } from '../../core/services/pases.service';
import { SesionService } from '../../core/services/sesion.service';
import { ResumenInicio } from '../../core/models/inicio.model';
import { PaseResumen, ESTADO_CREADO } from '../../core/models/pase.model';
import { formatearNumeroPase } from '../../core/utils/formato';

// Cuántos pases por autorizar se muestran en la tabla de Inicio
const PASES_EN_TABLA = 10;

// Una tarjeta de arriba: número, texto, color, ícono y a dónde lleva
interface Tarjeta {
  titulo: string;
  numero: number;
  color: 'azul' | 'ambar' | 'verde' | 'rojo';
  icono: 'pases' | 'reloj' | 'sede' | 'taller';
  ruta: string;
  filtros?: Record<string, number>;   // ?estado=0 para abrir el listado ya filtrado
}

// Página de Inicio: tarjetas con números y los últimos pases por autorizar.
@Component({
  selector: 'app-inicio',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio implements OnInit {
  private inicioService = inject(InicioService);
  private pasesService = inject(PasesService);
  private sesion = inject(SesionService);
  private router = inject(Router);

  protected formatearNumeroPase = formatearNumeroPase;
  protected ESTADO_CREADO = ESTADO_CREADO;

  protected nombreUsuario = this.sesion.nombreUsuario;

  // --- Tarjetas ---
  protected resumen = signal<ResumenInicio | null>(null);
  protected errorResumen = signal(false);

  // Sedes y talleres solo llegan (no son null) si el usuario tiene catalogos.ver
  protected tarjetas = computed<Tarjeta[]>(() => {
    const resumen = this.resumen();
    if (resumen === null) {
      return [];
    }

    const tarjetas: Tarjeta[] = [
      { titulo: 'Pases de salida', numero: resumen.pases, color: 'azul', icono: 'pases', ruta: '/pases' },
      { titulo: 'Por autorizar', numero: resumen.por_autorizar, color: 'ambar', icono: 'reloj', ruta: '/pases', filtros: { estado: ESTADO_CREADO } }
    ];

    if (resumen.sedes !== null) {
      tarjetas.push({ titulo: 'Sedes activas', numero: resumen.sedes, color: 'verde', icono: 'sede', ruta: '/catalogos/sedes' });
    }
    if (resumen.talleres !== null) {
      tarjetas.push({ titulo: 'Talleres activos', numero: resumen.talleres, color: 'rojo', icono: 'taller', ruta: '/catalogos/talleres' });
    }

    return tarjetas;
  });

  // --- Tabla de pases por autorizar ---
  protected pases = signal<PaseResumen[]>([]);
  protected cargandoPases = signal(true);
  protected errorPases = signal(false);

  ngOnInit(): void {
    this.cargarResumen();
    this.cargarPases();
  }

  protected cargarResumen(): void {
    this.errorResumen.set(false);

    this.inicioService.resumen().subscribe({
      next: (resumen) => this.resumen.set(resumen),
      error: () => this.errorResumen.set(true)
    });
  }

  // Usa el mismo listado de pases, filtrado en Creado y solo la primera página
  protected cargarPases(): void {
    this.cargandoPases.set(true);
    this.errorPases.set(false);

    this.pasesService.listar({
      pagina: 1,
      tamanoPagina: PASES_EN_TABLA,
      estado: ESTADO_CREADO,
      tipo: null,
      busqueda: ''
    }).subscribe({
      next: (respuesta) => {
        this.pases.set(respuesta.pases);
        this.cargandoPases.set(false);
      },
      error: () => {
        this.errorPases.set(true);
        this.cargandoPases.set(false);
      }
    });
  }

  protected abrirPase(pase: PaseResumen): void {
    this.router.navigate(['/pases', pase.id_pase]);
  }
}
