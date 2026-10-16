import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PasesService } from '../../core/services/pases.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { SesionService } from '../../core/services/sesion.service';
import { PaseResumen, ESTADO_CREADO, ESTADO_AUTORIZADO, ESTADO_ANULADO } from '../../core/models/pase.model';
import { TipoPase } from '../../core/models/catalogo.model';
import { formatearNumeroPase, claseDeEstado } from '../../core/utils/formato';

// Opciones de los filtros rápidos por estado (null = todos)
interface OpcionEstado {
  etiqueta: string;
  valor: number | null;
}

const TAMANO_PAGINA = 20;

@Component({
  selector: 'app-listado-pases',
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './listado-pases.html',
  styleUrl: './listado-pases.css'
})
export class ListadoPases implements OnInit {
  private pasesService = inject(PasesService);
  private catalogosService = inject(CatalogosService);
  private router = inject(Router);
  protected sesion = inject(SesionService);

  // Funciones de formato para usarlas en el HTML
  protected formatearNumeroPase = formatearNumeroPase;
  protected claseDeEstado = claseDeEstado;

  protected opcionesEstado: OpcionEstado[] = [
    { etiqueta: 'Todos', valor: null },
    { etiqueta: 'Por autorizar', valor: ESTADO_CREADO },
    { etiqueta: 'Autorizados', valor: ESTADO_AUTORIZADO },
    { etiqueta: 'Anulados', valor: ESTADO_ANULADO }
  ];

  // --- Filtros ---
  protected estadoSeleccionado = signal<number | null>(null);
  protected tipoSeleccionado: number | null = null;   // enlazado con [(ngModel)]
  protected textoBusqueda = '';                       // enlazado con [(ngModel)]
  protected pagina = signal(1);

  // --- Datos que se muestran ---
  protected pases = signal<PaseResumen[]>([]);
  protected total = signal(0);
  protected tiposPase = signal<TipoPase[]>([]);
  protected cargando = signal(false);
  protected mensajeError = signal('');

  // --- Paginación calculada a partir del total ---
  protected totalPaginas = computed(() => {
    const paginas = Math.ceil(this.total() / TAMANO_PAGINA);
    if (paginas < 1) {
      return 1;
    }
    return paginas;
  });

  protected primerRegistro = computed(() => {
    if (this.total() === 0) {
      return 0;
    }
    return (this.pagina() - 1) * TAMANO_PAGINA + 1;
  });

  protected ultimoRegistro = computed(() => {
    const ultimo = this.pagina() * TAMANO_PAGINA;
    if (ultimo > this.total()) {
      return this.total();
    }
    return ultimo;
  });

  ngOnInit(): void {
    this.cargarTiposPase();
    this.cargarPases();
  }

  // ---------------------------------------------------------------------
  // Acciones de la pantalla
  // ---------------------------------------------------------------------

  protected elegirEstado(valor: number | null): void {
    this.estadoSeleccionado.set(valor);
    this.irAPrimeraPaginaYCargar();
  }

  protected cambiarTipo(): void {
    this.irAPrimeraPaginaYCargar();
  }

  protected buscar(): void {
    this.irAPrimeraPaginaYCargar();
  }

  protected limpiarBusqueda(): void {
    this.textoBusqueda = '';
    this.irAPrimeraPaginaYCargar();
  }

  protected limpiarFiltros(): void {
    this.estadoSeleccionado.set(null);
    this.tipoSeleccionado = null;
    this.textoBusqueda = '';
    this.irAPrimeraPaginaYCargar();
  }

  protected paginaAnterior(): void {
    if (this.pagina() > 1) {
      this.pagina.set(this.pagina() - 1);
      this.cargarPases();
    }
  }

  protected paginaSiguiente(): void {
    if (this.pagina() < this.totalPaginas()) {
      this.pagina.set(this.pagina() + 1);
      this.cargarPases();
    }
  }

  protected abrirPase(pase: PaseResumen): void {
    this.router.navigate(['/pases', pase.id_pase]);
  }

  // ---------------------------------------------------------------------
  // Carga de datos
  // ---------------------------------------------------------------------

  private irAPrimeraPaginaYCargar(): void {
    this.pagina.set(1);
    this.cargarPases();
  }

  protected cargarPases(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    this.pasesService.listar({
      pagina: this.pagina(),
      tamanoPagina: TAMANO_PAGINA,
      estado: this.estadoSeleccionado(),
      tipo: this.tipoSeleccionado,
      busqueda: this.textoBusqueda.trim()
    }).subscribe({
      next: (respuesta) => {
        this.pases.set(respuesta.pases);
        this.total.set(respuesta.total);
        this.cargando.set(false);
      },
      error: () => {
        this.pases.set([]);
        this.total.set(0);
        this.mensajeError.set('No se pudieron cargar los pases. Revise su conexión e intente de nuevo.');
        this.cargando.set(false);
      }
    });
  }

  private cargarTiposPase(): void {
    this.catalogosService.tiposPase().subscribe({
      next: (tipos) => this.tiposPase.set(tipos),
      error: () => this.tiposPase.set([])
    });
  }
}
