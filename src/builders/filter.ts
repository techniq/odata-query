import {
    Alias,
    BOOLEAN_FUNCTIONS,
    COLLECTION_OPERATORS,
    COMPARISON_OPERATORS,
    Filter,
    FUNCTION_REGEX,
    LOGICAL_OPERATORS,
    PlainObject
} from './../odata-types';
import {handleValue} from './../helpers';
import {INDEXOF_REGEX, ITEM_ROOT} from './../constants';

export function buildFilter(filters: Filter = {}, aliases: Alias[] = [], propPrefix = ''): string {
    return ((Array.isArray(filters) ? filters : [filters])
        .reduce((acc: string[], filter) => {
            if (filter) {
                const builtFilter = buildFilterCore(filter, aliases, propPrefix);
                if (builtFilter) {
                    acc.push(builtFilter);
                }
            }
            return acc;
        }, []) as string[]).join(' and ');
}

function replaceFilterKey(filterKey: string, propPrefix: string, regExp: RegExp) {
    return filterKey.replace(regExp, (_, $1) => $1.trim() === ITEM_ROOT ? `(${propPrefix})` : `(${propPrefix}/${$1.trim()})`);
}

function processFilterObj(filter: PlainObject | Array<string | PlainObject>, propPrefix: string, aliases: Alias[]) {
    return Object.keys(filter).reduce(
        (result: any[], filterKey) => {
            const value = (filter as any)[filterKey];
            let propName = '';
            if (propPrefix) {
                if (filterKey === ITEM_ROOT) {
                    propName = propPrefix;
                } else if (INDEXOF_REGEX.test(filterKey)) {
                    propName = replaceFilterKey(filterKey, propPrefix, INDEXOF_REGEX);
                } else if (FUNCTION_REGEX.test(filterKey)) {
                    propName = replaceFilterKey(filterKey, propPrefix, FUNCTION_REGEX);
                } else {
                    propName = `${propPrefix}/${filterKey}`;
                }
            } else {
                propName = filterKey;
            }

            if (filterKey === ITEM_ROOT && Array.isArray(value)) {
                return result.concat(
                    value.map((arrayValue: any) => renderPrimitiveValue(propName, arrayValue))
                )
            }

            if (
                ['number', 'string', 'boolean'].indexOf(typeof value) !== -1 ||
                value instanceof Date ||
                value === null
            ) {
                // Simple key/value handled as equals operator
                result.push(renderPrimitiveValue(propName, value, aliases));
            } else if (Array.isArray(value)) {
                const op = filterKey;
                const builtFilters = value
                    .map(v => buildFilter(v, aliases, propPrefix))
                    .filter(f => f)
                    .map(f => (LOGICAL_OPERATORS.indexOf(op) !== -1 ? `(${f})` : f));
                if (builtFilters.length) {
                    if (LOGICAL_OPERATORS.indexOf(op) !== -1) {
                        if (builtFilters.length) {
                            if (op === 'not') {
                                result.push(parseNot(builtFilters as string[]));
                            } else {
                                result.push(`(${builtFilters.join(` ${op} `)})`);
                            }
                        }
                    } else {
                        result.push(builtFilters.join(` ${op} `));
                    }
                }
            } else if (LOGICAL_OPERATORS.indexOf(propName) !== -1) {
                const op = propName;
                const builtFilters = Object.keys(value).map(valueKey =>
                    buildFilterCore({[valueKey]: value[valueKey]})
                );
                if (builtFilters.length) {
                    if (op === 'not') {
                        result.push(parseNot(builtFilters as string[]));
                    } else {
                        result.push(`${builtFilters.join(` ${op} `)}`);
                    }
                }
            } else if (typeof value === 'object') {
                if ('type' in value) {
                    result.push(renderPrimitiveValue(propName, value, aliases));
                } else {
                    const operators = Object.keys(value);
                    operators.forEach(op => {
                        if (COMPARISON_OPERATORS.indexOf(op) !== -1) {
                            result.push(`${propName} ${op} ${handleValue(value[op], aliases)}`);
                        } else if (LOGICAL_OPERATORS.indexOf(op) !== -1) {
                            if (Array.isArray(value[op])) {
                                result.push(
                                    value[op]
                                        .map((v: any) => '(' + buildFilterCore(v, aliases, propName) + ')')
                                        .join(` ${op} `)
                                );
                            } else {
                                result.push('(' + buildFilterCore(value[op], aliases, propName) + ')');
                            }
                        } else if (COLLECTION_OPERATORS.indexOf(op) !== -1) {
                            const collectionClause = buildCollectionClause(filterKey.toLowerCase(), value[op], op, propName, aliases);
                            if (collectionClause) {
                                result.push(collectionClause);
                            }
                        } else if (op === 'has') {
                            result.push(`${propName} ${op} ${handleValue(value[op], aliases)}`);
                        } else if (op === 'in') {
                            const resultingValues = Array.isArray(value[op])
                                ? value[op]
                                : value[op].value.map((typedValue: any) => ({
                                    type: value[op].type,
                                    value: typedValue,
                                }));

                            result.push(
                                propName + ' in (' + resultingValues.map((v: any) => handleValue(v, aliases)).join(',') + ')'
                            );
                        } else if (BOOLEAN_FUNCTIONS.indexOf(op) !== -1) {
                            // Simple boolean functions (startswith, endswith, contains)
                            result.push(`${op}(${propName},${handleValue(value[op], aliases)})`);
                        } else {
                            // Nested property
                            const filter = buildFilterCore(value, aliases, propName);
                            if (filter) {
                                result.push(filter);
                            }
                        }
                    });
                }
            } else if (value === undefined) {
                // Ignore/omit filter if value is `undefined`
            } else {
                throw new Error(`Unexpected value type: ${value}`);
            }

            return result;
        },
        []
    );
}

function buildFilterCore(filter: Filter = {}, aliases: Alias[] = [], propPrefix = '') {
    let filterExpr = "";
    if (typeof filter === 'string') {
        // Use raw filter string
        filterExpr = filter;
    } else if (filter && typeof filter === 'object') {
        const filtersArray = processFilterObj(filter, propPrefix, aliases);

        filterExpr = filtersArray.join(' and ');
    } /* else {
        throw new Error(`Unexpected filters type: ${filter}`);
      } */
    return filterExpr;
}

function buildCollectionClause(lambdaParameter: string, value: any, op: string, propName: string, aliases: Alias[]) {
    let clause = '';

    if (typeof value === 'string' || value instanceof String) {
        clause = getStringCollectionClause(lambdaParameter, value, op, propName);
    } else if (value) {
        // normalize {any:[{prop1: 1}, {prop2: 1}]} --> {any:{prop1: 1, prop2: 1}}; same for 'all',
        // simple values collection: {any:[{'': 'simpleVal1'}, {'': 'simpleVal2'}]} --> {any:{'': ['simpleVal1', 'simpleVal2']}}; same for 'all',
        const filterValue = Array.isArray(value) ?
            value.reduce((acc, item) => {
                if (item.hasOwnProperty(ITEM_ROOT)) {
                    if (!acc.hasOwnProperty(ITEM_ROOT)) {
                        acc[ITEM_ROOT] = [];
                    }
                    acc[ITEM_ROOT].push(item[ITEM_ROOT])
                    return acc;
                }
                return {...acc, ...item}
            }, {}) : value;

        const filter = buildFilterCore(filterValue, aliases, lambdaParameter);
        clause = `${propName}/${op}(${filter ? `${lambdaParameter}:${filter}` : ''})`;
    }
    return clause;
}

function renderPrimitiveValue(key: string, val: any, aliases: Alias[] = []) {
    return `${key} eq ${handleValue(val, aliases)}`
}

function getStringCollectionClause(lambdaParameter: string, value: any, collectionOperator: string, propName: string) {
    let clause = '';
    const conditionOperator = collectionOperator == 'all' ? 'ne' : 'eq';
    clause = `${propName}/${collectionOperator}(${lambdaParameter}: ${lambdaParameter} ${conditionOperator} '${value}')`

    return clause;
}

function parseNot(builtFilters: string[]): string {
    return `not(${builtFilters.join(' and ')})`;
}
