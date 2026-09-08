import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize, searchApps, dockEntries} from '../../services/search.js';

const apps = [
    {id: 'org.photo.desktop', name: 'Fotos', description: 'Bilder ansehen', keywords: 'photos pictures'},
    {id: 'org.editor.desktop', name: 'Texteditor', description: 'Texte bearbeiten', keywords: 'Notizen schreiben'},
    {id: 'org.terminal.desktop', name: 'Terminal', description: 'Befehlszeile', keywords: 'shell command'},
    {id: 'org.music.desktop', name: 'Música', description: 'Musik hören', keywords: 'audio player'},
];
test('search ignores accents and supports German sharp s', () => {
    assert.equal(normalize('  GRÖẞE  '), 'grosse');
    assert.equal(searchApps(apps, 'musica')[0].id, 'org.music.desktop');
});
test('all tokens must match across name and metadata', () => {
    assert.deepEqual(searchApps(apps, 'text schreiben').map(app => app.id), ['org.editor.desktop']);
    assert.deepEqual(searchApps(apps, 'text photos'), []);
});
test('name prefix outranks incidental metadata', () => {
    const entries = [...apps, {id: 'extra', name: 'Alpha', description: 'Terminal', keywords: ''}];
    assert.equal(searchApps(entries, 'term')[0].name, 'Terminal');
});
test('empty search is sorted without changing the catalog', () => {
    const before = [...apps];
    const results = searchApps(apps, '  ');
    assert.equal(results[0].name, 'Fotos');
    assert.deepEqual(apps, before);
    assert.notEqual(results, apps);
});
test('literal punctuation and nonexistent search return no unrelated apps', () => {
    assert.deepEqual(searchApps(apps, '['), []);
    assert.deepEqual(searchApps(apps, 'this-app-does-not-exist'), []);
});
test('pinned apps retain order and running favorites are never duplicated', () => {
    assert.deepEqual(dockEntries([apps[2], apps[0]], [apps[0], null, apps[1], apps[2]])
        .map(app => app.id), ['org.terminal.desktop', 'org.photo.desktop', 'org.editor.desktop']);
});

test('search preserves meaningful non-Latin marks and matches international names', () => {
    assert.notEqual(normalize('कि'), normalize('क'));
    for (const name of ['日本語', '한국어', 'العربية', 'Українська', 'हिन्दी']) {
        const entry = {id: 'test.desktop', name, description: '', keywords: ''};
        assert.deepEqual(searchApps([entry], name), [entry]);
    }
});
