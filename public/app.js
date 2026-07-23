let contratosData = [];
let currentFilteredData = [];
let isEditing = false;
let sortColumn = 'fecha_registro';
let sortDirection = 'desc';
let extractedOCData = null;

document.addEventListener('DOMContentLoaded', () => {
    loadContratos();

    document.getElementById('searchInput').addEventListener('input', () => filterData());
    setupOCDropzone();
});

async function loadContratos() {
    try {
        const res = await fetch('/api/contratos');
        const json = await res.json();
        contratosData = json.data || [];
        filterData();
    } catch (err) {
        console.error('Error al cargar contratos:', err);
        showToast('Error al conectar con la base de datos SQL', 'error');
    }
}

function filterData() {
    const query = (document.getElementById('searchInput').value || '').toLowerCase();
    const tipo = document.getElementById('filterTipo').value;
    const estado = document.getElementById('filterEstado').value;

    currentFilteredData = contratosData.filter(c => {
        const matchesQuery = !query || 
            c.codigo_nomenclatura.toLowerCase().includes(query) ||
            c.nombre_contrato.toLowerCase().includes(query) ||
            c.contraparte.toLowerCase().includes(query) ||
            (c.tipo_contrato && c.tipo_contrato.toLowerCase().includes(query)) ||
            (c.ubicacion_pc && c.ubicacion_pc.toLowerCase().includes(query));

        const matchesTipo = !tipo || c.tipo_contrato === tipo;
        const matchesEstado = !estado || c.estado === estado;

        return matchesQuery && matchesTipo && matchesEstado;
    });

    sortData();
    renderTable(currentFilteredData);
    updateStats(contratosData, currentFilteredData);
}

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    sortData();
    renderTable(currentFilteredData);
}

function sortData() {
    currentFilteredData.sort((a, b) => {
        let valA = a[sortColumn] || '';
        let valB = b[sortColumn] || '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
}

function updateStats(fullData, filteredData) {
    document.getElementById('stat-total').innerText = fullData.length;
    document.getElementById('stat-activos').innerText = fullData.filter(c => c.estado === 'ACTIVO').length;
    document.getElementById('stat-revision').innerText = fullData.filter(c => c.estado === 'EN REVISION' || c.estado === 'VENCIDO').length;

    const totalMontoUSD = fullData.reduce((acc, c) => acc + (parseFloat(c.monto) || 0), 0);
    document.getElementById('stat-monto').innerText = `$${totalMontoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const filteredMonto = filteredData.reduce((acc, c) => acc + (parseFloat(c.monto) || 0), 0);
    document.getElementById('table-total-monto').innerText = `$${filteredMonto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('grid-records-count').innerText = `Mostrando ${filteredData.length} de ${fullData.length} registros`;
}

function renderTable(data) {
    const tbody = document.getElementById('contractsTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No se encontraron registros en la base de datos SQL.
        </td></tr>`;
        return;
    }

    data.forEach(c => {
        const tr = document.createElement('tr');

        let statusClass = 'badge-activo';
        if (c.estado === 'VENCIDO') statusClass = 'badge-vencido';
        if (c.estado === 'EN REVISION') statusClass = 'badge-revision';

        tr.innerHTML = `
            <td>
                <span class="key-badge">${escapeHtml(c.codigo_nomenclatura)}</span>
            </td>
            <td><strong>${escapeHtml(c.nombre_contrato)}</strong></td>
            <td>${escapeHtml(c.contraparte)}</td>
            <td>${escapeHtml(c.tipo_contrato)}</td>
            <td>${c.fecha_fin ? c.fecha_fin : 'Indefinido'}</td>
            <td class="text-right font-mono">${c.moneda || 'USD'} ${parseFloat(c.monto || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td><span class="badge-status ${statusClass}">${c.estado}</span></td>
            <td>
                <div class="path-box" title="${escapeHtml(c.ubicacion_pc)}">
                    <span class="path-text">${escapeHtml(c.ubicacion_pc)}</span>
                    <button class="icon-btn" onclick="copyPath('${escapeJsString(c.ubicacion_pc)}')" title="Copiar Ruta">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <button class="icon-btn" onclick="openLocation('${escapeJsString(c.ubicacion_pc)}')" title="Abrir en Explorer">
                        <i class="fa-solid fa-folder-open"></i>
                    </button>
                </div>
            </td>
            <td class="text-center">
                <button class="icon-btn" onclick="editContract('${escapeJsString(c.codigo_nomenclatura)}')" title="Editar">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="icon-btn" onclick="deleteContract('${escapeJsString(c.codigo_nomenclatura)}')" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function generateAutoNomenclatura() {
    const tipo = document.getElementById('tipo_contrato').value || 'Servicios Profesionales';
    let codeMap = {
        'Servicios Profesionales': 'SER',
        'Proveedor / Insumos': 'PRO',
        'Arrendamiento': 'ARR',
        'Confidencialidad (NDA)': 'NDA',
        'Otro': 'GEN'
    };
    const prefix = codeMap[tipo] || 'CON';
    const year = new Date().getFullYear();
    const count = contratosData.length + 1;
    const seq = String(count).padStart(3, '0');

    const generated = `CON-${year}-${prefix}-${seq}`;
    document.getElementById('codigo_nomenclatura').value = generated;
    showToast(`Nomenclatura generada: ${generated}`, 'info');
}

function generateAutoNomenclaturaIfEmpty() {
    if (!isEditing && !document.getElementById('codigo_nomenclatura').value) {
        generateAutoNomenclatura();
    }
}

function openModal() {
    isEditing = false;
    document.getElementById('modalTitle').innerText = 'Nuevo Registro de Contrato SQL';
    document.getElementById('contractForm').reset();
    document.getElementById('codigo_nomenclatura').disabled = false;
    generateAutoNomenclatura();
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
            showToast(isEditing ? 'Contrato actualizado en SQL' : 'Contrato registrado exitosamente en SQL', 'success');
            loadContratos();
        } else {
            showToast('Error: ' + result.error, 'error');
        }
    } catch (err) {
        showToast('Error al procesar la solicitud con el servidor', 'error');
    }
}

function editContract(codigo) {
    const c = contratosData.find(item => item.codigo_nomenclatura === codigo);
    if (!c) return;

    isEditing = true;
    document.getElementById('modalTitle').innerHTML = `<i class="fa-solid fa-pen"></i> Editar Contrato: ${c.codigo_nomenclatura}`;
    document.getElementById('codigo_nomenclatura').value = c.codigo_nomenclatura;
    document.getElementById('codigo_nomenclatura').disabled = true;

    document.getElementById('nombre_contrato').value = c.nombre_contrato;
    document.getElementById('contraparte').value = c.contraparte;
    document.getElementById('tipo_contrato').value = c.tipo_contrato;
    document.getElementById('fecha_inicio').value = c.fecha_inicio || '';
    document.getElementById('fecha_fin').value = c.fecha_fin || '';
    document.getElementById('monto').value = c.monto;
    document.getElementById('moneda').value = c.moneda || 'USD';
    document.getElementById('estado').value = c.estado || 'ACTIVO';
    document.getElementById('ubicacion_pc').value = c.ubicacion_pc || '';
    document.getElementById('observaciones').value = c.observaciones || '';

    document.getElementById('contractModal').classList.add('active');
}

async function deleteContract(codigo) {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el contrato con Nomenclatura "${codigo}" de la Base de Datos SQL?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/contratos/${encodeURIComponent(codigo)}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Contrato eliminado de SQL', 'success');
            loadContratos();
        } else {
            const result = await response.json();
            showToast('Error al eliminar: ' + result.error, 'error');
        }
    } catch (err) {
        showToast('Error al intentar eliminar el contrato', 'error');
    }
}

function exportToCSV() {
    if (currentFilteredData.length === 0) {
        showToast('No hay datos para exportar', 'info');
        return;
    }

    const headers = ['Nomenclatura_PK', 'Nombre_Contrato', 'Contraparte', 'Tipo_Contrato', 'Fecha_Inicio', 'Fecha_Fin', 'Monto', 'Moneda', 'Estado', 'Ubicacion_PC', 'Observaciones'];
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\n";

    currentFilteredData.forEach(row => {
        const line = [
            `"${(row.codigo_nomenclatura || '').replace(/"/g, '""')}"`,
            `"${(row.nombre_contrato || '').replace(/"/g, '""')}"`,
            `"${(row.contraparte || '').replace(/"/g, '""')}"`,
            `"${(row.tipo_contrato || '').replace(/"/g, '""')}"`,
            `"${row.fecha_inicio || ''}"`,
            `"${row.fecha_fin || ''}"`,
            row.monto || 0,
            `"${row.moneda || 'USD'}"`,
            `"${row.estado || ''}"`,
            `"${(row.ubicacion_pc || '').replace(/"/g, '""')}"`,
            `"${(row.observaciones || '').replace(/"/g, '""')}"`
        ].join(",");
        csvContent += line + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Contratos_SQL_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Exportación a Excel / CSV descargada', 'success');
}

/* Modales & Extracción de OC con OCR Híbrido Client+Server */
function openOCModal() {
    const loadingEl = document.getElementById('ocLoading');
    const previewEl = document.getElementById('ocPreview');
    const btnUse = document.getElementById('btnUseOCData');
    if (loadingEl) loadingEl.style.display = 'none';
    if (previewEl) previewEl.style.display = 'none';
    if (btnUse) btnUse.style.display = 'none';
    document.getElementById('ocModal').classList.add('active');
}

function closeOCModal() {
    document.getElementById('ocModal').classList.remove('active');
}

function triggerFileInput() {
    document.getElementById('ocFileInput').click();
}

function setupOCDropzone() {
    const dropzone = document.getElementById('ocDropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            processOCFile(files[0]);
        }
    });
}

function handleOCFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        processOCFile(files[0]);
    }
}

// Convertir archivo a Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function processOCFile(file) {
    const loadingEl = document.getElementById('ocLoading');
    const previewEl = document.getElementById('ocPreview');
    const statusTextEl = document.getElementById('ocStatusText');
    const useDataBtn = document.getElementById('btnUseOCData');

    if (loadingEl) loadingEl.style.display = 'block';
    if (previewEl) previewEl.style.display = 'none';
    if (useDataBtn) useDataBtn.style.display = 'none';
    if (statusTextEl) statusTextEl.innerText = `Cargando archivo ${file.name}...`;

    showToast(`Iniciando OCR y análisis de documento: ${file.name}...`, 'info');

    let extractedText = '';
    let base64Content = '';

    try {
        // Generar base64 para envío seguro al servidor
        try {
            base64Content = await fileToBase64(file);
        } catch (b64Err) {
            console.warn('Error leyendo base64 del archivo:', b64Err);
        }

        const fileType = file.type || '';
        const fileName = file.name.toLowerCase();

        // 1. Archivos de texto plano (.txt, .csv, .json)
        if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.json')) {
            if (statusTextEl) statusTextEl.innerText = 'Leyendo texto del documento...';
            extractedText = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result || '');
                reader.onerror = () => resolve('');
                reader.readAsText(file);
            });
        }
        // 2. Documentos PDF (.pdf) -> Extracción con PDF.js en browser
        else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
            if (statusTextEl) statusTextEl.innerText = 'Analizando capas de texto en PDF...';
            if (typeof pdfjsLib !== 'undefined') {
                try {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let pdfText = '';
                    
                    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageItems = textContent.items.map(item => item.str).join(' ');
                        pdfText += pageItems + '\n';
                    }
                    extractedText = pdfText;
                } catch (pdfErr) {
                    console.warn('PDF.js client extraction skipped, relying on backend parser:', pdfErr);
                }
            }
        }
        // 3. Imágenes (.png, .jpg, .jpeg, .webp, .bmp) -> OCR con Tesseract.js
        else if (fileType.startsWith('image/') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp')) {
            if (statusTextEl) statusTextEl.innerText = 'Escaneando OCR con Tesseract.js...';
            if (typeof Tesseract !== 'undefined') {
                try {
                    const worker = await Tesseract.createWorker('spa+eng');
                    const ret = await worker.recognize(file);
                    extractedText = ret.data.text || '';
                    await worker.terminate();
                } catch (ocrErr) {
                    console.warn('Tesseract client OCR fallback to backend:', ocrErr);
                }
            }
        }

        if (statusTextEl) statusTextEl.innerText = 'Analizando patrones con motor OCR de IA...';

        // Enviar contenido completo extraído y datos base64 al servidor
        const res = await fetch('/api/extraer-oc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: file.name,
                contentText: extractedText || '',
                fileData: base64Content
            })
        });

        const data = await res.json();
        extractedOCData = { ...data, ubicacion_pc: `C:\\Contratos\\OrdenesCompra\\${file.name}` };

        document.getElementById('ocResNomenclatura').innerText = data.codigo_nomenclatura;
        document.getElementById('ocResNombre').innerText = data.nombre_contrato;
        document.getElementById('ocResContraparte').innerText = data.contraparte;
        document.getElementById('ocResMonto').innerText = `${data.moneda} $${(data.monto || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        if (loadingEl) loadingEl.style.display = 'none';
        if (previewEl) previewEl.style.display = 'block';
        if (useDataBtn) useDataBtn.style.display = 'inline-flex';

        showToast('¡Procesamiento OCR completado exitosamente!', 'success');
    } catch (err) {
        if (loadingEl) loadingEl.style.display = 'none';
        console.error('Error al procesar archivo en OCR:', err);
        showToast('Error al procesar el archivo en el motor OCR', 'error');
    }
}

function applyExtractedOCData() {
    if (!extractedOCData) return;

    closeOCModal();
    openModal();

    document.getElementById('codigo_nomenclatura').value = extractedOCData.codigo_nomenclatura;
    document.getElementById('nombre_contrato').value = extractedOCData.nombre_contrato;
    document.getElementById('contraparte').value = extractedOCData.contraparte;
    document.getElementById('tipo_contrato').value = extractedOCData.tipo_contrato;
    document.getElementById('monto').value = extractedOCData.monto;
    document.getElementById('moneda').value = extractedOCData.moneda;
    document.getElementById('estado').value = extractedOCData.estado;
    document.getElementById('ubicacion_pc').value = extractedOCData.ubicacion_pc;
    document.getElementById('observaciones').value = extractedOCData.observaciones;

    showToast('Campos de formulario auto-completados desde OCR', 'info');
}

function copyPath(path) {
    navigator.clipboard.writeText(path).then(() => {
        showToast('Ruta copiada al portapapeles', 'info');
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
            showToast(json.error || 'No se pudo abrir Explorer', 'error');
        } else {
            showToast('Abriendo ubicación en Explorer de Windows', 'info');
        }
    } catch (err) {
        showToast('Error al intentar abrir el archivo/carpeta en la PC', 'error');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeJsString(str) {
    if (!str) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}
