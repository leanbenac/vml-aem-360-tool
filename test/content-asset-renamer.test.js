const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('path');

// Mock window object for browser content script compatibility
global.window = {};

// Load the renamer script
const renamerPath = path.join(__dirname, '../modules/asset-injector/content-asset-renamer.js');
const renamerCode = fs.readFileSync(renamerPath, 'utf8');
eval(renamerCode);

const Renamer = global.window.AEM360Renamer;

test('AEM360Renamer - cleanFordName', (t) => {
    // US locale spelling replacements
    assert.strictEqual(Renamer.cleanFordName('colour', 'us'), 'color');
    assert.strictEqual(Renamer.cleanFordName('centre', 'us'), 'center');
    assert.strictEqual(Renamer.cleanFordName('tyre', 'us'), 'tire');
    assert.strictEqual(Renamer.cleanFordName('aluminium', 'us'), 'aluminum');

    // CA locale spelling replacements
    assert.strictEqual(Renamer.cleanFordName('gray', 'ca'), 'grey');
    assert.strictEqual(Renamer.cleanFordName('color', 'ca'), 'colour');
    assert.strictEqual(Renamer.cleanFordName('center', 'ca'), 'centre');

    // Hyphens, spaces, and alphanumeric cleaning
    assert.strictEqual(Renamer.cleanFordName('my_cool_color', 'us', false), 'mycoolcolor');
    assert.strictEqual(Renamer.cleanFordName('my_cool_color', 'us', true), 'my-cool-color');
    assert.strictEqual(Renamer.cleanFordName('my cool color', 'us'), 'my-cool-color');
    assert.strictEqual(Renamer.cleanFordName('special@character#name!', 'us'), 'specialcharactername');
});

test('AEM360Renamer - processDroppedFiles image extensions (.jpeg vs .jpg)', (t) => {
    const foldersToCreate = new Set(['desktop', 'desktop/exterior', 'desktop/exterior/trim1', 'desktop/exterior/trim1/color1']);
    const filesToUpload = [
        { file: {}, path: 'desktop/exterior/trim1/color1/001.jpg' },
        { file: {}, path: 'desktop/exterior/trim1/color1/002.jpeg' },
        { file: {}, path: 'desktop/exterior/trim1/color1/image_regular.jpg' },
        { file: {}, path: 'desktop/exterior/trim1/color1/image_regular.jpeg' }
    ];

    // Case 1: Standardizing to jpeg (default)
    const resultJpeg = Renamer.processDroppedFiles(foldersToCreate, filesToUpload, 'us', '', 'jpeg');
    const jpegPaths = resultJpeg.cleanedFiles.map(f => f.path);
    assert.ok(jpegPaths.includes('desktop/trim1/exterior/color1/001-trim1-color1.jpeg'));
    assert.ok(jpegPaths.includes('desktop/trim1/exterior/color1/002-trim1-color1.jpeg'));
    assert.ok(jpegPaths.includes('desktop/trim1/exterior/color1/image-regular.jpeg'));
    assert.ok(jpegPaths.includes('desktop/trim1/exterior/color1/image-regular.jpeg'));

    // Case 2: Standardizing to jpg
    const resultJpg = Renamer.processDroppedFiles(foldersToCreate, filesToUpload, 'us', '', 'jpg');
    const jpgPaths = resultJpg.cleanedFiles.map(f => f.path);
    assert.ok(jpgPaths.includes('desktop/trim1/exterior/color1/001-trim1-color1.jpg'));
    assert.ok(jpgPaths.includes('desktop/trim1/exterior/color1/002-trim1-color1.jpg'));
    assert.ok(jpgPaths.includes('desktop/trim1/exterior/color1/image-regular.jpg'));
    assert.ok(jpgPaths.includes('desktop/trim1/exterior/color1/image-regular.jpg'));
});

test('AEM360Renamer - processDroppedFiles sequence inversion', (t) => {
    const foldersToCreate = new Set(['desktop', 'desktop/exterior', 'desktop/exterior/trim1', 'desktop/exterior/trim1/color1']);
    const filesToUpload = [
        { file: {}, path: 'desktop/exterior/trim1/color1/001.jpg' },
        { file: {}, path: 'desktop/exterior/trim1/color1/002.jpg' },
        { file: {}, path: 'desktop/exterior/trim1/color1/003.jpg' }
    ];

    // Case 1: Without inversion (default)
    const resultNormal = Renamer.processDroppedFiles(foldersToCreate, filesToUpload, 'us', '', 'jpeg', {});
    const normalPaths = resultNormal.cleanedFiles.map(f => f.path);
    assert.strictEqual(normalPaths[0], 'desktop/trim1/exterior/color1/001-trim1-color1.jpeg');
    assert.strictEqual(normalPaths[1], 'desktop/trim1/exterior/color1/002-trim1-color1.jpeg');
    assert.strictEqual(normalPaths[2], 'desktop/trim1/exterior/color1/003-trim1-color1.jpeg');

    // Case 2: With inversion active for 'desktop/exterior/trim1/color1'
    const inversionMap = {
        'desktop/exterior/trim1/color1': true
    };
    const resultInverted = Renamer.processDroppedFiles(foldersToCreate, filesToUpload, 'us', '', 'jpeg', inversionMap);
    const invertedPaths = resultInverted.cleanedFiles.map(f => f.path);
    // Sequence ranges from 1 to 3.
    // 001 (1) becomes 3 - 1 + 1 = 3 -> 003
    // 002 (2) becomes 3 - 2 + 1 = 2 -> 002
    // 003 (3) becomes 3 - 3 + 1 = 1 -> 001
    assert.strictEqual(invertedPaths[0], 'desktop/trim1/exterior/color1/003-trim1-color1.jpeg');
    assert.strictEqual(invertedPaths[1], 'desktop/trim1/exterior/color1/002-trim1-color1.jpeg');
    assert.strictEqual(invertedPaths[2], 'desktop/trim1/exterior/color1/001-trim1-color1.jpeg');
});

