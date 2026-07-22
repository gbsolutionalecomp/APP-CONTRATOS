const db = require('./database');

const sampleData = [
    {
        codigo_nomenclatura: 'CON-2026-001',
        nombre_contrato: 'Contrato de Servicios de TI y Soporte Técnico',
        contraparte: 'GBS Solutions Tech',
        tipo_contrato: 'Servicios Profesionales',
        fecha_inicio: '2026-01-15',
        fecha_fin: '2026-12-31',
        monto: 15000.00,
        moneda: 'USD',
        estado: 'ACTIVO',
        ubicacion_pc: 'C:\\Users\\Clauder Castillo\\Downloads\\MAPEO DE PROCESOS GBS SOLUTIONS\\Mapeo de procesos.docx',
        observaciones: 'Soporte 24/7 y mantenimiento preventivo.'
    },
    {
        codigo_nomenclatura: 'CON-2026-002',
        nombre_contrato: 'Acuerdo de Confidencialidad y No Divulgación',
        contraparte: 'Consultores de Procesos S.A.',
        tipo_contrato: 'Confidencialidad (NDA)',
        fecha_inicio: '2026-02-01',
        fecha_fin: '2028-02-01',
        monto: 0.00,
        moneda: 'USD',
        estado: 'ACTIVO',
        ubicacion_pc: 'C:\\Users\\Clauder Castillo\\Downloads\\MAPEO DE PROCESOS GBS SOLUTIONS\\Junta Clara Dudas Brandon.pdf',
        observaciones: 'Firmado electrónicamente.'
    }
];

db.serialize(() => {
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO contratos 
        (codigo_nomenclatura, nombre_contrato, contraparte, tipo_contrato, fecha_inicio, fecha_fin, monto, moneda, estado, ubicacion_pc, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    sampleData.forEach(c => {
        stmt.run(
            c.codigo_nomenclatura,
            c.nombre_contrato,
            c.contraparte,
            c.tipo_contrato,
            c.fecha_inicio,
            c.fecha_fin,
            c.monto,
            c.moneda,
            c.estado,
            c.ubicacion_pc,
            c.observaciones
        );
    });

    stmt.finalize(() => {
        console.log('Datos iniciales insertados correctamente.');
        process.exit(0);
    });
});
