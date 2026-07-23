require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./supabaseClient');
const db = require('./database');
const { exec } = require('child_process');

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '3005', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper to check if Supabase is working, fallback to SQLite
async function getContratosList() {
    try {
        const { data, error } = await supabase
            .from('contratos')
            .select('*')
            .order('fecha_registro', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.warn('Supabase fallback to SQLite:', err.message);
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM contratos ORDER BY fecha_registro DESC', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }
}

// API: Obtener todos los contratos
app.get('/api/contratos', async (req, res) => {
    try {
        const list = await getContratosList();
        res.json({ data: list });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Obtener contrato por nomenclatura (PK)
app.get('/api/contratos/:codigo', async (req, res) => {
    try {
        try {
            const { data, error } = await supabase
                .from('contratos')
                .select('*')
                .eq('codigo_nomenclatura', req.params.codigo)
                .single();
            if (!error && data) return res.json({ data });
        } catch (e) {}

        // Fallback SQLite
        db.get('SELECT * FROM contratos WHERE codigo_nomenclatura = ?', [req.params.codigo], (err, row) => {
            if (err || !row) return res.status(404).json({ error: 'Contrato no encontrado' });
            res.json({ data: row });
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// API: Crear nuevo contrato
app.post('/api/contratos', async (req, res) => {
    const {
        codigo_nomenclatura,
        nombre_contrato,
        contraparte,
        tipo_contrato,
        fecha_inicio,
        fecha_fin,
        monto,
        moneda,
        estado,
        ubicacion_pc,
        observaciones
    } = req.body;

    if (!codigo_nomenclatura || !nombre_contrato || !contraparte || !ubicacion_pc) {
        return res.status(400).json({ error: 'Campos requeridos faltantes (Código, Nombre, Contraparte, Ubicación PC).' });
    }

    const payload = {
        codigo_nomenclatura: codigo_nomenclatura.trim(),
        nombre_contrato: nombre_contrato.trim(),
        contraparte: contraparte.trim(),
        tipo_contrato: tipo_contrato || 'General',
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null,
        monto: parseFloat(monto) || 0,
        moneda: moneda || 'USD',
        estado: estado || 'ACTIVO',
        ubicacion_pc: ubicacion_pc.trim(),
        observaciones: observaciones || ''
    };

    try {
        // Intentar guardar en Supabase
        let savedInSupabase = false;
        try {
            const { data, error } = await supabase
                .from('contratos')
                .insert([payload])
                .select();
            if (!error) savedInSupabase = true;
        } catch (sbErr) {}

        // Guardar siempre también en SQLite local para consistencia
        db.run(
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
            [payload.codigo_nomenclatura, payload.nombre_contrato, payload.contraparte, payload.tipo_contrato, payload.fecha_inicio, payload.fecha_fin, payload.monto, payload.moneda, payload.estado, payload.ubicacion_pc, payload.observaciones],
            function(err) {
                if (err && !savedInSupabase) {
                    return res.status(400).json({ error: 'Error al registrar en SQL: ' + err.message });
                }
                res.json({ message: 'Contrato registrado exitosamente en Base de Datos SQL', data: payload });
            }
        );
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// API: Actualizar contrato
app.put('/api/contratos/:codigo', async (req, res) => {
    const {
        nombre_contrato,
        contraparte,
        tipo_contrato,
        fecha_inicio,
        fecha_fin,
        monto,
        moneda,
        estado,
        ubicacion_pc,
        observaciones
    } = req.body;

    const payload = {
        nombre_contrato,
        contraparte,
        tipo_contrato,
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null,
        monto: parseFloat(monto) || 0,
        moneda,
        estado,
        ubicacion_pc,
        observaciones
    };

    try {
        try {
            await supabase
                .from('contratos')
                .update(payload)
                .eq('codigo_nomenclatura', req.params.codigo);
        } catch (e) {}

        db.run(
            `UPDATE contratos SET
                nombre_contrato=?, contraparte=?, tipo_contrato=?, fecha_inicio=?, fecha_fin=?,
                monto=?, moneda=?, estado=?, ubicacion_pc=?, observaciones=?
             WHERE codigo_nomenclatura=?`,
            [payload.nombre_contrato, payload.contraparte, payload.tipo_contrato, payload.fecha_inicio, payload.fecha_fin, payload.monto, payload.moneda, payload.estado, payload.ubicacion_pc, payload.observaciones, req.params.codigo],
            function(err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: 'Contrato actualizado exitosamente', data: payload });
            }
        );
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// API: Eliminar contrato
app.delete('/api/contratos/:codigo', async (req, res) => {
    try {
        try {
            await supabase.from('contratos').delete().eq('codigo_nomenclatura', req.params.codigo);
        } catch (e) {}

        db.run('DELETE FROM contratos WHERE codigo_nomenclatura = ?', [req.params.codigo], function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'Contrato eliminado de la Base de Datos SQL' });
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// API: Simulación / Extracción de Datos de Orden de Compra (OC)
app.post('/api/extraer-oc', (req, res) => {
    const { filename, contentText } = req.body;
    
    // Algoritmo preliminar de extracción inteligente
    const text = (contentText || filename || '').toString();
    const currentYear = new Date().getFullYear();

    // Extraer posible monto (ej. $15,000.00 o 15000)
    const montoMatch = text.match(/(?:Q|\$|USD|GTQ)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/i);
    const monto = montoMatch ? parseFloat(montoMatch[1].replace(/,/g, '')) : 5000.00;

    // Extraer número de OC
    const ocMatch = text.match(/(?:OC|PO|ORDEN|CONTRATO)[-_#\s]*([A-Z0-9-]+)/i);
    const ocNumero = ocMatch ? ocMatch[1] : Math.floor(1000 + Math.random() * 9000);

    const contraparteMatch = text.match(/(?:PROVEEDOR|CLIENTE|EMPRESA|PARA):\s*([^\n\r,]+)/i);
    const contraparte = contraparteMatch ? contraparteMatch[1].trim() : 'Proveedor Detectado S.A.';

    const suggestedNomenclatura = `CON-${currentYear}-OC-${ocNumero.toString().slice(-4)}`;

    res.json({
        codigo_nomenclatura: suggestedNomenclatura,
        nombre_contrato: filename ? `Contrato Derivado de OC ${filename.replace(/\.[^/.]+$/, "")}` : `Contrato Servicio OC #${ocNumero}`,
        contraparte: contraparte,
        tipo_contrato: 'Proveedor / Insumos',
        monto: monto,
        moneda: text.includes('GTQ') || text.includes('Q') ? 'GTQ' : 'USD',
        estado: 'ACTIVO',
        observaciones: `Datos extraídos automáticamente desde OC (${filename || 'Documento Cargado'}).`
    });
});

// API: Abrir carpeta/archivo en la PC (Explorer en Windows)
app.post('/api/abrir-ubicacion', (req, res) => {
    const { ubicacion } = req.body;
    if (!ubicacion) {
        return res.status(400).json({ error: 'No se especificó la ubicación' });
    }

    const command = `explorer "${ubicacion.replace(/\//g, '\\')}"`;
    exec(command, (err) => {
        if (err) {
            console.error('Error al abrir explorer:', err);
            return res.status(500).json({ error: 'No se pudo abrir la ubicación en Windows Explorer.' });
        }
        res.json({ message: 'Ubicación abierta en la PC' });
    });
});

function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`\n======================================================`);
        console.log(`  Servidor de Gestión de Contratos SQL Activo en:`);
        console.log(`  👉 http://localhost:${port}`);
        console.log(`======================================================\n`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`El puerto ${port} está ocupado. Intentando con el puerto ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Error al iniciar el servidor:', err);
        }
    });
}

if (!process.env.VERCEL) {
    startServer(DEFAULT_PORT);
}

module.exports = app;
