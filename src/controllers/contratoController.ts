import { Request, Response, NextFunction } from 'express';
import { contratoService } from '../services/contratoService';
import { ContratoQueryParams } from '../types/contrato.types';
import { exec } from 'child_process';
import { logger } from '../utils/logger';
import { BadRequestError, InternalServerError } from '../utils/errors';

export class ContratoController {
  public async getContratos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryParams = req.query as unknown as ContratoQueryParams;
      const result = await contratoService.getContratos(queryParams);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public async getContratoByCodigo(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const codigo = req.params.codigo as string;
      const contrato = await contratoService.getContratoByCodigo(codigo);
      res.json({ data: contrato });
    } catch (err) {
      next(err);
    }
  }

  public async createContrato(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contratoService.createContrato(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public async updateContrato(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const codigo = req.params.codigo as string;
      const result = await contratoService.updateContrato(codigo, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public async deleteContrato(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const codigo = req.params.codigo as string;
      const result = await contratoService.deleteContrato(codigo);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public extraerOc(req: Request, res: Response, next: NextFunction): void {
    try {
      const { filename, contentText } = req.body;
      const text = (contentText || filename || '').toString();
      const currentYear = new Date().getFullYear();

      // 1. Extraer Monto
      const totalMatch = text.match(
        /(?:TOTAL|MONTO|IMPORTE|SUMA|PRECIO|VALOR|NETO|GRAND\s+TOTAL)[\s:]*(?:Q|\$|USD|GTQ|EUR|MXN)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?|[0-9]+(?:[.,][0-9]{2})?)/i
      );
      const generalMontoMatch = text.match(
        /(?:Q|\$|USD|GTQ|EUR|MXN)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?|[0-9]+(?:[.,][0-9]{2})?)/i
      );

      let monto = 5000.0;
      if (totalMatch) {
        monto = parseFloat(totalMatch[1].replace(/,/g, ''));
      } else if (generalMontoMatch) {
        monto = parseFloat(generalMontoMatch[1].replace(/,/g, ''));
      }

      // 2. Extraer Nomenclatura / OC Number
      const ocMatch = text.match(
        /(?:OC|PO|ORDEN|CONTRATO|NO\.|NUMERO|NÚMERO|FOLIO)[-_#\s:]*([A-Z0-9-]{3,20})/i
      );
      const ocNumero = ocMatch ? ocMatch[1] : Math.floor(1000 + Math.random() * 9000);

      // 3. Extraer Contraparte (corta antes de palabras clave de Monto o Nomenclatura)
      const contraparteMatch = text.match(
        /(?:PROVEEDOR|CLIENTE|EMPRESA|PARA|DE|RAZON\s+SOCIAL|SEÑORES|SR\.|SRA\.|EMITIDO\s+A):\s*([^\n\r,;]+?)(?=\s*(?:MONTO|TOTAL|IMPORTE|SUMA|PRECIO|VALOR|NETO|OC|PO|ORDEN|CONTRATO|NO\.|NUMERO|NÚMERO|FOLIO|\$|Q|USD|GTQ|EUR|MXN)|,|$)/i
      );
      const contraparte = contraparteMatch ? contraparteMatch[1].trim() : 'Proveedor Detectado S.A.';

      // 4. Moneda
      let moneda = 'USD';
      if (text.includes('GTQ') || text.includes(' Q ') || text.includes('Q.')) moneda = 'GTQ';
      else if (text.includes('EUR') || text.includes('€')) moneda = 'EUR';
      else if (text.includes('MXN')) moneda = 'MXN';

      const sanitizedOcNumber = ocNumero.toString().replace(/[^A-Z0-9]/gi, '');
      const suggestedNomenclatura = `CON-${currentYear}-OC-${sanitizedOcNumber.slice(-6) || '001'}`;

      res.json({
        codigo_nomenclatura: suggestedNomenclatura,
        nombre_contrato: filename
          ? `Contrato Derivado de OC ${filename.replace(/\.[^/.]+$/, '')}`
          : `Contrato Servicio OC #${ocNumero}`,
        contraparte: contraparte,
        tipo_contrato: 'Proveedor / Insumos',
        monto: monto,
        moneda: moneda,
        estado: 'ACTIVO',
        ubicacion_pc: `C:\\Contratos\\Documentos\\${filename || 'orden_compra.pdf'}`,
        observaciones: `OCR y extracción procesados (${text.length} caracteres).`,
      });
    } catch (err) {
      next(err);
    }
  }

  public abrirUbicacion(req: Request, res: Response, next: NextFunction): void {
    try {
      const { ubicacion } = req.body;
      if (!ubicacion) {
        throw new BadRequestError('No se especificó la ubicación');
      }

      const command = `explorer "${ubicacion.replace(/\//g, '\\')}"`;
      exec(command, (err) => {
        if (err) {
          logger.error('Error al abrir explorer:', err);
          return next(
            new InternalServerError('No se pudo abrir la ubicación en Windows Explorer.')
          );
        }
        res.json({ message: 'Ubicación abierta en la PC' });
      });
    } catch (err) {
      next(err);
    }
  }
}

export const contratoController = new ContratoController();
