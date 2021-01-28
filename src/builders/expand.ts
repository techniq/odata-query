import {Expand, NestedExpandOptions, OrderBy, SUPPORTED_EXPAND_PROPERTIES} from './../odata-types';
import {buildFilter} from "./filter";
import {buildOrderBy} from "./order-by";

export function buildExpand<T>(expands: Expand<T>): string {
    if (typeof expands === 'number') {
        return expands as any;
    } else if (typeof expands === 'string') {
        if (expands.indexOf('/') === -1) {
            return expands;
        }

        // Change `Foo/Bar/Baz` to `Foo($expand=Bar($expand=Baz))`
        return expands
            .split('/')
            .reverse()
            .reduce((results, item, index, arr) => {
                if (index === 0) {
                    // Inner-most item
                    return `$expand=${item}`;
                } else if (index === arr.length - 1) {
                    // Outer-most item, don't add `$expand=` prefix (added above)
                    return `${item}(${results})`;
                } else {
                    // Other items
                    return `$expand=${item}(${results})`;
                }
            }, '');
    } else if (Array.isArray(expands)) {
        return `${(expands as Array<NestedExpandOptions<any>>).map(e => buildExpand(e)).join(',')}`;
    } else if (typeof expands === 'object') {
        const expandKeys = Object.keys(expands);

        if (
            expandKeys.some(
                key => SUPPORTED_EXPAND_PROPERTIES.indexOf(key.toLowerCase()) !== -1
            )
        ) {
            return expandKeys
                .map(key => {
                    let value;
                    switch (key) {
                        case 'filter':
                            value = buildFilter((expands as NestedExpandOptions<any>)[key]);
                            break;
                        case 'orderBy':
                            value = buildOrderBy((expands as NestedExpandOptions<any>)[key] as OrderBy<T>);
                            break;
                        case 'levels':
                        case 'count':
                        case 'top':
                            value = `${(expands as NestedExpandOptions<any>)[key]}`;
                            break;
                        default:
                            value = buildExpand((expands as NestedExpandOptions<any>)[key] as Expand<T>);
                    }
                    return `$${key.toLowerCase()}=${value}`;
                })
                .join(';');
        } else {
            return expandKeys
                .map(key => {
                    const builtExpand = buildExpand((expands as NestedExpandOptions<any>)[key] as NestedExpandOptions<any>);
                    return builtExpand ? `${key}(${builtExpand})` : key;
                })
                .join(',');
        }
    }
    return "";
}
