if (window.top !== window.self) {
    console.log('[AEM 360 Tool] Iframe detected. Skipping script injection.');
} else {
console.log('[AEM 360 Tool] Content script injected and waiting for commands.');

let dropzoneContainer = null;
let currentBasePath = '';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ACTIVATE_DROPZONE') {
        const path = request.payload.basePath;
        if (!path.startsWith('/content/dam/')) {
            alert('AEM 360 Error: La ruta destino debe comenzar obligatoriamente con /content/dam/');
            sendResponse({ success: false });
            return;
        }
        currentBasePath = path;
        injectDropzoneUI();
        sendResponse({ success: true });
    }
});

function injectDropzoneUI() {
    // Remove any existing dropzone container before creating a new one
    const existingDropzone = document.getElementById('aem-360-dropzone-container');
    if (existingDropzone) {
        existingDropzone.remove();
    }

    dropzoneContainer = document.createElement('div');
    dropzoneContainer.id = 'aem-360-dropzone-container';
    
    const styles = `
        #aem-360-dropzone-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 420px;
            height: 520px;
            background: #1e293b;
            color: #f8fafc;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            border: 1px solid #334155;
            overflow: hidden;
        }
        #aem-360-header {
            background: #0f172a;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #334155;
        }
        #aem-360-header h3 { margin: 0; font-size: 14px; font-weight: 600; color: #38bdf8; }
        #aem-360-close { background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; }
        #aem-360-close:hover { color: #f8fafc; }
        
        #aem-360-drop-area {
            flex: 1; margin: 16px; border: 2px dashed #475569; border-radius: 12px;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            text-align: center; transition: all 0.2s ease; background: rgba(15, 23, 42, 0.4);
            padding: 24px 16px;
        }
        #aem-360-drop-area.dragover { border-color: #38bdf8; background: rgba(56, 189, 248, 0.1); box-shadow: 0 0 15px rgba(56, 189, 248, 0.2); }
        #aem-360-drop-area p { margin: 8px 0; font-size: 14px; color: #cbd5e1; }
        .aem-360-highlight-box {
            display: inline-block;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid #334155;
            padding: 6px 10px;
            border-radius: 6px;
            color: #38bdf8;
            font-family: monospace;
            font-size: 11px;
            margin-top: 10px;
            word-break: break-all;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        }
        
        #aem-360-progress {
            padding: 0 16px 12px 16px;
            font-size: 12px;
            display: none;
            flex-direction: column;
            gap: 4px;
        }
        .aem-360-progress-bar { width: 100%; height: 6px; background: #334155; border-radius: 3px; overflow: hidden; margin-top: 2px;}
        .aem-360-progress-fill { height: 100%; background: #38bdf8; width: 0%; transition: width 0.2s ease; }
        
        #aem-360-logs {
            height: 160px; background: #0f172a; border-top: 1px solid #334155;
            padding: 8px 12px; overflow-y: auto; font-family: monospace; font-size: 11px; color: #a3e635;
        }
        .aem-360-log-error { color: #f87171; }
        .aem-360-log-info { color: #94a3b8; }
        .aem-360-log-success { color: #34d399; }
        .aem-360-log-warn { color: #fbbf24; }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    dropzoneContainer.innerHTML = `
        <div id="aem-360-header" style="cursor: move;">
            <h3>AEM 360 - Dropzone</h3>
            <button id="aem-360-close">&times;</button>
        </div>
        <div id="aem-360-drop-area">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 54px; height: 54px; margin-bottom: 12px; color: #38bdf8; filter: drop-shadow(0 0 8px rgba(56,189,248,0.4));">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p style="font-weight: 600; font-size: 15px; margin-bottom: 2px;">Drop folders or files here</p>
            <div style="font-size: 11px; color: #94a3b8; width: 100%;">
                Destination:
                <div id="aem-360-base-path-display" class="aem-360-highlight-box">${currentBasePath}</div>
            </div>
        </div>
        <div id="aem-360-progress">
            <div style="display: flex; justify-content: space-between;">
                <span id="aem-360-progress-text-folders" style="color: #cbd5e1;">Folders: 0 / 0</span>
                <span id="aem-360-progress-text-files" style="color: #cbd5e1;">Files: 0 / 0</span>
            </div>
            <div class="aem-360-progress-bar"><div id="aem-360-progress-fill-main" class="aem-360-progress-fill"></div></div>
        </div>
        <div id="aem-360-logs">Waiting for files...</div>
        <div id="aem-360-finish-container" style="display: none; padding: 10px; background: #0f172a; border-top: 1px solid #334155;">
            <button id="aem-360-finish-btn" style="width: 100%; padding: 8px; background: #38bdf8; color: #0f172a; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Finish Upload and Close</button>
        </div>
    `;

    document.body.appendChild(dropzoneContainer);

    document.getElementById('aem-360-close').addEventListener('click', () => {
        dropzoneContainer.style.display = 'none';
    });

    document.getElementById('aem-360-finish-btn').addEventListener('click', () => {
        dropzoneContainer.style.display = 'none';
        // Refrescar la página para que AEM muestre los archivos nuevos
        window.location.reload();
    });

    const header = document.getElementById('aem-360-header');
    let isDragging = false;
    let startX, startY, initialX, initialY;

    header.addEventListener('mousedown', (e) => {
        if (e.target.id === 'aem-360-close') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = dropzoneContainer.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        
        dropzoneContainer.style.bottom = 'auto';
        dropzoneContainer.style.right = 'auto';
        dropzoneContainer.style.left = initialX + 'px';
        dropzoneContainer.style.top = initialY + 'px';
        dropzoneContainer.style.margin = '0';
        
        header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        dropzoneContainer.style.left = (initialX + dx) + 'px';
        dropzoneContainer.style.top = (initialY + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        header.style.cursor = 'move';
    });

    const dropArea = document.getElementById('aem-360-drop-area');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
    });

    dropArea.addEventListener('drop', handleDrop, false);
}

function logToUI(msg, type = 'info') {
    const logsEl = document.getElementById('aem-360-logs');
    if (!logsEl) return;
    
    const div = document.createElement('div');
    div.className = `aem-360-log-${type}`;
    div.textContent = `> ${msg}`;
    logsEl.appendChild(div);
    logsEl.scrollTop = logsEl.scrollHeight;
}

async function promisePool(items, limit, asyncFn) {
    let index = 0;
    const active = new Set();
    const results = [];

    async function next() {
        if (index >= items.length) return;
        const currentIndex = index++;
        const item = items[currentIndex];
        
        const promise = asyncFn(item, currentIndex).then(res => {
            active.delete(promise);
            return res;
        }).catch(err => {
            active.delete(promise);
            return { error: err };
        });
        
        active.add(promise);
        results.push(promise);
        
        if (active.size >= limit) {
            await Promise.race(active);
        }
        await next();
    }
    
    await next();
    return Promise.all(results);
}

async function handleDrop(e) {
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    document.getElementById('aem-360-logs').innerHTML = '';
    const progressEl = document.getElementById('aem-360-progress');
    const progressFill = document.getElementById('aem-360-progress-fill-main');
    const progressTextFolders = document.getElementById('aem-360-progress-text-folders');
    const progressTextFiles = document.getElementById('aem-360-progress-text-files');
    progressEl.style.display = 'flex';
    progressFill.style.width = '0%';

    logToUI('Analyzing dropped structure...', 'info');
    
    const foldersToCreate = new Set();
    const filesToUpload = [];

    async function traverseFileTree(item, path) {
        path = path || "";
        if (item.isFile) {
            return new Promise((resolve) => {
                item.file((file) => {
                    filesToUpload.push({ file, path: path + file.name });
                    resolve();
                });
            });
        } else if (item.isDirectory) {
            foldersToCreate.add(path + item.name);
            const dirReader = item.createReader();
            let allEntries = [];
            
            const readAllEntries = () => {
                return new Promise((resolve) => {
                    dirReader.readEntries((entries) => {
                        if (entries.length === 0) resolve(allEntries);
                        else {
                            allEntries = allEntries.concat(entries);
                            readAllEntries().then(resolve);
                        }
                    });
                });
            };
            
            const entries = await readAllEntries();
            for (let i = 0; i < entries.length; i++) {
                await traverseFileTree(entries[i], path + item.name + "/");
            }
        }
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
            await traverseFileTree(item);
        }
    }

    logToUI(`Analysis complete: ${foldersToCreate.size} folders, ${filesToUpload.length} files.`, 'success');
    
    const sortedFolders = Array.from(foldersToCreate).sort((a, b) => a.split('/').length - b.split('/').length);
    
    processUploads(sortedFolders, filesToUpload, progressTextFolders, progressTextFiles, progressFill);
}

async function uploadSingleFile(fileObj, csrfToken) {
    let targetFolder = `${currentBasePath}/${fileObj.path.substring(0, fileObj.path.lastIndexOf('/'))}`.replace(/\/\//g, '/');
    if (targetFolder.endsWith('/')) targetFolder = targetFolder.slice(0, -1);
    
    const folderUrl = targetFolder;
    const fileName = fileObj.file.name;
    const fileSize = fileObj.file.size;

    const initiateUrl = `${folderUrl}.initiateUpload.json`;
    const initiateFormData = new URLSearchParams();
    initiateFormData.append('fileName', fileName);
    initiateFormData.append('fileSize', fileSize);

    const initResponse = await fetch(initiateUrl, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'CSRF-Token': csrfToken
        },
        body: initiateFormData
    });

    if (!initResponse.ok) {
        throw new Error(`InitiateUpload failed: ${initResponse.status}`);
    }

    const initData = await initResponse.json();
    if (!initData.files || initData.files.length === 0) {
        throw new Error('AEM returned no upload URIs');
    }

    const fileData = initData.files[0];
    const uploadUri = fileData.uploadURIs[0];
    const completeUri = initData.completeURI;
    const uploadToken = fileData.uploadToken;

    const putResponse = await fetch(uploadUri, {
        method: 'PUT',
        body: fileObj.file
    });

    if (!putResponse.ok) {
        throw new Error(`Binary upload failed: ${putResponse.status}`);
    }

    const completeFormData = new URLSearchParams();
    completeFormData.append('fileName', fileName);
    completeFormData.append('mimeType', fileObj.file.type || 'application/octet-stream');
    if (uploadToken) {
        completeFormData.append('uploadToken', uploadToken);
    }

    const completeResponse = await fetch(completeUri, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'CSRF-Token': csrfToken
        },
        body: completeFormData
    });

    if (!completeResponse.ok) {
        throw new Error(`CompleteUpload failed: ${completeResponse.status}`);
    }
}

async function processUploads(folders, files, textFolders, textFiles, progressFill) {
    let wakeLock = null;
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            logToUI('Keep-Alive mode activated (Screen on).', 'info');
        }
    } catch (err) {
        console.warn('Wake Lock not available:', err);
    }

    try {
        logToUI('Getting CSRF token...', 'info');
        let csrfToken = '';
        try {
            const csrfResponse = await fetch('/libs/granite/csrf/token.json');
            if (!csrfResponse.ok) throw new Error("No CSRF token");
            const json = await csrfResponse.json();
            csrfToken = json.token;
        } catch (e) {
            logToUI('Failed to get CSRF token. Make sure you are logged in.', 'error');
            return;
        }

        logToUI('Starting folder creation (Concurrency: 5)...', 'info');
        let foldersDone = 0;
        textFolders.textContent = `Folders: 0 / ${folders.length}`;
        
        await promisePool(folders, 5, async (folder) => {
            let targetPath = `${currentBasePath}/${folder}`.replace(/\/\//g, '/');
            if (targetPath.endsWith('/')) targetPath = targetPath.slice(0, -1);
            
            if (!targetPath.startsWith(currentBasePath)) {
                logToUI(`BLOCKED: Path escape attempt at ${targetPath}`, 'error');
                return;
            }
            
            const formData = new URLSearchParams();
            formData.append('./jcr:primaryType', 'sling:OrderedFolder');
            
            try {
                const res = await fetch(targetPath, {
                    method: 'POST',
                    headers: {
                        'CSRF-Token': csrfToken,
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    },
                    body: formData
                });
                foldersDone++;
                textFolders.textContent = `Folders: ${foldersDone} / ${folders.length}`;
                if (res.status === 409) {
                    logToUI(`Folder already existed: ${folder}`, 'info');
                } else if (!res.ok && res.status !== 200 && res.status !== 201) {
                    logToUI(`Error creating folder ${folder} (Status: ${res.status})`, 'error');
                }
            } catch (e) {
                logToUI(`Network error creating folder ${folder}`, 'error');
            }
        });

        logToUI('Starting file upload (Concurrency: 5)...', 'info');
        let filesDone = 0;
        textFiles.textContent = `Files: 0 / ${files.length}`;
        
        await promisePool(files, 5, async (fileObj) => {
            const file = fileObj.file;
            const relativePath = fileObj.path;
            let targetFolder = `${currentBasePath}/${relativePath.substring(0, relativePath.lastIndexOf('/'))}`.replace(/\/\//g, '/');
            if (targetFolder.endsWith('/')) targetFolder = targetFolder.slice(0, -1);
            
            if (!targetFolder.startsWith(currentBasePath)) {
                logToUI(`BLOCKED: Path escape attempt at file ${relativePath}`, 'error');
                return;
            }

            try {
                await uploadSingleFile(fileObj, csrfToken);
                filesDone++;
                textFiles.textContent = `Files: ${filesDone} / ${files.length}`;
                progressFill.style.width = `${(filesDone / files.length) * 100}%`;
                logToUI(`OK: ${file.name}`, 'success');
            } catch (e) {
                logToUI(`Error uploading ${file.name}: ${e.message}`, 'error');
            }
        });

        logToUI(`==== PROCESS COMPLETED ====`, 'success');
        logToUI(`Folders: ${foldersDone}/${folders.length} | Files: ${filesDone}/${files.length}`, 'success');
        
        const finishBtn = document.getElementById('aem-360-finish-container');
        if (finishBtn) finishBtn.style.display = 'block';

    } finally {
        // Release wake lock
        if (wakeLock !== null) {
            await wakeLock.release();
            wakeLock = null;
            logToUI('Keep-Alive mode deactivated.', 'info');
        }
    }
}

} // End of iframe guard else block
