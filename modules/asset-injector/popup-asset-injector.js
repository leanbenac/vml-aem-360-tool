console.log('[AEM 360 Tool] Popup UI for Asset Injector loaded.');

document.addEventListener('DOMContentLoaded', () => {
    const btnActivateDropzone = document.getElementById('btn-activate-dropzone');
    const basePathInput = document.getElementById('aem-base-path');
    const statusDiv = document.getElementById('aem-status');

    if (!btnActivateDropzone || !basePathInput || !statusDiv) {
        console.warn('UI elements for Asset Injector not found.');
        return;
    }

    // Helper para mostrar mensajes de estado
    function showStatus(message, isError = false) {
        statusDiv.style.display = 'block';
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? '#ff6b6b' : 'var(--accent-light)';
    }

    btnActivateDropzone.addEventListener('click', async () => {
        let basePath = basePathInput.value.trim();
        
        if (!basePath) {
            showStatus("Please enter a base path (e.g., /content/dam/my-project).", true);
            return;
        }

        // Feature: Auto-extraer la ruta JCR si el usuario pegó la URL completa del navegador
        if (basePath.includes('/aem/assets.html/')) {
            basePath = basePath.split('/aem/assets.html')[1];
            basePathInput.value = basePath; // Actualizar UI con la ruta limpia
        } else if (basePath.includes('http')) {
            // Caso genérico por si pega otro tipo de link de AEM
            try {
                const urlObj = new URL(basePath);
                basePath = urlObj.pathname.replace('/aem/assets.html', '');
                basePathInput.value = basePath;
            } catch (e) {}
        }

        if (!basePath.startsWith('/')) {
            basePath = '/' + basePath;
            basePathInput.value = basePath; // Auto-corregir UI
        }
        
        showStatus("Activating Dropzone in AEM...");
        
        try {
            // Obtener la pestaña activa
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                showStatus("Error: No active tab found.", true);
                return;
            }

            // Enviar mensaje al content script que ya está inyectado en AEM
            chrome.tabs.sendMessage(tab.id, { 
                action: "ACTIVATE_DROPZONE", 
                payload: { basePath } 
            }, (response) => {
                if (chrome.runtime.lastError) {
                    showStatus("Error: Ensure you are on a valid tab and reload the page.", true);
                } else if (response && response.success) {
                    // Auto-cerrar el popup de la extensión para revelar el Dropzone inyectado en AEM
                    window.close();
                } else {
                    showStatus("There was a problem activating the Dropzone.", true);
                }
            });
        } catch (error) {
            showStatus("Internal extension error: " + error.message, true);
        }
    });
});
