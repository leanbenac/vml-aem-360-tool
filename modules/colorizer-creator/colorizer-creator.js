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
  const btnClearWorkspaceSidebar = document.getElementById('btn-clear-workspace-sidebar');
  const clearConfirmModal = document.getElementById('clear-confirm-modal');
  const btnCancelClearModal = document.getElementById('btn-cancel-clear-modal');
  const btnConfirmClearModal = document.getElementById('btn-confirm-clear-modal');
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

  // Normalize paint abbreviations to expand words like 'flm', 'plat', 'blk' for smart color matching
  function normalizeAbbreviations(name) {
    if (!name) return '';
    return name.toLowerCase()
      .replace(/\bflm\b/g, 'flame')
      .replace(/\bplat\b/g, 'platinum')
      .replace(/\bblk\b/g, 'black')
      .replace(/\bgry\b/g, 'gray')
      .replace(/\bgray\b/g, 'grey') // unify gray/grey
      .replace(/\bslvr\b/g, 'silver')
      .replace(/\bwht\b/g, 'white')
      .replace(/\bblu\b/g, 'blue')
      .replace(/\bmet\b/g, 'metallic')
      .replace(/\bclr\b/g, 'clear')
      .replace(/\brd\b/g, 'red')
      .replace(/\bcarb\b/g, 'carbonized')
      .replace(/\bicon\b/g, 'iconic')
      .replace(/\btrans\b/g, 'transparent')
      .replace(/[^a-z0-9\s]/g, ' ') // replace punctuation with space
      .replace(/\s+/g, ' ')
      .trim();
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
      updateActiveModelBanner();
    });
  });

  // Switch tab via data-target-tab attribute (CSP compliant)
  document.querySelectorAll('[data-target-tab]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = el.dataset.targetTab;
      const tabBtn = document.querySelector(`.w-tab-btn[data-tab="${targetId}"]`);
      if (tabBtn) {
        tabBtn.click();
      }
    });
  });

  // Exclusive accordion for Init tab (tabImport)
  const accordions = document.querySelectorAll('#tabImport details.accordion-card');
  accordions.forEach(acc => {
    acc.addEventListener('toggle', () => {
      if (acc.open) {
        accordions.forEach(other => {
          if (other !== acc) {
            other.open = false;
          }
        });
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
    const normTarget = normalizeAbbreviations(name);
    for (const m of modelsState) {
      const colors = type === 'exterior' ? m.exteriorColors : m.interiorColors;
      const found = (colors || []).find(c => {
        if (!c || !c.name) return false;
        const normC = normalizeAbbreviations(c.name);
        return normC === normTarget || normC.includes(normTarget) || normTarget.includes(normC);
      });
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

  // ── SMART PARSER & DATA SYNC REVIEW MODAL ENGINE ──────────────────────
  
  // Helper to extract hex codes and color info from text in any format
  function parseSmartRouterAndVDMText(text) {
    console.log('🔍 [VML Smart Parse] Starting parsing of input text (length:', text ? text.length : 0, ')');
    const result = {
      exteriorColors: [],
      interiorColors: [],
      wheelTypes: [],
      parsedTrims: []
    };

    if (!text || !text.trim()) return result;

    const usedExtShortNames = new Set();
    
    // Helper to generate shortName with max 2 words (or 3 if conflict)
    function generateExteriorShortName(name) {
      const fullSlug = toShortName(name);
      const words = fullSlug.split('-');
      if (words.length <= 2) return fullSlug;
      
      let attempt = words.slice(0, 2).join('-');
      if (!usedExtShortNames.has(attempt)) {
        usedExtShortNames.add(attempt);
        return attempt;
      }
      
      attempt = words.slice(0, 3).join('-');
      if (!usedExtShortNames.has(attempt)) {
        usedExtShortNames.add(attempt);
        return attempt;
      }
      
      usedExtShortNames.add(fullSlug);
      return fullSlug;
    }

    function extractField(block, fieldName) {
      const regex = new RegExp(`^${fieldName}\\s*\\n(.+)`, 'm');
      const match = block.match(regex);
      return match ? match[1].trim() : '';
    }

    function detectExtraCost(line) {
      return /(extra\s*cost|extra-cost|tri-coat|tinted\s*clearcoat)/i.test(line);
    }

    function cleanColorName(name) {
      if (!name) return '';
      return name
        .replace(/^hex[-_\s]*colou?rs?[:\s]*/i, '')
        .replace(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})[\s:-]*/i, '')
        .replace(/[\s:-]*#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i, '')
        .replace(/\b([A-Fa-f0-9]{6})\b[\s:-]*/i, '')
        .replace(/\s*\((extra\s*cost|extra-cost\s*colour)\)/gi, '')
        .replace(/\s*\(extra\s*cost\)/gi, '')
        .replace(/\s*tri-coat/gi, ' Tri-Coat')
        .replace(/\s*tinted\s*clearcoat/gi, ' Tinted Clearcoat')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Split text by Interior separator if present
    const splitByInterior = text.split(/_{10,}\s*\n\s*Interior/i);
    const exteriorText = splitByInterior[0] || text;
    const interiorText = splitByInterior[1] || '';

    // 1. Check for VDM structured block format (Part Class - Paint Type / Interior Trim Colour / Wheel Type)
    const paintMatch = text.split(/Part Class\s*-\s*Paint Type/i);
    if (paintMatch.length > 1) {
      const paintText = paintMatch[1].split(/Part Class\s*-/i)[0];
      const parts = paintText.split(/Part\s*-/).slice(1);
      parts.forEach(p => {
        const rawDisplayName = extractField(p, 'Display Name');
        const rawName = extractField(p, 'Name');
        const primaryName = rawDisplayName || rawName;
        const salesCode = extractField(p, 'Sales Code') || extractField(p, 'Id');
        const color = extractField(p, 'Color');
        if (primaryName) {
          const cleaned = cleanColorName(primaryName);
          result.exteriorColors.push({
            name: cleaned,
            displayName: cleanColorName(rawDisplayName),
            rawName: cleanColorName(rawName),
            id: salesCode || '',
            hexcode: color && color.startsWith('#') ? color.toLowerCase() : (color ? '#' + color.toLowerCase() : ''),
            costlabel: detectExtraCost(primaryName) ? '(extra-cost colour)' : '',
            shortName: generateExteriorShortName(cleaned),
            isInterior: false
          });
        }
      });
    }

    const intMatch = text.split(/Part Class\s*-\s*Interior Trim Colour/i);
    if (intMatch.length > 1) {
      const intText = intMatch[1].split(/Part Class\s*-/i)[0];
      const parts = intText.split(/Part\s*-/).slice(1);
      parts.forEach(p => {
        const rawDisplayName = extractField(p, 'Display Name');
        const rawName = extractField(p, 'Name');
        const primaryName = rawDisplayName || rawName;
        const salesCode = extractField(p, 'Sales Code') || extractField(p, 'Id');
        const color = extractField(p, 'Color');
        if (primaryName) {
          const cleaned = cleanColorName(primaryName);
          result.interiorColors.push({
            name: cleaned,
            displayName: cleanColorName(rawDisplayName),
            rawName: cleanColorName(rawName),
            id: salesCode || '',
            hexcode: color && color.startsWith('#') ? color.toLowerCase() : (color ? '#' + color.toLowerCase() : ''),
            costlabel: detectExtraCost(primaryName) ? '(extra-cost colour)' : '',
            shortName: toShortName(cleaned),
            imageURL: '',
            isInterior: true
          });
        }
      });
    }

    const wheelMatch = text.split(/Part Class\s*-\s*Wheel Type/i);
    if (wheelMatch.length > 1) {
      const wheelText = wheelMatch[1].split(/Part Class\s*-/i)[0];
      const parts = wheelText.split(/Part\s*-/).slice(1);
      parts.forEach(p => {
        const name = extractField(p, 'Name') || extractField(p, 'Display Name');
        const salesCode = extractField(p, 'Sales Code') || extractField(p, 'Id');
        if (name) {
          result.wheelTypes.push({
            name: name,
            id: salesCode || '',
            shortName: (salesCode || '').toLowerCase()
          });
        }
      });
    }

    // 2. Parse Line-by-Line Hex formats (supports "#1b1b1d Agate..." or "1b1b1d Agate..." or "hex-colour #1b1b1d...")
    function parseLinesForColors(sectionText, isInterior) {
      const colors = [];
      const lines = sectionText.split(/\r?\n/);
      // Matches hex codes with or without leading #
      const hexRegex = /(#?[A-Fa-f0-9]{6})\b/i;

      lines.forEach(line => {
        const match = line.match(hexRegex);
        if (match) {
          let hex = match[1].toLowerCase();
          if (!hex.startsWith('#')) hex = '#' + hex;

          let namePart = line.replace(match[0], '');
          namePart = namePart
            .replace(/hex[-_\s]*colou?rs?/gi, '')
            .replace(/^[\s:-]+|[\s:-]+$/g, '')
            .trim();

          const cleanedName = cleanColorName(namePart || line);
          if (cleanedName && cleanedName.length > 1) {
            const isExtraCost = detectExtraCost(line);
            colors.push({
              name: cleanedName,
              id: '',
              hexcode: hex,
              costlabel: isExtraCost ? '(extra-cost colour)' : '',
              shortName: isInterior ? toShortName(cleanedName) : generateExteriorShortName(cleanedName),
              isInterior: isInterior
            });
          }
        }
      });
      return colors;
    }

    if (result.exteriorColors.length === 0) {
      result.exteriorColors = parseLinesForColors(exteriorText, false);
    }
    if (result.interiorColors.length === 0 && interiorText) {
      result.interiorColors = parseLinesForColors(interiorText, true);
    }

    // 3. Extract Trims / Model definitions if present
    const trimRegex = /^Trim\s*\n(.+)/gm;
    let trimMatch;
    while ((trimMatch = trimRegex.exec(text)) !== null) {
      const trimName = trimMatch[1].trim();
      if (trimName && !result.parsedTrims.includes(trimName)) {
        result.parsedTrims.push(trimName);
      }
    }

    console.log('✅ [VML Smart Parse] Extraction complete:', {
      extColors: result.exteriorColors.length,
      intColors: result.interiorColors.length,
      wheels: result.wheelTypes.length,
      trims: result.parsedTrims.length
    });

    return result;
  }

  // Smart Import Diff Analyzer
  function analyzeSmartImportDiff(parsedData) {
    const autofillList = []; // Colors in JSON missing hex, input provides hex
    const conflictList = []; // Colors in JSON with hex, input provides DIFFERENT hex
    const unmatchedList = []; // Colors in input that don't match any color in JSON
    const updatedIdsList = []; // Colors in JSON missing or having different VDM ID
    const wheelUpdatesList = []; // Wheels in JSON matching by VDM ID/shortName where name is updated/populated
    const newWheels = [];

    const allParsedColors = [...parsedData.exteriorColors, ...parsedData.interiorColors];

    // Helper to find matching color in modelsState
    function findMatchingColor(parsed) {
      if (!parsed || (!parsed.name && !parsed.displayName && !parsed.rawName)) return [];

      const namesToTest = [
        parsed.name,
        parsed.displayName,
        parsed.rawName
      ].filter(Boolean).map(n => n.toLowerCase().trim());

      const normNamesToTest = namesToTest.map(n => normalizeAbbreviations(n));
      const targetId = (parsed.id || '').toLowerCase().trim();
      const targetSlug = toShortName(parsed.name || parsed.displayName || '');

      let matches = [];

      modelsState.forEach((m, mIdx) => {
        const checkList = (list, type) => {
          (list || []).forEach((c, cIdx) => {
            if (!c || !c.name) return;

            const cName = c.name.toLowerCase().trim();
            const normC = normalizeAbbreviations(c.name);
            const cId = (c.id || '').toLowerCase().trim();
            const cSlug = (c.shortName || toShortName(c.name)).toLowerCase();

            const isMatch = (targetId && cId && cId === targetId) ||
                            (cSlug && targetSlug && cSlug === targetSlug) ||
                            namesToTest.some(tn => cName === tn || (cName.length > 3 && tn.length > 3 && (cName.includes(tn) || tn.includes(cName)))) ||
                            normNamesToTest.some(normT => normC === normT || (normC.length > 3 && normT.length > 3 && (normC.includes(normT) || normT.includes(normC))));

            if (isMatch) {
              matches.push({ modelIndex: mIdx, modelName: m.model || 'Untitled Model', colorType: type, colorIndex: cIdx, colorObj: c });
            }
          });
        };

        checkList(m.exteriorColors, 'exterior');
        checkList(m.interiorColors, 'interior');
      });

      return matches;
    }

    const seenParsed = new Set();

    allParsedColors.forEach(parsed => {
      if (!parsed || !parsed.name) return;
      const key = (parsed.name + '|' + parsed.hexcode + '|' + parsed.id).toLowerCase();
      if (seenParsed.has(key)) return;
      seenParsed.add(key);

      const matches = findMatchingColor(parsed);

      if (matches.length === 0) {
        // Color not in JSON at all
        unmatchedList.push({
          parsed: parsed,
          typeChoice: parsed.isInterior ? 'interior' : 'exterior',
          targetScope: 'all', // 'all' or 'specific'
          selectedModelIndices: modelsState.map((_, i) => i),
          isIncluded: true
        });
      } else {
        // Color found in one or more models
        matches.forEach(m => {
          const currentHex = (m.colorObj.hexcode || '').trim().toLowerCase();
          const newHex = (parsed.hexcode || '').trim().toLowerCase();
          const currentId = (m.colorObj.id || '').trim();
          const newId = (parsed.id || '').trim();

          // Check VDM Sales Code ID update
          if (newId && currentId !== newId) {
            let existingIdUpdate = updatedIdsList.find(u => u.colorName.toLowerCase() === m.colorObj.name.toLowerCase() && u.newId.toLowerCase() === newId.toLowerCase());
            if (existingIdUpdate) {
              if (!existingIdUpdate.models.includes(m.modelName)) existingIdUpdate.models.push(m.modelName);
              existingIdUpdate.targets.push({ modelIndex: m.modelIndex, colorType: m.colorType, colorIndex: m.colorIndex });
            } else {
              updatedIdsList.push({
                colorName: m.colorObj.name,
                colorType: m.colorType,
                currentId: currentId,
                newId: newId,
                models: [m.modelName],
                isIncluded: true,
                targets: [{ modelIndex: m.modelIndex, colorType: m.colorType, colorIndex: m.colorIndex }]
              });
            }
          }

          if (newHex) {
            if (!currentHex) {
              // Missing hex in JSON -> Auto-Fill!
              let existingAutofill = autofillList.find(a => a.colorName.toLowerCase() === m.colorObj.name.toLowerCase() && a.newHex.toLowerCase() === newHex);
              if (existingAutofill) {
                if (!existingAutofill.models.includes(m.modelName)) existingAutofill.models.push(m.modelName);
                existingAutofill.targets.push({ modelIndex: m.modelIndex, colorType: m.colorType, colorIndex: m.colorIndex });
              } else {
                autofillList.push({
                  colorName: m.colorObj.name,
                  colorType: m.colorType,
                  newHex: parsed.hexcode,
                  models: [m.modelName],
                  targets: [{ modelIndex: m.modelIndex, colorType: m.colorType, colorIndex: m.colorIndex }]
                });
              }
            } else if (currentHex !== newHex) {
              // Hex Conflict!
              let existingConflict = conflictList.find(c => c.colorName.toLowerCase() === m.colorObj.name.toLowerCase());
              if (existingConflict) {
                if (!existingConflict.models.includes(m.modelName)) existingConflict.models.push(m.modelName);
                existingConflict.targets.push({ modelIndex: m.modelIndex, colorType: m.colorType, colorIndex: m.colorIndex });
              } else {
                conflictList.push({
                  colorName: m.colorObj.name,
                  colorType: m.colorType,
                  currentHex: m.colorObj.hexcode,
                  newHex: parsed.hexcode,
                  models: [m.modelName],
                  selectedChoice: 'keep', // Default to 'keep' unless user toggles to 'update'
                  targets: [{ modelIndex: m.modelIndex, colorType: m.colorType, colorIndex: m.colorIndex }]
                });
              }
            }
          }
        });
      }
    });

    // Check Wheels: match by VDM ID or shortName
    (parsedData.wheelTypes || []).forEach(w => {
      if (!w || (!w.id && !w.name)) return;
      const targetWheelId = (w.id || '').trim().toLowerCase();
      const targetWheelName = (w.name || '').trim();
      const targetWheelSlug = (w.shortName || toShortName(w.name || '')).toLowerCase();

      let matchingWheelsInState = [];

      modelsState.forEach((m, mIdx) => {
        (m.wheelTypes || []).forEach((ew, wIdx) => {
          if (!ew) return;
          const ewId = (ew.id || '').trim().toLowerCase();
          const ewSlug = (ew.shortName || (ew.id || '').toLowerCase()).trim();

          const isWheelMatch = (targetWheelId && ewId && ewId === targetWheelId) ||
                               (targetWheelSlug && ewSlug && ewSlug === targetWheelSlug);

          if (isWheelMatch) {
            matchingWheelsInState.push({ modelIndex: mIdx, modelName: m.model || 'Untitled Model', wheelIndex: wIdx, wheelObj: ew });
          }
        });
      });

      if (matchingWheelsInState.length === 0) {
        newWheels.push({
          parsed: w,
          targetScope: 'all',
          selectedModelIndices: modelsState.map((_, i) => i),
          isIncluded: true
        });
      } else {
        // Wheel exists in state! Check if display name needs populating/updating
        matchingWheelsInState.forEach(mw => {
          const currentName = (mw.wheelObj.name || '').trim();
          if (targetWheelName && currentName !== targetWheelName) {
            let existingWUpdate = wheelUpdatesList.find(wu => (wu.wheelId.toLowerCase() === (mw.wheelObj.id || targetWheelId).toLowerCase()) && wu.newName.toLowerCase() === targetWheelName.toLowerCase());
            if (existingWUpdate) {
              if (!existingWUpdate.models.includes(mw.modelName)) existingWUpdate.models.push(mw.modelName);
              existingWUpdate.targets.push({ modelIndex: mw.modelIndex, wheelIndex: mw.wheelIndex });
            } else {
              wheelUpdatesList.push({
                wheelId: mw.wheelObj.id || targetWheelId || 'Wheel',
                currentName: currentName || '(No Name)',
                newName: targetWheelName,
                models: [mw.modelName],
                isIncluded: true,
                targets: [{ modelIndex: mw.modelIndex, wheelIndex: mw.wheelIndex }]
              });
            }
          }
        });
      }
    });

    console.log('📊 [VML Smart Parse] Diff Analysis:', {
      autofills: autofillList.length,
      conflicts: conflictList.length,
      unmatched: unmatchedList.length,
      updatedIds: updatedIdsList.length,
      wheelUpdates: wheelUpdatesList.length,
      newWheels: newWheels.length
    });

    return { autofillList, conflictList, unmatchedList, updatedIdsList, wheelUpdatesList, newWheels };
  }

  // Render & Handle Smart Import Inline Review Results
  function renderSmartImportInlineResults(diffReport, onApply) {
    const inlineResults = document.getElementById('smart-import-inline-results');
    const summaryBar = document.getElementById('smart-import-summary-bar');
    
    const autofillSection = document.getElementById('smart-import-autofill-section');
    const autofillCount = document.getElementById('autofill-count');
    const autofillContainer = document.getElementById('autofill-items-container');

    const conflictsSection = document.getElementById('smart-import-conflicts-section');
    const conflictsCount = document.getElementById('conflicts-count');
    const conflictsContainer = document.getElementById('conflicts-items-container');
    const btnKeepAll = document.getElementById('btn-conflicts-keep-all');
    const btnUpdateAll = document.getElementById('btn-conflicts-update-all');

    const idUpdatesSection = document.getElementById('smart-import-id-updates-section');
    const idUpdatesCount = document.getElementById('id-updates-count');
    const idUpdatesContainer = document.getElementById('id-updates-items-container');

    const wheelUpdatesSection = document.getElementById('smart-import-wheel-updates-section');
    const wheelUpdatesCount = document.getElementById('wheel-updates-count');
    const wheelUpdatesContainer = document.getElementById('wheel-updates-items-container');

    const newColorsSection = document.getElementById('smart-import-new-colors-section');
    const newColorsCount = document.getElementById('new-colors-count');
    const newColorsContainer = document.getElementById('new-colors-items-container');

    const btnCancel = document.getElementById('btn-smart-import-cancel');
    const btnApply = document.getElementById('btn-smart-import-apply');

    // 1. Populate Summary Bar
    summaryBar.replaceChildren();
    if (diffReport.autofillList.length > 0) {
      const pill = document.createElement('span');
      pill.className = 'badge';
      pill.style.cssText = 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);';
      pill.textContent = `✓ ${diffReport.autofillList.length} Hex Auto-Fills`;
      summaryBar.appendChild(pill);
    }
    if (diffReport.conflictList.length > 0) {
      const pill = document.createElement('span');
      pill.className = 'badge';
      pill.style.cssText = 'background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);';
      pill.textContent = `⚠️ ${diffReport.conflictList.length} Hex Conflicts`;
      summaryBar.appendChild(pill);
    }
    if (diffReport.updatedIdsList.length > 0) {
      const pill = document.createElement('span');
      pill.className = 'badge';
      pill.style.cssText = 'background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);';
      pill.textContent = `🆔 ${diffReport.updatedIdsList.length} VDM ID Updates`;
      summaryBar.appendChild(pill);
    }
    if (diffReport.wheelUpdatesList && diffReport.wheelUpdatesList.length > 0) {
      const pill = document.createElement('span');
      pill.className = 'badge';
      pill.style.cssText = 'background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3);';
      pill.textContent = `🛞 ${diffReport.wheelUpdatesList.length} Wheel Name Updates`;
      summaryBar.appendChild(pill);
    }
    if (diffReport.unmatchedList.length > 0) {
      const pill = document.createElement('span');
      pill.className = 'badge';
      pill.style.cssText = 'background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3);';
      pill.textContent = `+ ${diffReport.unmatchedList.length} New Colors`;
      summaryBar.appendChild(pill);
    }
    if (diffReport.newWheels.length > 0) {
      const pill = document.createElement('span');
      pill.className = 'badge';
      pill.style.cssText = 'background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);';
      pill.textContent = `+ ${diffReport.newWheels.length} New Wheels`;
      summaryBar.appendChild(pill);
    }

    // 2. Render Auto-Fill Section
    if (diffReport.autofillList.length > 0) {
      autofillSection.style.display = 'block';
      autofillCount.textContent = diffReport.autofillList.length;
      autofillContainer.replaceChildren();

      diffReport.autofillList.forEach(item => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 6px; padding: 8px 12px; font-size: 12px;';
        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 18px; height: 18px; border-radius: 50%; background-color: ${escapeHTML(item.newHex)}; border: 1px solid rgba(255,255,255,0.3);"></div>
            <span style="font-weight: 700; color: #f8fafc;">${escapeHTML(item.colorName)}</span>
            <span style="font-family: monospace; font-size: 11px; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: 4px;">${escapeHTML(item.newHex)}</span>
          </div>
          <span style="font-size: 10.5px; color: #94a3b8;">Models: ${escapeHTML(item.models.join(', '))}</span>
        `;
        autofillContainer.appendChild(row);
      });
    } else {
      autofillSection.style.display = 'none';
    }

    // 3. Render Conflicts Section
    if (diffReport.conflictList.length > 0) {
      conflictsSection.style.display = 'block';
      conflictsCount.textContent = diffReport.conflictList.length;
      conflictsContainer.replaceChildren();

      function renderConflictRows() {
        conflictsContainer.replaceChildren();
        diffReport.conflictList.forEach((item, idx) => {
          const row = document.createElement('div');
          row.className = 'conflict-item-row';
          row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-weight: 700; color: #f8fafc; font-size: 13px;">${escapeHTML(item.colorName)}</span>
              <span style="font-size: 10.5px; color: #94a3b8;">(${escapeHTML(item.models.join(', '))})</span>
            </div>
            <div class="swatch-compare-group">
              <div class="swatch-compare-box" style="border-color: rgba(148, 163, 184, 0.2);">
                <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Current:</span>
                <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${escapeHTML(item.currentHex)}; border: 1px solid rgba(255,255,255,0.3);"></div>
                <span style="color: #cbd5e1;">${escapeHTML(item.currentHex)}</span>
              </div>
              <span style="color: #64748b; font-weight: 700;">➔</span>
              <div class="swatch-compare-box" style="border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.1);">
                <span style="font-size: 10px; color: #fbbf24; text-transform: uppercase;">New:</span>
                <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${escapeHTML(item.newHex)}; border: 1px solid rgba(255,255,255,0.3);"></div>
                <span style="color: #fbbf24; font-weight: 700;">${escapeHTML(item.newHex)}</span>
              </div>
              <div class="choice-btn-group">
                <button type="button" class="choice-btn ${item.selectedChoice === 'keep' ? 'active-keep' : ''}" data-idx="${idx}" data-action="keep">Keep Current</button>
                <button type="button" class="choice-btn ${item.selectedChoice === 'update' ? 'active-update' : ''}" data-idx="${idx}" data-action="update">Update to New</button>
              </div>
            </div>
          `;
          conflictsContainer.appendChild(row);
        });

        // Add click listeners to choice buttons
        conflictsContainer.querySelectorAll('.choice-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx, 10);
            const action = btn.dataset.action;
            diffReport.conflictList[idx].selectedChoice = action;
            renderConflictRows();
          });
        });
      }

      renderConflictRows();

      btnKeepAll.onclick = () => {
        diffReport.conflictList.forEach(c => c.selectedChoice = 'keep');
        renderConflictRows();
      };
      btnUpdateAll.onclick = () => {
        diffReport.conflictList.forEach(c => c.selectedChoice = 'update');
        renderConflictRows();
      };
    } else {
      conflictsSection.style.display = 'none';
    }

    // 3. Render VDM Sales Code ID Updates Section
    if (diffReport.updatedIdsList.length > 0) {
      idUpdatesSection.style.display = 'block';
      idUpdatesCount.textContent = diffReport.updatedIdsList.length;
      idUpdatesContainer.replaceChildren();

      diffReport.updatedIdsList.forEach(item => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px; padding: 8px 12px; font-size: 12px;';
        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: 700; color: #f8fafc;">${escapeHTML(item.colorName)}</span>
            <span style="font-size: 11px; color: #94a3b8;">${item.currentId ? `(Current ID: ${escapeHTML(item.currentId)})` : '(No ID)'}</span>
            <span style="color: #38bdf8; font-weight: 700;">➔ New Sales Code: ${escapeHTML(item.newId)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 10.5px; color: #94a3b8;">Models: ${escapeHTML(item.models.join(', '))}</span>
            <label class="checkbox-container" style="color: #38bdf8; font-size: 10px;">
              <input type="checkbox" ${item.isIncluded ? 'checked' : ''} class="id-update-cb">
              <span class="checkbox-checkmark"></span>
              Update ID
            </label>
          </div>
        `;
        const cb = row.querySelector('.id-update-cb');
        cb.addEventListener('change', () => { item.isIncluded = cb.checked; });
        idUpdatesContainer.appendChild(row);
      });
    } else {
      idUpdatesSection.style.display = 'none';
    }

    // 4. Render Wheel Display Name Updates Section
    if (diffReport.wheelUpdatesList && diffReport.wheelUpdatesList.length > 0) {
      wheelUpdatesSection.style.display = 'block';
      wheelUpdatesCount.textContent = diffReport.wheelUpdatesList.length;
      wheelUpdatesContainer.replaceChildren();

      diffReport.wheelUpdatesList.forEach(item => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(236, 72, 153, 0.2); border-radius: 6px; padding: 8px 12px; font-size: 12px;';
        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: 700; color: #f472b6; font-family: var(--font-mono);">${escapeHTML(item.wheelId)}</span>
            <span style="font-size: 11px; color: #94a3b8;">${escapeHTML(item.currentName)}</span>
            <span style="color: #f472b6; font-weight: 700;">➔ ${escapeHTML(item.newName)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 10.5px; color: #94a3b8;">Models: ${escapeHTML(item.models.join(', '))}</span>
            <label class="checkbox-container" style="color: #f472b6; font-size: 10px;">
              <input type="checkbox" ${item.isIncluded ? 'checked' : ''} class="wheel-update-cb">
              <span class="checkbox-checkmark"></span>
              Update Name
            </label>
          </div>
        `;
        const cb = row.querySelector('.wheel-update-cb');
        cb.addEventListener('change', () => { item.isIncluded = cb.checked; });
        wheelUpdatesContainer.appendChild(row);
      });
    } else {
      wheelUpdatesSection.style.display = 'none';
    }

    // 5. Render New Colors Section
    function renderNewColorsRows() {
      newColorsContainer.replaceChildren();
      diffReport.unmatchedList.forEach((item, itemIdx) => {
        const card = document.createElement('div');
        card.className = 'new-color-card';

        const colorHex = item.parsed.hexcode || '#7e22ce';
        const colorName = item.parsed.name;

        card.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 20px; height: 20px; border-radius: 50%; background-color: ${escapeHTML(colorHex)}; border: 1.5px solid rgba(255,255,255,0.4); box-shadow: 0 2px 4px rgba(0,0,0,0.4);"></div>
              <strong style="color: #f8fafc; font-size: 13px;">${escapeHTML(colorName)}</strong>
              ${colorHex ? `<span style="font-family: monospace; font-size: 11px; color: #a7f3d0; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: 4px;">${escapeHTML(colorHex)}</span>` : '<span style="font-size: 10px; color: #fbbf24;">(No Hex)</span>'}
              ${item.parsed.costlabel ? `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24;">${escapeHTML(item.parsed.costlabel)}</span>` : ''}
            </div>
            <button type="button" class="btn btn-sm ${item.isIncluded ? 'btn-secondary' : 'btn-primary'}" style="font-size: 10px; padding: 4px 10px;">
              ${item.isIncluded ? '✓ Included' : '+ Include Color'}
            </button>
          </div>

          <div style="display: ${item.isIncluded ? 'flex' : 'none'}; flex-direction: column; gap: 10px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px;">
            <div style="display: flex; align-items: center; gap: 20px; font-size: 11.5px;">
              <span style="color: #94a3b8; font-weight: 600;">Color Category:</span>
              <label class="checkbox-container" style="color: #f8fafc;">
                <input type="radio" name="color-type-${itemIdx}" value="exterior" ${item.typeChoice === 'exterior' ? 'checked' : ''} class="new-color-type-radio">
                <span class="checkbox-checkmark" style="border-radius: 50%;"></span>
                Exterior Color
              </label>
              <label class="checkbox-container" style="color: #f8fafc;">
                <input type="radio" name="color-type-${itemIdx}" value="interior" ${item.typeChoice === 'interior' ? 'checked' : ''} class="new-color-type-radio">
                <span class="checkbox-checkmark" style="border-radius: 50%;"></span>
                Interior Color
              </label>
            </div>

            <div style="display: flex; align-items: center; gap: 20px; font-size: 11.5px;">
              <span style="color: #94a3b8; font-weight: 600;">Target Models:</span>
              <label class="checkbox-container" style="color: #f8fafc;">
                <input type="radio" name="model-target-scope-${itemIdx}" value="all" ${item.targetScope === 'all' ? 'checked' : ''} class="new-color-scope-radio">
                <span class="checkbox-checkmark" style="border-radius: 50%;"></span>
                All Models (${modelsState.length})
              </label>
              <label class="checkbox-container" style="color: #f8fafc;">
                <input type="radio" name="model-target-scope-${itemIdx}" value="specific" ${item.targetScope === 'specific' ? 'checked' : ''} class="new-color-scope-radio">
                <span class="checkbox-checkmark" style="border-radius: 50%;"></span>
                Select Specific Models
              </label>
            </div>

            <div class="model-checkbox-grid" style="display: ${item.targetScope === 'specific' ? 'grid' : 'none'};">
              ${modelsState.map((m, mIdx) => `
                <label class="checkbox-container" style="font-size: 11px; color: #cbd5e1;">
                  <input type="checkbox" value="${mIdx}" ${item.selectedModelIndices.includes(mIdx) ? 'checked' : ''} class="new-color-model-cb">
                  <span class="checkbox-checkmark"></span>
                  ${escapeHTML(m.model || 'Untitled Model')}
                </label>
              `).join('')}
            </div>
          </div>
        `;

        const toggleBtn = card.querySelector('button');
        toggleBtn.addEventListener('click', () => {
          item.isIncluded = !item.isIncluded;
          renderNewColorsRows();
        });

        const typeRadios = card.querySelectorAll('.new-color-type-radio');
        typeRadios.forEach(r => {
          r.addEventListener('change', () => { item.typeChoice = r.value; });
        });

        const scopeRadios = card.querySelectorAll('.new-color-scope-radio');
        scopeRadios.forEach(r => {
          r.addEventListener('change', () => {
            item.targetScope = r.value;
            renderNewColorsRows();
          });
        });

        const modelCbs = card.querySelectorAll('.new-color-model-cb');
        modelCbs.forEach(cb => {
          cb.addEventListener('change', () => {
            const mIdx = parseInt(cb.value, 10);
            if (cb.checked) {
              if (!item.selectedModelIndices.includes(mIdx)) item.selectedModelIndices.push(mIdx);
            } else {
              item.selectedModelIndices = item.selectedModelIndices.filter(i => i !== mIdx);
            }
          });
        });

        newColorsContainer.appendChild(card);
      });
    }

    if (diffReport.unmatchedList.length > 0) {
      newColorsSection.style.display = 'block';
      newColorsCount.textContent = diffReport.unmatchedList.length;
      renderNewColorsRows();

      const btnNewColorsIncludeAll = document.getElementById('btn-new-colors-include-all');
      const btnNewColorsExcludeAll = document.getElementById('btn-new-colors-exclude-all');
      btnNewColorsIncludeAll.onclick = () => {
        diffReport.unmatchedList.forEach(item => item.isIncluded = true);
        renderNewColorsRows();
      };
      btnNewColorsExcludeAll.onclick = () => {
        diffReport.unmatchedList.forEach(item => item.isIncluded = false);
        renderNewColorsRows();
      };
    } else {
      newColorsSection.style.display = 'none';
    }

    // 6. Render New Wheels Section
    const newWheelsSection = document.getElementById('smart-import-new-wheels-section');
    const newWheelsCount = document.getElementById('new-wheels-count');
    const newWheelsContainer = document.getElementById('new-wheels-items-container');

    function renderNewWheelsRows() {
      newWheelsContainer.replaceChildren();
      diffReport.newWheels.forEach((item, itemIdx) => {
        const card = document.createElement('div');
        card.className = 'new-color-card'; // Reuse style

        const wheelName = item.parsed.name || 'pending';
        const wheelId = item.parsed.id || 'No ID';

        card.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: 700; color: #f8fafc; font-size: 13px;">${escapeHTML(wheelName)}</span>
              <span style="font-family: monospace; font-size: 11px; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 2px 6px; border-radius: 4px;">ID: ${escapeHTML(wheelId)}</span>
            </div>
            <button type="button" class="btn btn-sm ${item.isIncluded ? 'btn-secondary' : 'btn-primary'}" style="font-size: 10px; padding: 4px 10px;">
              ${item.isIncluded ? '✓ Included' : '+ Include Wheel'}
            </button>
          </div>

          <div style="display: ${item.isIncluded ? 'flex' : 'none'}; flex-direction: column; gap: 10px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px;">
            <div style="display: flex; align-items: center; gap: 20px; font-size: 11.5px;">
              <span style="color: #94a3b8; font-weight: 600;">Target Models:</span>
              <label class="checkbox-container" style="color: #f8fafc;">
                <input type="radio" name="wheel-target-scope-${itemIdx}" value="all" ${item.targetScope === 'all' ? 'checked' : ''} class="new-wheel-scope-radio">
                <span class="checkbox-checkmark" style="border-radius: 50%;"></span>
                All Models (${modelsState.length})
              </label>
              <label class="checkbox-container" style="color: #f8fafc;">
                <input type="radio" name="wheel-target-scope-${itemIdx}" value="specific" ${item.targetScope === 'specific' ? 'checked' : ''} class="new-wheel-scope-radio">
                <span class="checkbox-checkmark" style="border-radius: 50%;"></span>
                Select Specific Models
              </label>
            </div>

            <div class="model-checkbox-grid" style="display: ${item.targetScope === 'specific' ? 'grid' : 'none'};">
              ${modelsState.map((m, mIdx) => `
                <label class="checkbox-container" style="font-size: 11px; color: #cbd5e1;">
                  <input type="checkbox" value="${mIdx}" ${item.selectedModelIndices.includes(mIdx) ? 'checked' : ''} class="new-wheel-model-cb">
                  <span class="checkbox-checkmark"></span>
                  ${escapeHTML(m.model || 'Untitled Model')}
                </label>
              `).join('')}
            </div>
          </div>
        `;

        const toggleBtn = card.querySelector('button');
        toggleBtn.addEventListener('click', () => {
          item.isIncluded = !item.isIncluded;
          renderNewWheelsRows();
        });

        const scopeRadios = card.querySelectorAll('.new-wheel-scope-radio');
        scopeRadios.forEach(r => {
          r.addEventListener('change', () => {
            item.targetScope = r.value;
            renderNewWheelsRows();
          });
        });

        const modelCbs = card.querySelectorAll('.new-wheel-model-cb');
        modelCbs.forEach(cb => {
          cb.addEventListener('change', () => {
            const mIdx = parseInt(cb.value, 10);
            if (cb.checked) {
              if (!item.selectedModelIndices.includes(mIdx)) item.selectedModelIndices.push(mIdx);
            } else {
              item.selectedModelIndices = item.selectedModelIndices.filter(i => i !== mIdx);
            }
          });
        });

        newWheelsContainer.appendChild(card);
      });
    }

    if (diffReport.newWheels && diffReport.newWheels.length > 0) {
      newWheelsSection.style.display = 'block';
      newWheelsCount.textContent = diffReport.newWheels.length;
      renderNewWheelsRows();

      const btnNewWheelsIncludeAll = document.getElementById('btn-new-wheels-include-all');
      const btnNewWheelsExcludeAll = document.getElementById('btn-new-wheels-exclude-all');
      btnNewWheelsIncludeAll.onclick = () => {
        diffReport.newWheels.forEach(item => item.isIncluded = true);
        renderNewWheelsRows();
      };
      btnNewWheelsExcludeAll.onclick = () => {
        diffReport.newWheels.forEach(item => item.isIncluded = false);
        renderNewWheelsRows();
      };
    } else {
      newWheelsSection.style.display = 'none';
    }

    // Show inline results area
    inlineResults.style.display = 'flex';

    function hideInlineResults() {
      inlineResults.style.display = 'none';
    }

    btnCancel.onclick = hideInlineResults;

    btnApply.onclick = () => {
      onApply(diffReport);
      hideInlineResults();
    };
  }

  // Show inline feedback message inside Data Autofill tab
  function showAutofillStatus(msg, type = 'info') {
    const statusEl = document.getElementById('autofill-status');
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.style.display = 'block';
      if (type === 'success') {
        statusEl.style.background = 'rgba(16, 185, 129, 0.15)';
        statusEl.style.color = '#10b981';
        statusEl.style.border = '1px solid rgba(16, 185, 129, 0.3)';
      } else if (type === 'warning' || type === 'error') {
        statusEl.style.background = 'rgba(239, 68, 68, 0.15)';
        statusEl.style.color = '#ef4444';
        statusEl.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      } else {
        statusEl.style.background = 'rgba(56, 189, 248, 0.15)';
        statusEl.style.color = '#38bdf8';
        statusEl.style.border = '1px solid rgba(56, 189, 248, 0.3)';
      }
      statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 8000);
    }
  }

  // Smart Parse Button Listener and Trigger function
  window.vmlSmartParseTrigger = () => {
    console.log('⚡ [VML Smart Parse] Parse Triggered via window.vmlSmartParseTrigger!');
    try {
      const text = mSmartPaste ? mSmartPaste.value : '';
      if (!text || !text.trim()) {
        console.warn('⚠️ [VML Smart Parse] Smart paste textarea is empty!');
        showAutofillStatus('Please paste router or VDM data text first.', 'warning');
        return;
      }

      const parsedData = parseSmartRouterAndVDMText(text);

      // If trims were detected in text and modelsState is currently empty (or user approves model creation), auto-create models
      if (parsedData.parsedTrims.length > 0) {
        parsedData.parsedTrims.forEach(trimName => {
          let existingModel = modelsState.find(m => m.model && m.model.toLowerCase() === trimName.toLowerCase());
          if (!existingModel) {
            const slug = toShortName(trimName);
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
          }
        });

        // Remove placeholder model if empty
        const defaultIdx = modelsState.findIndex(m => m.model === "New Vehicle Model" && m.exteriorColors.length === 0 && m.interiorColors.length === 0 && m.wheelTypes.length === 0);
        if (defaultIdx !== -1) {
          modelsState.splice(defaultIdx, 1);
        }

        if (activeModelIndex < 0 || activeModelIndex >= modelsState.length) {
          activeModelIndex = 0;
        }
      }

      // If still no models in workspace, create a default model so colors have a destination
      if (modelsState.length === 0) {
        modelsState.push({
          model: "Default Vehicle Model",
          modelId: "default",
          exteriorColors: [],
          wheelTypes: [],
          interiorColors: [],
          exterior_angles: 36,
          exterior_start_angle: 1,
          exterior360imageurl: "/content/dam/na/ford/en_us/images/vehicle/2027/360/{modelId}/{view}/{device}/{exteriorcolor}/{wheel}/00{exterior_start_angle}-{exteriorcolor}-{wheel}.jpeg",
          "exterior-slider-view": "false",
          interior_angles: 36,
          interior_start_angle: 1,
          "interior-dome-view": "false",
          interior360imageurl: "/content/dam/na/ford/en_us/images/vehicle/2027/360/{modelId}/{view}/{device}/{interiorcolor}/00{interior_start_angle}-{interiorcolor}.jpeg",
          configuratorurl: "&trim=default"
        });
        activeModelIndex = 0;
      }

      // Run Diff Analysis
      const diffReport = analyzeSmartImportDiff(parsedData);

      const totalChanges = diffReport.autofillList.length + diffReport.conflictList.length + diffReport.updatedIdsList.length + (diffReport.wheelUpdatesList ? diffReport.wheelUpdatesList.length : 0) + diffReport.unmatchedList.length + diffReport.newWheels.length;

      console.log('ℹ️ [VML Smart Parse] Total changes detected:', totalChanges);

      if (totalChanges === 0) {
        showAutofillStatus('No new colors, hex codes, or updates detected. All colors already match the workspace state.', 'info');
        return;
      }

      // Render inline review to prompt user for choices
      renderSmartImportInlineResults(diffReport, (report) => {
        // 1. Apply Auto-Fills
        report.autofillList.forEach(item => {
          item.targets.forEach(t => {
            const m = modelsState[t.modelIndex];
            if (m) {
              const list = t.colorType === 'exterior' ? m.exteriorColors : m.interiorColors;
              if (list && list[t.colorIndex]) {
                list[t.colorIndex].hexcode = item.newHex;
              }
            }
          });
        });

        // 2. Apply Conflicts Resolution
        report.conflictList.forEach(item => {
          if (item.selectedChoice === 'update') {
            item.targets.forEach(t => {
              const m = modelsState[t.modelIndex];
              if (m) {
                const list = t.colorType === 'exterior' ? m.exteriorColors : m.interiorColors;
                if (list && list[t.colorIndex]) {
                  list[t.colorIndex].hexcode = item.newHex;
                }
              }
            });
          }
        });

        // 3. Apply VDM Sales Code updates
        report.updatedIdsList.forEach(item => {
          if (!item.isIncluded) return;
          item.targets.forEach(t => {
            const m = modelsState[t.modelIndex];
            if (m) {
              const list = t.colorType === 'exterior' ? m.exteriorColors : m.interiorColors;
              if (list && list[t.colorIndex]) {
                list[t.colorIndex].id = item.newId;
              }
            }
          });
        });

        // 3b. Apply Wheel Display Name updates
        (report.wheelUpdatesList || []).forEach(item => {
          if (!item.isIncluded) return;
          item.targets.forEach(t => {
            const m = modelsState[t.modelIndex];
            if (m && m.wheelTypes && m.wheelTypes[t.wheelIndex]) {
              m.wheelTypes[t.wheelIndex].name = item.newName;
            }
          });
        });

        // 4. Apply New Colors
        report.unmatchedList.forEach(item => {
          if (!item.isIncluded) return;

          const newColorObj = {
            name: item.parsed.name,
            id: item.parsed.id || '',
            hexcode: item.parsed.hexcode || '',
            costlabel: item.parsed.costlabel || '',
            shortName: item.parsed.shortName || toShortName(item.parsed.name),
            imageURL: ''
          };

          const targetModelIndices = item.targetScope === 'all'
            ? modelsState.map((_, i) => i)
            : item.selectedModelIndices;

          targetModelIndices.forEach(mIdx => {
            const m = modelsState[mIdx];
            if (m) {
              const targetArray = item.typeChoice === 'exterior' ? m.exteriorColors : m.interiorColors;
              if (!targetArray) return;
              const exists = targetArray.some(c => c.name && c.name.toLowerCase() === newColorObj.name.toLowerCase());
              if (!exists) {
                targetArray.push(JSON.parse(JSON.stringify(newColorObj)));
              }
            }
          });
        });

        // 5. Apply New Wheels
        (report.newWheels || []).forEach(item => {
          if (!item.isIncluded) return;

          const newWheelObj = {
            name: item.parsed.name || 'pending',
            id: item.parsed.id || '',
            thumbnail: "",
            shortName: item.parsed.shortName || toShortName(item.parsed.name || item.parsed.id || 'wheel'),
            costlabel: item.parsed.costlabel || ''
          };

          const targetModelIndices = item.targetScope === 'all'
            ? modelsState.map((_, i) => i)
            : item.selectedModelIndices;

          targetModelIndices.forEach(mIdx => {
            const m = modelsState[mIdx];
            if (m) {
              if (!m.wheelTypes) m.wheelTypes = [];
              const exists = m.wheelTypes.some(ew => ew && (ew.id === newWheelObj.id || (ew.name && ew.name.toLowerCase() === newWheelObj.name.toLowerCase())));
              if (!exists) {
                m.wheelTypes.push(JSON.parse(JSON.stringify(newWheelObj)));
              }
            }
          });
        });

        if (mSmartPaste) mSmartPaste.value = '';
        showAutofillStatus('Smart Auto-Populate & Data Sync completed successfully!', 'success');
        refreshUI();
      });
    } catch (err) {
      console.error('❌ [VML Smart Parse] Exception inside trigger:', err);
      showAutofillStatus('Smart Parse failed. Error: ' + err.message, 'error');
    }
  };

  if (btnSmartParse) {
    btnSmartParse.addEventListener('click', window.vmlSmartParseTrigger);
  }

  // ── INITIAL STATE LOADER ──────────────────────────────────────────────
  function initDefaultState() {
    modelsState = [];
    activeModelIndex = -1;
    refreshUI();
  }

  // Helper to update the top active model banner
  function updateActiveModelBanner() {
    const activeModel = activeModelIndex >= 0 && activeModelIndex < modelsState.length ? modelsState[activeModelIndex] : null;
    const modelName = activeModel ? (activeModel.model || 'Untitled Model') : '';
    
    const banner = document.getElementById('active-model-banner');
    if (banner) {
      const activeTabPane = document.querySelector('.w-tab-pane.active');
      const activeTabId = activeTabPane ? activeTabPane.id : '';
      if (activeTabId === 'tabInit' || activeTabId === 'tabDataAutofill') {
        banner.style.display = 'none';
      } else {
        banner.style.display = activeModel ? 'flex' : 'none';
      }
    }

    document.querySelectorAll('.active-model-name-display').forEach(el => {
      el.textContent = modelName;
    });
  }

  // ── STATE COMPILER & RENDER ───────────────────────────────────────────
  function refreshUI() {
    updateActiveModelBanner();
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
  function renderSwatchCell(color, type, onUpdateHex) {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; align-items: center; gap: 8px; position: relative; max-width: 220px;';

    const pickerInput = document.createElement('input');
    pickerInput.type = 'color';
    pickerInput.value = (color.hexcode && color.hexcode.trim()) ? color.hexcode.trim() : '#7e22ce';
    pickerInput.style.cssText = 'position: absolute; opacity: 0; width: 100%; height: 100%; top: 0; left: 0; cursor: pointer; z-index: 5; pointer-events: auto;';
    pickerInput.title = 'Click to choose Hex Code';

    pickerInput.addEventListener('change', (e) => {
      const originalColor = { ...color };
      const newHex = e.target.value;
      const newValues = { ...color, hexcode: newHex };
      
      updateAndPropagateColor(type, originalColor, newValues);
      
      if (onUpdateHex) onUpdateHex(newHex);
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
      tdSwatch.appendChild(renderSwatchCell(color, 'exterior', (newHex) => {
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
        wName.value = wheel.name === 'pending' ? '' : wheel.name;
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
      tdSwatch.appendChild(renderSwatchCell(color, 'interior', (newHex) => {
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
            if (!w.name || !w.name.trim() || w.name.trim().toLowerCase() === 'pending') {
              addValidationItem(`[${modelLabel}] Wheel "${w.shortName || w.id}" is missing description (Display Name is "pending" / incomplete).`, "warning");
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
      
      // If editing model name and pill is active, refresh models select bar & banner
      if (prop === 'model') {
        renderModelsList();
        updateActiveModelBanner();
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

  // Show custom app-styled centered notification modal for general color updates
  function showColorNoticeModal(colorName, affectedModels) {
    const modal = document.getElementById('color-notice-modal');
    const msgEl = document.getElementById('color-notice-message');
    const modelsEl = document.getElementById('color-notice-models');
    const btnClose = document.getElementById('btn-close-color-notice');

    if (!modal) {
      alert(`Se va a modificar el color "${colorName}" que está presente en ${affectedModels.length} modelo(s): ${affectedModels.join(', ')}.`);
      return;
    }

    if (msgEl) {
      msgEl.textContent = `The color "${colorName}" is present in ${affectedModels.length} vehicle model(s) and will be updated globally across all of them:`;
    }

    if (modelsEl) {
      modelsEl.replaceChildren();
      affectedModels.forEach(m => {
        const tag = document.createElement('span');
        tag.style.cssText = 'background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.35); color: #e9d5ff; font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;';
        tag.innerHTML = `<span style="width: 6px; height: 6px; background: #c084fc; border-radius: 50%;"></span>${escapeHTML(m)}`;
        modelsEl.appendChild(tag);
      });
    }

    modal.style.display = 'flex';

    if (btnClose) {
      const handleClose = () => {
        modal.style.display = 'none';
        btnClose.removeEventListener('click', handleClose);
        modal.removeEventListener('click', handleOverlayClick);
      };
      const handleOverlayClick = (e) => {
        if (e.target === modal) handleClose();
      };
      btnClose.addEventListener('click', handleClose);
      modal.addEventListener('click', handleOverlayClick);
    }
  }

  // Propagate all color updates (name, id, shortName, hexcode, costlabel, imageURL) to all models
  function updateAndPropagateColor(type, originalColor, newValues) {
    if (!originalColor || !originalColor.name) return;
    
    const origName = originalColor.name.trim().toLowerCase();
    const origId = (originalColor.id || '').trim().toLowerCase();
    const origShort = (originalColor.shortName || '').trim().toLowerCase();

    // Find all models containing a matching color
    const affectedModels = [];
    modelsState.forEach(m => {
      const colors = type === 'exterior' ? m.exteriorColors : m.interiorColors;
      const hasMatch = (colors || []).some(c => {
        const cName = c.name.trim().toLowerCase();
        const cId = (c.id || '').trim().toLowerCase();
        const cShort = (c.shortName || '').trim().toLowerCase();
        return cName === origName || (origId && cId === origId) || cShort === origShort;
      });
      if (hasMatch) {
        affectedModels.push(m.model || 'Untitled Model');
      }
    });

    if (affectedModels.length > 0) {
      showColorNoticeModal(originalColor.name, affectedModels);
    }

    // Apply updates to all occurrences in all models
    modelsState.forEach(m => {
      const colors = type === 'exterior' ? m.exteriorColors : m.interiorColors;
      (colors || []).forEach(c => {
        const cName = c.name.trim().toLowerCase();
        const cId = (c.id || '').trim().toLowerCase();
        const cShort = (c.shortName || '').trim().toLowerCase();
        
        if (cName === origName || (origId && cId === origId) || cShort === origShort) {
          c.name = newValues.name;
          c.id = newValues.id;
          c.shortName = newValues.shortName;
          c.hexcode = newValues.hexcode;
          c.costlabel = newValues.costlabel;
          if (type === 'interior' && newValues.imageURL !== undefined) {
            c.imageURL = newValues.imageURL;
          }
        }
      });
    });
  }

  // Propagate ID and Hex updates to all occurrences of a color name
  function propagateColorUpdates(name, id, hex, shortName, costlabel, type) {
    if (!name) return;
    const targetName = name.trim().toLowerCase();
    modelsState.forEach(m => {
      if (type === 'exterior' || !type) {
        (m.exteriorColors || []).forEach(c => {
          if (c.name.trim().toLowerCase() === targetName) {
            c.id = id;
            c.hexcode = hex;
            if (shortName) c.shortName = shortName;
            if (costlabel !== undefined) c.costlabel = costlabel;
          }
        });
      }
      if (type === 'interior' || !type) {
        (m.interiorColors || []).forEach(c => {
          if (c.name.trim().toLowerCase() === targetName) {
            c.id = id;
            c.hexcode = hex;
            if (shortName) c.shortName = shortName;
            if (costlabel !== undefined) c.costlabel = costlabel;
          }
        });
      }
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
      const originalColor = { ...targetColor };
      
      const newValues = {
        name: name,
        id: id,
        shortName: short,
        hexcode: hex,
        costlabel: costText
      };
      
      updateAndPropagateColor('exterior', originalColor, newValues);
      
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
      propagateColorUpdates(name, id, hex, short, costText, 'exterior');
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

    const name = wName.value.trim() || 'pending';
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
      const originalColor = { ...targetColor };

      const newValues = {
        name: name,
        id: id,
        shortName: short,
        hexcode: hex,
        costlabel: costText,
        imageURL: imgUrl
      };

      updateAndPropagateColor('interior', originalColor, newValues);
      
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
      propagateColorUpdates(name, id, hex, short, costText, 'interior');
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

  // Clear workspace handler (In-App Modal)
  const handleClearWorkspace = () => {
    if (clearConfirmModal) {
      clearConfirmModal.style.display = 'flex';
    } else {
      initDefaultState();
      importText.value = "";
      showStatus("Workspace cleared.", "info");
    }
  };

  if (btnClearWorkspace) {
    btnClearWorkspace.addEventListener('click', handleClearWorkspace);
  }
  if (btnClearWorkspaceSidebar) {
    btnClearWorkspaceSidebar.addEventListener('click', handleClearWorkspace);
  }

  if (btnCancelClearModal) {
    btnCancelClearModal.addEventListener('click', () => {
      if (clearConfirmModal) clearConfirmModal.style.display = 'none';
    });
  }

  if (btnConfirmClearModal) {
    btnConfirmClearModal.addEventListener('click', () => {
      if (clearConfirmModal) clearConfirmModal.style.display = 'none';
      initDefaultState();
      importText.value = "";
      showStatus("Workspace cleared.", "info");
    });
  }

  if (clearConfirmModal) {
    clearConfirmModal.addEventListener('click', (e) => {
      if (e.target === clearConfirmModal) {
        clearConfirmModal.style.display = 'none';
      }
    });
  }

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
