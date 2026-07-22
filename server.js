const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Obtener todos los contratos
app.get('/api/contratos', (req, res) => {
    const sql = `SELECT * FROM contratos ORDER BY fecha_registro DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// API: Obtener un contrato por Código Nomenclatura (Llave Primaria)
app.get('/api/contratos/:codigo', (req, res) => {
    const sql = `SELECT * FROM contratos WHERE codigo_nomenclatura = ?`;
    db.get(sql, [req.params.codigo], (err, row) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Contrato no encontrado' });
            return;
        }
        res.json({ data: row });
    });
});

// API: Crear un nuevo contrato
app.post('/api/contratos', (req, res) => {
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
        res.status(400).json({ error: 'Campos requeridos faltantes (Código, Nombre, Contraparte, Ubicación PC).' });
        return;
    }

    const sql = `
        INSERT INTO contratos 
        (codigo_nomenclatura, nombre_contrato, contraparte, tipo_contrato, fecha_inicio, fecha_fin, monto, moneda, estado, ubicacion_pc, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        codigo_nomenclatura.trim(),
        nombre_contrato.trim(),
        contraparte.trim(),
        tipo_contrato || 'General',
        fecha_inicio || null,
        fecha_fin || null,
        monto || 0,
        moneda || 'USD',
        estado || 'ACTIVO',
        ubicacion_pc.trim(),
        observaciones || ''
    ];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message.includes('UNIQUE constraint failed') ? 'El Código/Nomenclatura ya existe en la Base de Datos.' : err.message });
            return;
        }
        res.json({ message: 'Contrato registrado con éxito', codigo: codigo_nomenclatura });
    });
});

// API: Actualizar contrato existente
app.put('/api/contratos/:codigo', (req, res) => {
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

    const sql = `
        UPDATE contratos SET
            nombre_contrato = ?,
            contraparte = ?,
            tipo_contrato = ?,
            fecha_inicio = ?,
            fecha_fin = ?,
            monto = ?,
            moneda = ?,
            estado = ?,
            ubicacion_pc = ?,
            observaciones = ?
        WHERE codigo_nomenclatura = ?
    `;

    const params = [
        nombre_contrato,
        contraparte,
        tipo_contrato,
        fecha_inicio,
        fecha_fin,
        monto,
        moneda,
        estado,
        ubicacion_pc,
        observaciones,
        req.params.codigo
    ];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Contrato actualizado correctamente' });
    });
});

// API: Eliminar contrato
app.delete('/api/contratos/:codigo', (req, res) => {
    const sql = `DELETE FROM contratos WHERE codigo_nomenclatura = ?`;
    db.run(sql, [req.params.codigo], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Contrato eliminado correctamente' });
    });
});

// API: Abrir carpeta/archivo en la PC (Explorer en Windows)
app.post('/api/abrir-ubicacion', (req, res) => {
    const { ubicacion } = req.body;
    if (!ubicacion) {
        return res.status(400).json({ error: 'No se especificó la ubicación' });
    }

    // Ejecutar comando explorer en Windows
    const command = `explorer "${ubicacion.replace(/\//g, '\\')}"`;
    exec(command, (err) => {
        if (err) {
            console.error('Error al abrir explorer:', err);
            return res.status(500).json({ error: 'No se pudo abrir la ubicación en Windows Explorer.' });
        }
        res.json({ message: 'Ubicación abierta en la PC' });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor de Gestión de Contratos activo en http://localhost:${PORT}`);
});
