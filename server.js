require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./supabaseClient');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Obtener todos los contratos desde Supabase
app.get('/api/contratos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('contratos')
            .select('*')
            .order('fecha_registro', { ascending: false });

        if (error) throw error;
        res.json({ data: data || [] });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// API: Obtener contrato por nomenclatura (PK)
app.get('/api/contratos/:codigo', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('contratos')
            .select('*')
            .eq('codigo_nomenclatura', req.params.codigo)
            .single();

        if (error) throw error;
        res.json({ data });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// API: Crear nuevo contrato en Supabase
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

    try {
        const { data, error } = await supabase
            .from('contratos')
            .insert([{
                codigo_nomenclatura: codigo_nomenclatura.trim(),
                nombre_contrato: nombre_contrato.trim(),
                contraparte: contraparte.trim(),
                tipo_contrato: tipo_contrato || 'General',
                fecha_inicio: fecha_inicio || null,
                fecha_fin: fecha_fin || null,
                monto: monto || 0,
                moneda: moneda || 'USD',
                estado: estado || 'ACTIVO',
                ubicacion_pc: ubicacion_pc.trim(),
                observaciones: observaciones || ''
            }])
            .select();

        if (error) throw error;
        res.json({ message: 'Contrato registrado exitosamente en Supabase', data });
    } catch (err) {
        res.status(400).json({ error: err.message.includes('duplicate key') ? 'El Código/Nomenclatura ya existe en la Base de Datos SQL.' : err.message });
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

    try {
        const { data, error } = await supabase
            .from('contratos')
            .update({
                nombre_contrato,
                contraparte,
                tipo_contrato,
                fecha_inicio: fecha_inicio || null,
                fecha_fin: fecha_fin || null,
                monto,
                moneda,
                estado,
                ubicacion_pc,
                observaciones
            })
            .eq('codigo_nomenclatura', req.params.codigo)
            .select();

        if (error) throw error;
        res.json({ message: 'Contrato actualizado en Supabase', data });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// API: Eliminar contrato
app.delete('/api/contratos/:codigo', async (req, res) => {
    try {
        const { error } = await supabase
            .from('contratos')
            .delete()
            .eq('codigo_nomenclatura', req.params.codigo);

        if (error) throw error;
        res.json({ message: 'Contrato eliminado de Supabase' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
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

app.listen(PORT, () => {
    console.log(`Servidor de Gestión de Contratos (Supabase) activo en http://localhost:${PORT}`);
});
