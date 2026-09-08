// SPDX-License-Identifier: GPL-2.0-or-later

// Gettext translators may reorder arguments with %1$s and %2$d.
// Our messages use only strings, integer counts and escaped percent signs.
export function format(message, ...args) {
    let next = 0;
    return message.replace(/%(?:(\d+)\$)?([sd%])/g, (_match, position, type) => {
        if (type === '%')
            return '%';
        const index = position ? Number(position) - 1 : next++;
        if (index < 0 || index >= args.length)
            throw new Error('Translation placeholder has no matching argument');
        return type === 'd' ? String(Math.trunc(Number(args[index]))) : String(args[index]);
    });
}
