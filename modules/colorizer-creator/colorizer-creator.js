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

  // Model Form Fields
  const mName = document.getElementById('m-name');
  const mId = document.getElementById('m-id');
  const mBrandLincoln = document.getElementById('m-brand-lincoln');
  const mBrandFord = document.getElementById('m-brand-ford');
  const mLocaleCa = document.getElementById('m-locale-ca');
  const mLocaleUs = document.getElementById('m-locale-us');
  const mYear = document.getElementById('m-year');
  const mExtJpeg = document.getElementById('m-ext-jpeg');
  const mExtJpg = document.getElementById('m-ext-jpg');
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
          const name = extractField(p, 'Name') || extractField(p, 'Display Name');
          const salesCode = extractField(p, 'Sales Code');
          const id = extractField(p, 'Id');
          const color = extractField(p, 'Color');
          if (name) {
            parsedExterior.push({
              name: name,
              id: salesCode || id || '',
              hexcode: color || '#1b1b1d',
              costlabel: '',
              shortName: generateExteriorShortName(name, usedExtShortNames)
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
          const name = extractField(p, 'Name') || extractField(p, 'Display Name');
          const salesCode = extractField(p, 'Sales Code');
          const id = extractField(p, 'Id');
          const color = extractField(p, 'Color');
          if (name) {
            parsedInterior.push({
              name: name,
              id: salesCode || id || '',
              hexcode: color || '#1b1b1d',
              costlabel: '',
              shortName: toShortName(name),
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
      function mergeItems(targetArray, newItems, modelName) {
        newItems.forEach(newItem => {
          // Clone the item to avoid reference issues if applying to multiple models
          const clonedItem = JSON.parse(JSON.stringify(newItem));
          const existingItem = targetArray.find(item => 
            item.name.toLowerCase() === clonedItem.name.toLowerCase() || 
            (item.id && clonedItem.id && item.id === clonedItem.id)
          );
          
          if (!existingItem) {
            targetArray.push(clonedItem);
          } else {
            // Mismatch check for hexcode (prioritizing the router's hexcode as requested)
            if (clonedItem.hexcode && existingItem.hexcode && clonedItem.hexcode.toLowerCase() !== existingItem.hexcode.toLowerCase()) {
              console.warn(`⚠️ [VML 360 Tool - ${modelName}] HEX color mismatch for "${clonedItem.name}". Existing JSON had ${existingItem.hexcode}, but Router says ${clonedItem.hexcode}. The Router value has been prioritized.`);
              existingItem.hexcode = clonedItem.hexcode;
            }
          }
        });
      }

      modelsState.forEach((model, idx) => {
        if (!model.exteriorColors) model.exteriorColors = [];
        if (!model.interiorColors) model.interiorColors = [];
        if (!model.wheelTypes) model.wheelTypes = [];

        // Apply global generic colors (if parsed from old format without trims) ONLY to the active model
        if (idx === activeModelIndex) {
          if (parsedExterior.length > 0) mergeItems(model.exteriorColors, parsedExterior, model.model);
          if (parsedInterior.length > 0) mergeItems(model.interiorColors, parsedInterior, model.model);
          if (parsedWheels.length > 0) mergeItems(model.wheelTypes, parsedWheels, model.model);
        }
        
        // Apply trim-specific colors (if parsed from new format) to all matching models
        const trimSpecificData = parsedByTrim[model.model.toLowerCase()];
        if (trimSpecificData) {
          if (trimSpecificData.exterior.length > 0) mergeItems(model.exteriorColors, trimSpecificData.exterior, model.model);
          if (trimSpecificData.interior.length > 0) mergeItems(model.interiorColors, trimSpecificData.interior, model.model);
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
        pill.innerHTML = `
          <div class="catalog-pill-swatch" style="background-color: ${escapeHTML(color.hexcode || '#000')};"></div>
          <span>${escapeHTML(color.name)} (${escapeHTML(color.id)})</span>
        `;
        pill.addEventListener('click', () => {
          ecName.value = color.name;
          ecId.value = color.id;
          ecHex.value = color.hexcode || '#1b1b1d';
          ecPicker.value = color.hexcode || '#1b1b1d';
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
        pill.innerHTML = `
          <div class="catalog-pill-swatch" style="background-color: ${escapeHTML(color.hexcode || '#000')};"></div>
          <span>${escapeHTML(color.name)} (${escapeHTML(color.id)})</span>
        `;
        pill.addEventListener('click', () => {
          icName.value = color.name;
          icId.value = color.id;
          icHex.value = color.hexcode || '#1b1b1d';
          icPicker.value = color.hexcode || '#1b1b1d';
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
    mYear.value = currentModel.year || '2027';
    
    // Brand and Locale radios checked state
    const brand = currentModel.brand || 'ford';
    const locale = currentModel.locale || 'en_us';
    const extension = currentModel.extension || 'jpeg';
    
    if (brand === 'lincoln') {
      mBrandLincoln.checked = true;
    } else {
      mBrandFord.checked = true;
    }
    
    if (locale === 'en_ca') {
      mLocaleCa.checked = true;
    } else {
      mLocaleUs.checked = true;
    }

    if (extension === 'jpg') {
      mExtJpg.checked = true;
    } else {
      mExtJpeg.checked = true;
    }

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
      tdSwatch.innerHTML = `<div class="color-swatch-preview" style="background-color: ${escapeHTML(color.hexcode || '#000')};"></div>`;
      
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
        ecHex.value = color.hexcode || '#1b1b1d';
        ecPicker.value = color.hexcode || '#1b1b1d';
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
      tdSwatch.innerHTML = `<div class="color-swatch-preview" style="background-color: ${escapeHTML(color.hexcode || '#000')};"></div>`;

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
        icHex.value = color.hexcode || '#1b1b1d';
        icPicker.value = color.hexcode || '#1b1b1d';
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
          // Check for unique sales codes
          const ids = m.exteriorColors.map(c => c.id).filter(id => id.trim() !== "");
          const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
          if (duplicates.length > 0) {
            addValidationItem(`[${modelLabel}] Duplicate VDM Codes in Exterior: ${duplicates.join(', ')}`, "warning");
            warningsCount++;
          }
        }

        // Wheel validation
        if (!m.wheelTypes || m.wheelTypes.length === 0) {
          addValidationItem(`[${modelLabel}] Has no wheel types configured.`, "warning");
          warningsCount++;
        }

        // Interior Colors validation
        if (!m.interiorColors || m.interiorColors.length === 0) {
          addValidationItem(`[${modelLabel}] Has no interior colors.`, "warning");
          warningsCount++;
        }
      });
    }

    if (warningsCount > 0) {
      validationBadge.textContent = "Incomplete";
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

  // Auto update URL templates based on brand, locale, year, extension and name
  function autoUpdateUrls() {
    if (activeModelIndex < 0 || activeModelIndex >= modelsState.length) return;
    const currentModel = modelsState[activeModelIndex];
    const vehicle = getVehicleFolder(currentModel.model);
    const brand = currentModel.brand || 'ford';
    const locale = currentModel.locale || 'en_us';
    const year = currentModel.year || '2027';
    const ext = currentModel.extension || 'jpeg';
    
    const extUrlTemplate = `/content/dam/na/${brand}/${locale}/images/${vehicle}/${year}/360/{modelId}/{view}/{device}/{exteriorcolor}/{wheel}/00{exterior_start_angle}-{exteriorcolor}-{wheel}.${ext}`;
    const intUrlTemplate = `/content/dam/na/${brand}/${locale}/images/${vehicle}/${year}/360/{modelId}/{view}/{device}/{interiorcolor}/00{interior_start_angle}-{interiorcolor}.${ext}`;
    
    currentModel.exterior360imageurl = extUrlTemplate;
    currentModel.interior360imageurl = intUrlTemplate;
    
    mExtUrl.value = extUrlTemplate;
    mIntUrl.value = intUrlTemplate;
  }

  mName.addEventListener('input', () => {
    updateActiveModelProperty('model', mName.value.trim());
    autoUpdateUrls();
    renderJSONOutput();
  });
  mId.addEventListener('input', () => updateActiveModelProperty('modelId', mId.value.trim()));

  mYear.addEventListener('input', () => {
    updateActiveModelProperty('year', mYear.value.trim());
    autoUpdateUrls();
    renderJSONOutput();
  });
  
  // Brand & Locale & Extension Radio events
  document.querySelectorAll('input[name="m-brand"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (activeModelIndex >= 0 && activeModelIndex < modelsState.length) {
        modelsState[activeModelIndex].brand = radio.value;
        autoUpdateUrls();
        renderJSONOutput();
        validateConfig();
      }
    });
  });

  document.querySelectorAll('input[name="m-locale"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (activeModelIndex >= 0 && activeModelIndex < modelsState.length) {
        modelsState[activeModelIndex].locale = radio.value;
        autoUpdateUrls();
        renderJSONOutput();
        validateConfig();
      }
    });
  });

  document.querySelectorAll('input[name="m-ext"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (activeModelIndex >= 0 && activeModelIndex < modelsState.length) {
        modelsState[activeModelIndex].extension = radio.value;
        autoUpdateUrls();
        renderJSONOutput();
        validateConfig();
      }
    });
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
    ecPicker.value = "#1b1b1d";
    ecHex.value = "#1b1b1d";
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
    icPicker.value = "#1b1b1d";
    icHex.value = "#1b1b1d";
    refreshUI();
  });

  // ── IMPORT JSON PARSER & ACTION ───────────────────────────────────────
  
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
            hexcode: c.hexcode || '#1b1b1d',
            costlabel: c.costlabel || ''
          })) : [],
          wheelTypes: Array.isArray(m.wheelTypes) ? m.wheelTypes.map(w => ({
            name: w.name || '',
            id: w.id || '',
            thumbnail: w.thumbnail || '',
            shortName: w.shortName || w.id.toLowerCase(),
            costlabel: w.costlabel || ''
          })) : [],
          interiorColors: Array.isArray(m.interiorColors) ? m.interiorColors.map(i => ({
            name: i.name || '',
            id: i.id || '',
            thumbnail: i.thumbnail || '',
            shortName: i.shortName || toShortName(i.name),
            hexcode: i.hexcode || '#1b1b1d',
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
