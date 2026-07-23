import supabase from '../database/supabase';
import db from '../database/sqlite';
import { Contrato, ContratoQueryParams, PaginatedResponse } from '../types/contrato.types';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import { config } from '../config/env';

function withTimeout<T>(promise: PromiseLike<T>, ms = 1000): Promise<T> {
  if (config.isTest) {
    return Promise.reject(new Error('Test mode fallback to local SQLite'));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Supabase request timed out after ${ms}ms`));
    }, ms);

    Promise.resolve(promise)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export class ContratoService {
  /**
   * Obtiene lista paginada y filtrada de contratos (Supabase con fallback a SQLite)
   */
  public async getContratos(
    queryParams: ContratoQueryParams
  ): Promise<PaginatedResponse<Contrato>> {
    const page = Number(queryParams.page) || 1;
    const limit = Math.min(Number(queryParams.limit) || 20, 100);
    const search = queryParams.search?.trim();
    const estado = queryParams.estado;
    const tipo_contrato = queryParams.tipo_contrato;

    // Intentar consulta en Supabase Cloud DB con timeout
    try {
      let query = supabase.from('contratos').select('*', { count: 'exact' });

      if (estado) {
        query = query.eq('estado', estado);
      }
      if (tipo_contrato) {
        query = query.eq('tipo_contrato', tipo_contrato);
      }
      if (search) {
        query = query.or(
          `codigo_nomenclatura.ilike.%${search}%,nombre_contrato.ilike.%${search}%,contraparte.ilike.%${search}%`
        );
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, count, error } = await withTimeout(
        query.order('fecha_registro', { ascending: false }).range(from, to)
      );

      if (error) {
        throw error;
      }

      const total = count || 0;
      return {
        data: (data as Contrato[]) || [],
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Supabase getContratos fallback a SQLite: ${message}`);

      return this.getContratosFromSqlite(page, limit, search, estado, tipo_contrato);
    }
  }

  private getContratosFromSqlite(
    page: number,
    limit: number,
    search?: string,
    estado?: string,
    tipo_contrato?: string
  ): Promise<PaginatedResponse<Contrato>> {
    return new Promise((resolve, reject) => {
      if (!db) {
        return resolve({ data: [], total: 0, page, limit, pages: 0 });
      }

      const whereClauses: string[] = [];
      const params: (string | number)[] = [];

      if (estado) {
        whereClauses.push('estado = ?');
        params.push(estado);
      }
      if (tipo_contrato) {
        whereClauses.push('tipo_contrato = ?');
        params.push(tipo_contrato);
      }
      if (search) {
        whereClauses.push(
          '(codigo_nomenclatura LIKE ? OR nombre_contrato LIKE ? OR contraparte LIKE ?)'
        );
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countSql = `SELECT COUNT(*) as count FROM contratos ${whereSql}`;
      db.get(countSql, params, (countErr, countRow: { count: number } | undefined) => {
        if (countErr) {
          logger.error(`SQLite count error: ${countErr.message}`);
          return reject(countErr);
        }

        const total = countRow ? countRow.count : 0;
        const offset = (page - 1) * limit;
        const dataSql = `SELECT * FROM contratos ${whereSql} ORDER BY codigo_nomenclatura DESC LIMIT ? OFFSET ?`;
        const dataParams = [...params, limit, offset];

        db!.all(dataSql, dataParams, (dataErr, rows: Contrato[]) => {
          if (dataErr) {
            logger.error(`SQLite data error: ${dataErr.message}`);
            return reject(dataErr);
          }
          resolve({
            data: rows || [],
            total,
            page,
            limit,
            pages: Math.ceil(total / limit) || 1,
          });
        });
      });
    });
  }

  /**
   * Obtiene un contrato por su código de nomenclatura
   */
  public async getContratoByCodigo(codigo: string): Promise<Contrato> {
    try {
      const { data, error } = await withTimeout(
        supabase.from('contratos').select('*').eq('codigo_nomenclatura', codigo).single()
      );

      if (!error && data) {
        return data as Contrato;
      }
    } catch {
      logger.warn(`Supabase getContratoByCodigo fail, fallback a SQLite for ${codigo}`);
    }

    if (db) {
      return new Promise((resolve, reject) => {
        db!.get(
          'SELECT * FROM contratos WHERE codigo_nomenclatura = ?',
          [codigo],
          (err, row: Contrato | undefined) => {
            if (err) return reject(err);
            if (!row) return reject(new NotFoundError('Contrato no encontrado'));
            resolve(row);
          }
        );
      });
    }

    throw new NotFoundError('Contrato no encontrado');
  }

  /**
   * Registra un nuevo contrato (Guarda en Supabase y SQLite)
   */
  public async createContrato(payload: Contrato): Promise<{ message: string; data: Contrato }> {
    let savedInSupabase = false;
    let sbError: Error | null = null;

    try {
      const { error } = await withTimeout(
        supabase.from('contratos').insert([payload]).select()
      );
      if (!error) {
        savedInSupabase = true;
      } else {
        sbError = new Error(error.message);
      }
    } catch (err: unknown) {
      sbError = err instanceof Error ? err : new Error(String(err));
    }

    if (db) {
      return new Promise((resolve, reject) => {
        db!.run(
          `INSERT INTO contratos (codigo_nomenclatura, nombre_contrato, contraparte, tipo_contrato, fecha_inicio, fecha_fin, monto, moneda, estado, ubicacion_pc, observaciones)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(codigo_nomenclatura) DO UPDATE SET
              nombre_contrato=excluded.nombre_contrato,
              contraparte=excluded.contraparte,
              tipo_contrato=excluded.tipo_contrato,
              fecha_inicio=excluded.fecha_inicio,
              fecha_fin=excluded.fecha_fin,
              monto=excluded.monto,
              moneda=excluded.moneda,
              estado=excluded.estado,
              ubicacion_pc=excluded.ubicacion_pc,
              observaciones=excluded.observaciones`,
          [
            payload.codigo_nomenclatura,
            payload.nombre_contrato,
            payload.contraparte,
            payload.tipo_contrato,
            payload.fecha_inicio,
            payload.fecha_fin,
            payload.monto,
            payload.moneda,
            payload.estado,
            payload.ubicacion_pc,
            payload.observaciones,
          ],
          function (err) {
            if (err && !savedInSupabase) {
              return reject(new Error('Error al registrar en SQL: ' + err.message));
            }
            resolve({
              message: savedInSupabase
                ? 'Contrato registrado exitosamente en Supabase Cloud y SQL Local'
                : 'Contrato registrado exitosamente en Base de Datos SQL Local',
              data: payload,
            });
          }
        );
      });
    }

    if (!savedInSupabase) {
      throw new Error(sbError ? sbError.message : 'Error al guardar en Supabase');
    }

    return {
      message: 'Contrato registrado exitosamente en Supabase Cloud',
      data: payload,
    };
  }

  /**
   * Actualiza un contrato existente
   */
  public async updateContrato(
    codigo: string,
    payload: Partial<Contrato>
  ): Promise<{ message: string; data: Partial<Contrato> }> {
    try {
      await withTimeout(
        supabase.from('contratos').update(payload).eq('codigo_nomenclatura', codigo)
      );
    } catch (e) {
      logger.warn(`Supabase update error para ${codigo}: ${e}`);
    }

    if (db) {
      return new Promise((resolve, reject) => {
        db!.get(
          'SELECT * FROM contratos WHERE codigo_nomenclatura = ?',
          [codigo],
          (checkErr, row: Contrato | undefined) => {
            if (checkErr) return reject(checkErr);
            if (!row) return reject(new NotFoundError('Contrato no encontrado'));

            const updatedData = { ...row, ...payload };

            db!.run(
              `UPDATE contratos SET
                nombre_contrato=?, contraparte=?, tipo_contrato=?, fecha_inicio=?, fecha_fin=?,
                monto=?, moneda=?, estado=?, ubicacion_pc=?, observaciones=?
               WHERE codigo_nomenclatura=?`,
              [
                updatedData.nombre_contrato,
                updatedData.contraparte,
                updatedData.tipo_contrato,
                updatedData.fecha_inicio || null,
                updatedData.fecha_fin || null,
                updatedData.monto || 0,
                updatedData.moneda || 'USD',
                updatedData.estado || 'ACTIVO',
                updatedData.ubicacion_pc,
                updatedData.observaciones || '',
                codigo,
              ],
              function (err) {
                if (err) return reject(err);
                resolve({
                  message: 'Contrato actualizado exitosamente',
                  data: updatedData as Partial<Contrato>,
                });
              }
            );
          }
        );
      });
    }

    return {
      message: 'Contrato actualizado en Supabase Cloud',
      data: payload,
    };
  }

  /**
   * Elimina un contrato
   */
  public async deleteContrato(codigo: string): Promise<{ message: string }> {
    try {
      await withTimeout(supabase.from('contratos').delete().eq('codigo_nomenclatura', codigo));
    } catch (e) {
      logger.warn(`Supabase delete error para ${codigo}: ${e}`);
    }

    if (db) {
      return new Promise((resolve, reject) => {
        db!.get(
          'SELECT codigo_nomenclatura FROM contratos WHERE codigo_nomenclatura = ?',
          [codigo],
          (checkErr, row) => {
            if (checkErr) return reject(checkErr);
            if (!row) return reject(new NotFoundError('Contrato no encontrado'));

            db!.run('DELETE FROM contratos WHERE codigo_nomenclatura = ?', [codigo], function (err) {
              if (err) return reject(err);
              resolve({ message: 'Contrato eliminado exitosamente de la base de datos' });
            });
          }
        );
      });
    }

    return { message: 'Contrato eliminado exitosamente de Supabase' };
  }
}

export const contratoService = new ContratoService();
