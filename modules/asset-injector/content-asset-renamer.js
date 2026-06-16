// content-asset-renamer.js
// Logic for cleaning and renaming Ford 360 Assets before uploading to AEM

window.AEM360Renamer = {
    cleanFordName: function(name, locale, preserveHyphens = false) {
        let cleanName = name.toLowerCase();
        if (locale === 'ca') {
            const caTranslations = {
                'gray': 'grey',
                'color': 'colour',
                'center': 'centre',
                'tire': 'tyre',
                'aluminum': 'aluminium',
                'mold': 'mould',
                'customize': 'customise'
            };
            for (const [us, ca] of Object.entries(caTranslations)) {
                cleanName = cleanName.replace(new RegExp(us, 'g'), ca);
            }
        }
        if (cleanName.includes('_')) {
            cleanName = preserveHyphens ? cleanName.replace(/_/g, '-') : cleanName.replace(/_/g, '');
        }
        if (cleanName.includes(' ')) {
            cleanName = cleanName.replace(/ /g, '-');
        }
        // Solo a-z, 0-9, y guiones permitidos
        cleanName = cleanName.replace(/[^a-z0-9\-]/g, '');
        return cleanName;
    },

    processDroppedFiles: function(foldersToCreate, filesToUpload, locale, trimOverride = '') {
        const cleanedFolders = new Set();
        const cleanedFiles = [];
        let renameCount = 0;

        filesToUpload.forEach(fileObj => {
            let pathParts = fileObj.path.split('/');
            
            // 1. Path Reordering: Swap View and Trim (Do NOT drop the Model root)
            // Find 'exterior' or 'interior' in the path
            let viewIndex = pathParts.findIndex(p => p.toLowerCase() === 'exterior' || p.toLowerCase() === 'interior');
            
            let reorderedParts = [...pathParts];
            // Ensure we found it, and there is at least a Trim folder and a File after it
            if (viewIndex !== -1 && viewIndex < pathParts.length - 2) {
                // Swap View (index viewIndex) and Trim (index viewIndex + 1)
                let temp = reorderedParts[viewIndex];
                reorderedParts[viewIndex] = reorderedParts[viewIndex + 1];
                reorderedParts[viewIndex + 1] = temp;
            } else {
                viewIndex = -1; // Safe fallback
            }

            let originalFileName = reorderedParts.pop(); // Remove file from parts
            let deviceIndex = reorderedParts.findIndex(p => ['desktop', 'mobile', 'tablet'].includes(p.toLowerCase()));
            
            // 2. Clean parent folder names (folders go together: bronzefire)
            let cleanedParentParts = reorderedParts.map((p, index) => {
                let lowerP = p.toLowerCase();
                
                // Trim (the one swapped to viewIndex)
                if (viewIndex !== -1 && index === viewIndex) {
                    if (trimOverride) return trimOverride.toLowerCase().replace(/[_ ]/g, '-');
                    
                    let trim = lowerP.replace(/[_ ]/g, ''); // Remove all spaces and underscores
                    if (trim === 'maxplatinum' || trim === 'platinummax') return 'platinummax';
                    return trim;
                }
                
                // Normal cleaning for colors, wheels, view, device, and Model
                return this.cleanFordName(p, locale, true);
            });
            let newParentPath = cleanedParentParts.join('/');
            
            // 2b. Clean parts for the file suffix (files get hyphens if needed)
            let suffixParentParts = reorderedParts.map(p => this.cleanFordName(p, locale, true));
            
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
                let extension = extensionIdx > -1 ? originalFileName.substring(extensionIdx).toLowerCase() : '';
                let numberMatch = originalFileName.match(/^0*(\d+)/);
                let numStr = numberMatch[1];
                let paddedNum = "00" + numStr; // El doble cero obligatorio
                
                // Find device folder ('desktop', 'mobile', 'tablet') to know where the suffix starts
                let deviceIndex = cleanedParentParts.findIndex(p => ['desktop', 'mobile', 'tablet'].includes(p));
                
                let suffixParts = [];
                if (deviceIndex !== -1 && deviceIndex < suffixParentParts.length - 1) {
                    // Combine everything after the device folder using the hyphenated parts
                    suffixParts = suffixParentParts.slice(deviceIndex + 1);
                } else if (suffixParentParts.length > 0) {
                    // Fallback to leaf folder
                    suffixParts = [suffixParentParts[suffixParentParts.length - 1]];
                }
                
                let suffix = suffixParts.join('-');
                newFileName = suffix ? `${paddedNum}-${suffix}${extension}` : `${paddedNum}${extension}`;
            } else {
                // Not a numeric image sequence, just clean its name
                let extensionIdx = originalFileName.lastIndexOf('.');
                let baseName = extensionIdx > -1 ? originalFileName.substring(0, extensionIdx) : originalFileName;
                let ext = extensionIdx > -1 ? originalFileName.substring(extensionIdx) : '';
                newFileName = this.cleanFordName(baseName, locale, true) + ext.toLowerCase();
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
