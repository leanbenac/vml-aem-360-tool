// ========================================================
// Colorizer JSON Creator — Core JavaScript Logic
// Handles state management, UI events, import/export, and live preview.
// ========================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── STATE ─────────────────────────────────────────────────────────────
  let modelsState = [];
  let activeModelIndex = -1;
  let isShortNameManuallyEdited = false;

  // Edit-tracking state
  let editingExtColorIdx = -1;
  let editingWheelIdx = -1;
  let editingIntColorIdx = -1;

  // Default Preset URL templates
  const PRESET_EXTERIOR = "/content/dam/na/lincoln/en_ca/images/vehicle/2027/360/{modelId}/{view}/{device}/{exteriorcolor}/{wheel}/00{exterior_start_angle}-{exteriorcolor}-{wheel}.jpeg";
  const PRESET_INTERIOR = "/content/dam/na/lincoln/en_ca/images/vehicle/2027/360/{modelId}/{view}/{device}/{interiorcolor}/00{interior_start_angle}-{interiorcolor}.jpeg";

  // ── DOM ELEMENTS ──────────────────────────────────────────────────────
  // Navigation Tabs
  const tabButtons = document.querySelectorAll('.w-tab-btn');
  const tabPanes = document.querySelectorAll('.w-tab-pane');

  // Import elements
  const importText = document.getElementById('import-text');
  const btnImportJson = document.getElementById('btn-import-json');
  const btnClearWorkspace = document.getElementById('btn-clear-workspace');
  const dropzone = document.getElementById('dropzone');
  const fileUploader = document.getElementById('file-uploader');
  const importStatus = document.getElementById('import-status');

  // Model elements
  const modelSelectorList = document.getElementById('model-selector-list');
  const btnAddModel = document.getElementById('btn-add-model');
  const btnDeleteModel = document.getElementById('btn-delete-model');
  const cardModelForm = document.getElementById('card-model-form');
  const currentEditingModelTitle = document.getElementById('current-editing-model-title');

  // Global Configuration Settings Elements
  const globalBrandFord = document.getElementById('global-brand-ford');
  const globalBrandLincoln = document.getElementById('global-brand-lincoln');
  const globalLocaleUs = document.getElementById('global-locale-us');
  const globalLocaleCa = document.getElementById('global-locale-ca');
  const globalYear = document.getElementById('global-year');
  const globalExtJpeg = document.getElementById('global-ext-jpeg');
  const globalExtJpg = document.getElementById('global-ext-jpg');

  // Model Form Fields
  const mName = document.getElementById('m-name');
  const mId = document.getElementById('m-id');
  const mConfigurator = document.getElementById('m-configurator');
  const mExtracostLabel = document.getElementById('m-extracost-label');
  const mExtAngles = document.getElementById('m-ext-angles');
  const mExtStart = document.getElementById('m-ext-start');
  const mExtSlider = document.getElementById('m-ext-slider');
  const mExtUrl = document.getElementById('m-ext-url');
  const mIntAngles = document.getElementById('m-int-angles');
  const mIntStart = document.getElementById('m-int-start');
  const mIntDome = document.getElementById('m-int-dome');
  const mIntUrl = document.getElementById('m-int-url');
  
  // Smart Parse elements
  const mSmartPaste = document.getElementById('m-smart-paste');
  const btnSmartParse = document.getElementById('btn-smart-parse');
  // Sub-tab selectors
  const selectModelTips = document.querySelectorAll('.select-model-tip');
  const colorManagerSection = document.querySelector('.color-manager-section');
  const wheelsManagerSection = document.querySelector('.wheels-manager-section');
  const interiorManagerSection = document.querySelector('.interior-manager-section');

  // Exterior Colors elements
  const addExtColorForm = document.getElementById('add-extcolor-form');
  const ecName = document.getElementById('ec-name');
  const ecId = document.getElementById('ec-id');
  const ecPicker = document.getElementById('ec-picker');
  const ecHex = document.getElementById('ec-hex');
  const ecExtraCost = document.getElementById('ec-extra-cost');
  const ecShort = document.getElementById('ec-short');
  const extColorCount = document.getElementById('extcolor-count');
  const extColorListRows = document.getElementById('extcolor-list-rows');
  const ecCatalogContainer = document.getElementById('ec-catalog-container');
  const ecCatalogList = document.getElementById('ec-catalog-list');

  // Wheels elements
  const addWheelForm = document.getElementById('add-wheel-form');
  const wName = document.getElementById('w-name');
  const wId = document.getElementById('w-id');
  const wShort = document.getElementById('w-short');
  const wheelCount = document.getElementById('wheel-count');
  const wheelListRows = document.getElementById('wheel-list-rows');

  // Interior Colors elements
  const addIntColorForm = document.getElementById('add-intcolor-form');
  const icName = document.getElementById('ic-name');
  const icId = document.getElementById('ic-id');
  const icPicker = document.getElementById('ic-picker');
  const icHex = document.getElementById('ic-hex');
  const icExtraCost = document.getElementById('ic-extra-cost');
  const icShort = document.getElementById('ic-short');
  const icImage = document.getElementById('ic-image');
  const intColorCount = document.getElementById('intcolor-count');
  const intColorListRows = document.getElementById('intcolor-list-rows');
  const icCatalogContainer = document.getElementById('ic-catalog-container');
  const icCatalogList = document.getElementById('ic-catalog-list');

  // Output elements
  const jsonPreview = document.getElementById('json-preview');
  const btnCopyJson = document.getElementById('btn-copy-json');
  const btnDownloadJson = document.getElementById('btn-download-json');
  const validationBadge = document.getElementById('validation-badge');
  const validationList = document.getElementById('validation-list');



  // ── HELPER FUNCTIONS ──────────────────────────────────────────────────

  // Convert name to lowercase-dashed shortName (slug)
  function toShortName(name) {
    if (!name) return "";
    return name
      .toLowerCase()
      .normalize('NFD') // remove accents
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/[^a-z0-9\s-]/g, '') // remove special characters
      .trim()
      .replace(/[\s_]+/g, '-') // spaces & underscores to dashes
      .replace(/-+/g, '-'); // collapse multiple dashes
  }

  // Get vehicle specific folder name
  function getVehicleFolder(name) {
    if (!name) return "vehicle";
    const lower = name.toLowerCase();
    if (lower.includes("super duty") || lower.includes("superduty")) return "superduty";
    if (lower.includes("navigator")) return "navigator";
    if (lower.includes("corsair")) return "corsair";
    if (lower.includes("aviator")) return "aviator";
    if (lower.includes("nautilus")) return "nautilus";
    
    // Default to first word, alphanumeric
    const firstWord = name.split(/\s+/)[0];
    return toShortName(firstWord) || "vehicle";
  }

  // Auto detect Brand, Locale, Model Year, and File Extension from imported data
  function detectBrandLocaleYearAndExtension(m) {
    let brand = 'ford';
    let locale = 'en_us';
    let year = '2027';
    let extension = 'jpeg';
    
    const extUrl = (m.exterior360imageurl || '').toLowerCase();
    const intUrl = (m.interior360imageurl || '').toLowerCase();
    const modelLower = (m.model || '').toLowerCase();
    const combined = extUrl + ' ' + intUrl + ' ' + modelLower;
    
    if (combined.includes('/ford/') || combined.includes('ford')) {
      brand = 'ford';
    } else if (combined.includes('/lincoln/') || combined.includes('lincoln')) {
      brand = 'lincoln';
    }
    
    if (combined.includes('/en_us/') || combined.includes('en-us') || combined.includes('en_us')) {
      locale = 'en_us';
    } else if (combined.includes('/en_ca/') || combined.includes('en-ca') || combined.includes('en_ca')) {
      locale = 'en_ca';
    }
    
    // Scan for a 4-digit year in URL paths (e.g. /2026/360 or /2027/360)
    const yearMatch = combined.match(/\/(20\d{2})\//);
    if (yearMatch) {
      year = yearMatch[1];
    }

    // Scan for image file extension (default is jpeg, navigator uses jpg)
    if (combined.includes('.jpeg')) {
      extension = 'jpeg';
    } else if (combined.includes('.jpg')) {
      extension = 'jpg';
    }
    
    m.brand = brand;
    m.locale = locale;
    m.year = year;
    m.extension = extension;
  }

  // Set message status
  function showStatus(text, type = 'info') {
    importStatus.textContent = text;
    importStatus.className = `status-msg ${type}`;
    importStatus.style.display = 'block';
    setTimeout(() => {
      importStatus.style.display = 'none';
    }, 6000);
  }

  // Safe DOM text escapes
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // ── WORKSPACE TABS SWITCHING ──────────────────────────────────────────
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetTab);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });

  // ── COLOR PICKER / HEX INPUT SYNCHRONIZATION ──────────────────────────
  // Exterior Swatch Sync
  ecPicker.addEventListener('input', () => {
    ecHex.value = ecPicker.value;
  });
  ecHex.addEventListener('input', () => {
    const val = ecHex.value.trim();
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      ecPicker.value = val;
    }
  });

  // Interior Swatch Sync
  icPicker.addEventListener('input', () => {
    icHex.value = icPicker.value;
  });
  icHex.addEventListener('input', () => {
    const val = icHex.value.trim();
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      icPicker.value = val;
    }
  });

  function findMatchingColorInfo(name, type) {
    if (!name) return null;
    const targetName = name.trim().toLowerCase();
    for (const m of modelsState) {
      const colors = type === 'exterior' ? m.exteriorColors : m.interiorColors;
      const found = (colors || []).find(c => c.name.trim().toLowerCase() === targetName);
      if (found && found.id) {
        return { id: found.id, hexcode: found.hexcode || '' };
      }
    }
    return null;
  }

  // ── SLUGIFICATION AUTO-GEN LISTENERS ──────────────────────────────────
  // Exterior Color Name -> Short Name
  ecName.addEventListener('input', () => {
    if (!isShortNameManuallyEdited) {
      ecShort.value = toShortName(ecName.value);
    }
    const match = findMatchingColorInfo(ecName.value, 'exterior');
    if (match) {
      ecId.value = match.id;
      if (match.hexcode) {
        ecHex.value = match.hexcode;
        ecPicker.value = match.hexcode;
      }
    }
  });
  ecShort.addEventListener('input', () => {
    isShortNameManuallyEdited = true;
    if (ecShort.value.trim() === "") {
      isShortNameManuallyEdited = false;
    }
  });

  // Wheel VDM Code (ID) -> Short Name
  wId.addEventListener('input', () => {
    wShort.value = wId.value.trim().toLowerCase();
  });

  // Interior Color Name -> Short Name
  icName.addEventListener('input', () => {
    icShort.value = toShortName(icName.value);
    const match = findMatchingColorInfo(icName.value, 'interior');
    if (match) {
      icId.value = match.id;
      if (match.hexcode) {
        icHex.value = match.hexcode;
        icPicker.value = match.hexcode;
      }
    }
  });

  // ── SMART PARSER (ROUTER DATA) ────────────────────────────────────────
  if (btnSmartParse) {
    btnSmartParse.addEventListener('click', () => {
      const text = mSmartPaste.value;
      if (!text.trim()) return;

      let parsedExterior = [];
      let parsedInterior = [];
      let parsedWheels = [];

      function extractField(block, fieldName) {
        const regex = new RegExp(`^${fieldName}\\s*\\n(.+)`, 'm');
        const match = block.match(regex);
        return match ? match[1].trim() : '';
      }

      // Helper to generate shortName with max 2 words (or 3 if conflict)
      function generateExteriorShortName(name, existingSet) {
        const fullSlug = toShortName(name);
        const words = fullSlug.split('-');
        if (words.length <= 2) return fullSlug;
        
        let attempt = words.slice(0, 2).join('-');
        if (!existingSet.has(attempt)) {
          existingSet.add(attempt);
          return attempt;
        }
        
        attempt = words.slice(0, 3).join('-');
        if (!existingSet.has(attempt)) {
          existingSet.add(attempt);
          return attempt;
        }
        
        existingSet.add(fullSlug);
        return fullSlug;
      }

      // Split text to separate interior from exterior if the word Interior is present
      // after a separator line.
      const splitByInterior = text.split(/_{10,}\s*\n\s*Interior/i);
      const exteriorText = splitByInterior[0] || text;
      const interiorText = splitByInterior[1] || '';

      const hexRegex = /(#[A-Fa-f0-9]{6})\s*-\s*([^\n\(]+?)(?:\s*\((.*?)\))?\s*$/gm;
      let hexMatch;

      // Parse Paint Types (Exterior Colors)
      const usedExtShortNames = new Set();
      const paintMatch = text.split(/Part Class\s*-\s*Paint Type/i);
      
      let parsedByTrim = {}; // To store trim-specific colors (new format)

      if (paintMatch.length > 1) {
        const paintText = paintMatch[1].split(/Part Class\s*-/i)[0];
        const parts = paintText.split(/Part\s*-/).slice(1);
        
        parts.forEach(p => {
          const name = extractField(p, 'Name');
          const displayName = extractField(p, 'Display Name');
          const salesCode = extractField(p, 'Sales Code');
          const id = extractField(p, 'Id');
          const color = extractField(p, 'Color');
          if (name || displayName) {
            parsedExterior.push({
              name: name || displayName || '',
              displayName: displayName || name || '',
              id: salesCode || id || '',
              hexcode: color || '',
              costlabel: '',
              shortName: generateExteriorShortName(name || displayName, usedExtShortNames)
            });
          }
        });
      } else {
        // Fallback to the new format (Hierarchical by Trim)
        function parseTrimsFromSection(sectionText, isInterior) {
          const chunks = sectionText.split(/^Trim\s*\n/m);
          for (let i = 1; i < chunks.length; i++) {
            const chunk = chunks[i];
            const newlineIdx = chunk.indexOf('\n');
            const trimName = chunk.substring(0, newlineIdx).trim();
            if (!trimName) continue;
            
            const trimKey = trimName.toLowerCase();
            if (!parsedByTrim[trimKey]) {
              parsedByTrim[trimKey] = { exterior: [], interior: [] };
            }
            
            const colorsList = isInterior ? parsedByTrim[trimKey].interior : parsedByTrim[trimKey].exterior;
            const usedShortNames = new Set();
            
            const localHexRegex = /(#[A-Fa-f0-9]{6})\s*-\s*([^\n\(]+?)(?:\s*\((.*?)\))?\s*$/gm;
            let localHexMatch;
            while ((localHexMatch = localHexRegex.exec(chunk)) !== null) {
              const hex = localHexMatch[1].trim();
              const name = localHexMatch[2].trim();
              const isExtraCost = localHexMatch[3] && localHexMatch[3].toLowerCase().includes('extra-cost');
              colorsList.push({
                name: name,
                id: '', // Not provided in this format
                hexcode: hex,
                costlabel: isExtraCost ? '(extra-cost colour)' : '',
                shortName: isInterior ? toShortName(name) : generateExteriorShortName(name, usedShortNames),
                imageURL: ''
              });
            }
          }
        }

        parseTrimsFromSection(exteriorText, false);
      }

      // Parse Interior Trim Colour
      const intMatch = text.split(/Part Class\s*-\s*Interior Trim Colour/i);
      if (intMatch.length > 1) {
        const intText = intMatch[1].split(/Part Class\s*-/i)[0];
        const parts = intText.split(/Part\s*-/).slice(1);
        parts.forEach(p => {
          const name = extractField(p, 'Name');
          const displayName = extractField(p, 'Display Name');
          const salesCode = extractField(p, 'Sales Code');
          const id = extractField(p, 'Id');
          const color = extractField(p, 'Color');
          if (name || displayName) {
            parsedInterior.push({
              name: name || displayName || '',
              displayName: displayName || name || '',
              id: salesCode || id || '',
              hexcode: color || '',
              costlabel: '',
              shortName: toShortName(name || displayName),
              imageURL: ''
            });
          }
        });
      } else {
        // Parse Interior for new format
        if (Object.keys(parsedByTrim).length > 0) {
          // If the new format was detected in exterior, parse the interior section the same way
          function parseTrimsFromSection(sectionText, isInterior) {
            const chunks = sectionText.split(/^Trim\s*\n/m);
            for (let i = 1; i < chunks.length; i++) {
              const chunk = chunks[i];
              const newlineIdx = chunk.indexOf('\n');
              const trimName = chunk.substring(0, newlineIdx).trim();
              if (!trimName) continue;
              
              const trimKey = trimName.toLowerCase();
              if (!parsedByTrim[trimKey]) {
                parsedByTrim[trimKey] = { exterior: [], interior: [] };
              }
              
              const colorsList = isInterior ? parsedByTrim[trimKey].interior : parsedByTrim[trimKey].exterior;
              const usedShortNames = new Set();
              
              const localHexRegex = /(#[A-Fa-f0-9]{6})\s*-\s*([^\n\(]+?)(?:\s*\((.*?)\))?\s*$/gm;
              let localHexMatch;
              while ((localHexMatch = localHexRegex.exec(chunk)) !== null) {
                const hex = localHexMatch[1].trim();
                const name = localHexMatch[2].trim();
                const isExtraCost = localHexMatch[3] && localHexMatch[3].toLowerCase().includes('extra-cost');
                colorsList.push({
                  name: name,
                  id: '', 
                  hexcode: hex,
                  costlabel: isExtraCost ? '(extra-cost colour)' : '',
                  shortName: isInterior ? toShortName(name) : generateExteriorShortName(name, usedShortNames),
                  imageURL: ''
                });
              }
            }
          }
          parseTrimsFromSection(interiorText, true);
        }
      }

      // Parse Wheel Type
      const wheelMatch = text.split(/Part Class\s*-\s*Wheel Type/i);
      if (wheelMatch.length > 1) {
        const wheelText = wheelMatch[1].split(/Part Class\s*-/i)[0];
        const parts = wheelText.split(/Part\s*-/).slice(1);
        parts.forEach(p => {
          const name = extractField(p, 'Name') || extractField(p, 'Display Name');
          const salesCode = extractField(p, 'Sales Code');
          const id = extractField(p, 'Id');
          if (name) {
            const shortNameSlug = (salesCode || id || '').toLowerCase();
            parsedWheels.push({
              name: name,
              id: salesCode || id || '',
              shortName: shortNameSlug
            });
          }
        });
      }

      // Parse Trims (Auto-create Models)
      const trimRegex = /^Trim\s*\n(.+)/gm;
      let trimMatch;
      let newlyCreatedModels = [];
      
      while ((trimMatch = trimRegex.exec(text)) !== null) {
        const trimName = trimMatch[1].trim();
        if (trimName) {
          // Check if model already exists
          let existingModel = modelsState.find(m => m.model.toLowerCase() === trimName.toLowerCase());
          if (!existingModel) {
            const slug = toShortName(trimName);
            // Notice: The user's JSON uses just "active", "st", "platinum" without "explorer-" prefix
            // So we'll try to extract the last word as the ID if possible, or use slug.
            let modelId = slug;
            if (trimName.includes("®")) {
              const parts = trimName.split("®").filter(p => p.trim() !== "");
              modelId = toShortName(parts[parts.length - 1]);
            } else if (slug.includes("-")) {
              modelId = slug.split("-").pop();
            }

            const defaultBrand = 'ford';
            const newModel = {
              model: trimName,
              modelId: modelId,
              exteriorColors: [],
              wheelTypes: [],
              interiorColors: [],
              exterior_angles: 36,
              exterior_start_angle: 1,
              exterior360imageurl: `/content/dam/na/${defaultBrand}/en_us/images/${slug.split('-')[0]}/2027/360/{modelId}/{view}/{device}/{exteriorcolor}/{wheel}/00{exterior_start_angle}-{exteriorcolor}-{wheel}.jpeg`,
              "exterior-slider-view": "false",
              interior_angles: 36,
              interior_start_angle: 1,
              "interior-dome-view": "false",
              interior360imageurl: `/content/dam/na/${defaultBrand}/en_us/images/${slug.split('-')[0]}/2027/360/{modelId}/{view}/{device}/{interiorcolor}/00{interior_start_angle}-{interiorcolor}.jpeg`,
              configuratorurl: `&trim=${modelId}`
            };
            modelsState.push(newModel);
            newlyCreatedModels.push(newModel);
          }
        }
      }

      if (newlyCreatedModels.length > 0) {
        // Automatically delete the placeholder "New Vehicle Model" if it was just sitting there empty
        const defaultIdx = modelsState.findIndex(m => m.model === "New Vehicle Model" && m.exteriorColors.length === 0 && m.interiorColors.length === 0 && m.wheelTypes.length === 0);
        if (defaultIdx !== -1) {
          modelsState.splice(defaultIdx, 1);
        }
      }

      // If we didn't have an active one (or we just deleted it), set the first new one as active
      if (activeModelIndex < 0 || activeModelIndex >= modelsState.length) {
        activeModelIndex = 0;
      }

      // Auto-append only if they don't already exist to prevent duplicates
      function mergeItems(targetArray, newItems, modelName, allowAdd = true) {
        newItems.forEach(newItem => {
          const clonedItem = JSON.parse(JSON.stringify(newItem));
          
          // Match by exact name, ID, or if one name is a substring of the other (e.g. "Onyx Black" vs "Onyx")
          const existingItem = targetArray.find(item => {
             const n1 = item.name.toLowerCase();
             const n2 = clonedItem.name.toLowerCase();
             const dn2 = (clonedItem.displayName || '').toLowerCase();
             
             const s1 = (item.shortName || '').toLowerCase();
             const s2 = toShortName(clonedItem.name);
             const sdn2 = clonedItem.displayName ? toShortName(clonedItem.displayName) : '';

             return n1 === n2 || 
                    (dn2 && n1 === dn2) ||
                    (item.id && clonedItem.id && item.id === clonedItem.id) ||
                    (n1.length > 3 && n2.length > 3 && (n1.includes(n2) || n2.includes(n1))) ||
                    (dn2 && n1.length > 3 && dn2.length > 3 && (n1.includes(dn2) || dn2.includes(n1))) ||
                    (s1 && s2 && s1 === s2) ||
                    (s1 && sdn2 && s1 === sdn2) ||
                    (s1 && s2 && (s1.includes(s2) || s2.includes(s1))) ||
                    (s1 && sdn2 && (s1.includes(sdn2) || sdn2.includes(s1)));
          });
          
          if (!existingItem) {
            if (allowAdd) {
              targetArray.push(clonedItem);
            }
          } else {
            // Update ID if missing
            if (!existingItem.id && clonedItem.id) {
              existingItem.id = clonedItem.id;
            }

            // Mismatch check for hexcode
            if (clonedItem.hexcode && existingItem.hexcode && clonedItem.hexcode.toLowerCase() !== existingItem.hexcode.toLowerCase()) {
              if (!clonedItem.id) {
                // clonedItem is from Router (no ID). Router prevails, overwrite.
                console.warn(`⚠️ [VML 360 Tool - ${modelName}] HEX mismatch for "${clonedItem.name}". Existing: ${existingItem.hexcode}, Router: ${clonedItem.hexcode}. Overwriting with Router hex.`);
                existingItem.hexcode = clonedItem.hexcode;
              } else {
                // clonedItem is from Sales Code (has ID). Router prevails, DO NOT overwrite.
                console.warn(`⚠️ [VML 360 Tool - ${modelName}] HEX mismatch for "${clonedItem.name}". Router: ${existingItem.hexcode}, Sales Code: ${clonedItem.hexcode}. Keeping Router hex.`);
              }
            }
          }
        });
      }

      modelsState.forEach((model, idx) => {
        if (!model.exteriorColors) model.exteriorColors = [];
        if (!model.interiorColors) model.interiorColors = [];
        if (!model.wheelTypes) model.wheelTypes = [];

        // Apply global generic colors. If the model already has colors (from router), we ONLY update. We don't add new ones.
        const allowAddExt = model.exteriorColors.length === 0;
        const allowAddInt = model.interiorColors.length === 0;
        
        if (parsedExterior.length > 0) mergeItems(model.exteriorColors, parsedExterior, model.model, allowAddExt);
        if (parsedInterior.length > 0) mergeItems(model.interiorColors, parsedInterior, model.model, allowAddInt);
        
        // Wheels are always added to all models
        if (parsedWheels.length > 0) mergeItems(model.wheelTypes, parsedWheels, model.model, true);
        
        // Apply trim-specific colors (if parsed from new format) to all matching models
        const trimSpecificData = parsedByTrim[model.model.toLowerCase()];
        if (trimSpecificData) {
          if (trimSpecificData.exterior.length > 0) mergeItems(model.exteriorColors, trimSpecificData.exterior, model.model, true);
          if (trimSpecificData.interior.length > 0) mergeItems(model.interiorColors, trimSpecificData.interior, model.model, true);
        }
      });

      mSmartPaste.value = '';
      showStatus('Router data parsed successfully!', 'success');
      refreshUI();
    });
  }

  // ── INITIAL STATE LOADER ──────────────────────────────────────────────
  function initDefaultState() {
    modelsState = [];
    activeModelIndex = -1;
    refreshUI();
  }

  // ── STATE COMPILER & RENDER ───────────────────────────────────────────
  function refreshUI() {
    renderModelsList();
    renderModelForm();
    renderExteriorColors();
    renderWheels();
    renderInteriorColors();
    renderColorCatalogs();
    renderJSONOutput();
    validateConfig();
  }

  // Render interactive color swatch UI (or unassigned badge)
  function renderSwatchCell(color, onUpdateHex) {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; align-items: center; gap: 8px; position: relative; max-width: 220px;';

    const pickerInput = document.createElement('input');
    pickerInput.type = 'color';
    pickerInput.value = (color.hexcode && color.hexcode.trim()) ? color.hexcode.trim() : '#7e22ce';
    pickerInput.style.cssText = 'position: absolute; opacity: 0; width: 100%; height: 100%; top: 0; left: 0; cursor: pointer; z-index: 5; pointer-events: auto;';
    pickerInput.title = 'Click to choose Hex Code';

    pickerInput.addEventListener('change', (e) => {
      color.hexcode = e.target.value;
      if (onUpdateHex) onUpdateHex(e.target.value);
      refreshUI();
    });

    if (color.hexcode && color.hexcode.trim()) {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch-preview';
      swatch.style.cssText = `background-color: ${escapeHTML(color.hexcode)}; border: 1.5px solid rgba(255,255,255,0.3); border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.4); flex-shrink: 0; cursor: pointer;`;

      const hexLabel = document.createElement('span');
      hexLabel.style.cssText = 'font-family: var(--font-mono, monospace); font-size: 11px; color: #a7f3d0; cursor: pointer; font-weight: 600;';
      hexLabel.textContent = color.hexcode;

      container.appendChild(pickerInput);
      container.appendChild(swatch);
      container.appendChild(hexLabel);
    } else {
      const swatch = document.createElement('div');
      swatch.style.cssText = 'width: 20px; height: 20px; border-radius: 50%; border: 1.5px dashed #f59e0b; background: repeating-linear-gradient(45deg, rgba(245,158,11,0.25), rgba(245,158,11,0.25) 3px, transparent 3px, transparent 6px); flex-shrink: 0; cursor: pointer;';

      const unassignedBadge = document.createElement('span');
      unassignedBadge.style.cssText = 'font-size: 10px; font-weight: 700; color: #fbbf24; background: rgba(245, 158, 11, 0.12); border: 1px dashed rgba(245, 158, 11, 0.4); padding: 2px 8px; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;';
      unassignedBadge.innerHTML = '⚠️ Hex Missing — Click to Set 🎨';

      container.appendChild(pickerInput);
      container.appendChild(swatch);
      container.appendChild(unassignedBadge);
    }

    return container;
  }

  // Scans modelsState to compile a global unique list of colors and renders quick-add pills
  function renderColorCatalogs() {
    // 1. Exterior Colors Catalog
    const extCatalog = [];
    const extSeen = new Set();
    
    modelsState.forEach(m => {
      (m.exteriorColors || []).forEach(c => {
        const key = c.name.trim().toLowerCase();
        if (c.name && c.id && !extSeen.has(key)) {
          extSeen.add(key);
          extCatalog.push(c);
        }
      });
    });
    
    ecCatalogList.replaceChildren();
    if (extCatalog.length > 0) {
      ecCatalogContainer.style.display = 'block';
      extCatalog.forEach(color => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'catalog-pill';
        const swatchStyle = (color.hexcode && color.hexcode.trim())
          ? `background-color: ${escapeHTML(color.hexcode)};`
          : `border: 1px dashed #f59e0b; background: repeating-linear-gradient(45deg, rgba(245,158,11,0.3), rgba(245,158,11,0.3) 2px, transparent 2px, transparent 4px);`;

        pill.innerHTML = `
          <div class="catalog-pill-swatch" style="${swatchStyle}"></div>
          <span>${escapeHTML(color.name)} (${escapeHTML(color.id)})</span>
        `;
        pill.addEventListener('click', () => {
          ecName.value = color.name;
          ecId.value = color.id;
          ecHex.value = color.hexcode || '';
          ecPicker.value = color.hexcode || '#7e22ce';
          ecExtraCost.checked = !!color.costlabel;
          ecShort.value = color.shortName || toShortName(color.name);
          isShortNameManuallyEdited = false;
        });
        ecCatalogList.appendChild(pill);
      });
    } else {
      ecCatalogContainer.style.display = 'none';
    }

    // 2. Interior Colors Catalog
    const intCatalog = [];
    const intSeen = new Set();
    
    modelsState.forEach(m => {
      (m.interiorColors || []).forEach(c => {
        const key = c.name.trim().toLowerCase();
        if (c.name && c.id && !intSeen.has(key)) {
          intSeen.add(key);
          intCatalog.push(c);
        }
      });
    });

    icCatalogList.replaceChildren();
    if (intCatalog.length > 0) {
      icCatalogContainer.style.display = 'block';
      intCatalog.forEach(color => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'catalog-pill';
        const swatchStyle = (color.hexcode && color.hexcode.trim())
          ? `background-color: ${escapeHTML(color.hexcode)};`
          : `border: 1px dashed #f59e0b; background: repeating-linear-gradient(45deg, rgba(245,158,11,0.3), rgba(245,158,11,0.3) 2px, transparent 2px, transparent 4px);`;

        pill.innerHTML = `
          <div class="catalog-pill-swatch" style="${swatchStyle}"></div>
          <span>${escapeHTML(color.name)} (${escapeHTML(color.id)})</span>
        `;
        pill.addEventListener('click', () => {
          icName.value = color.name;
          icId.value = color.id;
          icHex.value = color.hexcode || '';
          icPicker.value = color.hexcode || '#7e22ce';
          icExtraCost.checked = !!color.costlabel;
          icShort.value = color.shortName || toShortName(color.name);
          icImage.value = color.imageURL || '';
        });
        icCatalogList.appendChild(pill);
      });
    } else {
      icCatalogContainer.style.display = 'none';
    }
  }

  // Render vehicle model selection pills
  function renderModelsList() {
    modelSelectorList.replaceChildren();

    if (modelsState.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'no-models-msg';
      empty.textContent = 'No models available. Click "+ Add New Model" to start.';
      modelSelectorList.appendChild(empty);
      return;
    }

    modelsState.forEach((m, idx) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `model-pill ${idx === activeModelIndex ? 'active' : ''}`;
      pill.textContent = m.model || `Model ${idx + 1}`;
      pill.addEventListener('click', () => {
        activeModelIndex = idx;
        isShortNameManuallyEdited = false;
        refreshUI();
      });
      modelSelectorList.appendChild(pill);
    });
  }

  // Render the general model edit form values
  function renderModelForm() {
    const hasActiveModel = activeModelIndex >= 0 && activeModelIndex < modelsState.length;

    if (!hasActiveModel) {
      cardModelForm.style.display = 'none';
      selectModelTips.forEach(tip => tip.style.display = 'block');
      colorManagerSection.style.display = 'none';
      wheelsManagerSection.style.display = 'none';
      interiorManagerSection.style.display = 'none';
      return;
    }

    cardModelForm.style.display = 'flex';
    selectModelTips.forEach(tip => tip.style.display = 'none');
    colorManagerSection.style.display = 'flex';
    wheelsManagerSection.style.display = 'flex';
    interiorManagerSection.style.display = 'flex';

    const currentModel = modelsState[activeModelIndex];
    currentEditingModelTitle.textContent = `Edit Model: ${currentModel.model || 'Untitled'}`;

    mName.value = currentModel.model || '';
    mId.value = currentModel.modelId || '';
    mConfigurator.value = currentModel.configuratorurl || '';

    mExtAngles.value = currentModel.exterior_angles !== undefined ? currentModel.exterior_angles : 36;
    mExtStart.value = currentModel.exterior_start_angle !== undefined ? currentModel.exterior_start_angle : 1;
    mExtSlider.value = currentModel["exterior-slider-view"] || 'false';
    mExtUrl.value = currentModel.exterior360imageurl || '';

    mIntAngles.value = currentModel.interior_angles !== undefined ? currentModel.interior_angles : 36;
    mIntStart.value = currentModel.interior_start_angle !== undefined ? currentModel.interior_start_angle : 1;
    mIntDome.value = currentModel["interior-dome-view"] || 'false';
    mIntUrl.value = currentModel.interior360imageurl || '';

    // Restore extracost label setting (Lincoln en_ca is standard)
    // We scan exterior colors for a non-empty costlabel. If we find one, we use it, otherwise fall back to "(extra-cost colour)".
    let extraCostLabel = "(extra-cost colour)";
    const extColors = currentModel.exteriorColors || [];
    const costLabels = extColors.map(c => c.costlabel).filter(l => l && l !== "");
    if (costLabels.length > 0) {
      extraCostLabel = costLabels[0];
    }
    mExtracostLabel.value = extraCostLabel;
  }

  // Render the exterior colors data table
  function renderExteriorColors() {
    extColorListRows.replaceChildren();
    
    if (activeModelIndex < 0 || activeModelIndex >= modelsState.length) {
      extColorCount.textContent = '0';
      return;
    }

    const currentModel = modelsState[activeModelIndex];
    const extColors = currentModel.exteriorColors || [];
    extColorCount.textContent = extColors.length;

    if (extColors.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" style="text-align: center; color: var(--text-muted); font-style: italic;">No exterior colors added yet.</td>`;
      extColorListRows.appendChild(tr);
      return;
    }

    extColors.forEach((color, cIdx) => {
      const tr = document.createElement('tr');
      
      const tdSwatch = document.createElement('td');
      tdSwatch.appendChild(renderSwatchCell(color, (newHex) => {
        if (editingExtColorIdx === cIdx) {
          ecHex.value = newHex;
          ecPicker.value = newHex;
        }
      }));
      
      const tdName = document.createElement('td');
      tdName.className = 'cell-color-name';
      tdName.innerHTML = `
        <strong>${escapeHTML(color.name)}</strong>
        <span class="cell-short-name">${escapeHTML(color.shortName)}</span>
      `;
      
      const tdId = document.createElement('td');
      tdId.textContent = color.id;
      
      const tdCost = document.createElement('td');
      tdCost.textContent = color.costlabel || '-';
      if (color.costlabel) {
        tdCost.style.color = '#dfc598';
        tdCost.style.fontWeight = '500';
      }

      const tdActions = document.createElement('td');
      tdActions.className = 'cell-actions';
      
      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'btn-edit-row';
      btnEdit.title = 'Edit color';
      btnEdit.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>`;
      btnEdit.addEventListener('click', () => {
        editingExtColorIdx = cIdx;
        ecName.value = color.name;
        ecId.value = color.id;
        ecHex.value = color.hexcode || '';
        ecPicker.value = color.hexcode || '#7e22ce';
        ecExtraCost.checked = !!color.costlabel;
        ecShort.value = color.shortName;
        
        const submitBtn = addExtColorForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = '✓ Update Color';
        addExtColorForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      tdActions.appendChild(btnEdit);

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-row';
      btnDel.title = 'Remove color';
      btnDel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
      btnDel.addEventListener('click', () => {
        extColors.splice(cIdx, 1);
        if (editingExtColorIdx === cIdx) {
          editingExtColorIdx = -1;
          const submitBtn = addExtColorForm.querySelector('button[type="submit"]');
          if (submitBtn) submitBtn.textContent = '+ Add Color';
          addExtColorForm.reset();
        }
        refreshUI();
      });
      tdActions.appendChild(btnDel);

      tr.appendChild(tdSwatch);
      tr.appendChild(tdName);
      tr.appendChild(tdId);
      tr.appendChild(tdCost);
      tr.appendChild(tdActions);

      extColorListRows.appendChild(tr);
    });
  }

  // Render the wheels data table
  function renderWheels() {
    wheelListRows.replaceChildren();

    if (activeModelIndex < 0 || activeModelIndex >= modelsState.length) {
      wheelCount.textContent = '0';
      return;
    }

    const currentModel = modelsState[activeModelIndex];
    const wheels = currentModel.wheelTypes || [];
    wheelCount.textContent = wheels.length;

    if (wheels.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="4" style="text-align: center; color: var(--text-muted); font-style: italic;">No wheel types added yet.</td>`;
      wheelListRows.appendChild(tr);
      return;
    }

    wheels.forEach((wheel, wIdx) => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.innerHTML = `<strong>${escapeHTML(wheel.name)}</strong>`;

      const tdId = document.createElement('td');
      tdId.textContent = wheel.id;

      const tdShort = document.createElement('td');
      tdShort.className = 'cell-short-name';
      tdShort.textContent = wheel.shortName;

      const tdActions = document.createElement('td');
      tdActions.className = 'cell-actions';
      
      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'btn-edit-row';
      btnEdit.title = 'Edit wheel';
      btnEdit.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>`;
      btnEdit.addEventListener('click', () => {
        editingWheelIdx = wIdx;
        wName.value = wheel.name;
        wId.value = wheel.id;
        wShort.value = wheel.shortName;
        
        const submitBtn = addWheelForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = '✓ Update Wheel';
        addWheelForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      tdActions.appendChild(btnEdit);

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-row';
      btnDel.title = 'Remove wheel';
      btnDel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
      btnDel.addEventListener('click', () => {
        wheels.splice(wIdx, 1);
        if (editingWheelIdx === wIdx) {
          editingWheelIdx = -1;
          const submitBtn = addWheelForm.querySelector('button[type="submit"]');
          if (submitBtn) submitBtn.textContent = '+ Add Wheel';
          addWheelForm.reset();
        }
        refreshUI();
      });
      tdActions.appendChild(btnDel);

      tr.appendChild(tdName);
      tr.appendChild(tdId);
      tr.appendChild(tdShort);
      tr.appendChild(tdActions);

      wheelListRows.appendChild(tr);
    });
  }

  // Render the interior colors data table
  function renderInteriorColors() {
    intColorListRows.replaceChildren();

    if (activeModelIndex < 0 || activeModelIndex >= modelsState.length) {
      intColorCount.textContent = '0';
      return;
    }

    const currentModel = modelsState[activeModelIndex];
    const intColors = currentModel.interiorColors || [];
    intColorCount.textContent = intColors.length;

    if (intColors.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" style="text-align: center; color: var(--text-muted); font-style: italic;">No interior colors added yet.</td>`;
      intColorListRows.appendChild(tr);
      return;
    }

    intColors.forEach((color, cIdx) => {
      const tr = document.createElement('tr');

      const tdSwatch = document.createElement('td');
      tdSwatch.appendChild(renderSwatchCell(color, (newHex) => {
        if (editingIntColorIdx === cIdx) {
          icHex.value = newHex;
          icPicker.value = newHex;
        }
      }));

      const tdName = document.createElement('td');
      tdName.className = 'cell-color-name';
      tdName.innerHTML = `
        <strong>${escapeHTML(color.name)}</strong>
        <span class="cell-short-name">${escapeHTML(color.shortName)}</span>
      `;

      const tdId = document.createElement('td');
      tdId.textContent = color.id;

      const tdCost = document.createElement('td');
      tdCost.textContent = color.costlabel || '-';
      if (color.costlabel) {
        tdCost.style.color = '#dfc598';
        tdCost.style.fontWeight = '500';
      }

      const tdImage = document.createElement('td');
      tdImage.style.maxWidth = '180px';
      tdImage.style.overflow = 'hidden';
      tdImage.style.textOverflow = 'ellipsis';
      tdImage.style.whiteSpace = 'nowrap';
      tdImage.textContent = color.imageURL || '-';

      const tdActions = document.createElement('td');
      tdActions.className = 'cell-actions';
      
      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'btn-edit-row';
      btnEdit.title = 'Edit interior color';
      btnEdit.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>`;
      btnEdit.addEventListener('click', () => {
        editingIntColorIdx = cIdx;
        icName.value = color.name;
        icId.value = color.id;
        icHex.value = color.hexcode || '';
        icPicker.value = color.hexcode || '#7e22ce';
        icExtraCost.checked = !!color.costlabel;
        icShort.value = color.shortName;
        icImage.value = color.imageURL || '';
        
        const submitBtn = addIntColorForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = '✓ Update Interior Color';
        addIntColorForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      tdActions.appendChild(btnEdit);

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-row';
      btnDel.title = 'Remove color';
      btnDel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
      btnDel.addEventListener('click', () => {
        intColors.splice(cIdx, 1);
        if (editingIntColorIdx === cIdx) {
          editingIntColorIdx = -1;
          const submitBtn = addIntColorForm.querySelector('button[type="submit"]');
          if (submitBtn) submitBtn.textContent = '+ Add Interior Color';
          addIntColorForm.reset();
        }
        refreshUI();
      });
      tdActions.appendChild(btnDel);

      tr.appendChild(tdSwatch);
      tr.appendChild(tdName);
      tr.appendChild(tdId);
      tr.appendChild(tdCost);
      tr.appendChild(tdImage);
      tr.appendChild(tdActions);

      intColorListRows.appendChild(tr);
    });
  }

  // Helper to clean modelsState for export, stripping temporary fields used by UI
  function getCleanExportJSON() {
    const cleanState = modelsState.map(model => {
      const copy = { ...model };
      delete copy.brand;
      delete copy.locale;
      delete copy.year;
      delete copy.extension;
      return copy;
    });
    return JSON.stringify(cleanState, null, 4);
  }

  // Render Live JSON Output Box
  function renderJSONOutput() {
    jsonPreview.textContent = getCleanExportJSON();
  }

  // Validate the configuration state and render checklist
  function validateConfig() {
    validationList.replaceChildren();
    let errorsCount = 0;
    let warningsCount = 0;

    // Check 1: Models loaded
    if (modelsState.length === 0) {
      addValidationItem("No vehicle models have been added yet.", "warning");
      warningsCount++;
    } else {
      addValidationItem(`Config contains ${modelsState.length} model(s).`, "success");

      modelsState.forEach((m, idx) => {
        const modelLabel = m.model || `Model ${idx + 1}`;
        
        // Model ID validation
        if (!m.modelId) {
          addValidationItem(`[${modelLabel}] Missing Model ID (NASAPI code).`, "warning");
          warningsCount++;
        }

        // Exterior colors validation
        if (!m.exteriorColors || m.exteriorColors.length === 0) {
          addValidationItem(`[${modelLabel}] Has no exterior colors.`, "warning");
          warningsCount++;
        } else {
          const extNameMap = {};
          const extHexMap = {};

          m.exteriorColors.forEach(c => {
            const colorName = (c.name || c.shortName || '').trim();
            if (!c.id || !c.id.trim()) {
              addValidationItem(`[${modelLabel}] Exterior color "${colorName}" is missing VDM ID (Sales Code).`, "warning");
              warningsCount++;
            }
            if (!c.hexcode || !c.hexcode.trim()) {
              addValidationItem(`[${modelLabel}] Exterior color "${colorName}" is missing Hex Code.`, "warning");
              warningsCount++;
            } else {
              const hex = c.hexcode.trim().toLowerCase();
              if (!extHexMap[hex]) extHexMap[hex] = [];
              extHexMap[hex].push(colorName);
            }

            const lowerName = colorName.toLowerCase();
            if (lowerName) {
              if (!extNameMap[lowerName]) extNameMap[lowerName] = 0;
              extNameMap[lowerName]++;
            }
          });

          // Check for duplicate color names
          Object.entries(extNameMap).forEach(([nameLower, count]) => {
            if (count > 1) {
              const originalName = m.exteriorColors.find(c => (c.name || c.shortName || '').trim().toLowerCase() === nameLower)?.name || nameLower;
              addValidationItem(`[${modelLabel}] Duplicate Exterior Color Name: "${originalName}".`, "warning");
              warningsCount++;
            }
          });

          // Check for duplicate non-empty hex codes on differently named colors
          Object.entries(extHexMap).forEach(([hex, names]) => {
            const uniqueNames = [...new Set(names)];
            if (uniqueNames.length > 1) {
              addValidationItem(`[${modelLabel}] Exterior colors "${uniqueNames.join('", "')}" share identical Hex Code (${hex}).`, "warning");
              warningsCount++;
            }
          });

          // Check for unique sales codes
          const ids = m.exteriorColors.map(c => c.id).filter(id => id && id.trim() !== "");
          const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
          if (duplicates.length > 0) {
            const uniqueDupes = [...new Set(duplicates)];
            addValidationItem(`[${modelLabel}] Duplicate VDM Codes in Exterior: ${uniqueDupes.join(', ')}`, "warning");
            warningsCount++;
          }
        }

        // Wheel validation
        if (!m.wheelTypes || m.wheelTypes.length === 0) {
          addValidationItem(`[${modelLabel}] Has no wheel types configured.`, "warning");
          warningsCount++;
        } else {
          m.wheelTypes.forEach(w => {
            if (!w.id || !w.id.trim()) {
              addValidationItem(`[${modelLabel}] Wheel "${w.shortName}" is missing VDM Sales Code (ID).`, "warning");
              warningsCount++;
            }
            if (!w.name || !w.name.trim()) {
              addValidationItem(`[${modelLabel}] Wheel "${w.shortName || w.id}" is missing Wheel Description (Name).`, "warning");
              warningsCount++;
            }
          });
        }

        // Interior Colors validation
        if (!m.interiorColors || m.interiorColors.length === 0) {
          addValidationItem(`[${modelLabel}] Has no interior colors.`, "warning");
          warningsCount++;
        } else {
          const intNameMap = {};
          const intHexMap = {};

          m.interiorColors.forEach(c => {
            const colorName = (c.name || c.shortName || '').trim();
            if (!c.id || !c.id.trim()) {
              addValidationItem(`[${modelLabel}] Interior color "${colorName}" is missing VDM ID (Sales Code).`, "warning");
              warningsCount++;
            }
            if (!c.hexcode || !c.hexcode.trim()) {
              addValidationItem(`[${modelLabel}] Interior color "${colorName}" is missing Hex Code.`, "warning");
              warningsCount++;
            } else {
              const hex = c.hexcode.trim().toLowerCase();
              if (!intHexMap[hex]) intHexMap[hex] = [];
              intHexMap[hex].push(colorName);
            }

            const lowerName = colorName.toLowerCase();
            if (lowerName) {
              if (!intNameMap[lowerName]) intNameMap[lowerName] = 0;
              intNameMap[lowerName]++;
            }
          });

          // Check for duplicate interior color names
          Object.entries(intNameMap).forEach(([nameLower, count]) => {
            if (count > 1) {
              const originalName = m.interiorColors.find(c => (c.name || c.shortName || '').trim().toLowerCase() === nameLower)?.name || nameLower;
              addValidationItem(`[${modelLabel}] Duplicate Interior Color Name: "${originalName}".`, "warning");
              warningsCount++;
            }
          });

          // Check for duplicate non-empty hex codes on differently named interior colors
          Object.entries(intHexMap).forEach(([hex, names]) => {
            const uniqueNames = [...new Set(names)];
            if (uniqueNames.length > 1) {
              addValidationItem(`[${modelLabel}] Interior colors "${uniqueNames.join('", "')}" share identical Hex Code (${hex}).`, "warning");
              warningsCount++;
            }
          });
        }
      });
    }

    if (warningsCount > 0) {
      validationBadge.textContent = `Incomplete (${warningsCount} Issue${warningsCount > 1 ? 's' : ''})`;
      validationBadge.className = "badge badge-warning";
    } else if (modelsState.length > 0) {
      validationBadge.textContent = "Valid & Complete";
      validationBadge.className = "badge badge-success";
      addValidationItem("All model settings, colors, and wheels are fully populated.", "success");
    } else {
      validationBadge.textContent = "Empty Workspace";
      validationBadge.className = "badge badge-warning";
    }
  }

  const valBoxHeader = document.getElementById('val-box-header');
  const btnToggleValDetails = document.getElementById('btn-toggle-val-details');
  let isValDetailsOpen = true;

  if (valBoxHeader) {
    valBoxHeader.addEventListener('click', () => {
      isValDetailsOpen = !isValDetailsOpen;
      if (validationList) {
        validationList.style.display = isValDetailsOpen ? 'flex' : 'none';
      }
      if (btnToggleValDetails) {
        btnToggleValDetails.textContent = isValDetailsOpen ? 'Toggle Details ▼' : 'Toggle Details ▲';
      }
    });
  }

  function addValidationItem(text, type) {
    const li = document.createElement('li');
    li.className = `val-${type}`;
    li.textContent = text;
    validationList.appendChild(li);
  }

  // ── MODEL FORM FIELD EDIT EVENT HANDLERS ──────────────────────────────
  // Update state whenever a text field is changed
  function updateActiveModelProperty(prop, value) {
    if (activeModelIndex >= 0 && activeModelIndex < modelsState.length) {
      modelsState[activeModelIndex][prop] = value;
      
      // If editing model name and pill is active, refresh models select bar
      if (prop === 'model') {
        renderModelsList();
      }
      
      renderJSONOutput();
      validateConfig();
    }
  }

  function getGlobalSettings() {
    const brand = document.querySelector('input[name="global-brand"]:checked')?.value || 'ford';
    const locale = document.querySelector('input[name="global-locale"]:checked')?.value || 'en_us';
    const year = (globalYear ? globalYear.value.trim() : '') || '2027';
    const ext = document.querySelector('input[name="global-ext"]:checked')?.value || 'jpeg';
    return { brand, locale, year, ext };
  }

  function applyGlobalSettingsToAllModels() {
    const { brand, locale, year, ext } = getGlobalSettings();

    modelsState.forEach(m => {
      m.brand = brand;
      m.locale = locale;
      m.year = year;
      m.extension = ext;

      if (m.exterior360imageurl) {
        let url = m.exterior360imageurl;
        url = url.replace(/\/na\/[^\/]+\//g, `/na/${brand}/`);
        url = url.replace(/\/([^\/]+)\/images\//g, `/${locale}/images/`);
        url = url.replace(/\/([^\/]+)\/360\//g, `/${year}/360/`);
        url = url.replace(/\.[a-z0-9]+$/i, `.${ext}`);
        m.exterior360imageurl = url;
      }

      if (m.interior360imageurl) {
        let url = m.interior360imageurl;
        url = url.replace(/\/na\/[^\/]+\//g, `/na/${brand}/`);
        url = url.replace(/\/([^\/]+)\/images\//g, `/${locale}/images/`);
        url = url.replace(/\/([^\/]+)\/360\//g, `/${year}/360/`);
        url = url.replace(/\.[a-z0-9]+$/i, `.${ext}`);
        m.interior360imageurl = url;
      }
    });

    // Also sync folder import card controls in Tab 1 for smooth UX
    const folderBrandRadio = document.querySelector(`input[name="folder-brand"][value="${brand}"]`);
    if (folderBrandRadio) folderBrandRadio.checked = true;

    const folderLocaleRadio = document.querySelector(`input[name="folder-locale"][value="${locale === 'en_ca' ? 'ca' : 'us'}"]`);
    if (folderLocaleRadio) folderLocaleRadio.checked = true;

    const folderExtRadio = document.querySelector(`input[name="folder-ext"][value="${ext}"]`);
    if (folderExtRadio) folderExtRadio.checked = true;

    refreshUI();
  }

  document.querySelectorAll('input[name="global-brand"]').forEach(radio => {
    radio.addEventListener('change', applyGlobalSettingsToAllModels);
  });

  document.querySelectorAll('input[name="global-locale"]').forEach(radio => {
    radio.addEventListener('change', applyGlobalSettingsToAllModels);
  });

  document.querySelectorAll('input[name="global-ext"]').forEach(radio => {
    radio.addEventListener('change', applyGlobalSettingsToAllModels);
  });

  if (globalYear) {
    globalYear.addEventListener('input', applyGlobalSettingsToAllModels);
  }

  // Auto update URL templates based on global settings and model name
  function autoUpdateUrls() {
    if (activeModelIndex < 0 || activeModelIndex >= modelsState.length) return;
    const currentModel = modelsState[activeModelIndex];
    const vehicle = getVehicleFolder(currentModel.model);
    const { brand, locale, year, ext } = getGlobalSettings();
    
    const extUrlTemplate = `/content/dam/na/${brand}/${locale}/images/${vehicle}/${year}/360/{modelId}/{view}/{device}/{exteriorcolor}/{wheel}/00{exterior_start_angle}-{exteriorcolor}-{wheel}.${ext}`;
    const intUrlTemplate = `/content/dam/na/${brand}/${locale}/images/${vehicle}/${year}/360/{modelId}/{view}/{device}/{interiorcolor}/00{interior_start_angle}-{interiorcolor}.${ext}`;
    
    currentModel.exterior360imageurl = extUrlTemplate;
    currentModel.interior360imageurl = intUrlTemplate;
    currentModel.brand = brand;
    currentModel.locale = locale;
    currentModel.year = year;
    currentModel.extension = ext;
    
    mExtUrl.value = extUrlTemplate;
    mIntUrl.value = intUrlTemplate;
  }

  mName.addEventListener('input', () => {
    const newName = mName.value.trim();
    updateActiveModelProperty('model', newName);
    if (currentEditingModelTitle) {
      currentEditingModelTitle.textContent = `Edit Model: ${newName || 'Untitled'}`;
    }
    renderModelsList();
    renderJSONOutput();
    validateConfig();
  });

  mId.addEventListener('input', () => {
    const newId = mId.value.trim();
    updateActiveModelProperty('modelId', newId);
    
    if (activeModelIndex >= 0 && activeModelIndex < modelsState.length) {
      const currentModel = modelsState[activeModelIndex];
      if (currentModel.exterior360imageurl) {
        currentModel.exterior360imageurl = currentModel.exterior360imageurl.replace(/\/360\/([^\/]+)\/(exterior|interior)\//g, `/360/${newId}/$2/`);
        mExtUrl.value = currentModel.exterior360imageurl;
      }
      if (currentModel.interior360imageurl) {
        currentModel.interior360imageurl = currentModel.interior360imageurl.replace(/\/360\/([^\/]+)\/(exterior|interior)\//g, `/360/${newId}/$2/`);
        mIntUrl.value = currentModel.interior360imageurl;
      }
      if (!currentModel.configuratorurl || currentModel.configuratorurl.startsWith('&trim=')) {
        currentModel.configuratorurl = `&trim=${newId}`;
        mConfigurator.value = currentModel.configuratorurl;
      }
    }
    
    renderJSONOutput();
    validateConfig();
  });

  mConfigurator.addEventListener('input', () => updateActiveModelProperty('configuratorurl', mConfigurator.value.trim()));
  
  mExtAngles.addEventListener('input', () => updateActiveModelProperty('exterior_angles', parseInt(mExtAngles.value, 10) || 36));
  mExtStart.addEventListener('input', () => updateActiveModelProperty('exterior_start_angle', parseInt(mExtStart.value, 10) || 1));
  mExtSlider.addEventListener('change', () => updateActiveModelProperty('exterior-slider-view', mExtSlider.value));
  mExtUrl.addEventListener('input', () => updateActiveModelProperty('exterior360imageurl', mExtUrl.value.trim()));

  mIntAngles.addEventListener('input', () => updateActiveModelProperty('interior_angles', parseInt(mIntAngles.value, 10) || 36));
  mIntStart.addEventListener('input', () => updateActiveModelProperty('interior_start_angle', parseInt(mIntStart.value, 10) || 1));
  mIntDome.addEventListener('change', () => updateActiveModelProperty('interior-dome-view', mIntDome.value));
  mIntUrl.addEventListener('input', () => updateActiveModelProperty('interior360imageurl', mIntUrl.value.trim()));

  // ── ADD / DELETE MODEL ACTIONS ────────────────────────────────────────
  btnAddModel.addEventListener('click', () => {
    const defaultModel = {
      model: "New Vehicle Model",
      modelId: "new-model",
      brand: "ford",
      locale: "en_us",
      year: "2027",
      extension: "jpeg",
      exteriorColors: [],
      wheelTypes: [],
      interiorColors: [],
      exterior_angles: 36,
      exterior_start_angle: 1,
      exterior360imageurl: "",
      "exterior-slider-view": "false",
      interior_angles: 36,
      interior_start_angle: 1,
      "interior-dome-view": "false",
      interior360imageurl: "",
      configuratorurl: "&trim=new-model"
    };

    modelsState.push(defaultModel);
    activeModelIndex = modelsState.length - 1;
    isShortNameManuallyEdited = false;
    autoUpdateUrls();
    refreshUI();
  });

  btnDeleteModel.addEventListener('click', (e) => {
    e.preventDefault();
    if (activeModelIndex >= 0 && activeModelIndex < modelsState.length) {
      if (confirm(`Are you sure you want to delete the model: "${modelsState[activeModelIndex].model}"?`)) {
        modelsState.splice(activeModelIndex, 1);
        activeModelIndex = modelsState.length > 0 ? 0 : -1;
        isShortNameManuallyEdited = false;
        refreshUI();
      }
    }
  });

  // Propagate ID and Hex updates to all occurrences of a color name
  function propagateColorUpdates(name, id, hex) {
    if (!name) return;
    const targetName = name.trim().toLowerCase();
    modelsState.forEach(m => {
      (m.exteriorColors || []).forEach(c => {
        if (c.name.trim().toLowerCase() === targetName) {
          c.id = id;
          c.hexcode = hex;
        }
      });
      (m.interiorColors || []).forEach(c => {
        if (c.name.trim().toLowerCase() === targetName) {
          c.id = id;
          c.hexcode = hex;
        }
      });
    });
  }

  // ── ADD SUB-ITEM ACTIONS (COLORS / WHEELS) ────────────────────────────
  // 1. Exterior Color Submit
  addExtColorForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (activeModelIndex < 0 || activeModelIndex >= modelsState.length) return;

    const name = ecName.value.trim();
    const id = ecId.value.trim().toUpperCase();
    const hex = ecHex.value.trim();
    const hasExtra = ecExtraCost.checked;
    const short = ecShort.value.trim() || toShortName(name);
    
    // costlabel string resolve
    const costText = hasExtra ? (mExtracostLabel.value.trim() || "(extra-cost colour)") : "";

    const activeModel = modelsState[activeModelIndex];
    if (!activeModel.exteriorColors) {
      activeModel.exteriorColors = [];
    }

    if (editingExtColorIdx >= 0) {
      // Update in-place
      const targetColor = activeModel.exteriorColors[editingExtColorIdx];
      targetColor.name = name;
      targetColor.id = id;
      targetColor.shortName = short;
      targetColor.hexcode = hex;
      targetColor.costlabel = costText;
      
      propagateColorUpdates(name, id, hex);
      
      editingExtColorIdx = -1;
      const submitBtn = addExtColorForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = '+ Add Color';
    } else {
      // Push new
      const newColor = {
        name: name,
        id: id,
        thumbnail: "",
        shortName: short,
        hexcode: hex,
        costlabel: costText
      };
      
      // Check if duplicate code exists
      const exists = activeModel.exteriorColors.some(c => c.id === id);
      if (exists) {
        alert(`Warning: An exterior color with Sales Code "${id}" already exists in this model.`);
      }

      activeModel.exteriorColors.push(newColor);
      propagateColorUpdates(name, id, hex);
    }
    
    // Reset fields
    addExtColorForm.reset();
    ecPicker.value = "#7e22ce";
    ecHex.value = "";
    isShortNameManuallyEdited = false;

    refreshUI();
  });

  // 2. Wheel Type Submit
  addWheelForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (activeModelIndex < 0 || activeModelIndex >= modelsState.length) return;

    const name = wName.value.trim();
    const id = wId.value.trim().toUpperCase();
    const short = wShort.value.trim() || id.toLowerCase();

    const activeModel = modelsState[activeModelIndex];
    if (!activeModel.wheelTypes) {
      activeModel.wheelTypes = [];
    }

    if (editingWheelIdx >= 0) {
      const targetWheel = activeModel.wheelTypes[editingWheelIdx];
      targetWheel.name = name;
      targetWheel.id = id;
      targetWheel.shortName = short;
      
      editingWheelIdx = -1;
      const submitBtn = addWheelForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = '+ Add Wheel';
    } else {
      const newWheel = {
        name: name,
        id: id,
        thumbnail: "",
        shortName: short,
        costlabel: ""
      };
      activeModel.wheelTypes.push(newWheel);
    }

    // Reset Form
    addWheelForm.reset();
    refreshUI();
  });

  // 3. Interior Color Submit
  addIntColorForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (activeModelIndex < 0 || activeModelIndex >= modelsState.length) return;

    const name = icName.value.trim();
    const id = icId.value.trim().toUpperCase();
    const hex = icHex.value.trim();
    const hasExtra = icExtraCost.checked;
    const short = icShort.value.trim() || toShortName(name);
    const imgUrl = icImage.value.trim();

    const costText = hasExtra ? (mExtracostLabel.value.trim() || "(extra-cost colour)") : "";

    const activeModel = modelsState[activeModelIndex];
    if (!activeModel.interiorColors) {
      activeModel.interiorColors = [];
    }

    if (editingIntColorIdx >= 0) {
      const targetColor = activeModel.interiorColors[editingIntColorIdx];
      targetColor.name = name;
      targetColor.id = id;
      targetColor.shortName = short;
      targetColor.hexcode = hex;
      targetColor.costlabel = costText;
      targetColor.imageURL = imgUrl;
      
      propagateColorUpdates(name, id, hex);
      
      editingIntColorIdx = -1;
      const submitBtn = addIntColorForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = '+ Add Interior Color';
    } else {
      const newColor = {
        name: name,
        id: id,
        thumbnail: "",
        shortName: short,
        hexcode: hex,
        costlabel: costText,
        imageURL: imgUrl
      };
      activeModel.interiorColors.push(newColor);
      propagateColorUpdates(name, id, hex);
    }

    // Reset Form
    addIntColorForm.reset();
    icPicker.value = "#7e22ce";
    icHex.value = "";
    refreshUI();
  });

  // ── IMPORT JSON PARSER & ACTION ───────────────────────────────────────
  
  function syncGlobalSettingsUI(brand, locale, year, extension) {
    if (brand === 'lincoln') {
      if (globalBrandLincoln) globalBrandLincoln.checked = true;
    } else {
      if (globalBrandFord) globalBrandFord.checked = true;
    }

    if (locale === 'en_ca') {
      if (globalLocaleCa) globalLocaleCa.checked = true;
    } else {
      if (globalLocaleUs) globalLocaleUs.checked = true;
    }

    if (globalYear) {
      globalYear.value = year || '2027';
    }

    if (extension === 'jpg') {
      if (globalExtJpg) globalExtJpg.checked = true;
    } else {
      if (globalExtJpeg) globalExtJpeg.checked = true;
    }

    const folderBrandRadio = document.querySelector(`input[name="folder-brand"][value="${brand}"]`);
    if (folderBrandRadio) folderBrandRadio.checked = true;

    const folderLocaleRadio = document.querySelector(`input[name="folder-locale"][value="${locale === 'en_ca' ? 'ca' : 'us'}"]`);
    if (folderLocaleRadio) folderLocaleRadio.checked = true;

    const folderExtRadio = document.querySelector(`input[name="folder-ext"][value="${extension}"]`);
    if (folderExtRadio) folderExtRadio.checked = true;
  }

  // Parses loaded JSON array and formats/loads it to state
  function loadJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      
      if (!Array.isArray(parsed)) {
        throw new Error("Invalid configuration format. Root must be a JSON Array.");
      }

      if (parsed.length === 0) {
        throw new Error("JSON file is empty.");
      }

      // Check structure of first item at least
      const item = parsed[0];
      if (typeof item !== 'object' || item === null) {
        throw new Error("Array items must be JSON objects.");
      }

      // Map structure to sanitize it and supply missing properties if any
      const sanitized = parsed.map((m) => {
        const sanitizedModel = {
          model: m.model || 'Unnamed Model',
          modelId: m.modelId || toShortName(m.model),
          exteriorColors: Array.isArray(m.exteriorColors) ? m.exteriorColors.map(c => ({
            name: c.name || '',
            id: c.id || '',
            thumbnail: c.thumbnail || '',
            shortName: c.shortName || toShortName(c.name),
            hexcode: c.hexcode !== undefined ? c.hexcode : '',
            costlabel: c.costlabel || ''
          })) : [],
          wheelTypes: Array.isArray(m.wheelTypes) ? m.wheelTypes.map(w => ({
            name: w.name || '',
            id: w.id || '',
            thumbnail: w.thumbnail || '',
            shortName: w.shortName || toShortName(w.name || w.id),
            costlabel: w.costlabel || ''
          })) : [],
          interiorColors: Array.isArray(m.interiorColors) ? m.interiorColors.map(i => ({
            name: i.name || '',
            id: i.id || '',
            thumbnail: i.thumbnail || '',
            shortName: i.shortName || toShortName(i.name),
            hexcode: i.hexcode !== undefined ? i.hexcode : '',
            costlabel: i.costlabel || '',
            imageURL: i.imageURL || ''
          })) : [],
          exterior_angles: m.exterior_angles !== undefined ? parseInt(m.exterior_angles, 10) : 36,
          exterior_start_angle: m.exterior_start_angle !== undefined ? parseInt(m.exterior_start_angle, 10) : 1,
          exterior360imageurl: m.exterior360imageurl || PRESET_EXTERIOR,
          "exterior-slider-view": String(m["exterior-slider-view"]) || 'false',
          interior_angles: m.interior_angles !== undefined ? parseInt(m.interior_angles, 10) : 36,
          interior_start_angle: m.interior_start_angle !== undefined ? parseInt(m.interior_start_angle, 10) : 1,
          "interior-dome-view": String(m["interior-dome-view"]) || 'false',
          interior360imageurl: m.interior360imageurl || PRESET_INTERIOR,
          configuratorurl: m.configuratorurl || ''
        };
        detectBrandLocaleYearAndExtension(sanitizedModel);
        return sanitizedModel;
      });

      modelsState = sanitized;
      activeModelIndex = 0;
      isShortNameManuallyEdited = false;
      refreshUI();
      
      showStatus(`Successfully imported ${modelsState.length} model(s). Navigate to other tabs to edit.`, "success");
      
      // Auto switch to Models & General tab for immediate visibility
      const modelsTabBtn = document.querySelector('[data-tab="tabModels"]');
      if (modelsTabBtn) {
        modelsTabBtn.click();
      }
    } catch (err) {
      showStatus(`Import error: ${err.message}`, "error");
    }
  }

  // Import Paste Action
  btnImportJson.addEventListener('click', () => {
    const text = importText.value.trim();
    if (!text) {
      showStatus("Please paste a JSON configuration first.", "error");
      return;
    }
    loadJSON(text);
  });

  // Clear workspace
  btnClearWorkspace.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the workspace? This will delete all current models and unsaved progress.")) {
      initDefaultState();
      importText.value = "";
      showStatus("Workspace cleared.", "info");
    }
  });

  // Drag and Drop files
  dropzone.addEventListener('click', () => {
    fileUploader.click();
  });

  fileUploader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      readAndLoadFile(file);
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/json" || file.name.endsWith('.json')) {
      readAndLoadFile(file);
    } else {
      showStatus("Please drop a valid JSON file.", "error");
    }
  });

  function readAndLoadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      loadJSON(e.target.result);
    };
    reader.onerror = () => {
      showStatus("Failed to read file.", "error");
    };
    reader.readAsText(file);
  }

  // ── GENERATE JSON FROM LOCAL FOLDER STRUCTURE ──────────────────────────
  const folderDropzone = document.getElementById('folder-dropzone');
  const folderUploader = document.getElementById('folder-uploader');
  const folderDropzoneText = document.getElementById('folder-dropzone-text');
  const folderScanSummary = document.getElementById('folder-scan-summary');
  const folderScanStats = document.getElementById('folder-scan-stats');
  const btnGenerateFromFolder = document.getElementById('btn-generate-from-folder');
  const folderBasePathInput = document.getElementById('folder-base-path');

  let currentScannedFolderFiles = [];
  let currentScannedFoldersSet = new Set();

  if (folderDropzone && folderUploader) {
    folderDropzone.addEventListener('click', () => {
      folderUploader.click();
    });

    folderUploader.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      const fileList = [];
      const folderSet = new Set();
      
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const path = f.webkitRelativePath || f.name;
        if (f.name === '.DS_Store' || f.name.toLowerCase() === 'thumbs.db' || f.name.startsWith('._')) continue;
        
        fileList.push({ file: f, path: path });
        let parts = path.split('/');
        parts.pop();
        let cur = '';
        parts.forEach(p => {
          cur = cur ? cur + '/' + p : p;
          folderSet.add(cur);
        });
      }
      
      handleScannedFolderFiles(folderSet, fileList);
    });

    folderDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      folderDropzone.classList.add('dragover');
    });

    folderDropzone.addEventListener('dragleave', () => {
      folderDropzone.classList.remove('dragover');
    });

    folderDropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      folderDropzone.classList.remove('dragover');
      
      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;
      
      const fileList = [];
      const folderSet = new Set();
      
      async function traverseEntry(item, path = '') {
        if (item.isFile) {
          return new Promise((resolve) => {
            item.file((file) => {
              if (file.name !== '.DS_Store' && file.name.toLowerCase() !== 'thumbs.db' && !file.name.startsWith('._')) {
                fileList.push({ file: file, path: path + file.name });
              }
              resolve();
            });
          });
        } else if (item.isDirectory) {
          folderSet.add(path + item.name);
          const dirReader = item.createReader();
          let allEntries = [];
          
          const readAll = () => {
            return new Promise((resolve) => {
              dirReader.readEntries((entries) => {
                if (entries.length === 0) resolve(allEntries);
                else {
                  allEntries = allEntries.concat(entries);
                  readAll().then(resolve);
                }
              });
            });
          };
          
          const entries = await readAll();
          for (const entry of entries) {
            await traverseEntry(entry, path + item.name + '/');
          }
        }
      }

      const entries = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
        if (entry) entries.push(entry);
      }

      if (entries.length > 0) {
        for (const entry of entries) {
          await traverseEntry(entry);
        }
      } else {
        // Fallback for regular files dropped
        const files = e.dataTransfer.files;
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const path = f.webkitRelativePath || f.name;
          if (f.name !== '.DS_Store' && f.name.toLowerCase() !== 'thumbs.db' && !f.name.startsWith('._')) {
            fileList.push({ file: f, path: path });
          }
        }
      }

      handleScannedFolderFiles(folderSet, fileList);
    });
  }

  const btnOpenRenamer = document.getElementById('btn-open-renamer');
  const renamerModal = document.getElementById('renamer-modal');
  const renamerModalClose = document.getElementById('renamer-modal-close');
  const renamerModalCancel = document.getElementById('renamer-modal-cancel');
  const btnApplyRenamerJson = document.getElementById('btn-apply-renamer-json');
  const btnRenamerInvertAll = document.getElementById('btn-renamer-invert-all');
  const renamerTreeSummary = document.getElementById('renamer-tree-summary');
  const renamerTreeView = document.getElementById('renamer-tree-view');

  let renamerCurrentTree = null;
  let renamerFolderInversionStates = {};
  let renamerAllInverted = false;

  function handleScannedFolderFiles(foldersSet, fileList) {
    currentScannedFoldersSet = foldersSet;
    currentScannedFolderFiles = fileList;

    if (fileList.length === 0) {
      if (folderScanSummary) folderScanSummary.style.display = 'none';
      if (btnGenerateFromFolder) btnGenerateFromFolder.disabled = true;
      if (btnOpenRenamer) btnOpenRenamer.disabled = true;
      if (folderDropzoneText) folderDropzoneText.textContent = 'Drag & Drop 360 Folder here, or click to browse';
      return;
    }

    if (folderScanSummary) folderScanSummary.style.display = 'block';
    if (folderScanStats) {
      folderScanStats.textContent = `Scanned ${fileList.length} file(s) across ${foldersSet.size} folder(s). Ready to generate JSON!`;
    }
    if (folderDropzoneText) {
      folderDropzoneText.textContent = `✓ Folder loaded (${fileList.length} file(s) detected)`;
    }
    if (btnGenerateFromFolder) {
      btnGenerateFromFolder.disabled = false;
    }
    if (btnOpenRenamer) {
      btnOpenRenamer.disabled = false;
    }
  }

  if (btnOpenRenamer) {
    btnOpenRenamer.addEventListener('click', () => {
      if (currentScannedFolderFiles.length === 0) {
        alert("Please drop or browse a folder first.");
        return;
      }
      if (renamerModal) renamerModal.style.display = 'flex';
      buildAndRenderRenamerTree();
    });
  }

  function closeRenamerModal() {
    if (renamerModal) renamerModal.style.display = 'none';
  }

  if (renamerModalClose) renamerModalClose.addEventListener('click', closeRenamerModal);
  if (renamerModalCancel) renamerModalCancel.addEventListener('click', closeRenamerModal);

  if (btnRenamerInvertAll) {
    btnRenamerInvertAll.addEventListener('click', () => {
      renamerAllInverted = !renamerAllInverted;
      currentScannedFolderFiles.forEach(f => {
        let origParent = f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : '';
        renamerFolderInversionStates[origParent] = renamerAllInverted;
      });
      if (renamerAllInverted) {
        btnRenamerInvertAll.textContent = 'Numeration Inverted ✓';
        btnRenamerInvertAll.style.background = '#38bdf8';
        btnRenamerInvertAll.style.color = '#0f172a';
      } else {
        btnRenamerInvertAll.textContent = 'Invert All Numeration ⇄';
        btnRenamerInvertAll.style.background = 'transparent';
        btnRenamerInvertAll.style.color = '#38bdf8';
      }
      buildAndRenderRenamerTree();
    });
  }

  function buildAndRenderRenamerTree() {
    if (currentScannedFolderFiles.length === 0) return;
    
    const selectedLocale = document.querySelector('input[name="folder-locale"]:checked')?.value || 'us';
    const selectedExt = document.querySelector('input[name="folder-ext"]:checked')?.value || 'jpeg';

    let renameResults = { cleanedFolders: [], cleanedFiles: [], renameCount: 0 };
    if (window.AEM360Renamer) {
      renameResults = window.AEM360Renamer.processDroppedFiles(
        currentScannedFoldersSet,
        currentScannedFolderFiles,
        selectedLocale,
        '',
        selectedExt,
        renamerFolderInversionStates
      );
    } else {
      renameResults = {
        cleanedFolders: Array.from(currentScannedFoldersSet),
        cleanedFiles: currentScannedFolderFiles.map(f => ({ file: f.file, path: f.path, originalPath: f.path })),
        renameCount: 0
      };
    }

    const { cleanedFolders, cleanedFiles } = renameResults;
    if (renamerTreeSummary) {
      renamerTreeSummary.textContent = `${cleanedFolders.length} folder(s), ${cleanedFiles.length} file(s) detected. Edit folder names below:`;
    }

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

    renamerCurrentTree = tree;

    function updateRenamerPreviews() {
      function simulateTraverse(n, pathKeys = []) {
        let currentPathKeys = [...pathKeys];
        if (n._id) {
          const inputEl = document.getElementById(n._id);
          let newName = inputEl ? inputEl.value.trim() : n._name;
          const activeLocale = document.querySelector('input[name="folder-locale"]:checked')?.value || 'us';
          let oldClean = window.AEM360Renamer ? window.AEM360Renamer.cleanFordName(n._name, activeLocale, true) : n._name;
          newName = window.AEM360Renamer ? window.AEM360Renamer.cleanFordName(newName, activeLocale, true) : newName;
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

    let nodeIdCounter = 0;
    function renderTree(node, depth = 0) {
      const frag = document.createDocumentFragment();
      const keys = Object.keys(node._children).sort();
      
      keys.forEach((key) => {
        const childNode = node._children[key];
        childNode._id = 'renamer_tree_node_' + (++nodeIdCounter);
        const hasChildren = Object.keys(childNode._children).length > 0;
        
        const details = document.createElement('details');
        details.open = false;
        if (depth !== 0) details.style.marginTop = '4px';
        
        const summary = document.createElement('summary');
        summary.style.cssText = 'cursor: pointer; font-family: system-ui, -apple-system, sans-serif; color: #f8fafc; padding: 2px 0; font-size: 13px; font-weight: 500; user-select: none; transition: color 0.2s; display: flex; align-items: center;';
        
        const folderIconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        folderIconSvg.setAttribute("width", "14"); folderIconSvg.setAttribute("height", "14"); folderIconSvg.setAttribute("viewBox", "0 0 24 24"); folderIconSvg.setAttribute("fill", "#a855f7"); folderIconSvg.setAttribute("stroke", "#c084fc"); folderIconSvg.setAttribute("stroke-width", "1.5"); folderIconSvg.setAttribute("stroke-linecap", "round"); folderIconSvg.setAttribute("stroke-linejoin", "round"); folderIconSvg.style.cssText = 'margin-right: 6px; flex-shrink: 0;';
        const folderIconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        folderIconPath.setAttribute("d", "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z");
        folderIconSvg.appendChild(folderIconPath);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tree-input';
        input.id = childNode._id;
        input.value = childNode._name;
        input.style.cssText = 'background: rgba(0,0,0,0.3); border: 1px dashed rgba(168, 85, 247, 0.4); color: #c084fc; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: monospace; outline: none; margin-left: 4px; width: 220px;';
        input.addEventListener('click', e => e.stopPropagation());
        input.addEventListener('keydown', e => e.stopPropagation());
        input.addEventListener('keyup', e => e.stopPropagation());
        input.addEventListener('input', e => {
          e.stopPropagation();
          updateRenamerPreviews();
        });
        
        summary.appendChild(folderIconSvg);
        summary.appendChild(input);
        details.appendChild(summary);
        
        const childContainer = document.createElement('div');
        childContainer.style.cssText = 'border-left: 1px solid rgba(168, 85, 247, 0.2); margin-left: 11px; padding-left: 10px;';
        
        if (childNode._info) {
          const info = childNode._info;
          const countSpan = document.createElement('span');
          countSpan.style.cssText = 'font-size: 11px; color: #94a3b8; font-family: monospace; margin-left: 8px;';
          countSpan.textContent = `(${info.filesCount} files)`;
          summary.appendChild(countSpan);
        }
        
        if (hasChildren) {
          childContainer.appendChild(renderTree(childNode, depth + 1));
        }
        
        details.appendChild(childContainer);
        frag.appendChild(details);
      });
      return frag;
    }

    if (renamerTreeView) {
      renamerTreeView.replaceChildren();
      if (groupKeys.length === 0) {
        const div = document.createElement('div');
        div.style.cssText = 'color: #cbd5e1; text-align: center; margin-top: 20px; font-size: 13px;';
        div.textContent = 'No folders found.';
        renamerTreeView.appendChild(div);
      } else {
        const treeContainer = document.createElement('div');
        treeContainer.style.background = 'rgba(15, 23, 42, 0.6)';
        treeContainer.style.border = '1px solid rgba(168, 85, 247, 0.3)';
        treeContainer.style.borderRadius = '8px';
        treeContainer.style.padding = '12px';
        treeContainer.appendChild(renderTree(tree));
        renamerTreeView.appendChild(treeContainer);
      }
    }
  }

  function traverseAndBuildRenamerTree(node, currentPath = '', pathKeys = []) {
    const finalFiles = [];

    function traverse(n, currPath, pKeys) {
      let myPath = currPath;
      let currentPathKeys = [...pKeys];
      
      if (n._id) {
        const inputEl = document.getElementById(n._id);
        let newName = inputEl ? inputEl.value.trim() : n._name;
        
        const activeLocale = document.querySelector('input[name="folder-locale"]:checked')?.value || 'us';
        let oldClean = n._name;
        if (window.AEM360Renamer) {
          oldClean = window.AEM360Renamer.cleanFordName(n._name, activeLocale, true);
          newName = window.AEM360Renamer.cleanFordName(newName, activeLocale, true);
        }
        
        currentPathKeys.push({ old: n._name, new: newName, oldClean: oldClean });
        myPath = currPath ? `${currPath}/${newName}` : newName;
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
          
          let newFilePath = myPath ? `${myPath}/${finalFileName}` : finalFileName;
          finalFiles.push({
            path: newFilePath
          });
        });
      }
      
      Object.values(n._children).forEach(child => {
        traverse(child, myPath, currentPathKeys);
      });
    }

    traverse(node, currentPath, pathKeys);
    return finalFiles;
  }

  if (btnApplyRenamerJson) {
    btnApplyRenamerJson.addEventListener('click', () => {
      if (!renamerCurrentTree) return;

      const selectedBrand = document.querySelector('input[name="folder-brand"]:checked')?.value || 'ford';
      const selectedLocale = document.querySelector('input[name="folder-locale"]:checked')?.value || 'us';
      const selectedExt = document.querySelector('input[name="folder-ext"]:checked')?.value || 'jpeg';
      const localeFolder = selectedLocale === 'ca' ? 'en_ca' : 'en_us';
      let customBasePath = folderBasePathInput ? folderBasePathInput.value.trim() : '';

      if (!customBasePath) {
        customBasePath = `/content/dam/na/${selectedBrand}/${localeFolder}/images/vehicle/2027/360`;
      }

      const finalFiles = traverseAndBuildRenamerTree(renamerCurrentTree);
      const generatedModels = parseColorizerBaseJSON(finalFiles, customBasePath, selectedExt, selectedBrand, localeFolder);

      if (!generatedModels || generatedModels.length === 0) {
        alert("No models or color structures detected in the tree.");
        return;
      }

      const jsonString = JSON.stringify(generatedModels, null, 4);
      loadJSON(jsonString);
      closeRenamerModal();
      showStatus(`Successfully applied renames & generated JSON from folder with ${generatedModels.length} model(s).`, "success");
    });
  }

  if (btnGenerateFromFolder) {
    btnGenerateFromFolder.addEventListener('click', () => {
      if (currentScannedFolderFiles.length === 0) {
        alert("Please drop or browse a folder first.");
        return;
      }

      const selectedBrand = document.querySelector('input[name="folder-brand"]:checked')?.value || 'ford';
      const selectedLocale = document.querySelector('input[name="folder-locale"]:checked')?.value || 'us';
      const selectedExt = document.querySelector('input[name="folder-ext"]:checked')?.value || 'jpeg';
      const localeFolder = selectedLocale === 'ca' ? 'en_ca' : 'en_us';
      let customBasePath = folderBasePathInput ? folderBasePathInput.value.trim() : '';

      if (!customBasePath) {
        customBasePath = `/content/dam/na/${selectedBrand}/${localeFolder}/images/vehicle/2027/360`;
      }

      let renameResults = { cleanedFolders: [], cleanedFiles: [], renameCount: 0 };
      if (window.AEM360Renamer) {
        renameResults = window.AEM360Renamer.processDroppedFiles(
          currentScannedFoldersSet,
          currentScannedFolderFiles,
          selectedLocale,
          '',
          selectedExt
        );
      } else {
        renameResults.cleanedFiles = currentScannedFolderFiles.map(f => ({ file: f.file, path: f.path, originalPath: f.path }));
      }

      const generatedModels = parseColorizerBaseJSON(renameResults.cleanedFiles, customBasePath, selectedExt, selectedBrand, localeFolder);

      if (!generatedModels || generatedModels.length === 0) {
        alert("No models or color structures detected in the scanned folder.");
        return;
      }

      const jsonString = JSON.stringify(generatedModels, null, 4);
      loadJSON(jsonString);
      showStatus(`Successfully generated JSON from folder with ${generatedModels.length} model(s).`, "success");
    });
  }

  function parseColorizerBaseJSON(cleanedFiles, basePath, extOption = 'jpeg', brand = 'ford', locale = 'en_us') {
    const modelsMap = {};
    
    cleanedFiles.forEach(cf => {
      const parts = cf.path.split('/');
      const filteredParts = parts.filter(p => p);
      
      const viewIdx = filteredParts.findIndex(p => p.toLowerCase() === 'exterior' || p.toLowerCase() === 'interior');
      if (viewIdx === -1 || viewIdx === 0) return;
      
      const modelId = filteredParts[viewIdx - 1];
      
      if (!modelsMap[modelId]) {
        const modelName = modelId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const partsBeforeModel = filteredParts.slice(0, viewIdx - 1).join('/');
        const urlBase = partsBeforeModel ? `${basePath}/${partsBeforeModel}` : basePath;
        
        modelsMap[modelId] = {
          model: modelName,
          modelId: modelId,
          brand: brand,
          locale: locale,
          exteriorColors: [],
          wheelTypes: [],
          interiorColors: [],
          exterior_angles: 36,
          exterior_start_angle: 1,
          exterior360imageurl: `${urlBase}/${modelId}/exterior/{device}/{exteriorcolor}/{wheel}/00{exterior_start_angle}-{exteriorcolor}-{wheel}.${extOption}`.replace(/\/\//g, '/'),
          "exterior-slider-view": "false",
          interior_angles: 36,
          interior_start_angle: 1,
          "interior-dome-view": "false",
          interior360imageurl: `${urlBase}/${modelId}/interior/{device}/{interiorcolor}/00{interior_start_angle}-{interiorcolor}.${extOption}`.replace(/\/\//g, '/'),
          configuratorurl: `&trim=${modelId}`
        };
      }
      const modelObj = modelsMap[modelId];
      const viewType = filteredParts[viewIdx].toLowerCase();
      
      if (viewType === 'exterior') {
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
    
    return Object.values(modelsMap);
  }

  // ── EXPORT ACTIONS (COPY / DOWNLOAD) ──────────────────────────────────
  
  // Copy to clipboard
  btnCopyJson.addEventListener('click', () => {
    const jsonString = getCleanExportJSON();
    navigator.clipboard.writeText(jsonString).then(() => {
      const originalText = btnCopyJson.innerHTML;
      btnCopyJson.innerHTML = `
        <svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-green);"><polyline points="20 6 9 17 4 12"/></svg>
        Copied!
      `;
      btnCopyJson.style.backgroundColor = 'rgba(74, 222, 128, 0.15)';
      btnCopyJson.style.borderColor = 'var(--accent-green)';
      btnCopyJson.style.color = 'var(--accent-green)';
      
      setTimeout(() => {
        btnCopyJson.innerHTML = originalText;
        btnCopyJson.style.backgroundColor = '';
        btnCopyJson.style.borderColor = '';
        btnCopyJson.style.color = '';
      }, 1500);
    }).catch(err => {
      alert("Failed to copy JSON: " + err);
    });
  });

  // Download JSON file
  btnDownloadJson.addEventListener('click', () => {
    if (modelsState.length === 0) {
      alert("No configurations to download. Build or import a model first.");
      return;
    }

    const jsonString = getCleanExportJSON();
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Resolve clean filename from model IDs
    let filename = "colorizer-config.json";
    if (modelsState.length === 1 && modelsState[0].modelId) {
      filename = `${modelsState[0].modelId}-colorizer.json`;
    } else if (modelsState.length > 1) {
      // Use common identifier from the first model
      filename = `${modelsState[0].modelId}-multi-colorizer.json`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // ── INITIALIZATION ────────────────────────────────────────────────────
  initDefaultState();
});
