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
            top: 10vh;
            left: calc(50vw - 300px);
            width: 600px;
            height: 650px;
            max-height: 90vh;
            max-width: 90vw;
            resize: both;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: #f8fafc;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(56, 189, 248, 0.15), 0 0 40px rgba(56, 189, 248, 0.05);
            z-index: 2147483647 !important;
            display: flex;
            transition: background 0.4s ease, box-shadow 0.4s ease, width 0.3s ease, height 0.3s ease;
            flex-direction: column;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
        }
        #aem-360-drag-bar {
            background: transparent;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            flex-shrink: 0;
        }
        #aem-360-drag-bar h3 { margin: 0; font-size: 14px; font-weight: 600; color: #38bdf8; }
        #aem-360-close { background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; }
        #aem-360-close:hover { color: #f8fafc; }
        
        #aem-360-drop-area {
            flex: 1; margin: 16px; border: 2px dashed #475569; border-radius: 12px;
            display: flex; flex-direction: column; align-items: center;
            text-align: center; transition: all 0.2s ease; background: rgba(15, 23, 42, 0.4);
            padding: 12px;
            min-height: 120px;
            overflow-y: auto;
        }
        .aem-360-drop-wrapper { margin: auto 0; width: 100%; display: flex; flex-direction: column; align-items: center; }
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
            height: 160px; min-height: 60px; flex-shrink: 1; background: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding: 12px 16px; overflow-y: auto; font-family: monospace; font-size: 11px; color: #a3e635;
        }
        .aem-360-log-error { color: #f87171; }
        .aem-360-log-info { color: #94a3b8; }

        /* Premium Micro-Animations & Hovers */
        #aem-360-cancel-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        #aem-360-cancel-btn:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.2); }
        #aem-360-cancel-btn:active { transform: scale(0.97); }

        #aem-360-finish-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3); }
        #aem-360-finish-btn:hover { background: linear-gradient(135deg, #1d4ed8, #2563eb) !important; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4); transform: translateY(-1px); }
        #aem-360-finish-btn:active { transform: translateY(1px) scale(0.98); box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3); }

        details > summary { transition: all 0.15s ease; border-radius: 4px; padding: 4px 6px !important; margin-left: -6px; }
        details > summary:hover { color: #38bdf8 !important; background: rgba(56, 189, 248, 0.08); }

        @keyframes aem-border-pulse {
            0% { border-color: rgba(71, 85, 105, 0.5); }
            50% { border-color: rgba(148, 163, 184, 0.8); }
            100% { border-color: rgba(71, 85, 105, 0.5); }
        }
        #aem-360-drop-area:not(.dragover) {
            animation: aem-border-pulse 4s infinite ease-in-out;
        }

        @keyframes aem-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .aem-360-spinner {
            border: 4px solid rgba(56, 189, 248, 0.1);
            border-left-color: #38bdf8;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            animation: aem-spin 1s linear infinite;
        }

        .aem-360-log-success { color: #34d399; }
        .aem-360-log-warn { color: #f97316; } /* Orange para avisos */
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    dropzoneContainer.innerHTML = `
        <div id="aem-360-drag-bar" style="cursor: move;">
            <h3 style="font-size: 15px; font-weight: 700; background: linear-gradient(to right, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">VML AEM 360 Tool</h3>
            <div style="display: flex; gap: 12px; align-items: center;">
                <button id="aem-360-maximize" title="Maximize/Restore" style="background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 14px; transition: color 0.2s;">🗖</button>
                <button id="aem-360-close" title="Close" style="background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 16px; transition: color 0.2s;">✕</button>
            </div>
        </div>
        <div id="aem-360-locale-toggle" style="background: rgba(0, 0, 0, 0.2); border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: 600; color: #94a3b8;">Target Locale:</span>
            <div style="display: flex; gap: 16px;">
                <label style="cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #e2e8f0;">
                    <input type="radio" name="aem-locale" value="us" checked style="accent-color: #38bdf8;"> US (gray)
                </label>
                <label style="cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #e2e8f0;">
                    <input type="radio" name="aem-locale" value="ca" style="accent-color: #38bdf8;"> CA (grey)
                </label>
            </div>
        </div>
        <div id="aem-360-drop-area">
            <div class="aem-360-drop-wrapper">
                <div style="width: 40px; height: 40px; margin: 0 auto 6px auto; background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/%3E%3Cpolyline points='17 8 12 3 7 8'/%3E%3Cline x1='12' y1='3' x2='12' y2='15'/%3E%3C/svg%3E&quot;); background-size: contain; background-repeat: no-repeat; filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.4)); flex-shrink: 0;"></div>
                <p style="font-weight: 600; font-size: 15px; color: #f8fafc; margin-bottom: 2px; flex-shrink: 0;">Drop folders or files here</p>
                <p style="font-size: 12px; color: #94a3b8; margin: 0; flex-shrink: 0;">or <span id="aem-360-browse-btn" style="color: #38bdf8; cursor: pointer; text-decoration: underline;">Browse folders</span></p>
                <input type="file" id="aem-360-file-input" webkitdirectory directory multiple style="display: none;">
                <div style="margin-top: 10px; padding: 6px 10px; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px; background: rgba(56, 189, 248, 0.05); flex-shrink: 0; width: 90%;">
                    <p style="font-size: 10px; color: #cbd5e1; margin: 0;">Destination:</p>
                    <p style="font-family: monospace; font-size: 10px; color: #38bdf8; margin: 2px 0 0 0; word-break: break-all;">${currentBasePath}</p>
                </div>
            </div>
        </div>
        
        <div id="aem-360-review-container" style="display: none; flex: 1; flex-direction: column; overflow: hidden;">
            <div style="padding: 12px 20px; background: rgba(56, 189, 248, 0.05); border-bottom: 1px solid rgba(56, 189, 248, 0.1); display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0; font-size: 14px; color: #38bdf8; font-weight: 600;">Review Cleaned Assets</h4>
                    <span id="aem-360-review-count" style="font-size: 12px; color: #94a3b8; background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 12px;">0 items</span>
                </div>
                <div style="font-size: 11px; color: #94a3b8; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); word-break: break-all;">
                    <span style="color: #64748b; font-weight: 600;">DESTINATION:</span> <span style="font-family: monospace; color: #a3e635;">${currentBasePath}</span>
                </div>
            </div>
            <div id="aem-360-review-list" style="flex: 1; overflow-y: auto; padding: 16px 20px; font-family: monospace; font-size: 11px; color: #cbd5e1;">
            </div>
            <div style="padding: 16px 20px; background: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255, 255, 255, 0.05); display: flex; gap: 12px;">
                <button id="aem-360-cancel-review-btn" style="flex: 1; padding: 12px; font-weight: 600; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.02); color: #cbd5e1; font-size: 14px;">Cancel</button>
                <button id="aem-360-approve-btn" style="flex: 2; padding: 12px; font-weight: 600; cursor: pointer; border: none; border-radius: 8px; background: linear-gradient(135deg, #2563eb, #3b82f6); color: #fff; font-size: 14px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">Approve & Upload</button>
            </div>
        </div>

        <div id="aem-360-progress">
            <div style="display: flex; justify-content: space-between;">
                <span id="aem-360-progress-text-folders" style="color: #cbd5e1;">Folders: 0 / 0</span>
                <span id="aem-360-progress-text-files" style="color: #cbd5e1;">Files: 0 / 0</span>
            </div>
            <div class="aem-360-progress-bar"><div id="aem-360-progress-fill-main" class="aem-360-progress-fill"></div></div>
            <div id="aem-360-abort-container" style="display: none; margin-top: 8px; text-align: right;">
                <button id="aem-360-abort-btn" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: bold; transition: opacity 0.2s;">Abort Upload</button>
            </div>
        </div>
        <div id="aem-360-logs">Waiting for files...</div>
        <div id="aem-360-finish-container" style="display: none; padding: 10px; background: #0f172a; border-top: 1px solid #334155;">
            <button id="aem-360-finish-btn" style="width: 100%; padding: 8px; background: #38bdf8; color: #0f172a; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Finish Upload and Close</button>
        </div>
    `;

    document.body.appendChild(dropzoneContainer);

    document.getElementById('aem-360-close').addEventListener('click', () => {
        dropzoneContainer.remove();
    });

    const fileInput = document.getElementById('aem-360-file-input');
    const browseBtn = document.getElementById('aem-360-browse-btn');

    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleBrowse, false);

    // Locale Color Shift
    const localeRadios = document.querySelectorAll('input[name="aem-locale"]');
    localeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'ca') {
                dropzoneContainer.style.background = 'rgba(40, 15, 25, 0.95)'; // Deep crimson/burgundy for CA
                dropzoneContainer.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(244, 63, 94, 0.25), 0 0 40px rgba(244, 63, 94, 0.1)';
            } else {
                dropzoneContainer.style.background = 'rgba(15, 23, 42, 0.95)'; // Original slate for US
                dropzoneContainer.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(56, 189, 248, 0.15), 0 0 40px rgba(56, 189, 248, 0.05)';
            }
        });
    });

    let isMaximized = false;
    document.getElementById('aem-360-maximize').addEventListener('click', () => {
        if (!isMaximized) {
            dropzoneContainer.style.top = '2vh';
            dropzoneContainer.style.left = '2vw';
            dropzoneContainer.style.width = '96vw';
            dropzoneContainer.style.height = '96vh';
            dropzoneContainer.style.maxWidth = '100vw';
            dropzoneContainer.style.maxHeight = '100vh';
            isMaximized = true;
        } else {
            dropzoneContainer.style.top = '10vh';
            dropzoneContainer.style.left = 'calc(50vw - 300px)';
            dropzoneContainer.style.width = '600px';
            dropzoneContainer.style.height = '650px';
            dropzoneContainer.style.maxWidth = '90vw';
            dropzoneContainer.style.maxHeight = '90vh';
            isMaximized = false;
        }
    });

    document.getElementById('aem-360-finish-btn').addEventListener('click', () => {
        dropzoneContainer.style.display = 'none';
        window.location.reload();
    });

    const dragBar = document.getElementById('aem-360-drag-bar');
    let isDragging = false;
    let startX, startY, initialX, initialY;

    dragBar.addEventListener('mousedown', (e) => {
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
        dragBar.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dy = e.clientY - startY;
        const dx = e.clientX - startX;
        
        let newX = initialX + dx;
        let newY = initialY + dy;
        
        if (newY < 0) newY = 0;
        if (newX < 0) newX = 0;
        if (newX + dropzoneContainer.offsetWidth > window.innerWidth) newX = window.innerWidth - dropzoneContainer.offsetWidth;
        if (newY + dropzoneContainer.offsetHeight > window.innerHeight) newY = window.innerHeight - dropzoneContainer.offsetHeight;

        dropzoneContainer.style.left = newX + 'px';
        dropzoneContainer.style.top = newY + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        dragBar.style.cursor = 'move';
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

async function handleDrop(e) {
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    document.getElementById('aem-360-logs').innerHTML = '';
    const dropArea = document.getElementById('aem-360-drop-area');
    const progressEl = document.getElementById('aem-360-progress');
    progressEl.style.display = 'flex';

    const dropWrapper = dropArea.querySelector('.aem-360-drop-wrapper');
    if (dropWrapper) dropWrapper.style.display = 'none';

    const spinnerDiv = document.createElement('div');
    spinnerDiv.id = 'aem-360-scanning-spinner';
    spinnerDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; animation: fadeIn 0.3s;';
    spinnerDiv.innerHTML = `
        <div class="aem-360-spinner"></div>
        <p style="margin-top: 20px; font-weight: 600; color: #38bdf8; font-size: 16px;">Scanning & Analyzing Files...</p>
    `;
    dropArea.appendChild(spinnerDiv);
    
    const foldersToCreate = new Set();
    const filesToUpload = [];

    async function traverseFileTree(item, path = "") {
        if (item.isFile) {
            return new Promise((resolve) => {
                item.file((file) => {
                    if (file.name === '.DS_Store' || file.name.toLowerCase() === 'thumbs.db' || file.name.startsWith('._')) {
                        resolve(); return;
                    }
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
            for (const entry of entries) await traverseFileTree(entry, path + item.name + "/");
        }
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) await traverseFileTree(item);
    }

    logToUI(`Analysis complete: ${foldersToCreate.size} folders, ${filesToUpload.length} files.`, 'success');
    finalizeAnalysis(foldersToCreate, filesToUpload, dropArea);
}

async function handleBrowse(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    document.getElementById('aem-360-logs').innerHTML = '';
    const dropArea = document.getElementById('aem-360-drop-area');
    document.getElementById('aem-360-progress').style.display = 'flex';

    const dropWrapper = dropArea.querySelector('.aem-360-drop-wrapper');
    if (dropWrapper) dropWrapper.style.display = 'none';

    const spinnerDiv = document.createElement('div');
    spinnerDiv.id = 'aem-360-scanning-spinner';
    spinnerDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; animation: fadeIn 0.3s;';
    spinnerDiv.innerHTML = `
        <div class="aem-360-spinner"></div>
        <p style="margin-top: 20px; font-weight: 600; color: #38bdf8; font-size: 16px;">Scanning & Analyzing Files...</p>
    `;
    dropArea.appendChild(spinnerDiv);

    // Force browser to paint the spinner before blocking the UI thread with the synchronous loop
    await new Promise(r => setTimeout(r, 50));

    const foldersToCreate = new Set();
    const filesToUpload = [];

    for (const file of files) {
        if (file.name === '.DS_Store' || file.name.toLowerCase() === 'thumbs.db' || file.name.startsWith('._')) continue;
        const path = file.webkitRelativePath;
        filesToUpload.push({ file, path });
        const parts = path.split('/');
        let currentPath = '';
        for (let j = 0; j < parts.length - 1; j++) {
            currentPath += parts[j];
            foldersToCreate.add(currentPath);
            currentPath += '/';
        }
    }

    logToUI(`Analysis complete: ${foldersToCreate.size} folders, ${filesToUpload.length} files.`, 'success');
    finalizeAnalysis(foldersToCreate, filesToUpload, dropArea);
}

function finalizeAnalysis(foldersToCreate, filesToUpload, dropArea) {
    const localeInput = document.querySelector('input[name="aem-locale"]:checked');
    const locale = localeInput ? localeInput.value : 'us';

    let renameResults = { cleanedFolders: [], cleanedFiles: [], renameCount: 0 };
    if (window.AEM360Renamer) {
        renameResults = window.AEM360Renamer.processDroppedFiles(foldersToCreate, filesToUpload, locale);
    } else {
        logToUI('Warning: Renamer module not found. Proceeding with original names.', 'warn');
        renameResults.cleanedFolders = Array.from(foldersToCreate);
        renameResults.cleanedFiles = filesToUpload.map(f => ({ file: f.file, path: f.path, originalPath: f.path }));
    }

    const { cleanedFolders, cleanedFiles, renameCount } = renameResults;

    // Populate Review UI
    const reviewList = document.getElementById('aem-360-review-list');
    reviewList.innerHTML = '';
    
    // Group renames by folder for a much cleaner UI
    const folderGroups = {};
    cleanedFiles.forEach(cf => {
        if (cf.path !== cf.originalPath) {
            let origParent = cf.originalPath.substring(0, cf.originalPath.lastIndexOf('/'));
            let origFile = cf.originalPath.substring(cf.originalPath.lastIndexOf('/') + 1);
            let newParent = cf.path.substring(0, cf.path.lastIndexOf('/'));
            let newFile = cf.path.substring(cf.path.lastIndexOf('/') + 1);

            if (!folderGroups[origParent]) {
                folderGroups[origParent] = {
                    newParent: newParent,
                    filesCount: 0,
                    allFiles: []
                };
            }
            folderGroups[origParent].filesCount++;
            folderGroups[origParent].allFiles.push({
                orig: origFile,
                new: newFile
            });
        }
    });

    const groupKeys = Object.keys(folderGroups);
    
    if (groupKeys.length === 0) {
        reviewList.innerHTML = '<div style="color: #cbd5e1; text-align: center; margin-top: 20px; font-size: 13px;">All assets are perfectly named! No cleaning required.</div>';
    } else {
        // Build Tree Structure
        const tree = {};
        groupKeys.forEach(origParent => {
            const group = folderGroups[origParent];
            const parts = group.newParent.split('/').filter(p => p);
            
            let currentLevel = tree;
            parts.forEach((part, index) => {
                if (!currentLevel[part]) {
                    currentLevel[part] = { _children: {} };
                }
                if (index === parts.length - 1) {
                    currentLevel[part]._info = group;
                }
                currentLevel = currentLevel[part]._children;
            });
        });

        // Render Tree Recursively using Interactive <details> tags
        function renderTree(node, depth = 0) {
            let html = '';
            const keys = Object.keys(node).filter(k => k !== '_children' && k !== '_info').sort();
            
            keys.forEach((key, index) => {
                const childNode = node[key];
                const hasChildren = Object.keys(childNode._children).length > 0;
                
                // Use <details> for a native collapsible tree (closed by default)
                html += `<details style="margin-left: ${depth === 0 ? 0 : 20}px;">`;
                
                // SVG Folder Icon
                const folderIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#0ea5e9" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; position: relative; top: 2px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
                
                html += `<summary style="cursor: pointer; font-family: system-ui, -apple-system, sans-serif; color: #f8fafc; padding: 4px 0; font-size: 13px; font-weight: 500; user-select: none; transition: color 0.2s;">
                    ${folderIcon}${key}
                </summary>`;
                
                if (childNode._info) {
                    const info = childNode._info;
                    
                    // Sort files numerically based on the leading number
                    let sortedFiles = [...info.allFiles].sort((a, b) => {
                        let numA = parseInt((a.orig.match(/^0*(\d+)/) || [0, 0])[1], 10);
                        let numB = parseInt((b.orig.match(/^0*(\d+)/) || [0, 0])[1], 10);
                        return numA - numB;
                    });
                    
                    let filesListHtml = sortedFiles.map(f => `
                        <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 3px; white-space: nowrap;">
                            <span style="color: #475569;">•</span>
                            <span style="text-decoration: line-through; color: #f87171; opacity: 0.8;">${f.orig}</span> 
                            <span style="color: #10b981; font-weight: bold;">➔</span> 
                            <span style="color: #34d399; font-weight: bold;">${f.new}</span>
                        </div>
                    `).join('');

                    html += `<div style="margin-left: 24px; margin-top: 4px; margin-bottom: 8px; padding: 6px 12px; background: rgba(0,0,0,0.25); border-radius: 6px; border-left: 2px solid #10b981; overflow-x: auto;">
                        <details>
                            <summary style="cursor: pointer; outline: none; user-select: none;">
                                <span style="font-size: 10px; color: #10b981; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 2px 6px; border-radius: 4px; font-weight: bold;">Ver ${info.filesCount} archivos .jpeg ▼</span>
                            </summary>
                            <div style="font-family: monospace; font-size: 11px; display: flex; flex-direction: column; margin-top: 8px; padding-left: 4px; max-height: 150px; overflow-y: auto; overflow-x: auto; white-space: nowrap;">
                                ${filesListHtml}
                            </div>
                        </details>
                    </div>`;
                }
                
                if (hasChildren) {
                    html += renderTree(childNode._children, depth + 1);
                }
                
                html += `</details>`;
            });
            return html;
        }

        const treeContainer = document.createElement('div');
        treeContainer.style.background = 'rgba(15, 23, 42, 0.6)';
        treeContainer.style.border = '1px solid #334155';
        treeContainer.style.borderRadius = '6px';
        treeContainer.style.padding = '12px';
        treeContainer.innerHTML = renderTree(tree);
        
        reviewList.appendChild(treeContainer);
    }
    
    document.getElementById('aem-360-review-count').textContent = `${cleanedFiles.length} items (${renameCount} renamed)`;
    
    // Swap UI
    document.getElementById('aem-360-drop-area').style.display = 'none';
    document.getElementById('aem-360-review-container').style.display = 'flex';

    // Button Handlers
    const btnCancel = document.getElementById('aem-360-cancel-review-btn');
    const btnApprove = document.getElementById('aem-360-approve-btn');

    btnCancel.onclick = () => {
        document.getElementById('aem-360-review-container').style.display = 'none';
        
        const spinner = document.getElementById('aem-360-scanning-spinner');
        if (spinner) spinner.remove();
        
        const dropWrapper = document.getElementById('aem-360-drop-area').querySelector('.aem-360-drop-wrapper');
        if (dropWrapper) dropWrapper.style.display = 'flex';
        
        document.getElementById('aem-360-drop-area').style.display = 'flex';
        document.getElementById('aem-360-logs').innerHTML = 'Upload cancelled.';
    };

    btnApprove.onclick = () => {
        document.getElementById('aem-360-review-container').style.display = 'none';
        
        const abortContainer = document.getElementById('aem-360-abort-container');
        if (abortContainer) abortContainer.style.display = 'block';
        
        const sortedFolders = Array.from(cleanedFolders).sort((a, b) => a.split('/').length - b.split('/').length);
        
        logToUI('Starting upload of cleaned assets...', 'success');
        processUploads(sortedFolders, cleanedFiles, progressTextFolders, progressTextFiles, progressFill);
    };
}

async function uploadSingleFile(fileObj, tokenRef, retries = 5) {
    let targetFolder = `${currentBasePath}/${fileObj.path.substring(0, fileObj.path.lastIndexOf('/'))}`.replace(/\/\//g, '/');
    if (targetFolder.endsWith('/')) targetFolder = targetFolder.slice(0, -1);
    
    const folderUrl = targetFolder;
    const fileName = fileObj.file.name;
    const fileSize = fileObj.file.size;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const initiateUrl = `${folderUrl}.initiateUpload.json`;
            const initiateFormData = new URLSearchParams();
            initiateFormData.append('fileName', fileName);
            initiateFormData.append('fileSize', fileSize);

            const initResponse = await fetch(initiateUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'CSRF-Token': tokenRef.current
                },
                body: initiateFormData
            });

            if (!initResponse.ok) {
                if (initResponse.status === 403) {
                    logToUI(`Token expired (403) during ${fileName}. Auto-refreshing...`, 'warn');
                    const csrfRes = await fetch('/libs/granite/csrf/token.json');
                    if (csrfRes.ok) tokenRef.current = (await csrfRes.json()).token;
                }
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
                    'CSRF-Token': tokenRef.current
                },
                body: completeFormData
            });

            if (!completeResponse.ok) {
                if (completeResponse.status === 403) {
                    logToUI(`Token expired (403) on complete for ${fileName}. Auto-refreshing...`, 'warn');
                    const csrfRes = await fetch('/libs/granite/csrf/token.json');
                    if (csrfRes.ok) tokenRef.current = (await csrfRes.json()).token;
                }
                throw new Error(`CompleteUpload failed: ${completeResponse.status}`);
            }
            
            // AUTO-APPROVE ASSET
            const metadataUrl = `${currentBasePath}/${fileObj.path}/jcr:content/metadata`;
            const approveFormData = new URLSearchParams();
            approveFormData.append('./dam:status', 'approved');
            
            const approveResponse = await fetch(metadataUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'CSRF-Token': tokenRef.current
                },
                body: approveFormData
            });

            if (!approveResponse.ok) {
                if (approveResponse.status === 403) {
                    logToUI(`Token expired (403) on approve for ${fileName}. Auto-refreshing...`, 'warn');
                    const csrfRes = await fetch('/libs/granite/csrf/token.json');
                    if (csrfRes.ok) tokenRef.current = (await csrfRes.json()).token;
                }
                throw new Error(`ApproveAsset failed: ${approveResponse.status}`);
            }

            return attempt;
        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
            const backoffMs = 2000 * Math.pow(2, attempt - 1) + (Math.random() * 1000); // Exponential backoff + Jitter
            logToUI(`Retrying upload for ${fileName} (Attempt ${attempt + 1}/${retries})...`, 'warn');
            await new Promise(res => setTimeout(res, backoffMs));
        }
    }
}

async function processUploads(folders, files, textFolders, textFiles, progressFill) {
    let wakeLock = null;
    let abortRequested = false;

    const abortBtn = document.getElementById('aem-360-abort-btn');
    if (abortBtn) {
        abortBtn.onclick = () => {
            if (!abortRequested) {
                abortRequested = true;
                logToUI('ABORT REQUESTED! Stopping new uploads...', 'warn');
                abortBtn.textContent = 'Aborting...';
                abortBtn.style.opacity = '0.5';
                abortBtn.style.cursor = 'not-allowed';
            }
        };
    }

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
        let tokenRef = { current: '' };
        try {
            const csrfResponse = await fetch('/libs/granite/csrf/token.json');
            if (!csrfResponse.ok) throw new Error("No CSRF token");
            const json = await csrfResponse.json();
            tokenRef.current = json.token;
        } catch (e) {
            logToUI('Failed to get CSRF token. Make sure you are logged in.', 'error');
            return;
        }

        logToUI('Starting folder creation (Concurrency: 5)...', 'info');
        let foldersDone = 0;
        let foldersFailed = 0;
        const failedFoldersSet = new Set();
        textFolders.textContent = `Folders: 0 / ${folders.length}`;
        
        await promisePool(folders, 5, async (folder) => {
            if (abortRequested) return;

            let targetPath = `${currentBasePath}/${folder}`.replace(/\/\//g, '/');
            if (targetPath.endsWith('/')) targetPath = targetPath.slice(0, -1);
            
            if (!targetPath.startsWith(currentBasePath)) {
                logToUI(`BLOCKED: Path escape attempt at ${targetPath}`, 'error');
                failedFoldersSet.add(folder);
                foldersFailed++;
                return;
            }
            
            const formData = new URLSearchParams();
            formData.append('./jcr:primaryType', 'sling:OrderedFolder');
            
            let success = false;
            let lastStatus = 0;
            
            const maxFolderRetries = 5;
            for (let attempt = 1; attempt <= maxFolderRetries; attempt++) {
                try {
                    const res = await fetch(targetPath, {
                        method: 'POST',
                        headers: {
                            'CSRF-Token': tokenRef.current,
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                        },
                        body: formData
                    });
                    lastStatus = res.status;
                    if (res.status === 409) {
                        logToUI(`Folder already existed: ${folder}`, 'info');
                        success = true;
                        break;
                    } else if (res.ok || res.status === 200 || res.status === 201) {
                        success = true;
                        break;
                    } else if (res.status === 403) {
                        logToUI(`Token expired (403) while creating folder ${folder}. Auto-refreshing...`, 'warn');
                        const csrfRes = await fetch('/libs/granite/csrf/token.json');
                        if (csrfRes.ok) tokenRef.current = (await csrfRes.json()).token;
                        throw new Error(`Folder creation failed: 403`);
                    }
                } catch (e) {
                    // Network error, will retry
                }
                
                if (attempt < maxFolderRetries) {
                    const backoffMs = 2000 * Math.pow(2, attempt - 1) + (Math.random() * 1000);
                    logToUI(`Retrying folder creation ${folder} (Attempt ${attempt + 1}/${maxFolderRetries})...`, 'warn');
                    await new Promise(res => setTimeout(res, backoffMs));
                }
            }
            
            if (success) {
                foldersDone++;
            } else {
                logToUI(`Error creating folder ${folder} (Final Status: ${lastStatus})`, 'error');
                failedFoldersSet.add(folder);
                foldersFailed++;
            }
            textFolders.textContent = `Folders: ${foldersDone} / ${folders.length}` + (foldersFailed ? ` (${foldersFailed} err)` : '');
        });

        logToUI('Starting file upload (Concurrency: 5)...', 'info');
        let filesDone = 0;
        let filesFailed = 0;
        let filesSkipped = 0;
        textFiles.textContent = `Files: 0 / ${files.length}`;
        
        await promisePool(files, 5, async (fileObj) => {
            if (abortRequested) {
                filesSkipped++;
                textFiles.textContent = `Files: ${filesDone} / ${files.length} (${filesFailed} err, ${filesSkipped} skip)`;
                progressFill.style.width = `${((filesDone + filesFailed + filesSkipped) / files.length) * 100}%`;
                return;
            }

            const file = fileObj.file;
            const relativePath = fileObj.path;
            const parentFolder = relativePath.substring(0, relativePath.lastIndexOf('/'));
            
            if (failedFoldersSet.has(parentFolder) || Array.from(failedFoldersSet).some(failedPath => parentFolder.startsWith(failedPath + '/'))) {
                logToUI(`SKIPPED: ${file.name} (Parent folder failed)`, 'warn');
                filesSkipped++;
                textFiles.textContent = `Files: ${filesDone} / ${files.length} (${filesFailed} err, ${filesSkipped} skip)`;
                progressFill.style.width = `${((filesDone + filesFailed + filesSkipped) / files.length) * 100}%`;
                return;
            }

            let targetFolder = `${currentBasePath}/${parentFolder}`.replace(/\/\//g, '/');
            if (targetFolder.endsWith('/')) targetFolder = targetFolder.slice(0, -1);
            
            if (!targetFolder.startsWith(currentBasePath)) {
                logToUI(`BLOCKED: Path escape attempt at file ${relativePath}`, 'error');
                filesFailed++;
                textFiles.textContent = `Files: ${filesDone} / ${files.length} (${filesFailed} err, ${filesSkipped} skip)`;
                progressFill.style.width = `${((filesDone + filesFailed + filesSkipped) / files.length) * 100}%`;
                return;
            }

            try {
                const attemptNum = await uploadSingleFile(fileObj, tokenRef);
                filesDone++;
                textFiles.textContent = `Files: ${filesDone} / ${files.length}` + (filesFailed || filesSkipped ? ` (${filesFailed} err, ${filesSkipped} skip)` : '');
                progressFill.style.width = `${((filesDone + filesFailed + filesSkipped) / files.length) * 100}%`;
                
                if (attemptNum > 1) {
                    logToUI(`OK (after ${attemptNum} attempts): ${file.name}`, 'success');
                } else {
                    logToUI(`OK: ${file.name}`, 'success');
                }
            } catch (e) {
                logToUI(`Error uploading ${file.name}: ${e.message}`, 'error');
                filesFailed++;
                textFiles.textContent = `Files: ${filesDone} / ${files.length} (${filesFailed} err, ${filesSkipped} skip)`;
                progressFill.style.width = `${((filesDone + filesFailed + filesSkipped) / files.length) * 100}%`;
                progressFill.style.background = '#f87171';
            }
        });

        const abortContainer = document.getElementById('aem-360-abort-container');
        if (abortContainer) abortContainer.style.display = 'none';

        logToUI(`==== PROCESS COMPLETED ====`, 'success');
        if (abortRequested) logToUI(`PROCESS ABORTED BY USER`, 'error');
        
        if (filesFailed > 0 || foldersFailed > 0 || filesSkipped > 0) {
            logToUI(`Folders: ${foldersDone} OK, ${foldersFailed} Errors`, 'error');
            logToUI(`Files: ${filesDone} OK, ${filesFailed} Errors, ${filesSkipped} Skipped`, 'error');
        } else {
            logToUI(`Folders: ${foldersDone}/${folders.length} | Files: ${filesDone}/${files.length}`, 'success');
        }
        
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
