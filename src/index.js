const COMPARISON_OPERATORS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
const LOGICAL_OPERATORS = ['and', 'or', 'not'];
const COLLECTION_OPERATORS = ['any', 'all'];

export default function ({ select, filter, groupBy, orderBy, top, skip, count, expand } = {}) {
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

  if (count) {
    if (typeof(count) === 'boolean') {
      params.$count = true
    } else {
      path = '/$count';
    }
  }

  if (expand) {
    params.$expand = buildExpand(expand)
  }

  if (orderBy) {
    params.$orderby = orderBy
  }

  return buildUrl(path, params)
}

function buildFilter(filters = {}, propPrefix = '') {
  if (typeof(filters) === 'string') {
    // Use raw filter string
    return filters;
  } else if (Array.isArray(filters)) {
    // return `(${filters.map(f => buildFilter(f, propPrefix)).join(' and ')})`;
    const builtFilters = filters.map(f => buildFilter(f, propPrefix));
    if (builtFilters.length) {
      return `(${builtFilters.join(` and `)})`
    }
  } else if (typeof(filters) === 'object') {
    const filtersArray = Object.keys(filters).reduce((result, filterKey) => {
      const value = filters[filterKey];
      const propName = propPrefix ? `${propPrefix}/${filterKey}` : filterKey;

      if (Array.isArray(value)) {
        const op = filterKey;
        const builtFilters = value.map(v => buildFilter(v, propPrefix));
        if (builtFilters.length) {
          result.push(`(${builtFilters.join(` ${op} `)})`)
        }
      } else if (["number", "string", "boolean"].indexOf(typeof(value)) !== -1 || value instanceof Date) {
        // Simple key/value handled as equals operator
        result.push(`${propName} eq ${handleValue(value)}`) 
      } else if (value instanceof Object) {
        const operators = Object.keys(value);
        operators.forEach(op => {
          if ([...COMPARISON_OPERATORS, ...LOGICAL_OPERATORS].indexOf(op) !== -1) {
            result.push(`${propName} ${op} ${handleValue(value[op])}`) 
          } else if (COLLECTION_OPERATORS.indexOf(op) !== -1) {
            const lambaParameter = propName[0].toLowerCase();
            result.push(`${propName}/${op}(${lambaParameter}:${buildFilter(value[op], lambaParameter)})`) 
          } else if (op === 'in') {
            // Convert `{ Prop: [1,2,3] }` to `Prop eq 1 or Prop eq 2 or Prop eq 3`
            result.push(value[op].map(v => `${propName} eq ${handleValue(v)}`).join(' or '))
          } else {
            // single boolean function
            result.push(`${op}(${propName}, ${handleValue(value[op])})`) 
          }
        })
      } else if (value === undefined) {
        // Ignore/omit filter
      } else {
        throw new Error(`Unexpected value type: ${value}`)
      }

      return result;
    }, [])

    return filtersArray.join(' and ');
  } else {
    throw new Error(`Unexpected filters type: ${filters}`)
  }
}

function handleValue(value) {
  if (typeof(value) === 'string') {
    return `'${value}'`
  } else if (value instanceof Date) {
    const isoString = value.toISOString();
    return isoString.split('.')[0] + "Z"; // strip microseconds
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
        // First item
        return `$expand=${item}`
      } else if(index === arr.length - 1) {
        // Last item, don't add `$expand=` prefix (added above)
        return `${item}(${results})`
      } else {
        // Other items
        return `$expand=${item}(${results})`
      }
    }, '')
  } else if (Array.isArray(expands)) {
    return `${expands.map(e => buildExpand(e)).join(',')}`;
  } else if (typeof(expands) === 'object') {
    return Object.keys(expands)
                 // Supports `orderBy` and `orderby`
                 .map(key => ['expand', 'select', 'top', 'orderby', 'filter'].indexOf(key.toLowerCase()) !== -1
                    ? `$${key.toLowerCase()}=${key === 'filter' ? buildFilter(expands[key]) : buildExpand(expands[key])}`
                    : `${key}(${buildExpand(expands[key])})`
                  )
                 .join(';')
  }
}

function buildUrl(path, params) {
  if (Object.keys(params).length) {
    return path + '?' + Object.keys(params).map(key => `${key}=${params[key]}`).join('&');
  } else {
    return path;
  }
}
