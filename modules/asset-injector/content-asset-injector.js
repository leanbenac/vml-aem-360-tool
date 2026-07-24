if (window.top !== window.self) {
    console.log('[AEM 360 Tool] Iframe detected. Skipping script injection.');
} else {
console.log('[AEM 360 Tool] Content script injected and waiting for commands.');

let dropzoneContainer = null;
let currentBasePath = '';
let tokenRefreshPromise = null;
let currentScannedFolders = null;
let currentScannedFiles = null;
let folderInversionStates = {};
let allInverted = false;

async function getValidToken(tokenRef, contextStr) {
    if (tokenRefreshPromise) {
        logToUI(`Waiting for existing token refresh (${contextStr})...`, 'info');
        await tokenRefreshPromise;
        return;
    }
    
    logToUI(`Token expired (403) during ${contextStr}. Auto-refreshing...`, 'warn');
    tokenRefreshPromise = (async () => {
        try {
            const csrfRes = await fetch('/libs/granite/csrf/token.json');
            if (csrfRes.ok) {
                const json = await csrfRes.json();
                tokenRef.current = json.token;
                logToUI(`Token successfully refreshed.`, 'success');
            } else {
                throw new Error('Failed to fetch new token');
            }
        } catch (e) {
            logToUI(`Error refreshing token: ${e.message}`, 'error');
            throw e;
        } finally {
            tokenRefreshPromise = null;
        }
    })();
    
    await tokenRefreshPromise;
}

function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'style') el.style.cssText = value;
            else if (key === 'className') el.className = value;
            else if (key === 'textContent') el.textContent = value;
            else if (value === true || value === 'true') el.setAttribute(key, '');
            else el.setAttribute(key, value);
        }
    }
    for (const child of children) {
        if (!child) continue;
        if (typeof child === 'string') el.appendChild(document.createTextNode(child));
        else el.appendChild(child);
    }
    return el;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ACTIVATE_DROPZONE') {
        const path = request.payload.basePath;
        if (!path.startsWith('/content/dam/')) {
            alert('AEM 360 Error: The destination path must start with /content/dam/');
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
            height: 180px; min-height: 120px; flex-shrink: 0; background: rgba(15, 23, 42, 0.4); 
            border-top: 1px solid rgba(56, 189, 248, 0.1); box-shadow: inset 0 4px 20px rgba(0,0,0,0.5);
            padding: 12px 16px; overflow-y: auto; font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace; 
            font-size: 11px; letter-spacing: 0.3px; line-height: 1.5; color: #a3e635;
        }
        .aem-360-log-item { display: flex; align-items: flex-start; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed rgba(255,255,255,0.05); word-break: break-all; }
        .aem-360-log-error { color: #ef4444; }
        .aem-360-log-info { color: #94a3b8; }

        /* Premium Micro-Animations & Hovers */
        #aem-360-cancel-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        #aem-360-cancel-btn:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.2); }
        #aem-360-cancel-btn:active { transform: scale(0.97); }

        #aem-360-cancel-review-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        #aem-360-cancel-review-btn:hover { background: rgba(255, 255, 255, 0.08) !important; border-color: rgba(255, 255, 255, 0.2) !important; transform: translateY(-1px); }
        #aem-360-cancel-review-btn:active { transform: translateY(0) scale(0.98); }

        #aem-360-approve-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        #aem-360-approve-btn:hover { background: linear-gradient(135deg, #1d4ed8, #2563eb) !important; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4) !important; transform: translateY(-1px); }
        #aem-360-approve-btn:active { transform: translateY(0) scale(0.98); box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3) !important; }

        #aem-360-finish-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3); }
        #aem-360-finish-btn:hover { background: linear-gradient(135deg, #1d4ed8, #2563eb) !important; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4); transform: translateY(-1px); }
        #aem-360-finish-btn:active { transform: translateY(1px) scale(0.98); box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3); }

        details > summary { transition: background-color 0.15s ease, color 0.15s ease; border-radius: 4px; padding: 4px 6px !important; margin-left: -6px; }
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

        .aem-360-log-success { color: #10b981; }
        .aem-360-log-warn { color: #f59e0b; } /* Orange for warnings */

        #aem-360-invert-all-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        #aem-360-invert-all-btn:hover { background: rgba(56, 189, 248, 0.08) !important; }
        #aem-360-invert-all-btn:active { transform: scale(0.98); }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    const svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgIcon.setAttribute("width", "18");
    svgIcon.setAttribute("height", "18");
    svgIcon.setAttribute("viewBox", "0 0 24 24");
    svgIcon.setAttribute("fill", "none");
    svgIcon.setAttribute("stroke", "currentColor");
    svgIcon.setAttribute("stroke-width", "2");
    svgIcon.setAttribute("stroke-linecap", "round");
    svgIcon.setAttribute("stroke-linejoin", "round");
    const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path1.setAttribute("d", "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4");
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", "17 8 12 3 7 8");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "12"); line.setAttribute("y1", "3"); line.setAttribute("x2", "12"); line.setAttribute("y2", "15");
    svgIcon.appendChild(path1); svgIcon.appendChild(polyline); svgIcon.appendChild(line);

    dropzoneContainer.appendChild(h('div', { id: 'aem-360-drag-bar', style: 'cursor: move;' },
        h('h3', { style: 'font-size: 15px; font-weight: 700; background: linear-gradient(to right, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;', textContent: 'VML AEM 360 Tool' }),
        h('div', { style: 'display: flex; gap: 12px; align-items: center;' },
            h('button', { id: 'aem-360-maximize', title: 'Maximize/Restore', style: 'background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 14px; transition: color 0.2s;', textContent: '🗖' }),
            h('button', { id: 'aem-360-close', title: 'Close', style: 'background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 16px; transition: color 0.2s;', textContent: '✕' })
        )
    ));

    dropzoneContainer.appendChild(h('div', { id: 'aem-360-settings-bar', style: 'background: rgba(0, 0, 0, 0.2); border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding: 12px 20px; display: flex; flex-direction: column; gap: 12px;' },
        h('div', { style: 'display: flex; align-items: center; justify-content: space-between; width: 100%;' },
            h('div', { id: 'aem-360-locale-group', style: 'display: flex; align-items: center; gap: 12px;' },
                h('span', { style: 'font-size: 13px; font-weight: 600; color: #94a3b8;', textContent: 'Locale:' }),
                h('div', { style: 'display: flex; gap: 12px;' },
                    h('label', { style: 'cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 500; color: #e2e8f0;' },
                        h('input', { type: 'radio', name: 'aem-locale', value: 'us', checked: true, style: 'accent-color: #38bdf8; margin: 0;' }),
                        ' US (gray)'
                    ),
                    h('label', { style: 'cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 500; color: #e2e8f0;' },
                        h('input', { type: 'radio', name: 'aem-locale', value: 'ca', style: 'accent-color: #38bdf8; margin: 0;' }),
                        ' CA (grey)'
                    )
                )
            ),
            h('div', { id: 'aem-360-ext-group', style: 'display: flex; align-items: center; gap: 12px;' },
                h('span', { style: 'font-size: 13px; font-weight: 600; color: #94a3b8;', textContent: 'Extension:' }),
                h('div', { style: 'display: flex; gap: 12px;' },
                    h('label', { style: 'cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 500; color: #e2e8f0;' },
                        h('input', { type: 'radio', name: 'aem-ext', value: 'jpeg', checked: true, style: 'accent-color: #38bdf8; margin: 0;' }),
                        ' .jpeg'
                    ),
                    h('label', { style: 'cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 500; color: #e2e8f0;' },
                        h('input', { type: 'radio', name: 'aem-ext', value: 'jpg', style: 'accent-color: #38bdf8; margin: 0;' }),
                        ' .jpg'
                    )
                )
            )
        ),
        h('div', { style: 'display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 10px;' },
            h('button', {
                id: 'aem-360-invert-all-btn',
                type: 'button',
                style: 'background: transparent; border: 1px solid #38bdf8; border-radius: 6px; color: #38bdf8; padding: 6px 12px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; outline: none; flex: 1; text-align: center;',
                textContent: 'Invert All Numeration'
            }),
            h('label', { style: 'cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #e2e8f0; white-space: nowrap;' },
                h('input', { type: 'checkbox', id: 'aem-360-direct-upload', style: 'accent-color: #38bdf8; margin: 0; width: 16px; height: 16px;' }),
                'Direct Upload'
            )
        )
    ));

    dropzoneContainer.appendChild(h('div', { id: 'aem-360-top-destination', style: 'display: none; background: rgba(15, 23, 42, 0.4); padding: 8px 20px; border-bottom: 1px solid rgba(255,255,255,0.05);' },
        h('div', { style: 'font-size: 11px; color: #94a3b8; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); word-break: break-all;' },
            h('span', { style: 'color: #64748b; font-weight: 600;', textContent: 'DESTINATION: ' }),
            h('span', { style: 'font-family: monospace; color: #a3e635;', textContent: currentBasePath })
        )
    ));

    dropzoneContainer.appendChild(h('div', { id: 'aem-360-drop-area' },
        h('div', { className: 'aem-360-drop-wrapper' },
            h('div', { style: "width: 40px; height: 40px; margin: 0 auto 6px auto; background-image: url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2338bdf8\\' stroke-width=\\'1.5\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'%3E%3Cpath d=\\'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\\'/%3E%3Cpolyline points=\\'17 8 12 3 7 8\\'/%3E%3Cline x1=\\'12\\' y1=\\'3\\' x2=\\'12\\' y2=\\'15\\'/%3E%3C/svg%3E'); background-size: contain; background-repeat: no-repeat; filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.4)); flex-shrink: 0;" }),
            h('p', { style: 'font-weight: 600; font-size: 15px; color: #f8fafc; margin-bottom: 2px; flex-shrink: 0;', textContent: 'Drop folders or files here' }),
            h('p', { style: 'font-size: 12px; color: #94a3b8; margin: 0; flex-shrink: 0;' },
                'or ',
                h('span', { id: 'aem-360-browse-btn', style: 'color: #38bdf8; cursor: pointer; text-decoration: underline;', textContent: 'Browse folders' })
            ),
            h('input', { type: 'file', id: 'aem-360-file-input', webkitdirectory: true, directory: true, multiple: true, style: 'display: none;' }),
            h('input', { type: 'file', id: 'aem-360-file-input-files', multiple: true, style: 'display: none;' }),
            h('div', { style: 'margin-top: 10px; padding: 8px 12px; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px; background: rgba(56, 189, 248, 0.05); flex-shrink: 0; width: 90%; line-height: 1.4;' },
                h('span', { style: 'font-size: 12px; color: #cbd5e1; font-weight: 600;', textContent: 'Destination: ' }),
                h('span', { style: 'font-family: monospace; font-size: 12px; color: #38bdf8; word-break: break-all;', textContent: currentBasePath })
            )
        )
    ));

    dropzoneContainer.appendChild(h('div', { id: 'aem-360-review-container', style: 'display: none; flex: 1; flex-direction: column; overflow: hidden; min-height: 0;' },
        h('div', { style: 'padding: 12px 20px; background: rgba(56, 189, 248, 0.05); border-bottom: 1px solid rgba(56, 189, 248, 0.1); display: flex; flex-direction: column; gap: 8px;' },
            h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
                h('h4', { style: 'margin: 0; font-size: 14px; color: #38bdf8; font-weight: 600;', textContent: 'Review Cleaned Assets' }),
                h('span', { id: 'aem-360-review-count', style: 'font-size: 12px; color: #94a3b8; background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 12px;', textContent: '0 items' })
            )
        ),
        h('div', { id: 'aem-360-review-list', style: 'flex: 1; overflow-y: auto; min-height: 0; padding: 16px 20px; font-family: monospace; font-size: 11px; color: #cbd5e1; transform: translateZ(0);' }),
        h('div', { style: 'padding: 16px 20px; background: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255, 255, 255, 0.05); display: flex; gap: 12px;' },
            h('button', { id: 'aem-360-cancel-review-btn', style: 'flex: 1; padding: 12px; font-weight: 600; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.02); color: #cbd5e1; font-size: 14px;', textContent: 'Cancel' }),
            h('button', { id: 'aem-360-export-colorizer-btn', style: 'flex: 1.5; padding: 12px; font-weight: 600; cursor: pointer; border: 1px solid #a855f7; border-radius: 8px; background: rgba(168, 85, 247, 0.1); color: #c084fc; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 6px;', textContent: 'Export JSON Colorizer Base' }),
            h('button', { id: 'aem-360-approve-btn', style: 'flex: 2; padding: 12px; font-weight: 600; cursor: pointer; border: none; border-radius: 8px; background: linear-gradient(135deg, #2563eb, #3b82f6); color: #fff; font-size: 14px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px;' },
                svgIcon,
                ' Approve & Upload'
            )
        )
    ));

    dropzoneContainer.appendChild(h('div', { id: 'aem-360-progress' },
        h('div', { style: 'display: flex; justify-content: space-between;' },
            h('span', { id: 'aem-360-progress-text-folders', style: 'color: #cbd5e1; flex: 1;', textContent: 'Folders: 0 / 0' }),
            h('span', { id: 'aem-360-progress-time', style: "color: #38bdf8; font-family: 'JetBrains Mono', monospace; font-weight: bold; flex: 1; text-align: center; font-size: 14px; letter-spacing: 1px;", textContent: '00:00' }),
            h('span', { id: 'aem-360-progress-text-files', style: 'color: #cbd5e1; flex: 1; text-align: right;', textContent: 'Files: 0 / 0' })
        ),
        h('div', { className: 'aem-360-progress-bar' },
            h('div', { id: 'aem-360-progress-fill-main', className: 'aem-360-progress-fill' })
        ),
        h('div', { id: 'aem-360-abort-container', style: 'display: none; margin-top: 8px; text-align: right;' },
            h('button', { id: 'aem-360-abort-btn', style: 'background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: bold; transition: opacity 0.2s;', textContent: 'Abort Upload' })
        )
    ));

    dropzoneContainer.appendChild(h('div', { id: 'aem-360-logs', className: 'aem-360-custom-scroll', style: 'display: none;', textContent: 'Waiting for files...' }));
    
    dropzoneContainer.appendChild(h('div', { id: 'aem-360-finish-container', style: 'display: none; padding: 10px; background: #0f172a; border-top: 1px solid #334155;' },
        h('button', { id: 'aem-360-finish-btn', style: 'width: 100%; padding: 8px; background: #38bdf8; color: #0f172a; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;', textContent: 'Finish Upload and Close' })
    ));

    document.body.appendChild(dropzoneContainer);

    document.getElementById('aem-360-close').addEventListener('click', () => {
        dropzoneContainer.remove();
    });

    const fileInput = document.getElementById('aem-360-file-input');
    const fileInputFiles = document.getElementById('aem-360-file-input-files');
    const browseBtn = document.getElementById('aem-360-browse-btn');
    const directUploadCheckbox = document.getElementById('aem-360-direct-upload');

    browseBtn.addEventListener('click', () => {
        if (directUploadCheckbox && directUploadCheckbox.checked) {
            fileInputFiles.click();
        } else {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', handleBrowse, false);
    fileInputFiles.addEventListener('change', handleBrowse, false);

    if (directUploadCheckbox) {
        directUploadCheckbox.addEventListener('change', () => {
            if (directUploadCheckbox.checked) {
                browseBtn.textContent = 'Browse files';
            } else {
                browseBtn.textContent = 'Browse folders';
            }
            if (currentScannedFolders && currentScannedFiles) {
                const dropArea = document.getElementById('aem-360-drop-area');
                finalizeAnalysis(currentScannedFolders, currentScannedFiles, dropArea);
            }
        });
    }

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

    // Real-time Update on setting changes
    const settingsRadios = document.querySelectorAll('input[name="aem-locale"], input[name="aem-ext"]');
    settingsRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (currentScannedFolders && currentScannedFiles) {
                const dropArea = document.getElementById('aem-360-drop-area');
                finalizeAnalysis(currentScannedFolders, currentScannedFiles, dropArea);
            }
        });
    });

    // Global Inversion Button click listener
    const invertAllBtn = document.getElementById('aem-360-invert-all-btn');
    if (invertAllBtn) {
        invertAllBtn.addEventListener('click', () => {
            allInverted = !allInverted;
            
            // Update button styling
            if (allInverted) {
                invertAllBtn.style.background = '#38bdf8';
                invertAllBtn.style.color = '#0f172a';
                invertAllBtn.textContent = 'Numeration Inverted ✓';
            } else {
                invertAllBtn.style.background = 'transparent';
                invertAllBtn.style.color = '#38bdf8';
                invertAllBtn.textContent = 'Invert All Numeration';
            }
            
            if (currentScannedFiles) {
                // Apply global state to all currently scanned folders
                const folderKeys = new Set();
                currentScannedFiles.forEach(f => {
                    let origParent = f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : '';
                    folderKeys.add(origParent);
                });
                folderKeys.forEach(key => {
                    folderInversionStates[key] = allInverted;
                });
                
                // Re-run analysis to update preview UI
                const dropArea = document.getElementById('aem-360-drop-area');
                finalizeAnalysis(currentScannedFolders, currentScannedFiles, dropArea);
            }
        });
    }



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
    div.className = `aem-360-log-item aem-360-log-${type}`;
    
    let icon = 'ℹ';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '✕';
    else if (type === 'warn') icon = '⚠';
    
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'opacity: 0.6; margin-right: 6px; font-weight: bold;';
    iconSpan.textContent = icon;
    
    const msgSpan = document.createElement('span');
    msgSpan.style.cssText = 'flex: 1;';
    msgSpan.textContent = msg;
    
    div.appendChild(iconSpan);
    div.appendChild(msgSpan);
    logsEl.appendChild(div);
    logsEl.scrollTop = logsEl.scrollHeight;
}

async function handleDrop(e) {
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    document.getElementById('aem-360-logs').replaceChildren();
    const dropArea = document.getElementById('aem-360-drop-area');
    const progressEl = document.getElementById('aem-360-progress');
    progressEl.style.display = 'flex';

    const dropWrapper = dropArea.querySelector('.aem-360-drop-wrapper');
    if (dropWrapper) dropWrapper.style.display = 'none';

    const spinnerDiv = document.createElement('div');
    spinnerDiv.id = 'aem-360-scanning-spinner';
    spinnerDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; animation: fadeIn 0.3s;';
    spinnerDiv.appendChild(h('div', { className: 'aem-360-spinner' }));
    spinnerDiv.appendChild(h('p', { style: 'margin-top: 20px; font-weight: 600; color: #38bdf8; font-size: 16px;', textContent: 'Scanning & Analyzing Files...' }));
    spinnerDiv.appendChild(h('p', { id: 'aem-360-scanning-progress-text', style: 'margin-top: 8px; font-size: 13px; color: #94a3b8; font-family: monospace;', textContent: 'Reading file system...' }));
    dropArea.appendChild(spinnerDiv);
    
    const foldersToCreate = new Set();
    const filesToUpload = [];
    let scannedCount = 0;

    async function traverseFileTree(item, path = "") {
        if (item.isFile) {
            return new Promise((resolve) => {
                item.file((file) => {
                    scannedCount++;
                    if (scannedCount % 100 === 0) {
                        const pText = document.getElementById('aem-360-scanning-progress-text');
                        if (pText) pText.textContent = `Found ${scannedCount} files...`;
                    }
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

    const entries = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) entries.push(item);
    }

    for (const entry of entries) {
        await traverseFileTree(entry);
    }

    currentScannedFolders = foldersToCreate;
    currentScannedFiles = filesToUpload;
    logToUI(`Analysis complete: ${foldersToCreate.size} folders, ${filesToUpload.length} files.`, 'success');
    await finalizeAnalysis(foldersToCreate, filesToUpload, dropArea);
}

async function handleBrowse(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    document.getElementById('aem-360-logs').replaceChildren();
    const dropArea = document.getElementById('aem-360-drop-area');
    document.getElementById('aem-360-progress').style.display = 'flex';

    const dropWrapper = dropArea.querySelector('.aem-360-drop-wrapper');
    if (dropWrapper) dropWrapper.style.display = 'none';

    const spinnerDiv = document.createElement('div');
    spinnerDiv.id = 'aem-360-scanning-spinner';
    spinnerDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; animation: fadeIn 0.3s;';
    spinnerDiv.appendChild(h('div', { className: 'aem-360-spinner' }));
    spinnerDiv.appendChild(h('p', { style: 'margin-top: 20px; font-weight: 600; color: #38bdf8; font-size: 16px;', textContent: 'Scanning & Analyzing Files...' }));
    spinnerDiv.appendChild(h('p', { id: 'aem-360-scanning-progress-text', style: 'margin-top: 8px; font-size: 13px; color: #94a3b8; font-family: monospace;', textContent: 'Preparing...' }));
    dropArea.appendChild(spinnerDiv);

    // Force browser to paint the spinner before blocking the UI thread with the synchronous loop
    await new Promise(r => setTimeout(r, 50));

    const foldersToCreate = new Set();
    const filesToUpload = [];
    const totalFiles = files.length;
    let count = 0;

    for (const file of files) {
        count++;
        if (count % 250 === 0) {
            const pText = document.getElementById('aem-360-scanning-progress-text');
            if (pText) pText.textContent = `Reading files... ${count} / ${totalFiles}`;
            await new Promise(r => setTimeout(r, 0));
        }
        
        if (file.name === '.DS_Store' || file.name.toLowerCase() === 'thumbs.db' || file.name.startsWith('._')) continue;
        const path = file.webkitRelativePath || file.name;
        filesToUpload.push({ file, path });
        const parts = path.split('/');
        let currentPath = '';
        for (let j = 0; j < parts.length - 1; j++) {
            currentPath += parts[j];
            foldersToCreate.add(currentPath);
            currentPath += '/';
        }
    }

    currentScannedFolders = foldersToCreate;
    currentScannedFiles = filesToUpload;
    logToUI(`Analysis complete: ${foldersToCreate.size} folders, ${filesToUpload.length} files.`, 'success');
    await finalizeAnalysis(foldersToCreate, filesToUpload, dropArea);
}

async function finalizeAnalysis(foldersToCreate, filesToUpload, dropArea) {
    const localeInput = dropzoneContainer ? dropzoneContainer.querySelector('input[name="aem-locale"]:checked') : null;
    const locale = localeInput ? localeInput.value : 'us';
    const extInput = dropzoneContainer ? dropzoneContainer.querySelector('input[name="aem-ext"]:checked') : null;
    const extOption = extInput ? extInput.value : 'jpeg';
    
    const pText = document.getElementById('aem-360-scanning-progress-text');
    if (pText) pText.textContent = `Applying renaming rules...`;
    await new Promise(r => setTimeout(r, 50));
    
    // Ensure all folders have an inversion state, defaulting to the global allInverted state if not set
    filesToUpload.forEach(f => {
        let origParent = f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : '';
        if (folderInversionStates[origParent] === undefined) {
            folderInversionStates[origParent] = allInverted;
        }
    });

    const directUploadCheckbox = document.getElementById('aem-360-direct-upload');
    const bypassRename = directUploadCheckbox ? directUploadCheckbox.checked : false;

    let renameResults = { cleanedFolders: [], cleanedFiles: [], renameCount: 0 };
    if (bypassRename) {
        logToUI('Info: Skipping renamer. Using original names (auto-detecting missing folders).', 'info');
        const cleanedFoldersSet = new Set();
        renameResults.cleanedFiles = filesToUpload.map(f => {
            let pathParts = f.path.split('/');
            let fileName = pathParts.pop();
            
            let extIdx = fileName.lastIndexOf('.');
            if (extIdx > -1) {
                let currentExt = fileName.substring(extIdx + 1).toLowerCase();
                if (currentExt === 'jpg' || currentExt === 'jpeg') {
                    fileName = fileName.substring(0, extIdx) + '.' + extOption;
                    extIdx = fileName.lastIndexOf('.'); // Update index after change
                }
            }
            
            let baseName = extIdx > -1 ? fileName.substring(0, extIdx) : fileName;
            let match = baseName.match(/^0*\d+-(.+)$/);
            
            if (match) {
                let originalSuffix = match[1];
                let devIdx = pathParts.findIndex(p => ['desktop', 'mobile', 'tablet'].includes(p.toLowerCase()));
                if (devIdx !== -1) {
                    let existingSuffixParts = pathParts.slice(devIdx + 1).filter(p => p.toLowerCase() !== 'exterior' && p.toLowerCase() !== 'interior');
                    
                    let cleanedExistingSuffix = existingSuffixParts.map(p => {
                        return window.AEM360Renamer ? window.AEM360Renamer.cleanFordName(p, locale, true) : p.toLowerCase().replace(/[_ ]/g, '-').replace(/[^a-z0-9\-]/g, '');
                    }).join('-');
                    
                    let compareSuffix = window.AEM360Renamer ? window.AEM360Renamer.cleanFordName(originalSuffix, locale, true) : originalSuffix.toLowerCase().replace(/[_ ]/g, '-').replace(/[^a-z0-9\-]/g, '');
                    
                    if (cleanedExistingSuffix && compareSuffix.startsWith(cleanedExistingSuffix + '-')) {
                        let numExistingHyphens = cleanedExistingSuffix.split('-').length;
                        let originalSuffixParts = originalSuffix.split('-');
                        let missingPartsArray = originalSuffixParts.slice(numExistingHyphens);
                        
                        if (missingPartsArray.length > 0) {
                            console.warn(`[Direct Upload] Carpeta(s) intermedia faltante detectada: '${missingPartsArray.join('/')}' para '${fileName}'`);
                            pathParts.push(...missingPartsArray);
                        }
                    }
                }
            }
            
            if (window.AEM360Renamer) {
                pathParts = pathParts.map(p => window.AEM360Renamer.cleanFordName(p, locale, true));
                
                let fileExtIdx = fileName.lastIndexOf('.');
                if (fileExtIdx > -1) {
                    let base = fileName.substring(0, fileExtIdx);
                    let ext = fileName.substring(fileExtIdx);
                    fileName = window.AEM360Renamer.cleanFordName(base, locale, true) + ext;
                } else {
                    fileName = window.AEM360Renamer.cleanFordName(fileName, locale, true);
                }
            }

            let newPath = pathParts.length > 0 ? `${pathParts.join('/')}/${fileName}` : fileName;
            
            let currentPath = '';
            for (let part of pathParts) {
                currentPath = currentPath ? currentPath + '/' + part : part;
                cleanedFoldersSet.add(currentPath);
            }
            
            return { file: f.file, path: newPath, originalPath: f.path };
        });
        
        foldersToCreate.forEach(folder => {
            if (window.AEM360Renamer) {
                folder = folder.split('/').map(p => window.AEM360Renamer.cleanFordName(p, locale, true)).join('/');
            }
            cleanedFoldersSet.add(folder);
        });
        renameResults.cleanedFolders = Array.from(cleanedFoldersSet);
        renameResults.renameCount = renameResults.cleanedFiles.filter(f => f.path !== f.originalPath).length;
    } else if (window.AEM360Renamer) {
        renameResults = window.AEM360Renamer.processDroppedFiles(foldersToCreate, filesToUpload, locale, '', extOption, folderInversionStates);
    } else {
        logToUI('Warning: Renamer module not found. Proceeding with original names.', 'warn');
        renameResults.cleanedFolders = Array.from(foldersToCreate);
        renameResults.cleanedFiles = filesToUpload.map(f => ({ file: f.file, path: f.path, originalPath: f.path }));
    }

    const { cleanedFolders, cleanedFiles, renameCount } = renameResults;

    if (pText) pText.textContent = `Building preview tree...`;
    await new Promise(r => setTimeout(r, 50));

    // Populate Review UI
    const reviewList = document.getElementById('aem-360-review-list');
    reviewList.replaceChildren();
    
    // Group ALL files so we can display the complete tree
    const folderGroups = {};
    cleanedFiles.forEach(cf => {
        let origParent = cf.originalPath.includes('/') ? cf.originalPath.substring(0, cf.originalPath.lastIndexOf('/')) : '';
        let origFile = cf.originalPath.includes('/') ? cf.originalPath.substring(cf.originalPath.lastIndexOf('/') + 1) : cf.originalPath;
        let newParent = cf.path.includes('/') ? cf.path.substring(0, cf.path.lastIndexOf('/')) : '';
        let newFile = cf.path.includes('/') ? cf.path.substring(cf.path.lastIndexOf('/') + 1) : cf.path;

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
            new: newFile,
            fileObj: cf.file,
            originalPath: cf.originalPath
        });
    });

    const groupKeys = Object.keys(folderGroups);
    
    // Build Tree Structure with Editable Nodes
    const tree = { _children: {}, _name: 'root' };
    groupKeys.forEach(origParent => {
        const group = folderGroups[origParent];
        const parts = group.newParent.split('/').filter(p => p);
        
        let currentLevel = tree;
        if (parts.length === 0) {
            tree._info = group;
        } else {
            parts.forEach((part, index) => {
                if (!currentLevel._children[part]) {
                    currentLevel._children[part] = { _children: {}, _name: part, _info: null };
                }
                if (index === parts.length - 1) {
                    currentLevel._children[part]._info = group;
                }
                currentLevel = currentLevel._children[part];
            });
        }
    });

    function updatePreviews() {
        function simulateTraverse(n, pathKeys = []) {
            let currentPathKeys = [...pathKeys];
            if (n._id) {
                const inputEl = document.getElementById(n._id);
                let newName = inputEl ? inputEl.value.trim() : n._name;
                const activeLocale = (dropzoneContainer && dropzoneContainer.querySelector('input[name="aem-locale"]:checked')?.value) || 'us';
                let oldClean = window.AEM360Renamer.cleanFordName(n._name, activeLocale, true);
                newName = window.AEM360Renamer.cleanFordName(newName, activeLocale, true);
                currentPathKeys.push({ old: n._name, new: newName, oldClean: oldClean });
            }
            if (n._info) {
                n._info.allFiles.forEach(f => {
                    let finalFileName = f.new;
                    let sortedKeys = [...currentPathKeys].sort((a, b) => b.old.length - a.old.length);
                    sortedKeys.forEach(k => {
                        if (k.old && k.old !== k.new) {
                            let regex = new RegExp(`(?<=^|-)${k.old}(?=-|\\.|$)`, 'g');
                            if (regex.test(finalFileName)) {
                                finalFileName = finalFileName.replace(regex, k.new);
                            } else if (k.oldClean && k.oldClean !== k.new) {
                                let cleanRegex = new RegExp(`(?<=^|-)${k.oldClean}(?=-|\\.|$)`, 'gi');
                                finalFileName = finalFileName.replace(cleanRegex, k.new);
                            }
                        }
                    });
                    if (f._uiNewSpan) {
                        f._uiNewSpan.textContent = finalFileName;
                        if (f._uiUpdateVisibility) f._uiUpdateVisibility();
                    }
                });
            }
            Object.values(n._children).forEach(child => {
                simulateTraverse(child, currentPathKeys);
            });
        }
        simulateTraverse(tree, []);
    }

    // Render Tree Recursively using Interactive <details> tags and inputs
    let nodeIdCounter = 0;
    function renderTree(node, depth = 0) {
        const frag = document.createDocumentFragment();
        if (depth === 0) {
            const style = document.createElement('style');
            style.textContent = `
                details > summary { 
                    list-style: none; 
                    padding: 4px 6px;
                    border-radius: 4px;
                    margin-bottom: 2px;
                    transition: background 0.1s;
                    display: flex;
                    align-items: center;
                }
                details > summary::-webkit-details-marker { display: none; }
                details > summary:hover {
                    background: rgba(255, 255, 255, 0.06);
                }
                .tree-input {
                    background: transparent;
                    border: 1px dashed transparent;
                    color: #e2e8f0;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 13px;
                    font-family: 'Segoe UI', system-ui, sans-serif;
                    outline: none;
                    margin-left: 4px;
                    width: 220px;
                    cursor: text;
                }
                .tree-input:hover, .tree-input:focus {
                    background: rgba(0,0,0,0.3);
                    border: 1px dashed rgba(56, 189, 248, 0.4);
                    color: #38bdf8;
                }
                .tree-child-container {
                    border-left: 1px solid rgba(255, 255, 255, 0.1);
                    margin-left: 11px;
                    padding-left: 10px;
                }
                .aem-360-custom-scroll::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .aem-360-custom-scroll::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.4);
                    border-radius: 4px;
                }
                .aem-360-custom-scroll::-webkit-scrollbar-thumb {
                    background: rgba(56, 189, 248, 0.3);
                    border-radius: 4px;
                }
                .aem-360-custom-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(56, 189, 248, 0.6);
                }
            `;
            frag.appendChild(style);

            if (node._info) {
                const fileContainer = document.createElement('div');
                fileContainer.style.cssText = 'margin-bottom: 12px; padding: 6px 12px; background: rgba(0,0,0,0.25); border-radius: 6px; border-left: 2px solid #10b981; overflow-x: auto;';
                
                const fileDetails = document.createElement('details');
                const fileSummary = document.createElement('summary');
                fileSummary.style.cssText = 'cursor: pointer; outline: none; user-select: none;';
                
                const fileSummarySpan = document.createElement('span');
                fileSummarySpan.style.cssText = 'font-size: 10px; color: #10b981; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 2px 6px; border-radius: 4px; font-weight: bold;';
                fileSummarySpan.textContent = `View ${node._info.filesCount} files ▼`;
                fileSummary.appendChild(fileSummarySpan);
                fileDetails.appendChild(fileSummary);

                const fileListContainer = document.createElement('div');
                fileListContainer.className = 'aem-360-custom-scroll';
                fileListContainer.style.cssText = 'font-family: monospace; font-size: 11px; display: flex; flex-direction: column; margin-top: 8px; padding-left: 4px; max-height: 150px; overflow-y: auto; overflow-x: auto; white-space: nowrap;';

                node._info.allFiles.forEach(f => {
                    const fDiv = document.createElement('div');
                    fDiv.style.cssText = 'display: flex; gap: 6px; align-items: center; margin-bottom: 3px; white-space: nowrap;';
                    
                    const dot = document.createElement('span');
                    dot.style.color = '#475569';
                    dot.textContent = '•';
                    fDiv.appendChild(dot);
                    
                    const origSpan = document.createElement('span');
                    origSpan.textContent = f.orig;
                    
                    const arrowSpan = document.createElement('span');
                    arrowSpan.textContent = '➔';
                    
                    const newSpan = document.createElement('span');
                    newSpan.textContent = f.new;
                    
                    f._uiOrigSpan = origSpan;
                    f._uiArrowSpan = arrowSpan;
                    f._uiNewSpan = newSpan;
                    
                    function updateVisibility() {
                        if (origSpan.textContent !== newSpan.textContent) {
                            origSpan.style.cssText = 'text-decoration: line-through; color: #f87171; opacity: 0.8;';
                            arrowSpan.style.cssText = 'color: #10b981; font-weight: bold; margin: 0 4px; display: inline;';
                            newSpan.style.cssText = 'color: #34d399; font-weight: bold; display: inline;';
                        } else {
                            origSpan.style.cssText = 'color: #cbd5e1; text-decoration: none; opacity: 1;';
                            arrowSpan.style.cssText = 'display: none;';
                            newSpan.style.cssText = 'display: none;';
                        }
                    }
                    updateVisibility();
                    f._uiUpdateVisibility = updateVisibility;
                    
                    fDiv.appendChild(origSpan);
                    fDiv.appendChild(arrowSpan);
                    fDiv.appendChild(newSpan);
                    fileListContainer.appendChild(fDiv);
                });

                fileDetails.appendChild(fileListContainer);
                fileContainer.appendChild(fileDetails);
                frag.appendChild(fileContainer);
            }
        }
        
        const keys = Object.keys(node._children).sort();
        
        keys.forEach((key) => {
            const childNode = node._children[key];
            childNode._id = 'aem_tree_node_' + (++nodeIdCounter);
            const hasChildren = Object.keys(childNode._children).length > 0;
            
            const details = document.createElement('details');
            if (depth !== 0) details.style.marginTop = '4px';
            
            const summary = document.createElement('summary');
            summary.style.cssText = 'cursor: pointer; font-family: system-ui, -apple-system, sans-serif; color: #f8fafc; padding: 2px 0; font-size: 13px; font-weight: 500; user-select: none; transition: color 0.2s; display: flex; align-items: center;';
            
            const folderIconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            folderIconSvg.setAttribute("width", "14"); folderIconSvg.setAttribute("height", "14"); folderIconSvg.setAttribute("viewBox", "0 0 24 24"); folderIconSvg.setAttribute("fill", "#0ea5e9"); folderIconSvg.setAttribute("stroke", "#38bdf8"); folderIconSvg.setAttribute("stroke-width", "1.5"); folderIconSvg.setAttribute("stroke-linecap", "round"); folderIconSvg.setAttribute("stroke-linejoin", "round"); folderIconSvg.style.cssText = 'margin-right: 6px; flex-shrink: 0;';
            const folderIconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            folderIconPath.setAttribute("d", "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z");
            folderIconSvg.appendChild(folderIconPath);
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'tree-input';
            input.id = childNode._id;
            input.value = childNode._name;
            input.addEventListener('click', e => e.stopPropagation());
            input.addEventListener('keydown', e => e.stopPropagation());
            input.addEventListener('keyup', e => e.stopPropagation());
            input.addEventListener('input', e => {
                e.stopPropagation();
                updatePreviews();
            });
            
            summary.appendChild(folderIconSvg);
            summary.appendChild(input);
            details.appendChild(summary);
            
            const childContainer = document.createElement('div');
            childContainer.className = 'tree-child-container';
            
            if (childNode._info) {
                const info = childNode._info;
                let sortedFiles = [...info.allFiles].sort((a, b) => {
                    let numA = parseInt((a.orig.match(/^0*(\d+)/) || [0, 0])[1], 10);
                    let numB = parseInt((b.orig.match(/^0*(\d+)/) || [0, 0])[1], 10);
                    return numA - numB;
                });
                
                const fileContainer = document.createElement('div');
                fileContainer.style.cssText = 'margin-left: 24px; margin-top: 4px; margin-bottom: 8px; padding: 6px 12px; background: rgba(0,0,0,0.25); border-radius: 6px; border-left: 2px solid #10b981; overflow-x: auto;';
                
                const fileDetails = document.createElement('details');
                const fileSummary = document.createElement('summary');
                fileSummary.style.cssText = 'cursor: pointer; outline: none; user-select: none;';
                
                const fileSummarySpan = document.createElement('span');
                fileSummarySpan.style.cssText = 'font-size: 10px; color: #10b981; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 2px 6px; border-radius: 4px; font-weight: bold;';
                fileSummarySpan.textContent = `View ${info.filesCount} files ▼`;
                fileSummary.appendChild(fileSummarySpan);

                const hasSequence = info.allFiles.some(f => f.orig.match(/^0*\d+/));
                if (hasSequence) {
                    const origParentFolder = info.allFiles[0].originalPath.includes('/') ? info.allFiles[0].originalPath.substring(0, info.allFiles[0].originalPath.lastIndexOf('/')) : '';
                    const isFolderInverted = !!folderInversionStates[origParentFolder];
                    
                    const invertFolderBtn = document.createElement('button');
                    invertFolderBtn.type = 'button';
                    invertFolderBtn.style.cssText = 'font-size: 10px; color: #38bdf8; background: transparent; border: 1px solid #38bdf8; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 8px; cursor: pointer; transition: all 0.2s; outline: none;';
                    
                    if (isFolderInverted) {
                        invertFolderBtn.textContent = 'Numeration Inverted ✓';
                        invertFolderBtn.style.background = '#38bdf8';
                        invertFolderBtn.style.color = '#0f172a';
                    } else {
                        invertFolderBtn.textContent = 'Invert Numeration ⇄';
                    }
                    
                    invertFolderBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        folderInversionStates[origParentFolder] = !isFolderInverted;
                        
                        // Re-run analysis
                        const dropArea = document.getElementById('aem-360-drop-area');
                        finalizeAnalysis(currentScannedFolders, currentScannedFiles, dropArea);
                    });
                    
                    fileSummary.appendChild(invertFolderBtn);
                }
                fileDetails.appendChild(fileSummary);
                
                const fileListContainer = document.createElement('div');
                fileListContainer.className = 'aem-360-custom-scroll';
                fileListContainer.style.cssText = 'font-family: monospace; font-size: 11px; display: flex; flex-direction: column; margin-top: 8px; padding-left: 4px; max-height: 150px; overflow-y: auto; overflow-x: auto; white-space: nowrap;';
                
                sortedFiles.forEach(f => {
                    const fDiv = document.createElement('div');
                    fDiv.style.cssText = 'display: flex; gap: 6px; align-items: center; margin-bottom: 3px; white-space: nowrap;';
                    
                    const dot = document.createElement('span');
                    dot.style.color = '#475569';
                    dot.textContent = '•';
                    fDiv.appendChild(dot);
                    
                    if (true) {
                        const origSpan = document.createElement('span');
                        origSpan.textContent = f.orig;
                        
                        const arrowSpan = document.createElement('span');
                        arrowSpan.textContent = '➔';
                        
                        const newSpan = document.createElement('span');
                        newSpan.textContent = f.new;
                        
                        f._uiOrigSpan = origSpan;
                        f._uiArrowSpan = arrowSpan;
                        f._uiNewSpan = newSpan;
                        
                        function updateVisibility() {
                            if (origSpan.textContent !== newSpan.textContent) {
                                origSpan.style.cssText = 'text-decoration: line-through; color: #f87171; opacity: 0.8;';
                                arrowSpan.style.cssText = 'color: #10b981; font-weight: bold; margin: 0 4px; display: inline;';
                                newSpan.style.cssText = 'color: #34d399; font-weight: bold; display: inline;';
                            } else {
                                origSpan.style.cssText = 'color: #cbd5e1; text-decoration: none; opacity: 1;';
                                arrowSpan.style.cssText = 'display: none;';
                                newSpan.style.cssText = 'display: none;';
                            }
                        }
                        updateVisibility();
                        f._uiUpdateVisibility = updateVisibility;
                        
                        fDiv.appendChild(origSpan);
                        fDiv.appendChild(arrowSpan);
                        fDiv.appendChild(newSpan);
                    }
                    fileListContainer.appendChild(fDiv);
                });
                
                fileDetails.appendChild(fileListContainer);
                fileContainer.appendChild(fileDetails);
                childContainer.appendChild(fileContainer);
            }
            
            if (hasChildren) {
                childContainer.appendChild(renderTree(childNode, depth + 1));
            }
            
            details.appendChild(childContainer);
            frag.appendChild(details);
        });
        return frag;
    }

    if (groupKeys.length === 0) {
        const div = document.createElement('div');
        div.style.cssText = 'color: #cbd5e1; text-align: center; margin-top: 20px; font-size: 13px;';
        div.textContent = 'No files found.';
        reviewList.appendChild(div);
    } else {
        const treeContainer = document.createElement('div');
        treeContainer.style.background = 'rgba(15, 23, 42, 0.6)';
        treeContainer.style.border = '1px solid #334155';
        treeContainer.style.borderRadius = '6px';
        treeContainer.style.padding = '12px';
        treeContainer.appendChild(renderTree(tree));
        
        reviewList.appendChild(treeContainer);
    }
    
    document.getElementById('aem-360-review-count').textContent = `${cleanedFolders.length} folders, ${cleanedFiles.length} files (Edit folder names if needed)`;
    
    // Swap UI
    document.getElementById('aem-360-drop-area').style.display = 'none';
    document.getElementById('aem-360-review-container').style.display = 'flex';
    document.getElementById('aem-360-top-destination').style.display = 'block';

    // Button Handlers
    const btnCancel = document.getElementById('aem-360-cancel-review-btn');
    const btnApprove = document.getElementById('aem-360-approve-btn');
    const btnExport = document.getElementById('aem-360-export-colorizer-btn');

    if (btnExport) {
        btnExport.onclick = () => {
            const finalFiles = [];
            
            function traverseAndBuild(node, currentPath, pathKeys = []) {
                let myPath = currentPath;
                let currentPathKeys = [...pathKeys];
                
                if (node._id) {
                    const inputEl = document.getElementById(node._id);
                    let newName = inputEl ? inputEl.value.trim() : node._name;
                    
                    let oldClean = node._name;
                    if (window.AEM360Renamer) {
                        const activeLocale = (dropzoneContainer && dropzoneContainer.querySelector('input[name="aem-locale"]:checked')?.value) || 'us';
                        oldClean = window.AEM360Renamer.cleanFordName(node._name, activeLocale, true);
                        newName = window.AEM360Renamer.cleanFordName(newName, activeLocale, true);
                    }
                    
                    currentPathKeys.push({ old: node._name, new: newName, oldClean: oldClean });
                    myPath = currentPath ? `${currentPath}/${newName}` : newName;
                }
                
                if (node._info) {
                    node._info.allFiles.forEach(f => {
                        let finalFileName = f.new;
                        let sortedKeys = [...currentPathKeys].sort((a, b) => b.old.length - a.old.length);
                        sortedKeys.forEach(k => {
                            if (k.old && k.old !== k.new) {
                                let regex = new RegExp(`(?<=^|-)${k.old}(?=-|\\.|$)`, 'g');
                                if (regex.test(finalFileName)) {
                                    finalFileName = finalFileName.replace(regex, k.new);
                                } else if (k.oldClean && k.oldClean !== k.new) {
                                    let cleanRegex = new RegExp(`(?<=^|-)${k.oldClean}(?=-|\\.|$)`, 'gi');
                                    finalFileName = finalFileName.replace(cleanRegex, k.new);
                                }
                            }
                        });
                        
                        let newFilePath = myPath ? `${myPath}/${finalFileName}` : finalFileName;
                        finalFiles.push({
                            path: newFilePath
                        });
                    });
                }
                
                Object.values(node._children).forEach(child => {
                    traverseAndBuild(child, myPath, currentPathKeys);
                });
            }
            
            traverseAndBuild(tree, '', []);
            exportColorizerBaseJSON(finalFiles);
        };
    }

    btnCancel.onclick = () => {
        document.getElementById('aem-360-review-container').style.display = 'none';
        document.getElementById('aem-360-top-destination').style.display = 'none';
        
        const spinner = document.getElementById('aem-360-scanning-spinner');
        if (spinner) spinner.remove();
        
        const dropWrapper = document.getElementById('aem-360-drop-area').querySelector('.aem-360-drop-wrapper');
        if (dropWrapper) dropWrapper.style.display = 'flex';
        
        document.getElementById('aem-360-drop-area').style.display = 'flex';
        
        const logsEl = document.getElementById('aem-360-logs');
        logsEl.replaceChildren();
        logsEl.appendChild(document.createTextNode('Upload cancelled.'));
        
        currentScannedFolders = null;
        currentScannedFiles = null;
        
        allInverted = false;
        folderInversionStates = {};
        const invertAllBtn = document.getElementById('aem-360-invert-all-btn');
        if (invertAllBtn) {
            invertAllBtn.style.background = 'transparent';
            invertAllBtn.style.color = '#38bdf8';
            invertAllBtn.textContent = 'Invert All Numeration';
        }
    };

    btnApprove.onclick = async () => {
        btnApprove.textContent = 'Checking existing files...';
        btnApprove.disabled = true;

        // Traverse tree to reconstruct final paths from user inputs
        const finalFolders = new Set();
        const finalFiles = [];
        
        function traverseAndBuild(node, currentPath, pathKeys = []) {
            let myPath = currentPath;
            let currentPathKeys = [...pathKeys];
            
            if (node._id) {
                const inputEl = document.getElementById(node._id);
                let newName = inputEl ? inputEl.value.trim() : node._name;
                
                // Sanitize user input before applying
                let oldClean = node._name;
                if (window.AEM360Renamer) {
                    const activeLocale = (dropzoneContainer && dropzoneContainer.querySelector('input[name="aem-locale"]:checked')?.value) || 'us';
                    oldClean = window.AEM360Renamer.cleanFordName(node._name, activeLocale, true);
                    newName = window.AEM360Renamer.cleanFordName(newName, activeLocale, true);
                }
                
                currentPathKeys.push({ old: node._name, new: newName, oldClean: oldClean });
                
                myPath = currentPath ? `${currentPath}/${newName}` : newName;
                finalFolders.add(myPath);
            }
            
            if (node._info) {
                node._info.allFiles.forEach(f => {
                    let finalFileName = f.new;
                    
                    // Apply renames to file name suffix
                    let sortedKeys = [...currentPathKeys].sort((a, b) => b.old.length - a.old.length);
                    sortedKeys.forEach(k => {
                        if (k.old && k.old !== k.new) {
                            let regex = new RegExp(`(?<=^|-)${k.old}(?=-|\\.|$)`, 'g');
                            if (regex.test(finalFileName)) {
                                finalFileName = finalFileName.replace(regex, k.new);
                            } else if (k.oldClean && k.oldClean !== k.new) {
                                let cleanRegex = new RegExp(`(?<=^|-)${k.oldClean}(?=-|\\.|$)`, 'gi');
                                finalFileName = finalFileName.replace(cleanRegex, k.new);
                            }
                        }
                    });
                    
                    let newFilePath = myPath ? `${myPath}/${finalFileName}` : finalFileName;
                    finalFiles.push({
                        file: f.fileObj,
                        path: newFilePath,
                        originalPath: f.originalPath
                    });
                });
            }
            
            Object.values(node._children).forEach(child => {
                traverseAndBuild(child, myPath, currentPathKeys);
            });
        }
        
        traverseAndBuild(tree, '', []);
        
        const sortedFolders = Array.from(finalFolders).sort((a, b) => a.split('/').length - b.split('/').length);
        
        const progressTextFolders = document.getElementById('aem-360-progress-text-folders');
        const progressTextFiles = document.getElementById('aem-360-progress-text-files');
        const progressFill = document.getElementById('aem-360-progress-fill-main');

        // Check for existing files in AEM by fetching folder JSON (massively faster than checking individual files)
        const collisions = [];
        try {
            const filesByFolder = {};
            finalFiles.forEach(f => {
                let parts = f.path.split('/');
                let fileName = parts.pop();
                let folderPath = parts.join('/');
                if (!filesByFolder[folderPath]) filesByFolder[folderPath] = [];
                filesByFolder[folderPath].push({ fileObj: f, fileName: fileName });
            });

            const uniqueFolders = Object.keys(filesByFolder);
            let checkedCount = 0;
            
            await promisePool(uniqueFolders, 10, async (folderPath) => {
                const folderUrl = `${currentBasePath}/${folderPath}`.replace(/\/\//g, '/');
                try {
                    const res = await fetch(folderUrl + '.1.json');
                    if (res.status === 200) {
                        const data = await res.json();
                        filesByFolder[folderPath].forEach(item => {
                            if (data[item.fileName] !== undefined) {
                                collisions.push(item.fileObj);
                            }
                        });
                    }
                } catch (e) {
                    // Ignore network errors or JSON parse errors (folder might not exist)
                }
                checkedCount++;
                if (checkedCount % 3 === 0 || checkedCount === uniqueFolders.length) {
                    btnApprove.textContent = `Checking folders (${checkedCount}/${uniqueFolders.length})...`;
                }
            });
        } catch (e) {
            console.error('Error checking collisions:', e);
        }

        const startUpload = () => {
            document.getElementById('aem-360-review-container').style.display = 'none';
            
            const abortContainer = document.getElementById('aem-360-abort-container');
            if (abortContainer) abortContainer.style.display = 'block';
            
            const logsEl = document.getElementById('aem-360-logs');
            if (logsEl) {
                logsEl.style.display = 'block';
                logsEl.style.height = 'auto';
                logsEl.style.flex = '1';
            }

            logToUI('Starting upload of assets...', 'success');
            processUploads(sortedFolders, finalFiles, progressTextFolders, progressTextFiles, progressFill);
        };

        if (collisions.length > 0) {
            btnApprove.textContent = ' Approve & Upload';
            btnApprove.disabled = false;
            
            showConflictModal(collisions, () => {
                // Option: Replace All
                startUpload();
            }, () => {
                // Option: Cancelled
            });
        } else {
            btnApprove.textContent = ' Approve & Upload';
            btnApprove.disabled = false;
            startUpload();
        }
    };
}

async function uploadSingleFile(fileObj, tokenRef, retries = 5) {
    let targetFolder = `${currentBasePath}/${fileObj.path.substring(0, fileObj.path.lastIndexOf('/'))}`.replace(/\/\//g, '/');
    if (targetFolder.endsWith('/')) targetFolder = targetFolder.slice(0, -1);
    
    const folderUrl = targetFolder;
    const pathParts = fileObj.path.split('/');
    const fileName = pathParts[pathParts.length - 1];
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
                    await getValidToken(tokenRef, fileName);
                }
                const errText = await initResponse.text().catch(() => '');
                console.error(`[AEM 360 Tool] initiateUpload failed for "${fileName}" at URL: ${initiateUrl}. Status: ${initResponse.status}. Response:`, errText);
                throw new Error(`InitiateUpload failed: ${initResponse.status} (URL: ${initiateUrl})`);
            }

            const initData = await initResponse.json();
            if (!initData.files || initData.files.length === 0) {
                throw new Error('AEM returned no upload URIs');
            }

            const fileData = initData.files[0];
            const uploadURIs = fileData.uploadURIs;
            const completeUri = initData.completeURI;
            const uploadToken = fileData.uploadToken;

            const partPromises = [];
            // AEM dictates the chunk size. Fallback to 10MB if not provided.
            const chunkSize = fileData.minPartSize || (10 * 1024 * 1024);
            let offset = 0;

            for (let i = 0; i < uploadURIs.length && offset < fileSize; i++) {
                const chunk = fileObj.file.slice(offset, offset + chunkSize);
                offset += chunkSize;

                const putPromise = fetch(uploadURIs[i], {
                    method: 'PUT',
                    body: chunk
                }).then(res => {
                    if (!res.ok) throw new Error(`Part ${i + 1} upload failed: ${res.status}`);
                });
                partPromises.push(putPromise);
            }

            // Wait for all parts to finish uploading
            await Promise.all(partPromises);

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
                    await getValidToken(tokenRef, fileName + ' (complete)');
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
                    await getValidToken(tokenRef, fileName + ' (approve)');
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
    let timerInterval = null;
    let startTime = Date.now();
    const timeEl = document.getElementById('aem-360-progress-time');

    if (timeEl) {
        timerInterval = setInterval(() => {
            const diff = Math.floor((Date.now() - startTime) / 1000);
            const m = Math.floor(diff / 60).toString().padStart(2, '0');
            const s = (diff % 60).toString().padStart(2, '0');
            timeEl.textContent = `${m}:${s}`;
        }, 1000);
    }

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

        logToUI('Starting folder creation...', 'info');
        let foldersDone = 0;
        let foldersFailed = 0;
        const failedFoldersSet = new Set();
        textFolders.textContent = `Folders: 0 / ${folders.length}`;
        
        await promisePool(folders, 1, async (folder) => {
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
                        const errText = await res.text().catch(() => '');
                        console.warn(`[AEM 360 Tool] Folder creation returned 409 Conflict for "${folder}" at URL: ${targetPath}. Response:`, errText);
                        logToUI(`Folder already existed: ${folder}`, 'info');
                        success = true;
                        break;
                    } else if (res.ok || res.status === 200 || res.status === 201) {
                        success = true;
                        break;
                    } else if (res.status === 403) {
                        logToUI(`Token expired (403) while creating folder ${folder}. Auto-refreshing...`, 'warn');
                        await getValidToken(tokenRef, folder + ' (folder)');
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

        logToUI('Starting file upload (Concurrency: 10)...', 'info');
        
        // Sort files by directory first, then numerically by filename to upload sequentially per folder
        files.sort((a, b) => {
            let aDir = a.path.substring(0, a.path.lastIndexOf('/'));
            let bDir = b.path.substring(0, b.path.lastIndexOf('/'));
            if (aDir !== bDir) return aDir.localeCompare(bDir);

            let aName = a.path.split('/').pop();
            let bName = b.path.split('/').pop();
            let numA = parseInt((aName.match(/^0*(\d+)/) || [0, 0])[1], 10);
            let numB = parseInt((bName.match(/^0*(\d+)/) || [0, 0])[1], 10);
            if (numA > 0 && numB > 0 && numA !== numB) return numA - numB;
            return aName.localeCompare(bName);
        });

        let filesDone = 0;
        let filesFailed = 0;
        let filesSkipped = 0;
        textFiles.textContent = `Files: 0 / ${files.length}`;
        
        await promisePool(files, 10, async (fileObj) => {
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
                
                const uploadedFileName = fileObj.path.split('/').pop();
                if (attemptNum > 1) {
                    logToUI(`OK (after ${attemptNum} attempts): ${uploadedFileName}`, 'success');
                } else {
                    logToUI(`OK: ${uploadedFileName}`, 'success');
                }
            } catch (e) {
                const failedFileName = fileObj.path.split('/').pop();
                logToUI(`Error uploading ${failedFileName}: ${e.message}`, 'error');
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

    } catch (err) {
        logToUI(`CRITICAL ERROR: ${err.message}`, 'error');
        console.error('Upload Error:', err);
    } finally {
        if (timerInterval) clearInterval(timerInterval);
        
        // Release wake lock
        if (wakeLock !== null) {
            await wakeLock.release();
            wakeLock = null;
            logToUI('Keep-Alive mode deactivated.', 'info');
        }
    }
}

async function promisePool(items, limit, fn) {
    let i = 0;
    const workers = new Array(limit).fill(Promise.resolve()).map(async () => {
        while (i < items.length) {
            const item = items[i++];
            try {
                const delayMs = Math.floor(Math.random() * 31) + 20; // Jitter 20-50ms
                await new Promise(res => setTimeout(res, delayMs));
                await fn(item);
            } catch (e) {
                console.error('PromisePool item failed:', e);
            }
        }
    });
    await Promise.all(workers);
}

function showConflictModal(collisions, onReplace, onCancel) {
    const modalId = 'aem-360-conflict-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.2s ease-out;';

    const modal = document.createElement('div');
    modal.style.cssText = 'width: 360px; max-width: 90%; background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); display: flex; flex-direction: column; overflow: hidden; padding: 20px; animation: scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);';

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 12px;';
    
    const warningIcon = document.createElement('span');
    warningIcon.style.cssText = 'font-size: 20px; display: flex; align-items: center; justify-content: center; color: #f59e0b;';
    warningIcon.textContent = '⚠️';
    
    const title = document.createElement('h3');
    title.style.cssText = 'margin: 0; font-size: 15px; font-weight: 700; color: #f8fafc; font-family: sans-serif;';
    title.textContent = 'Conflict Detected';
    
    header.appendChild(warningIcon);
    header.appendChild(title);
    modal.appendChild(header);

    const desc = document.createElement('p');
    desc.style.cssText = 'margin: 0 0 14px 0; font-size: 12px; line-height: 1.5; color: #94a3b8; font-family: sans-serif;';
    desc.textContent = `There are ${collisions.length} files that already exist in the target folder in AEM. How would you like to proceed?`;
    modal.appendChild(desc);

    const filesContainer = document.createElement('div');
    filesContainer.className = 'aem-360-custom-scroll';
    filesContainer.style.cssText = 'max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; font-family: monospace; font-size: 11px; color: #e2e8f0; display: flex; flex-direction: column; gap: 6px;';
    
    collisions.forEach(c => {
        const item = document.createElement('div');
        item.style.cssText = 'word-break: break-all; opacity: 0.85;';
        const fname = c.path.split('/').pop();
        item.textContent = `• ${fname}`;
        filesContainer.appendChild(item);
    });
    modal.appendChild(filesContainer);

    const footer = document.createElement('div');
    footer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; width: 100%;';

    const btnReplace = document.createElement('button');
    btnReplace.type = 'button';
    btnReplace.style.cssText = 'width: 100%; background: #ef4444; border: none; color: #f8fafc; border-radius: 6px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; outline: none; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.2); text-align: center;';
    btnReplace.textContent = 'Replace All';
    btnReplace.onclick = () => {
        overlay.remove();
        onReplace();
    };
    btnReplace.onmouseenter = () => { btnReplace.style.background = '#dc2626'; };
    btnReplace.onmouseleave = () => { btnReplace.style.background = '#ef4444'; };

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.style.cssText = 'width: 100%; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #f8fafc; border-radius: 6px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; outline: none; text-align: center;';
    btnCancel.textContent = 'Cancel';
    btnCancel.onclick = () => {
        overlay.remove();
        onCancel();
    };
    btnCancel.onmouseenter = () => { btnCancel.style.background = 'rgba(255,255,255,0.05)'; };
    btnCancel.onmouseleave = () => { btnCancel.style.background = 'transparent'; };

    footer.appendChild(btnReplace);
    footer.appendChild(btnCancel);
    modal.appendChild(footer);
    overlay.appendChild(modal);

    if (dropzoneContainer) {
        dropzoneContainer.appendChild(overlay);
    } else {
        document.body.appendChild(overlay);
    }
}

function exportColorizerBaseJSON(cleanedFiles) {
    const modelsMap = {};
    
    const extInput = dropzoneContainer ? dropzoneContainer.querySelector('input[name="aem-ext"]:checked') : null;
    const extOption = extInput ? extInput.value : 'jpeg';
    
    cleanedFiles.forEach(cf => {
        const parts = cf.path.split('/');
        const filteredParts = parts.filter(p => p);
        
        // Find index of 'exterior' or 'interior'
        const viewIdx = filteredParts.findIndex(p => p.toLowerCase() === 'exterior' || p.toLowerCase() === 'interior');
        if (viewIdx === -1 || viewIdx === 0) return; // 'exterior' or 'interior' not found, or it's at the very beginning (no model prefix)
        
        // The model ID is the part right before exterior/interior
        const modelId = filteredParts[viewIdx - 1];
        
        if (!modelsMap[modelId]) {
            const modelName = modelId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            
            // Reconstruct the URL base dynamically based on the path parts before modelId
            const partsBeforeModel = filteredParts.slice(0, viewIdx - 1).join('/');
            const urlBase = partsBeforeModel ? `${currentBasePath}/${partsBeforeModel}` : currentBasePath;
            
            modelsMap[modelId] = {
                model: modelName,
                modelId: modelId,
                exteriorColors: [],
                wheelTypes: [],
                interiorColors: [],
                exterior_angles: 36,
                exterior_start_angle: 1,
                // Match the new layout: model -> exterior -> device -> color -> wheel
                exterior360imageurl: `${urlBase}/${modelId}/exterior/{device}/{exteriorcolor}/{wheel}/00{exterior_start_angle}-{exteriorcolor}-{wheel}.${extOption}`.replace(/\/\//g, '/'),
                "exterior-slider-view": "false",
                interior_angles: 36,
                interior_start_angle: 1,
                "interior-dome-view": "false",
                // Match the new layout: model -> interior -> device -> color -> files
                interior360imageurl: `${urlBase}/${modelId}/interior/{device}/{interiorcolor}/00{interior_start_angle}-{interiorcolor}.${extOption}`.replace(/\/\//g, '/'),
                configuratorurl: `&trim=${modelId}`
            };
        }
        const modelObj = modelsMap[modelId];
        
        // Find exterior / interior color and wheel structure
        const viewType = filteredParts[viewIdx].toLowerCase();
        
        if (viewType === 'exterior') {
            // Layout: exterior -> device -> color -> wheel -> files
            const extColor = filteredParts[viewIdx + 2];
            if (extColor && (viewIdx + 2 < filteredParts.length - 1)) {
                const colorShort = extColor.toLowerCase();
                const defaultName = colorShort.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                if (!modelObj.exteriorColors.some(c => c.shortName === colorShort)) {
                    modelObj.exteriorColors.push({
                        name: defaultName,
                        id: "",
                        thumbnail: "",
                        shortName: colorShort,
                        hexcode: "",
                        costlabel: ""
                    });
                }
                
                // Now check for wheel folder
                if (viewIdx + 3 < filteredParts.length - 1) {
                    const wheel = filteredParts[viewIdx + 3];
                    const wheelShort = wheel.toLowerCase();
                    const wheelId = wheel.toUpperCase();
                    if (!modelObj.wheelTypes.some(w => w.id === wheelId)) {
                        modelObj.wheelTypes.push({
                            name: "",
                            id: wheelId,
                            thumbnail: "",
                            shortName: wheelShort,
                            costlabel: ""
                        });
                    }
                }
            }
        } else if (viewType === 'interior') {
            // Layout: interior -> device -> color -> files
            const intColor = filteredParts[viewIdx + 2];
            if (intColor && (viewIdx + 2 < filteredParts.length - 1)) {
                const colorShort = intColor.toLowerCase();
                const defaultName = colorShort.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                if (!modelObj.interiorColors.some(c => c.shortName === colorShort)) {
                    modelObj.interiorColors.push({
                        name: defaultName,
                        id: "",
                        thumbnail: "",
                        shortName: colorShort,
                        hexcode: "",
                        costlabel: "",
                        imageURL: ""
                    });
                }
            }
        }
    });
    
    const finalArray = Object.values(modelsMap);
    if (finalArray.length === 0) {
        alert("No models or color structures detected in the renamed path structures.");
        return;
    }
    
    const jsonString = JSON.stringify(finalArray, null, 4);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colorizer-base-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logToUI(`Successfully exported Colorizer JSON Base with ${finalArray.length} model(s).`, 'success');
}

} // End of iframe guard else block
