const COMPARISON_OPERATORS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
const LOGICAL_OPERATORS = ['and', 'or', 'not'];
const COLLECTION_OPERATORS = ['any', 'all'];
const BOOLEAN_FUNCTIONS = ['startswith', 'endswith', 'contains'];
const SUPPORTED_EXPAND_PROPERTIES = [
  'expand',
  'levels',
  'select',
  'top',
  'count',
  'orderby',
  'filter',
];

const FUNCTION_REGEX = /\((.*)\)/;
const INDEXOF_REGEX = /(?!indexof)\((\w+)\)/;

export type PlainObject = { [property: string]: any };
export type Select<T> = string | keyof T | Array<keyof T>;
export type OrderBy<T> = string | OrderByOptions<T> | Array<OrderByOptions<T>> | { [P in keyof T]?: OrderBy<T[P]> };
export type Filter = string | PlainObject | Array<string | PlainObject>;
export type NestedExpandOptions<T> = {[P in keyof T]?: (T[P] extends Array<infer E> ? Partial<ExpandOptions<E>> : Partial<ExpandOptions<T[P]>>) };
export type Expand<T> = string | keyof T | NestedExpandOptions<T> | Array<keyof T | NestedExpandOptions<T>> | Array<string | NestedExpandOptions<T>>;
export enum StandardAggregateMethods {
  sum = "sum",
  min = "min",
  max = "max",
  average = "average",
  countdistinct = "countdistinct",
}
export type Aggregate = string | { [propertyName: string]: { with: StandardAggregateMethods, as: string } };

export type OrderByOptions<T> = keyof T | [ keyof T, 'asc' | 'desc' ];
export type ExpandOptions<T> = {
  select: Select<T>;
  filter: Filter;
  orderBy: OrderBy<T>;
  top: number;
  levels: number | 'max';
  count: boolean | Filter;
  expand: Expand<T>;
}

export type Transform<T> = {
  aggregate?: Aggregate | Array<Aggregate>;
  filter?: Filter;
  groupBy?: GroupBy<T>;
}
export type GroupBy<T> = {
  properties: Array<keyof T>;
  transform?: Transform<T>;
}

export type Value = {
  type: 'raw' | 'guid' | 'duration' | 'binary' | 'json' | 'alias';
  value: any;
}

export type Alias = Value & {
  name: string;
  handleName(): string;
  handleValue(): string;
}

export const raw = (value: string): Value => ({type: 'raw', value});
export const guid = (value: string): Value => ({type: 'guid', value});
export const duration = (value: string): Value => ({type: 'duration', value});
export const binary = (value: string): Value => ({type: 'binary', value});
export const json = (value: PlainObject): Value => ({type: 'json', value});
export const alias = (name: string, value: PlainObject): Alias => ({
  type: 'alias', name, value,
  handleName() {
    return `@${this.name}`;
  },
  handleValue() {
    return handleValue(this.value);
  }
});

export type QueryOptions<T> = ExpandOptions<T> & {
  search: string;
  transform: PlainObject | PlainObject[];
  skip: number;
  skiptoken: string;
  key: string | number | PlainObject;
  count: boolean | Filter;
  action: string;
  func: string | { [functionName: string]: { [parameterName: string]: any } };
  format: string;
  aliases: Alias[];
}

export const ITEM_ROOT = "";

export default function <T>({
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
  func,
  aliases
}: Partial<QueryOptions<T>> = {}) {
  let path = '';

  const params: any = {};

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

  if (filter || typeof count === 'object')
    params.$filter = buildFilter(typeof count === 'object' ? count : filter);

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
      const funcArgs = Object.keys(func[funcName]).reduce(
        (acc: string[], item) => [...acc, `${item}=${handleValue(func[funcName][item])}`],
        []
      );

      path += `/${funcName}`;
      if (funcArgs.length) {
        path += `(${funcArgs.join(',')})`;
      }
    }
  }

  if (aliases) {
    aliases
      .reduce((acc, alias) => Object.assign(acc, {[alias.handleName()]: alias.handleValue()}), params);
  }

  return buildUrl(path, { $select, $search, $skiptoken, $format, ...params });
}

function buildFilter(filters: Filter = {}, propPrefix = ''): string {
  return ((Array.isArray(filters) ? filters : [filters])
    .reduce((acc: string[], filter) => {
      if (filter) {
        const builtFilter = buildFilterCore(filter, propPrefix);
        if (builtFilter) {
          acc.push(builtFilter);
        }
      }
      return acc;
    }, []) as string[]).join(' and ');

  function buildFilterCore(filter: Filter = {}, propPrefix = '') {
    let filterExpr = "";
    if (typeof filter === 'string') {
      // Use raw filter string
      filterExpr = filter;
    } else if (filter && typeof filter === 'object') {
      const filtersArray = Object.keys(filter).reduce(
        (result: any[], filterKey) => {
          const value = (filter as any)[filterKey];
          let propName = '';
          if (propPrefix) {
            if (filterKey === ITEM_ROOT) {
              propName = propPrefix;
            } else if (INDEXOF_REGEX.test(filterKey)) {
              propName = filterKey.replace(INDEXOF_REGEX, (_,$1)=>$1.trim() === ITEM_ROOT ? `(${propPrefix})` : `(${propPrefix}/${$1.trim()})`);
            } else if (FUNCTION_REGEX.test(filterKey)) {
              propName = filterKey.replace(FUNCTION_REGEX, (_,$1)=>$1.trim() === ITEM_ROOT ? `(${propPrefix})` : `(${propPrefix}/${$1.trim()})`);
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
              buildFilterCore({ [valueKey]: value[valueKey] })
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
                        .map((v: any) => '(' + buildFilterCore(v, propName) + ')')
                        .join(` ${op} `)
                    );
                  } else {
                    result.push('(' + buildFilterCore(value[op], propName) + ')');
                  }
                } else if (COLLECTION_OPERATORS.indexOf(op) !== -1) {
                  const collectionClause = buildCollectionClause(filterKey.toLowerCase(), value[op], op, propName);
                  if (collectionClause) { result.push(collectionClause); }
                } else if (op === 'in') {
                  const resultingValues = Array.isArray(value[op])
                    ? value[op]
                    : value[op].value.map((typedValue: any) => ({
                      type: value[op].type,
                      value: typedValue,
                    }));

                  result.push(
                    propName + ' in (' + resultingValues.map((v: any) => handleValue(v)).join(',') + ')'
                  );
                } else if (BOOLEAN_FUNCTIONS.indexOf(op) !== -1) {
                  // Simple boolean functions (startswith, endswith, contains)
                  result.push(`${op}(${propName},${handleValue(value[op])})`);
                } else {
                  // Nested property
                  const filter = buildFilterCore(value, propName);
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

      filterExpr = filtersArray.join(' and ');
    } /* else {
        throw new Error(`Unexpected filters type: ${filter}`);
      } */
    return filterExpr;
  }

	function buildCollectionClause(lambdaParameter: string, value: any, op: string, propName: string) {
		let clause = '';

		if (typeof value === 'string' || value instanceof String) {
			clause = getStringCollectionClause(lambdaParameter, value, op, propName);

		} else if (value) {
			// normalize {any:[{prop1: 1}, {prop2: 1}]} --> {any:{prop1: 1, prop2: 1}}; same for 'all'
			const filter = buildFilterCore(
				Array.isArray(value)
					? value.reduce((acc, item) => ({ ...acc, ...item }), {})
					: value, lambdaParameter);
			clause = `${propName}/${op}(${filter ? `${lambdaParameter}:${filter}` : ''})`;
		}
		return clause;
	}
}

function getStringCollectionClause(lambdaParameter: string, value: any, collectionOperator: string, propName: string) {
	let clause = '';
	const conditionOperator = collectionOperator == 'all' ? 'ne' : 'eq';
	clause = `${propName}/${collectionOperator}(${lambdaParameter}: ${lambdaParameter} ${conditionOperator} '${value}')`

	return clause;
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
      case 'duration':
        return `duration'${value.value}'`;
      case 'raw':
        return value.value;
      case 'binary':
        return `binary'${value.value}'`;
      case 'alias':
        return (value as Alias).handleName();
      case 'json':
        return escape(JSON.stringify(value.value));
    }
    return value;
  }
}

function buildExpand<T>(expands: Expand<T>): string {
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

function buildTransforms<T>(transforms: Transform<T> | Transform<T>[]) {
  // Wrap single object an array for simplified processing
  const transformsArray = Array.isArray(transforms) ? transforms : [transforms];

  const transformsResult = transformsArray.reduce((result: string[], transform) => {
    const { aggregate, filter, groupBy, ...rest } = transform;

    // TODO: support as many of the following:
    //   topcount, topsum, toppercent,
    //   bottomsum, bottomcount, bottompercent,
    //   identity, concat, expand, search, compute, isdefined
    const unsupportedKeys = Object.keys(rest);
    if (unsupportedKeys.length) { throw new Error(`Unsupported transform(s): ${unsupportedKeys}`); }

    if (aggregate) { result.push(`aggregate(${buildAggregate(aggregate)})`); }
    if (filter) {
      const builtFilter = buildFilter(filter);
      if (builtFilter) {
        result.push(`filter(${buildFilter(builtFilter)})`);
      }
    }
    if (groupBy) { result.push(`groupby(${buildGroupBy(groupBy)})`); }

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

function buildGroupBy<T>(groupBy: GroupBy<T>) {
  if (!groupBy.properties) {
    throw new Error(`'properties' property required for groupBy`);
  }

  let result = `(${groupBy.properties.join(',')})`;

  if (groupBy.transform) {
    result += `,${buildTransforms(groupBy.transform)}`;
  }

  return result;
}

function buildOrderBy<T>(orderBy: OrderBy<T>, prefix: string = ''): string {
  if (Array.isArray(orderBy)) {
    return (orderBy as OrderByOptions<T>[])
      .map(value =>
        (Array.isArray(value) && value.length === 2 && ['asc', 'desc'].indexOf(value[1]) !== -1)? value.join(' ') : value
      )
      .map(v => `${prefix}${v}`).join(',');
  } else if (typeof orderBy === 'object') {
    return Object.entries(orderBy)
      .map(([k, v]) => buildOrderBy(v as OrderBy<any>, `${k}/`))
      .map(v => `${prefix}${v}`).join(',');
  }
  return `${prefix}${orderBy}`;
}

function buildUrl(path: string, params: PlainObject): string {
  // This can be refactored using URL API. But IE does not support it.
  const queries: string[] = Object.getOwnPropertyNames(params)
    .filter(key => params[key] !== undefined && params[key] !== '')
    .map(key => `${key}=${params[key]}`);
  return queries.length ? `${path}?${queries.join('&')}` : path;
}

function parseNot(builtFilters: string[]): string {
  return `not(${builtFilters.join(' and ')})`;
}
