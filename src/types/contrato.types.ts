export type EstadoContrato = 'ACTIVO' | 'INACTIVO' | 'FINALIZADO' | 'PENDIENTE';

export interface Contrato {
  codigo_nomenclatura: string;
  nombre_contrato: string;
  contraparte: string;
  tipo_contrato: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  monto: number;
  moneda: string;
  estado: EstadoContrato;
  ubicacion_pc: string;
  observaciones: string | null;
  fecha_registro?: string;
}

export interface ContratoQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  estado?: EstadoContrato;
  tipo_contrato?: string;
}

export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
