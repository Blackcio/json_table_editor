document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const loadButton = document.getElementById('load-button');
    const saveButton = document.getElementById('save-button');
    const addRowButton = document.getElementById('add-row-button');
    const increaseFontButton = document.getElementById('increase-font-button');
    const decreaseFontButton = document.getElementById('decrease-font-button');
    const tableContainer = document.getElementById('table-container');
    const tableToolbar = document.getElementById('table-toolbar');
    const jsonTable = document.getElementById('json-table');
    const errorAlert = document.getElementById('error-alert');
    const dropZone = document.getElementById('drop-zone');

    let jsonData = [];
    let tableHeaders = [];
    let columnWidths = {}; // Object to store column widths
    let currentFontSize = 14; // Initial font size in pixels
    const MIN_FONT_SIZE = 8;
    const MAX_FONT_SIZE = 24;

    // --- Event Listeners ---
    loadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    saveButton.addEventListener('click', saveJsonToFile);
    addRowButton.addEventListener('click', addRow);
    increaseFontButton.addEventListener('click', () => changeFontSize(2));
    decreaseFontButton.addEventListener('click', () => changeFontSize(-2));

    // --- Drag and Drop --- 
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect({ target: fileInput });
        }
    });

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const data = JSON.parse(text);
                if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
                    // Flatten each object in the array
                    jsonData = data.map(item => flattenObject(item));
                    columnWidths = {}; // Reset widths on new file
                    renderTable();
                    showError(''); // Clear errors
                } else {
                    showError('Erro: O JSON deve ser um array de objetos e não pode estar vazio.');
                }
            } catch (err) {
                showError(`Erro ao analisar o JSON: ${err.message}`);
            }
        };
        reader.onerror = () => showError('Erro ao ler o arquivo.');
        reader.readAsText(file);
    }

    function renderTable() {
        const thead = jsonTable.querySelector('thead');
        const tbody = jsonTable.querySelector('tbody');

        // Clear previous table
        thead.innerHTML = '';
        tbody.innerHTML = '';

        if (jsonData.length === 0) {
            tableContainer.classList.add('d-none');
            tableToolbar.classList.add('d-none');
            return;
        }

        // Ensure table and toolbar are visible before calculating widths
        tableContainer.classList.remove('d-none');
        tableToolbar.classList.remove('d-none');
        const oldHeaders = new Set(tableHeaders);
        tableHeaders = Object.keys(jsonData[0] || {});
        const headerRow = document.createElement('tr');

        // Check if headers have changed
        const headersChanged = tableHeaders.length !== oldHeaders.size || tableHeaders.some(h => !oldHeaders.has(h));
        if (headersChanged) {
            columnWidths = {}; // Reset widths if headers are different
        }

        tableHeaders.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key;

            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            resizeHandle.addEventListener('mousedown', initResize, false);
            th.appendChild(resizeHandle);

            headerRow.appendChild(th);
        });
        const actionsTh = document.createElement('th');
        actionsTh.textContent = 'Ações';
        headerRow.appendChild(actionsTh);
        thead.appendChild(headerRow);

        // Create rows
        jsonData.forEach((item, rowIndex) => {
            const tr = document.createElement('tr');
            tableHeaders.forEach(header => {
                const td = document.createElement('td');
                td.textContent = item[header] !== undefined ? item[header] : '';
                td.setAttribute('contenteditable', 'true');
                td.addEventListener('input', (e) => {
                    updateJsonData(rowIndex, header, e.target.textContent);
                });
                tr.appendChild(td);
            });

            // Add delete button
            const actionsTd = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Excluir';
            deleteButton.className = 'btn btn-danger btn-sm';
            deleteButton.onclick = () => deleteRow(rowIndex);
            actionsTd.appendChild(deleteButton);
            tr.appendChild(actionsTd);

            tbody.appendChild(tr);
        });

        // Set initial column widths or apply stored widths
        const ths = headerRow.querySelectorAll('th');
        ths.forEach((th, index) => {
            const headerKey = tableHeaders[index];
            if (headerKey && columnWidths[headerKey]) {
                th.style.width = columnWidths[headerKey];
            } else if (headerKey) {
                // Set initial width and store it
                const initialWidth = `${th.offsetWidth}px`;
                th.style.width = initialWidth;
                columnWidths[headerKey] = initialWidth;
            }
        });
    }

    function updateJsonData(rowIndex, key, value) {
        // Try to parse value as a number or boolean
        if (!isNaN(value) && value.trim() !== '') {
            jsonData[rowIndex][key] = Number(value);
        } else if (value.toLowerCase() === 'true') {
            jsonData[rowIndex][key] = true;
        } else if (value.toLowerCase() === 'false') {
            jsonData[rowIndex][key] = false;
        } else {
            jsonData[rowIndex][key] = value;
        }
    }

    function addRow() {
        const newRow = {};
        tableHeaders.forEach(header => {
            newRow[header] = ''; // Default empty value
        });
        jsonData.push(newRow);
        renderTable();
    }

    function deleteRow(rowIndex) {
        jsonData.splice(rowIndex, 1);
        renderTable();
    }

    function saveJsonToFile() {
        if (jsonData.length === 0) {
            showError('Não há dados para salvar.');
            return;
        }

        // Unflatten each object before saving
        const unflattenedData = jsonData.map(item => unflattenObject(item));
        const jsonString = JSON.stringify(unflattenedData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dados_editados.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function showError(message) {
        if (message) {
            errorAlert.textContent = message;
            errorAlert.classList.remove('d-none');
            tableContainer.classList.add('d-none');
        } else {
            errorAlert.classList.add('d-none');
        }
    }

    function changeFontSize(delta) {
        const newSize = currentFontSize + delta;
        if (newSize >= MIN_FONT_SIZE && newSize <= MAX_FONT_SIZE) {
            currentFontSize = newSize;
            jsonTable.style.fontSize = `${currentFontSize}px`;
        }
    }

    // --- Column Resizing --- 
    let thBeingResized;
    let startX, startWidth;

    function initResize(e) {
        thBeingResized = e.target.parentElement;
        startX = e.pageX;
        startWidth = thBeingResized.offsetWidth;

        document.addEventListener('mousemove', doResize, false);
        document.addEventListener('mouseup', stopResize, false);
    }

    function doResize(e) {
        const width = startWidth + (e.pageX - startX);
        if (width > 40) { // Minimum column width
            const newWidthPx = `${width}px`;
            thBeingResized.style.width = newWidthPx;

            // Store the new width
            const headerKey = thBeingResized.textContent;
            if (columnWidths.hasOwnProperty(headerKey)) {
                columnWidths[headerKey] = newWidthPx;
            }
        }
    }

    function stopResize() {
        document.removeEventListener('mousemove', doResize, false);
        document.removeEventListener('mouseup', stopResize, false);
    }

    // --- Helper functions for flattening/unflattening JSON ---
    function flattenObject(obj, parentKey = '', result = {}) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = parentKey ? `${parentKey}.${key}` : key;
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    if (Array.isArray(obj[key])) {
                        // Handle arrays: stringify if complex, join if simple
                        if (obj[key].some(item => typeof item === 'object' && item !== null)) {
                            result[newKey] = JSON.stringify(obj[key]);
                        } else {
                            result[newKey] = obj[key].join(',');
                        }
                    } else {
                        // It's an object, recurse
                        flattenObject(obj[key], newKey, result);
                    }
                } else {
                    // It's a primitive value
                    result[newKey] = obj[key];
                }
            }
        }
        return result;
    }

    function unflattenObject(flatObj) {
        const result = {};
        for (const key in flatObj) {
            if (flatObj.hasOwnProperty(key)) {
                const parts = key.split('.');
                let current = result;
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (i === parts.length - 1) {
                        let value = flatObj[key];
                        // Try to parse back arrays
                        if (typeof value === 'string') {
                            try {
                                const parsed = JSON.parse(value);
                                if (Array.isArray(parsed)) {
                                    value = parsed;
                                } else if (value.startsWith('[') && value.endsWith(']')) {
                                    // If it looks like an array but failed to parse, keep as string
                                } else if (value.includes(',')) {
                                    // Simple comma-separated array
                                    value = value.split(',');
                                }
                            } catch (e) {
                                // Not a valid JSON string, keep as is
                            }
                        }
                        current[part] = value;
                    } else {
                        if (!current[part] || typeof current[part] !== 'object') {
                            current[part] = {};
                        }
                        current = current[part];
                    }
                }
            }
        }
        return result;
    }
});
