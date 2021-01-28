import {Alias, QueryOptions, Value} from './odata-types';
import {handleValue} from './helpers';
import {buildFilter} from './builders/filter';
import {buildTransforms} from './builders/transforms';
import {buildExpand} from './builders/expand';
import {buildOrderBy} from './builders/order-by';
import {buildUrl} from './builders/url';

export function buildQuery<T>({
                                  select: $select,
                                  search: $search,
                                  skiptoken: $skiptoken,
                                  format: $format,
                                  top,
                                  skip,
                                  filter,
                                  transform,
                                  orderBy,
                                  key,
                                  count,
                                  expand,
                                  action,
                                  func
                              }: Partial<QueryOptions<T>> = {}) {
    let path: string = '';
    let aliases: Alias[] = [];

    const params: any = {};

    // key is not (null, undefined)
    if (key != undefined) {
        path += `(${handleValue(key as Value, aliases)})`;
    }

    if (filter || typeof count === 'object')
        params.$filter = buildFilter(typeof count === 'object' ? count : filter, aliases);

    if (transform)
        params.$apply = buildTransforms(transform);

    if (expand)
        params.$expand = buildExpand(expand);

    if (orderBy)
        params.$orderby = buildOrderBy(orderBy);

    if (count) {
        if (typeof count === 'boolean') {
            params.$count = true;
        } else {
            path += '/$count';
        }
    }

    if (typeof top === 'number') {
        params.$top = top;
    }

    if (typeof skip === 'number') {
        params.$skip = skip;
    }

    if (action) {
        path += `/${action}`;
    }

    if (func) {
        if (typeof func === 'string') {
            path += `/${func}`;
        } else if (typeof func === 'object') {
            const [funcName] = Object.keys(func);
            const funcArgs = handleValue(func[funcName] as Value, aliases);

            path += `/${funcName}`;
            if (funcArgs !== "") {
                path += `(${funcArgs})`;
            }
        }
    }

    if (aliases.length > 0) {
        Object.assign(params, aliases.reduce((acc, alias) =>
                Object.assign(acc, {[`@${alias.name}`]: handleValue(alias.value)})
            , {}));
    }

    return buildUrl(path, {$select, $search, $skiptoken, $format, ...params});
}
