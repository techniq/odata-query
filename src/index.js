const COMPARISON_OPERATORS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
const LOGICAL_OPERATORS = ['and', 'or', 'not'];
const COLLECTION_OPERATORS = ['any', 'all'];

export default function ({ select, filter, groupBy, orderBy, top, skip, count, expand } = {}) {
  const builtFilter = buildFilter(filter)

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
      params.$count = true
    }
  }

  if (expand) {
    // TODO: Seperate and built out based on dotted notation 'Foo.Bar.Baz' => '$expand=Foo($expand=Bar($expand=Baz))
    // example: $expand=Source,SourceType,Site,Customer,Status,Tasks,Tasks($expand=AssignedUser),Tasks($expand=AssignedGroup),Tasks($expand=Status)
    params.$expand = expand
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
    return filters.map(f => buildFilter(f, propPrefix)).join(' and ');
  } else if (typeof(filters) === 'object') {
    const filtersArray = Object.keys(filters).reduce((result, filterKey) => {
      const value = filters[filterKey];
      const propName = propPrefix ? `${propPrefix}/${filterKey}` : filterKey;

      if (Array.isArray(value)) {
        result.push(`(${value.map(v => buildFilter(v, propPrefix)).join(` ${filterKey} `)})`)
      } else if (["number", "string", "boolean"].includes(typeof(value)) || value instanceof Date) {
        // Simple key/value handled as equals operator
        result.push(`${propName} eq ${handleValue(value)}`) 
      } else if (value instanceof Object) {
        const operators = Object.keys(value);
        operators.forEach(op => {
          if ([...COMPARISON_OPERATORS, ...LOGICAL_OPERATORS].includes(op)) {
            result.push(`${propName} ${op} ${handleValue(value[op])}`) 
          } else if (COLLECTION_OPERATORS.includes(op)) {
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

function buildUrl(path, params) {
  if (Object.keys(params).length) {
    return path + '?' + Object.keys(params).map(key => `${key}=${params[key]}`).join('&');
  } else {
    return path;
  }
}