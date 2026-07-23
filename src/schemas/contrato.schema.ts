import { z } from 'zod';

export const contratoSchema = z
  .object({
    codigo_nomenclatura: z
      .string()
      .min(3, 'El código debe tener al menos 3 caracteres')
      .max(50, 'El código no puede exceder 50 caracteres')
      .trim(),
    nombre_contrato: z
      .string()
      .min(5, 'El nombre debe tener al menos 5 caracteres')
      .max(200, 'El nombre no puede exceder 200 caracteres')
      .trim(),
    contraparte: z
      .string()
      .min(3, 'La contraparte debe tener al menos 3 caracteres')
      .max(100, 'La contraparte no puede exceder 100 caracteres')
      .trim(),
    tipo_contrato: z.string().default('General'),
    fecha_inicio: z
      .string()
      .nullable()
      .optional()
      .refine(
        (val) => !val || !isNaN(Date.parse(val)),
        'fecha_inicio debe ser una fecha válida en formato ISO'
      ),
    fecha_fin: z
      .string()
      .nullable()
      .optional()
      .refine(
        (val) => !val || !isNaN(Date.parse(val)),
        'fecha_fin debe ser una fecha válida en formato ISO'
      ),
    monto: z.coerce
      .number()
      .min(0, 'El monto debe ser igual o mayor a 0')
      .default(0),
    moneda: z.string().default('USD'),
    estado: z
      .enum(['ACTIVO', 'INACTIVO', 'FINALIZADO', 'PENDIENTE'], {
        message: "El estado debe ser 'ACTIVO', 'INACTIVO', 'FINALIZADO' o 'PENDIENTE'",
      })
      .default('ACTIVO'),
    ubicacion_pc: z.string().min(1, 'La ubicación PC es requerida').trim(),
    observaciones: z.string().nullable().optional().default(''),
  })
  .refine(
    (data) => {
      if (data.fecha_inicio && data.fecha_fin) {
        const inicio = new Date(data.fecha_inicio).getTime();
        const fin = new Date(data.fecha_fin).getTime();
        return fin >= inicio;
      }
      return true;
    },
    {
      message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
      path: ['fecha_fin'],
    }
  );

export const updateContratoSchema = z
  .object({
    nombre_contrato: z.string().min(5).max(200).trim().optional(),
    contraparte: z.string().min(3).max(100).trim().optional(),
    tipo_contrato: z.string().optional(),
    fecha_inicio: z.string().nullable().optional(),
    fecha_fin: z.string().nullable().optional(),
    monto: z.coerce.number().min(0).optional(),
    moneda: z.string().optional(),
    estado: z.enum(['ACTIVO', 'INACTIVO', 'FINALIZADO', 'PENDIENTE']).optional(),
    ubicacion_pc: z.string().min(1).trim().optional(),
    observaciones: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.fecha_inicio && data.fecha_fin) {
        const inicio = new Date(data.fecha_inicio).getTime();
        const fin = new Date(data.fecha_fin).getTime();
        return fin >= inicio;
      }
      return true;
    },
    {
      message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
      path: ['fecha_fin'],
    }
  );

export const contratoQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO', 'FINALIZADO', 'PENDIENTE']).optional(),
  tipo_contrato: z.string().optional(),
});

export const extraerOcSchema = z.object({
  filename: z.string().optional(),
  contentText: z.string().optional(),
});

export const abrirUbicacionSchema = z.object({
  ubicacion: z.string().min(1, 'No se especificó la ubicación'),
});
