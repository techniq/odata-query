import {Alias, Value} from './odata-types';

export function handleValue(value: Value, aliases?: Alias[]): any {
    if (typeof value === 'string') {
        return `'${escapeIllegalChars(value)}'`;
    } else if (value instanceof Date) {
        return value.toISOString();
    } else if (typeof value === 'number') {
        return value;
    } else if (Array.isArray(value)) {
        return `[${value.map(d => handleValue(d)).join(',')}]`;
    } else if (value === null) {
        return value;
    } else if (typeof value === 'object') {
        switch (value.type) {
            case 'raw':
            case 'guid':
                return value.value;
            case 'duration':
                return `duration'${value.value}'`;
            case 'binary':
                return `binary'${value.value}'`;
            case 'alias':
                // Store
                if (Array.isArray(aliases))
                    aliases.push(value as Alias);
                return `@${(value as Alias).name}`;
            case 'json':
                return escape(JSON.stringify(value.value));
            case 'decimal':
                return `${value.value}M`;
            default:
                return Object.entries(value)
                    .filter(([, v]) => v !== undefined)
                    .map(([k, v]) => `${k}=${handleValue(v as Value, aliases)}`).join(',');
        }
    }
    return value;
}

function escapeIllegalChars(string: string) {
    string = string.replace(/%/g, '%25');
    string = string.replace(/\+/g, '%2B');
    string = string.replace(/\//g, '%2F');
    string = string.replace(/\?/g, '%3F');
    string = string.replace(/#/g, '%23');
    string = string.replace(/&/g, '%26');
    string = string.replace(/'/g, "''");
    return string;
}
