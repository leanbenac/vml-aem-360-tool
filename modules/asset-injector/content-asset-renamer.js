// content-asset-renamer.js
// Logic for cleaning and renaming Ford 360 Assets before uploading to AEM

window.AEM360Renamer = {
    cleanFordName: function(name, locale, preserveHyphens = false) {
        let cleanName = name.toLowerCase();
        const translations = {
            'gray': 'grey',
            'color': 'colour',
            'center': 'centre',
            'tire': 'tyre',
            'aluminum': 'aluminium',
            'mold': 'mould',
            'customize': 'customise'
        };

        if (locale === 'ca') {
            for (const [us, ca] of Object.entries(translations)) {
                cleanName = cleanName.replace(new RegExp(us, 'g'), ca);
            }
        } else if (locale === 'us') {
            for (const [us, ca] of Object.entries(translations)) {
                cleanName = cleanName.replace(new RegExp(ca, 'g'), us);
            }
        }
        if (cleanName.includes('_')) {
            cleanName = preserveHyphens ? cleanName.replace(/_/g, '-') : cleanName.replace(/_/g, '');
        }
        if (cleanName.includes(' ')) {
            cleanName = cleanName.replace(/ /g, '-');
        }
        // Only a-z, 0-9, and hyphens allowed
        cleanName = cleanName.replace(/[^a-z0-9\-]/g, '');
        return cleanName;
    },

    processDroppedFiles: function(foldersToCreate, filesToUpload, locale, trimOverride = '', extOption = 'jpeg', inversionMap = {}) {
        const cleanedFolders = new Set();
        const cleanedFiles = [];
        let renameCount = 0;

        // Collect min and max numbers for sequence files in each folder (using original folder path as key)
        const sequenceStats = {}; 
        filesToUpload.forEach(fileObj => {
            let pathParts = fileObj.path.split('/');
            let fileName = pathParts[pathParts.length - 1];
            if (fileName.match(/^0*\d+/)) {
                let folderPath = pathParts.slice(0, -1).join('/');
                let numVal = parseInt((fileName.match(/^0*(\d+)/) || [0, 0])[1], 10);
                if (!sequenceStats[folderPath]) {
                    sequenceStats[folderPath] = { min: numVal, max: numVal };
                } else {
                    if (numVal < sequenceStats[folderPath].min) sequenceStats[folderPath].min = numVal;
                    if (numVal > sequenceStats[folderPath].max) sequenceStats[folderPath].max = numVal;
                }
            }
        });

        const colorOriginals = new Set();
        filesToUpload.forEach(fileObj => {
            let pathParts = fileObj.path.split('/');
            let isExterior = pathParts.some(p => p.toLowerCase() === 'exterior');
            let devIdx = pathParts.findIndex(p => ['desktop', 'mobile', 'tablet'].includes(p.toLowerCase()));
            
            if (isExterior && devIdx !== -1) {
                for (let i = devIdx + 1; i < pathParts.length - 1; i++) {
                    let p = pathParts[i].toLowerCase();
                    if (p !== 'exterior' && p !== 'interior') {
                        colorOriginals.add(this.cleanFordName(p, locale, true));
                        break;
                    }
                }
            }
        });

        const colorMap = {}; 
        const wordCounts = {}; 
        for (let c of colorOriginals) {
            let parts = c.split('-');
            if (parts.length > 2) {
                let twoWords = parts.slice(0, 2).join('-');
                if (!wordCounts[twoWords]) wordCounts[twoWords] = [];
                wordCounts[twoWords].push(c);
            } else {
                colorMap[c] = c;
            }
        }
        for (let c of colorOriginals) {
            if (!colorMap[c]) {
                let parts = c.split('-');
                let twoWords = parts.slice(0, 2).join('-');
                if (wordCounts[twoWords].length > 1) {
                    colorMap[c] = parts.slice(0, 3).join('-');
                } else {
                    colorMap[c] = twoWords;
                }
            }
        }

        filesToUpload.forEach(fileObj => {
            let pathParts = fileObj.path.split('/');
            
            // 1. Path Reordering: Move Trim before View ONLY if it's misplaced
            let viewIndex = pathParts.findIndex(p => p.toLowerCase() === 'exterior' || p.toLowerCase() === 'interior');
            let deviceIndex = pathParts.findIndex(p => ['desktop', 'mobile', 'tablet'].includes(p.toLowerCase()));
            
            let reorderedParts = [...pathParts];
            if (viewIndex !== -1 && deviceIndex !== -1 && viewIndex < deviceIndex) {
                // Check if there is a Trim folder sitting BETWEEN View and Device (e.g. exterior/Platinum/desktop)
                if (viewIndex + 1 < deviceIndex) {
                    let trims = reorderedParts.splice(viewIndex + 1, deviceIndex - viewIndex - 1);
                    reorderedParts.splice(viewIndex, 0, ...trims); // Move Trim(s) before View
                }
            }

            let originalFileName = reorderedParts.pop(); // Remove file from parts
            
            // --- DETECT MISSING WHEEL CODE FOLDERS (EXTERIOR ONLY) ---
            let isExterior = pathParts.some(p => p.toLowerCase() === 'exterior');
            let extIdx = originalFileName.lastIndexOf('.');
            let baseName = extIdx > -1 ? originalFileName.substring(0, extIdx) : originalFileName;
            let match = baseName.match(/^0*\d+-(.+)$/);
            
            if (isExterior && match) {
                let fileSuffix = this.cleanFordName(match[1], locale, true);
                
                let tempDeviceIdx = reorderedParts.findIndex(p => ['desktop', 'mobile', 'tablet'].includes(p.toLowerCase()));
                if (tempDeviceIdx !== -1) {
                    let tempStartIdx = tempDeviceIdx + 1;
                    let existingSuffixParts = reorderedParts.slice(tempStartIdx).filter(p => p.toLowerCase() !== 'exterior' && p.toLowerCase() !== 'interior');
                    
                    // Comparamos contra la versión NO truncada de la carpeta, para evitar confundir palabras truncadas con llantas
                    let unTruncatedSuffix = existingSuffixParts.map(p => this.cleanFordName(p, locale, true)).join('-');
                    
                    if (unTruncatedSuffix && fileSuffix.startsWith(unTruncatedSuffix + '-')) {
                        let missingPart = fileSuffix.substring(unTruncatedSuffix.length + 1);
                        if (missingPart) {
                            // En exterior, lo que sobra al final del nombre suele ser el código de la llanta (ej. 16x)
                            reorderedParts.push(missingPart);
                        }
                    }
                }
            }
            // -------------------------------------------
            
            deviceIndex = reorderedParts.findIndex(p => ['desktop', 'mobile', 'tablet'].includes(p.toLowerCase()));
            
            // Identify where the Trim is located so we can format it properly (remove hyphens)
            let trimIndex = -1;
            if (viewIndex !== -1) {
                // If it was already correct (Trim before View), it's at viewIndex - 1. 
                // If we moved it, it's at viewIndex (since we inserted it there).
                // Let's rely on finding it just before the View.
                trimIndex = viewIndex > 0 ? viewIndex - 1 : -1;
            }

            // 2. Clean parent folder names (folders go together: bronzefire)
            let cleanedParentParts = reorderedParts.map((p, index) => {
                let lowerP = p.toLowerCase();
                
                // Trim formatting
                if (index === trimIndex) {
                    if (trimOverride) return trimOverride.toLowerCase().replace(/[_ ]/g, '-');
                    
                    let trim = lowerP.replace(/[_ ]/g, '-'); // Replace spaces and underscores with hyphens
                    if (trim === 'maxplatinum' || trim === 'platinummax' || trim === 'max-platinum' || trim === 'platinum-max') return 'platinummax';
                    return trim;
                }
                
                // Normal cleaning for colors, wheels, view, device, and Model root
                let cleaned = this.cleanFordName(p, locale, true);
                return colorMap[cleaned] ? colorMap[cleaned] : cleaned;
            });
            let newParentPath = cleanedParentParts.join('/');
            
            // 2b. Clean parts for the file suffix (files get hyphens if needed)
            let suffixParentParts = reorderedParts.map(p => {
                let cleaned = this.cleanFordName(p, locale, true);
                return colorMap[cleaned] ? colorMap[cleaned] : cleaned;
            });
            
            // 3. Add to cleanedFolders set (including all ancestors)
            if (newParentPath) {
                let currentPath = '';
                for (let part of cleanedParentParts) {
                    currentPath = currentPath ? currentPath + '/' + part : part;
                    cleanedFolders.add(currentPath);
                }
            }
            
            // 4. File Name Logic
            let newFileName = originalFileName;
            
            if (originalFileName.match(/^0*\d+/)) {
                let extensionIdx = originalFileName.lastIndexOf('.');
                let originalExt = extensionIdx > -1 ? originalFileName.substring(extensionIdx).toLowerCase() : '';
                let extension = originalExt;
                if (extOption === 'jpeg') {
                    if (originalExt === '.jpg') extension = '.jpeg';
                } else if (extOption === 'jpg') {
                    if (originalExt === '.jpeg') extension = '.jpg';
                }
                let numberMatch = originalFileName.match(/^0*(\d+)/);
                let numStr = numberMatch[1];
                let numVal = parseInt(numStr, 10);
                
                // Check if this folder's sequence should be inverted
                let origFolder = fileObj.path.split('/').slice(0, -1).join('/');
                if (inversionMap && inversionMap[origFolder] && sequenceStats[origFolder]) {
                    const stats = sequenceStats[origFolder];
                    numVal = stats.max - numVal + stats.min;
                    numStr = String(numVal);
                }
                
                let paddedNum = "00" + numStr; // Mandatory double zero
                
                // Find device folder ('desktop', 'mobile', 'tablet') to know where the suffix starts
                let deviceIndex = cleanedParentParts.findIndex(p => ['desktop', 'mobile', 'tablet'].includes(p));
                
                let startIndex = deviceIndex !== -1 ? deviceIndex + 1 : 0;
                let suffixParts = suffixParentParts.slice(startIndex).filter(p => p !== 'exterior' && p !== 'interior');
                
                let suffix = suffixParts.join('-');
                newFileName = suffix ? `${paddedNum}-${suffix}${extension}` : `${paddedNum}${extension}`;
            } else {
                // Not a numeric image sequence, just clean its name
                let extensionIdx = originalFileName.lastIndexOf('.');
                let baseName = extensionIdx > -1 ? originalFileName.substring(0, extensionIdx) : originalFileName;
                let originalExt = extensionIdx > -1 ? originalFileName.substring(extensionIdx).toLowerCase() : '';
                let ext = originalExt;
                if (extOption === 'jpeg') {
                    if (originalExt === '.jpg') ext = '.jpeg';
                } else if (extOption === 'jpg') {
                    if (originalExt === '.jpeg') ext = '.jpg';
                }
                newFileName = this.cleanFordName(baseName, locale, true) + ext;
            }

            const newFullPath = newParentPath ? `${newParentPath}/${newFileName}` : newFileName;
            
            if (newFullPath !== fileObj.path) {
                renameCount++;
            }
            
            cleanedFiles.push({
                file: fileObj.file,
                path: newFullPath,
                originalPath: fileObj.path
            });
        });

        return {
            cleanedFolders: Array.from(cleanedFolders),
            cleanedFiles: cleanedFiles,
            renameCount: renameCount
        };
    }
};
