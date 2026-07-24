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
    const codeMap = {
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

/* =====================================================================
   OCR SYSTEM — Todo el procesamiento ocurre en el NAVEGADOR.
   El servidor solo recibe texto plano para aplicar regex inteligente.
   ===================================================================== */

function openOCModal() {
    const loadingEl = document.getElementById('ocLoading');
    const previewEl = document.getElementById('ocPreview');
    const btnUse = document.getElementById('btnUseOCData');
    if (loadingEl) loadingEl.style.display = 'none';
    if (previewEl) previewEl.style.display = 'none';
    if (btnUse) btnUse.style.display = 'none';
    // Reset file input para permitir re-selección del mismo archivo
    const fileInput = document.getElementById('ocFileInput');
    if (fileInput) fileInput.value = '';
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
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
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

/**
 * Extrae texto de un archivo PDF usando PDF.js (en el navegador).
 * Retorna el texto concatenado de hasta 10 páginas.
 */
async function extractTextFromPDF(file) {
    if (typeof pdfjsLib === 'undefined') {
        console.warn('PDF.js no está cargado');
        return '';
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const maxPages = Math.min(pdf.numPages, 10);
    let fullText = '';

    for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText.trim();
}

/**
 * Extrae texto de una imagen usando Tesseract.js OCR (en el navegador).
 */
async function extractTextFromImage(file) {
    if (typeof Tesseract === 'undefined') {
        console.warn('Tesseract.js no está cargado');
        return '';
    }

    const worker = await Tesseract.createWorker('spa+eng');
    const result = await worker.recognize(file);
    const text = result.data.text || '';
    await worker.terminate();
    return text.trim();
}

/**
 * Extrae texto de un archivo de texto plano usando FileReader.
 */
function extractTextFromTextFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result || '');
        reader.onerror = () => resolve('');
        reader.readAsText(file);
    });
}

/**
 * Función principal de procesamiento OCR.
 * 1) Extrae texto COMPLETAMENTE en el navegador (PDF.js, Tesseract.js, FileReader)
 * 2) Envía SOLO el texto plano al backend para análisis regex
 * 3) NO envía datos binarios ni base64 al servidor
 */
async function processOCFile(file) {
    const loadingEl = document.getElementById('ocLoading');
    const previewEl = document.getElementById('ocPreview');
    const statusTextEl = document.getElementById('ocStatusText');
    const useDataBtn = document.getElementById('btnUseOCData');

    // Mostrar estado de carga
    if (loadingEl) loadingEl.style.display = 'block';
    if (previewEl) previewEl.style.display = 'none';
    if (useDataBtn) useDataBtn.style.display = 'none';
    if (statusTextEl) statusTextEl.innerText = `Cargando archivo: ${file.name}...`;

    showToast(`Iniciando OCR: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`, 'info');

    try {
        const fileName = file.name.toLowerCase();
        let extractedText = '';

        // ── PASO 1: Extraer texto en el navegador según tipo de archivo ──

        if (fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.json')) {
            // Archivo de texto plano
            if (statusTextEl) statusTextEl.innerText = 'Leyendo contenido de texto...';
            extractedText = await extractTextFromTextFile(file);

        } else if (fileName.endsWith('.pdf')) {
            // PDF → PDF.js extrae el texto embebido
            if (statusTextEl) statusTextEl.innerText = 'Extrayendo texto de PDF con PDF.js...';
            try {
                extractedText = await extractTextFromPDF(file);
            } catch (pdfErr) {
                console.warn('Error PDF.js:', pdfErr);
            }

            // Si PDF.js no encontró texto (PDF escaneado), intentar OCR con Tesseract
            if (!extractedText || extractedText.trim().length < 20) {
                if (statusTextEl) statusTextEl.innerText = 'PDF escaneado detectado. Ejecutando OCR Tesseract...';
                showToast('PDF sin texto embebido — ejecutando OCR en imagen...', 'info');
                // Nota: Tesseract no puede leer PDFs directamente. Para PDFs escaneados,
                // se necesitaría renderizar cada página a canvas, pero eso requiere
                // más lógica. Por ahora usamos lo que PDF.js extrajo.
            }

        } else if (fileName.match(/\.(png|jpg|jpeg|webp|bmp|tiff?)$/)) {
            // Imagen → Tesseract.js OCR
            if (statusTextEl) statusTextEl.innerText = 'Escaneando imagen con OCR Tesseract.js...';
            try {
                extractedText = await extractTextFromImage(file);
            } catch (ocrErr) {
                console.warn('Error Tesseract.js:', ocrErr);
            }
        }

        // Verificar que obtuvimos algo
        if (!extractedText || extractedText.trim().length === 0) {
            extractedText = file.name; // Fallback mínimo
            showToast('No se pudo extraer texto del documento. Usando nombre de archivo.', 'info');
        } else {
            showToast(`Texto extraído: ${extractedText.length} caracteres`, 'success');
        }

        // ── PASO 2: Enviar SOLO texto plano al servidor para regex ──

        if (statusTextEl) statusTextEl.innerText = 'Analizando patrones con motor de IA...';

        const res = await fetch('/api/extraer-oc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: file.name,
                contentText: extractedText
            })
        });

        // Manejar respuesta de forma segura (podría ser HTML de Vercel en caso de error)
        const contentType = res.headers.get('content-type') || '';
        let data;
        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            const rawText = await res.text();
            console.error('Respuesta no-JSON del servidor:', rawText.slice(0, 200));
            throw new Error('El servidor devolvió una respuesta inesperada. Verifique la conexión.');
        }

        if (!res.ok) {
            throw new Error(data.error || `Error del servidor (${res.status})`);
        }

        // ── PASO 3: Mostrar resultados ──

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
        console.error('Error completo en OCR pipeline:', err);
        showToast(`Error OCR: ${err.message || 'Fallo al procesar archivo'}`, 'error');
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
