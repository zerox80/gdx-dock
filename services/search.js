// SPDX-License-Identifier: GPL-2.0-or-later
export function normalize(value) {
    return String(value ?? '').toLocaleLowerCase().normalize('NFKD')
        .replace(/(\p{Script=Latin})\p{M}+/gu, '$1').replace(/ß/g, 'ss').trim();
}

export function searchApps(entries, query) {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (!tokens.length)
        return [...entries].sort((a, b) => a.name.localeCompare(b.name));

    return entries.map(entry => {
        const name = normalize(entry.name);
        const extra = normalize(`${entry.description} ${entry.keywords} ${entry.id}`);
        let score = 0;
        for (const token of tokens) {
            if (name === token)
                score += 100;
            else if (name.startsWith(token))
                score += 65;
            else if (name.split(/\s+/).some(word => word.startsWith(token)))
                score += 50;
            else if (name.includes(token))
                score += 30;
            else if (extra.includes(token))
                score += 10;
            else
                return {entry, score: -1};
        }
        return {entry, score};
    }).filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
        .map(result => result.entry);
}

export function dockEntries(favorites, running) {
    const seen = new Set();
    return [...favorites, ...running].filter(entry => {
        if (!entry || seen.has(entry.id))
            return false;
        seen.add(entry.id);
        return true;
    });
}
