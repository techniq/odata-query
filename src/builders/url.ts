import {PlainObject} from './../odata-types';

export function buildUrl(path: string, params: PlainObject): string {
    // This can be refactored using URL API. But IE does not support it.
    const queries: string[] = Object.getOwnPropertyNames(params)
        .filter(key => params[key] !== undefined && params[key] !== '')
        .map(key => `${key}=${params[key]}`);
    return queries.length ? `${path}?${queries.join('&')}` : path;
}
