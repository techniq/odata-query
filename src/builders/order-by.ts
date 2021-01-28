import {OrderBy, OrderByOptions} from './../odata-types';

export function buildOrderBy<T>(orderBy: OrderBy<T>, prefix: string = ''): string {
    if (Array.isArray(orderBy)) {
        return (orderBy as OrderByOptions<T>[])
            .map(value =>
                (Array.isArray(value) && value.length === 2 && ['asc', 'desc'].indexOf(value[1]) !== -1) ? value.join(' ') : value
            )
            .map(v => `${prefix}${v}`).join(',');
    } else if (typeof orderBy === 'object') {
        return Object.entries(orderBy)
            .map(([k, v]) => buildOrderBy(v as OrderBy<any>, `${k}/`))
            .map(v => `${prefix}${v}`).join(',');
    }
    return `${prefix}${orderBy}`;
}
