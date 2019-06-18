const COMPARISON_OPERATORS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
const LOGICAL_OPERATORS = ['and', 'or', 'not'];
const COLLECTION_OPERATORS = ['any', 'all'];
const BOOLEAN_FUNCTIONS = ['startswith', 'endswith', 'contains'];
const SUPPORTED_EXPAND_PROPERTIES = [
  'expand',
  'select',
  'top',
  'orderby',
  'filter',
];

const FUNCTION_REGEX = /\((.*)\)/;
const INDEXOF_REGEX = /(?!indexof)\((\w+)\)/;

export type PlainObject = { [property: string]: any };
export type Filter = string | PlainObject | Array<string | PlainObject>;
export type NestedExpandOptions = { [key: string]: Partial<ExpandQueryOptions>; };
export type Expand = string | NestedExpandOptions | Array<string | NestedExpandOptions>;
export enum StandardAggregateMethods {
  sum = "sum",
  min = "min",
  max = "max",
  average = "average",
  countdistinct = "countdistinct",
}
export type Aggregate = { [propertyName: string]: { with: StandardAggregateMethods, as: string } } | string;

export interface ExpandQueryOptions {
  select: string | string[];
  filter: Filter;
  orderBy: string | string[];
  top: number;
  expand: Expand;
}
export interface Transform {
  aggregate?: Aggregate | Aggregate[];
  filter?: Filter;
  groupBy?: GroupBy;
}
export interface GroupBy {
  properties: string[];
  transform?: Transform;
}
export interface QueryOptions extends ExpandQueryOptions {
  search: string;
  transform: PlainObject | PlainObject[];
  skip: number;
  key: string | number | PlainObject;
  count: boolean | PlainObject;
  action: string;
  func: string | { [functionName: string]: { [parameterName: string]: any } };
  format: string;
}

export default function ({
  select: $select,
  search: $search,
  top: $top,
  skip: $skip,
  format: $format,
  filter,
  transform,
  orderBy,
  key,
  count,
  expand,
  action,
  func,
}: Partial<QueryOptions> = {}) {
  let path = '';

  const params: any = {
    $filter: (filter || count instanceof Object) && buildFilter(count instanceof Object ? count : filter),
    $apply: transform && buildTransforms(transform),
    $expand: expand && buildExpand(expand),
    $orderby: orderBy && buildOrderBy(orderBy),
  };

  if (key) {
    if (typeof key === 'object') {
      const keys = Object.keys(key)
        .map(k => `${k}=${key[k]}`)
        .join(',');
      path += `(${keys})`;
    } else {
      path += `(${key})`;
    }
  }

  if (count) {
    if (typeof count === 'boolean') {
      params.$count = true;
    } else {
      path += '/$count';
    }
  }

  if (action) {
    path += `/${action}`;
  }

  if (func) {
    if (typeof func === 'string') {
      path += `/${func}`;
    } else if (typeof func === 'object') {
      const [funcName] = Object.keys(func);
      const funcArgs = Object.keys(func[funcName]).reduce(
        (acc: { params: string[]; aliases: string[] }, item) => {
          const value = func[funcName][item];
          if (Array.isArray(value) && typeof value[0] === 'object') {
            acc.params.push(`${item}=@${item}`);
            acc.aliases.push(`@${item}=${escape(JSON.stringify(value))}`);
          } else {
            acc.params.push(`${item}=${handleValue(value)}`);
          }
          return acc;
        },
        { params: [], aliases: [] }
      );

      path += `/${funcName}`;
      if (funcArgs.params.length) {
        path += `(${funcArgs.params.join(',')})`;
      }
      if (funcArgs.aliases.length) {
        path += `?${funcArgs.aliases.join(',')}`;
      }
    }
  }

  return buildUrl(path, { $select, $search, $top, $skip, $format, ...params });
}

function buildFilter(filters: Filter = {}, propPrefix = ''): undefined | string {
  let filterExpr;
  if (filters) {
    if (typeof filters === 'string') {
      // Use raw filter string
      filterExpr = filters;
    } else if (Array.isArray(filters)) {
      filterExpr = filters
        .reduce((acc: string[], filter) => {
          const builtFilter = buildFilter(filter, propPrefix);
          if (builtFilter !== undefined) {
            acc.push(`(${builtFilter})`);
          }
          return acc;
        }, [])
        .join(' and ');
    } else if (typeof filters === 'object') {
      const filtersArray = Object.keys(filters).reduce(
        (result: any[], filterKey) => {
          const value = filters[filterKey];
          let propName = '';
          if (propPrefix) {
            if (INDEXOF_REGEX.test(filterKey)) {
              propName = filterKey.replace(INDEXOF_REGEX, `(${propPrefix}/$1)`);
            } else if (FUNCTION_REGEX.test(filterKey)) {
              propName = filterKey.replace(
                FUNCTION_REGEX,
                `(${propPrefix}/$1)`
              );
            } else {
              propName = `${propPrefix}/${filterKey}`;
            }
          } else {
            propName = filterKey;
          }

          if (
            ['number', 'string', 'boolean'].indexOf(typeof value) !== -1 ||
            value instanceof Date ||
            value === null
          ) {
            // Simple key/value handled as equals operator
            result.push(`${propName} eq ${handleValue(value)}`);
          } else if (Array.isArray(value)) {
            const op = filterKey;
            const builtFilters = value
              .map(v => buildFilter(v, propPrefix))
              .filter(f => f !== undefined)
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
              buildFilter({ [valueKey]: value[valueKey] })
            );
            if (builtFilters.length) {
              if (op === 'not') {
                result.push(parseNot(builtFilters as string[]));
              } else {
                result.push(`${builtFilters.join(` ${op} `)}`);
              }
            }
          } else if (value instanceof Object) {
            if ('type' in value) {
              result.push(`${propName} eq ${handleValue(value)}`);
            } else {
              const operators = Object.keys(value);
              operators.forEach(op => {
                if (COMPARISON_OPERATORS.indexOf(op) !== -1) {
                  result.push(`${propName} ${op} ${handleValue(value[op])}`);
                } else if (LOGICAL_OPERATORS.indexOf(op) !== -1) {
                  if (Array.isArray(value[op])) {
                    result.push(
                      value[op]
                        .map((v: any) => '(' + buildFilter(v, propName) + ')')
                        .join(` ${op} `)
                    );
                  } else {
                    result.push('(' + buildFilter(value[op], propName) + ')');
                  }
                } else if (COLLECTION_OPERATORS.indexOf(op) !== -1) {
                  const lambaParameter = filterKey.toLowerCase();
                  const filter = buildFilter(value[op], lambaParameter);

                  if (filter /*  !== undefined */) {
                    // Do not apply collection filter if undefined (ex. ignore `Foo: { any: {} }`)
                    result.push(
                      `${propName}/${op}(${lambaParameter}:${filter})`
                    );
                  }
                } else if (op === 'in') {
                  const resultingValues = Array.isArray(value[op])
                    ? // Convert `{ Prop: { in: [1,2,3] } }` to `(Prop eq 1 or Prop eq 2 or Prop eq 3)`
                    value[op]
                    : // Convert `{ Prop: { in: [{type: type, value: 1},{type: type, value: 2},{type: type, value: 3}] } }`
                    // to `(Prop eq 1 or Prop eq 2 or Prop eq 3)`
                    value[op].value.map((typedValue: any) => ({
                      type: value[op].type,
                      value: typedValue,
                    }));

                  result.push(
                    '(' +
                    resultingValues
                      .map((v: any) => `${propName} eq ${handleValue(v)}`)
                      .join(' or ') +
                    ')'
                  );
                } else if (BOOLEAN_FUNCTIONS.indexOf(op) !== -1) {
                  // Simple boolean functions (startswith, endswith, contains)
                  result.push(`${op}(${propName},${handleValue(value[op])})`);
                } else {
                  // Nested property
                  const filter = buildFilter(value, propName);
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

      filterExpr = filtersArray.join(' and ') || undefined;
    } else {
      throw new Error(`Unexpected filters type: ${filters}`);
    }
  }
  return filterExpr;
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

function handleValue(value: any) {
  if (typeof value === 'string') {
    return `'${escapeIllegalChars(value)}'`;
  } else if (value instanceof Date) {
    return value.toISOString();
  } else if (value instanceof Number) {
    return value;
  } else if (Array.isArray(value)) {
    // Double quote strings to keep them after `.join`
    const arr = value.map(d => (typeof d === 'string' ? `'${d}'` : d));
    return `[${arr.join(',')}]`;
  } else {
    // TODO: Figure out how best to specify types.  See: https://github.com/devnixs/ODataAngularResources/blob/master/src/odatavalue.js
    switch (value && value.type) {
      case 'guid':
        return value.value;
      case 'raw':
        return value.value;
      case 'binary':
        return `binary'${value.value}'`;
    }
    return value;
  }
}

function buildExpand(expands: Expand): string | undefined {
  if (typeof expands === 'number') {
    return expands;
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
    return `${expands.map(e => buildExpand(e)).join(',')}`;
  } else if (typeof expands === 'object') {
    const expandKeys = Object.keys(expands);

    if (
      expandKeys.some(
        key => SUPPORTED_EXPAND_PROPERTIES.indexOf(key.toLowerCase()) !== -1
      )
    ) {
      return expandKeys
        .map(key => {
          const value =
            key === 'filter'
              ? buildFilter(expands[key])
              : key.toLowerCase() === 'orderby'
                ? buildOrderBy(expands[key] as any)
                : buildExpand(expands[key] as any);
          return `$${key.toLowerCase()}=${value}`;
        })
        .join(';');
    } else {
      return expandKeys
        .map(key => {
          const builtExpand = buildExpand(expands[key] as any);
          return builtExpand ? `${key}(${builtExpand})` : key;
        })
        .join(',');
    }
  }
  return undefined;
}

function buildTransforms(transforms: PlainObject | PlainObject[]) {
  // Wrap single object an array for simplified processing
  const transformsArray = Array.isArray(transforms) ? transforms : [transforms];

  const transformsResult = transformsArray.reduce((result, transform) => {
    Object.keys(transform).forEach(transformKey => {
      const transformValue = transform[transformKey];
      switch (transformKey) {
        case 'aggregate':
          result.push(`aggregate(${buildAggregate(transformValue)})`);
          break;
        case 'filter':
          const builtFilter = buildFilter(transformValue);
          if (builtFilter !== undefined) {
            result.push(`filter(${buildFilter(transformValue)})`);
          }
          break;
        case 'groupby': // support both cases
        case 'groupBy':
          result.push(`groupby(${buildGroupBy(transformValue)})`);
          break;
        default:
          // TODO: support as many of the following:
          //   topcount, topsum, toppercent,
          //   bottomsum, bottomcount, bottompercent,
          //   identity, concat, expand, search, compute, isdefined
          throw new Error(`Unsupported transform: '${transformKey}'`);
      }
    });

    return result;
  }, []);

  return transformsResult.join('/') || undefined;
}

function buildAggregate(aggregate: Aggregate | Aggregate[]) {
  // Wrap single object in an array for simplified processing
  const aggregateArray = Array.isArray(aggregate) ? aggregate : [aggregate];

  return aggregateArray
    .map(aggregateItem => {
      return typeof aggregateItem === "string"
        ? aggregateItem
        : Object.keys(aggregateItem).map(aggregateKey => {
          const aggregateValue = aggregateItem[aggregateKey];

          // TODO: Are these always required?  Can/should we default them if so?
          if (!aggregateValue.with) {
            throw new Error(`'with' property required for '${aggregateKey}'`);
          }
          if (!aggregateValue.as) {
            throw new Error(`'as' property required for '${aggregateKey}'`);
          }

          return `${aggregateKey} with ${aggregateValue.with} as ${aggregateValue.as}`;
        });
    })
    .join(',');
}

function buildGroupBy(groupBy: GroupBy) {
  if (groupBy.properties === undefined) {
    throw new Error(`'properties' property required for groupBy`);
  }

  let result = `(${groupBy.properties.join(',')})`;

  if (groupBy.transform) {
    result += `,${buildTransforms(groupBy.transform)}`;
  }

  return result;
}

function buildOrderBy(orderBy: string | string[]): string {
  return Array.isArray(orderBy) ? orderBy.map(o => buildOrderBy(o)).join(',') : orderBy;
}

function buildUrl(path: string, params: PlainObject): string {
  // This can be refactored using URL API. But IE does not support it.
  const queries: string[] = [];
  for (const key of Object.getOwnPropertyNames(params)) {
    if (params[key]) {
      queries.push(`${key}=${params[key]}`);
    }
  }
  return queries.length ? `${path}?${queries.join('&')}` : path;
}

function parseNot(builtFilters: string[]): string {
  if (builtFilters.length > 1) {
    return `not( ${builtFilters.join(' and ')})`;
  } else {
    const filter = builtFilters[0] as string;
    return filter.charAt(0) === '(' ? `(not ${filter.substr(1)}` : `not ${filter}`;
  }
}
