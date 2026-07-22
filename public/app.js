let contratosData = [];
let isEditing = false;

document.addEventListener('DOMContentLoaded', () => {
    loadContratos();

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = contratosData.filter(c => 
            c.codigo_nomenclatura.toLowerCase().includes(query) ||
            c.nombre_contrato.toLowerCase().includes(query) ||
            c.contraparte.toLowerCase().includes(query) ||
            c.tipo_contrato.toLowerCase().includes(query) ||
            c.ubicacion_pc.toLowerCase().includes(query)
        );
        renderTable(filtered);
    });
});

async function loadContratos() {
    try {
        const res = await fetch('/api/contratos');
        const json = await res.json();
        contratosData = json.data || [];
        renderTable(contratosData);
        updateStats(contratosData);
    } catch (err) {
        console.error('Error al cargar contratos:', err);
    }
}

function updateStats(data) {
    document.getElementById('stat-total').innerText = data.length;
    document.getElementById('stat-activos').innerText = data.filter(c => c.estado === 'ACTIVO').length;
    document.getElementById('stat-rutas').innerText = data.filter(c => c.ubicacion_pc && c.ubicacion_pc.trim() !== '').length;
}

function renderTable(data) {
    const tbody = document.getElementById('contractsTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No se encontraron contratos registrados.</td></tr>`;
        return;
    }

    data.forEach(c => {
        const tr = document.createElement('tr');
        
        let statusClass = 'badge-activo';
        if (c.estado === 'VENCIDO') statusClass = 'badge-vencido';
        if (c.estado === 'EN REVISION') statusClass = 'badge-revision';

        tr.innerHTML = `
            <td>
                <span class="key-badge"><i class="fa-solid fa-key"></i> ${escapeHtml(c.codigo_nomenclatura)}</span>
            </td>
            <td><strong>${escapeHtml(c.nombre_contrato)}</strong></td>
            <td>${escapeHtml(c.contraparte)}</td>
            <td>${escapeHtml(c.tipo_contrato)}</td>
            <td>${c.fecha_fin ? c.fecha_fin : 'N/A'}</td>
            <td>${c.moneda} ${parseFloat(c.monto || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            <td><span class="badge-status ${statusClass}">${c.estado}</span></td>
            <td>
                <div class="path-box" title="${escapeHtml(c.ubicacion_pc)}">
                    <i class="fa-solid fa-folder"></i>
                    <span class="path-text">${escapeHtml(c.ubicacion_pc)}</span>
                    <button class="icon-btn" onclick="copyPath('${escapeHtml(c.ubicacion_pc)}')" title="Copiar Ruta">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <button class="icon-btn" onclick="openLocation('${escapeHtml(c.ubicacion_pc)}')" title="Abrir en Explorador de Windows">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </button>
                </div>
            </td>
            <td>
                <button class="icon-btn" onclick="editContract('${c.codigo_nomenclatura}')" title="Editar Contrato">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="icon-btn" onclick="deleteContract('${c.codigo_nomenclatura}')" style="color: var(--danger);" title="Eliminar de SQL">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openModal() {
    isEditing = false;
    document.getElementById('modalTitle').innerText = 'Nuevo Registro de Contrato SQL';
    document.getElementById('contractForm').reset();
    document.getElementById('codigo_nomenclatura').disabled = false;
    document.getElementById('contractModal').classList.add('active');
}

function closeModal() {
    document.getElementById('contractModal').classList.remove('active');
}

async function saveContract(event) {
    event.preventDefault();

    const payload = {
        codigo_nomenclatura: document.getElementById('codigo_nomenclatura').value,
        nombre_contrato: document.getElementById('nombre_contrato').value,
        contraparte: document.getElementById('contraparte').value,
        tipo_contrato: document.getElementById('tipo_contrato').value,
        fecha_inicio: document.getElementById('fecha_inicio').value,
        fecha_fin: document.getElementById('fecha_fin').value,
        monto: parseFloat(document.getElementById('monto').value) || 0,
        moneda: document.getElementById('moneda').value,
        estado: document.getElementById('estado').value,
        ubicacion_pc: document.getElementById('ubicacion_pc').value,
        observaciones: document.getElementById('observaciones').value
    };

    try {
        let url = '/api/contratos';
        let method = 'POST';

        if (isEditing) {
            url = `/api/contratos/${encodeURIComponent(payload.codigo_nomenclatura)}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (response.ok) {
            closeModal();
            loadContratos();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (err) {
        alert('Error al guardar el contrato.');
    }
}

function editContract(codigo) {
    const c = contratosData.find(item => item.codigo_nomenclatura === codigo);
    if (!c) return;

    isEditing = true;
    document.getElementById('modalTitle').innerText = `Editar Contrato: ${c.codigo_nomenclatura}`;
    document.getElementById('codigo_nomenclatura').value = c.codigo_nomenclatura;
    document.getElementById('codigo_nomenclatura').disabled = true;

    document.getElementById('nombre_contrato').value = c.nombre_contrato;
    document.getElementById('contraparte').value = c.contraparte;
    document.getElementById('tipo_contrato').value = c.tipo_contrato;
    document.getElementById('fecha_inicio').value = c.fecha_inicio || '';
    document.getElementById('fecha_fin').value = c.fecha_fin || '';
    document.getElementById('monto').value = c.monto;
    document.getElementById('moneda').value = c.moneda;
    document.getElementById('estado').value = c.estado;
    document.getElementById('ubicacion_pc').value = c.ubicacion_pc;
    document.getElementById('observaciones').value = c.observaciones || '';

    document.getElementById('contractModal').classList.add('active');
}

async function deleteContract(codigo) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el contrato con Llave Primaria "${codigo}" de la Base de Datos SQL?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/contratos/${encodeURIComponent(codigo)}`, { method: 'DELETE' });
        if (response.ok) {
            loadContratos();
        } else {
            const result = await response.json();
            alert('Error al eliminar: ' + result.error);
        }
    } catch (err) {
        alert('Error de red al eliminar el contrato.');
    }
}

function copyPath(path) {
    navigator.clipboard.writeText(path).then(() => {
        alert('Ruta copiada al portapapeles: ' + path);
    });
}

async function openLocation(path) {
    try {
        const res = await fetch('/api/abrir-ubicacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ubicacion: path })
        });
        const json = await res.json();
        if (!res.ok) {
            alert(json.error || 'No se pudo abrir la ubicación en Windows Explorer.');
        }
    } catch (err) {
        alert('Error al intentar abrir el archivo/carpeta en la PC.');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
