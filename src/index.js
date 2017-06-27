const COMPARISON_OPERATORS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
const LOGICAL_OPERATORS = ['and', 'or', 'not'];
const COLLECTION_OPERATORS = ['any', 'all'];
const BOOLEAN_FUNCTIONS = ['startswith', 'endswith', 'contains'];
const SUPPORTED_EXPAND_PROPERTIES = ['expand', 'select', 'top', 'orderby', 'filter'];

export default function ({ select, filter, groupBy, orderBy, top, skip, key, count, expand, action, func } = {}) {
  const builtFilter = buildFilter(count instanceof Object ? count : filter)

  let path = '';
  const params = {};

  if (select) {
    params.$select = select
  }

  if (groupBy) {
    const applyParam = [];

    if (builtFilter) {
      applyParam.push(`filter(${builtFilter})`)
    }
    // TODO: Support `groupBy` subproperties using '/' or '.'
    applyParam.push(`groupby((${groupBy}),aggregate(Id with countdistinct as Total))`)
    params.$apply = applyParam.join('/');
  } else if (builtFilter) {
    params.$filter = builtFilter
  }

  if (top) {
    params.$top = top
  }

  if (skip) {
    params.$skip = skip
  }

  if (key) {
    if (typeof(key) === 'object') {
      const keys = Object.keys(key).map(k => `${k}=${key[k]}`).join(',')
      path += `(${keys})`;
    } else {
      path += `(${key})`;
    }
  }

  if (count) {
    if (typeof(count) === 'boolean') {
      params.$count = true
    } else {
      path += '/$count';
    }
  }

  if (action) {
    path += `/${action}`;
  }

  if (func) {
    if (typeof(func) === 'string') {
      path += `/${func}`;
    } else if (typeof(func) === 'object') {
      const [funcName] = Object.keys(func);
      const funcParams = Object.keys(func[funcName]).map(p => `${p}=${func[funcName][p]}`).join(',')

      path += `/${funcName}`;
      if (funcParams.length) {
        path += `(${funcParams})`;
      }
    }
  }

  if (expand) {
    params.$expand = buildExpand(expand)
  }

  if (orderBy) {
    params.$orderby = buildOrderBy(orderBy)
  }

  return buildUrl(path, params)
}

function buildFilter(filters = {}, propPrefix = '') {
  if (filters == null) {
    // ignore `null` and `undefined` filters (useful for conditionally applied filters)
    return
  } else if (typeof(filters) === 'string') {
    // Use raw filter string
    return filters;
  } else if (Array.isArray(filters)) {
    const builtFilters = filters.map(f => buildFilter(f, propPrefix)).filter(f => f !== undefined);
    if (builtFilters.length) {
      return `(${builtFilters.join(` and `)})`
    }
  } else if (typeof(filters) === 'object') {
    const filtersArray = Object.keys(filters).reduce((result, filterKey) => {
      const value = filters[filterKey];
      const propName = propPrefix ? `${propPrefix}/${filterKey}` : filterKey;

      if (["number", "string", "boolean"].indexOf(typeof(value)) !== -1 || value instanceof Date) {
        // Simple key/value handled as equals operator
        result.push(`${propName} eq ${handleValue(value)}`) 
      } else if (Array.isArray(value)) {
        const op = filterKey;
        const builtFilters = value.map(v => buildFilter(v, propPrefix)).filter(f => f !== undefined);
        if (builtFilters.length) {
          result.push(`(${builtFilters.join(` ${op} `)})`)
        }
      } else if (LOGICAL_OPERATORS.indexOf(propName) !== -1) {
        const builtFilters = Object.keys(value).map(valueKey => buildFilter({ [valueKey]: value[valueKey] }));
        if (builtFilters.length) {
          result.push(`${builtFilters.join(` ${propName} `)}`)
        }
      } else if (value instanceof Object) {
        const operators = Object.keys(value);
        operators.forEach(op => {
          if ([...COMPARISON_OPERATORS, ...LOGICAL_OPERATORS].indexOf(op) !== -1) {
            result.push(`${propName} ${op} ${handleValue(value[op])}`) 
          } else if (COLLECTION_OPERATORS.indexOf(op) !== -1) {
            const lambaParameter = propName[0].toLowerCase();
            result.push(`${propName}/${op}(${lambaParameter}:${buildFilter(value[op], lambaParameter)})`) 
          } else if (op === 'in') {
            // Convert `{ Prop: { in: [1,2,3] } }` to `Prop eq 1 or Prop eq 2 or Prop eq 3`
            result.push(value[op].map(v => `${propName} eq ${handleValue(v)}`).join(' or '))
          } else if (BOOLEAN_FUNCTIONS.indexOf(op) !== -1) {
            // Simple boolean functions (startswith, endswith, contains)
            result.push(`${op}(${propName},${handleValue(value[op])})`) 
          } else {
            // Nested property
            result.push(buildFilter(value, propName));
          }
        })
      } else if (value == null) {
        // Ignore/omit filter if `null` or `undefined`
      } else {
        throw new Error(`Unexpected value type: ${value}`)
      }

      return result;
    }, [])

    if (filtersArray.length) {
      return filtersArray.join(' and ');
    } else {
      // return `undefined` for empty arrays
      return
    }
  } else {
    throw new Error(`Unexpected filters type: ${filters}`)
  }
}

function handleValue(value) {
  if (typeof(value) === 'string') {
    return `'${value}'`
  } else if (value instanceof Date) {
    return value.toISOString();
  } else {
    // TODO: Figure out how best to specify types.  See: https://github.com/devnixs/ODataAngularResources/blob/master/src/odatavalue.js
    return value
  }
}

function buildExpand(expands) {
  if (typeof(expands) === 'number') {
    return expands
  } else if (typeof(expands) === 'string') {

    if (expands.indexOf('/') === -1) {
      return expands
    }

    // Change `Foo/Bar/Baz` to `Foo($expand=Bar($expand=Baz))`
    return expands.split('/').reverse().reduce((results, item, index, arr) => {
      if (index === 0) {
        // Inner-most item
        return `$expand=${item}`
      } else if(index === arr.length - 1) {
        // Outer-most item, don't add `$expand=` prefix (added above)
        return `${item}(${results})`
      } else {
        // Other items
        return `$expand=${item}(${results})`
      }
    }, '')
  } else if (Array.isArray(expands)) {
    return `${expands.map(e => buildExpand(e)).join(',')}`;
  } else if (typeof(expands) === 'object') {
    const expandKeys = Object.keys(expands);

    if (expandKeys.some(key => SUPPORTED_EXPAND_PROPERTIES.indexOf(key.toLowerCase()) !== -1)) {
      return expandKeys.map(key => {
        const value =
          key === 'filter' ? buildFilter(expands[key]) :
          key.toLowerCase() === 'orderby' ? buildOrderBy(expands[key]) :
          buildExpand(expands[key]);
        return `$${key.toLowerCase()}=${value}`
      })
      .join(';')
    } else {
      return expandKeys.map(key => {
        const builtExpand = buildExpand(expands[key]);
        return builtExpand ? `${key}(${builtExpand})` : key;
      })
      .join(',')
    }
  }
}

function buildOrderBy(orderBy) {
  if (typeof(orderBy) === 'number') {
    return orderBy
  } else if (typeof(orderBy) === 'string') {
    return orderBy
  } else if (Array.isArray(orderBy)) {
    return `${orderBy.map(o => buildOrderBy(o)).join(',')}`;
  }
}

function buildUrl(path, params) {
  if (Object.keys(params).length) {
    return path + '?' + Object.keys(params).map(key => `${key}=${params[key]}`).join('&');
  } else {
    return path;
  }
}
