const COMPARISON_OPERATORS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
const LOGICAL_OPERATORS = ['and', 'or', 'not'];
const COLLECTION_OPERATORS = ['any', 'all'];
const BOOLEAN_FUNCTIONS = ['startswith', 'endswith', 'contains'];
const SUPPORTED_EXPAND_PROPERTIES = ['expand', 'select', 'top', 'orderby', 'filter'];

const FUNCTION_REGEX = /\((.*)\)/;

export default function ({ select, filter, search, groupBy, transform, orderBy, top, skip, key, count, expand, action, func } = {}) {
  let path = '';
  const params = {};

  if (select) {
    params.$select = select
  }

  if (filter || count instanceof Object) {
    const builtFilter = buildFilter(count instanceof Object ? count : filter)
    if (builtFilter !== undefined) {
      params.$filter = builtFilter
    }
  }

  if (search) {
    params.$search = search
  }

  if (transform) {
    const builtTransforms = buildTransforms(transform);
    if (builtTransforms !== undefined) {
      params.$apply = builtTransforms
    }
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
      return `${builtFilters.map(f => `(${f})`).join(` and `)}`
    }
  } else if (typeof(filters) === 'object') {
    const filtersArray = Object.keys(filters).reduce((result, filterKey) => {
      const value = filters[filterKey];
      const propName = propPrefix ?
        (FUNCTION_REGEX.test(filterKey) ? filterKey.replace(FUNCTION_REGEX, `(${propPrefix}/$1)`) : `${propPrefix}/${filterKey}`)
        : filterKey;

      if (["number", "string", "boolean"].indexOf(typeof(value)) !== -1 || value instanceof Date || value === null) {
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
            const lambaParameter = filterKey[0].toLowerCase();
            const filter = buildFilter(value[op], lambaParameter);

            if (filter !== undefined) {
              // Do not apply collection filter if undefined (ex. ignore `Foo: { any: {} }`)
              result.push(`${propName}/${op}(${lambaParameter}:${filter})`)
            }
          } else if (op === 'in') {
            // Convert `{ Prop: { in: [1,2,3] } }` to `(Prop eq 1 or Prop eq 2 or Prop eq 3)`
            result.push('(' + value[op].map(v => `${propName} eq ${handleValue(v)}`).join(' or ') + ')')
          } else if (BOOLEAN_FUNCTIONS.indexOf(op) !== -1) {
            // Simple boolean functions (startswith, endswith, contains)
            result.push(`${op}(${propName},${handleValue(value[op])})`)
          } else {
            // Nested property
            result.push(buildFilter(value, propName));
          }
        })
      } else if (value === undefined) {
        // Ignore/omit filter if value is `undefined`
      } else {
        throw new Error(`Unexpected value type: ${value}`)
      }

      return result;
    }, [])

    return filtersArray.join(' and ') || undefined;
  } else {
    throw new Error(`Unexpected filters type: ${filters}`)
  }
}

function handleValue(value) {
  if (typeof(value) === 'string') {
    return `'${value.replace("'", "''")}'`
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

function buildTransforms(transforms) {
  // Wrap single object an array for simplified processing
  const transformsArray = Array.isArray(transforms) ? transforms : [transforms];

  const transformsResult = transformsArray.reduce((result, transform) => {
    Object.keys(transform).forEach(transformKey => {
      const transformValue = transform[transformKey];
      switch(transformKey) {
        case 'aggregate':
          result.push(`aggregate(${buildAggregate(transformValue)})`)
          break;
        case 'filter':
          const builtFilter = buildFilter(transformValue);
          if (builtFilter !== undefined) {
            result.push(`filter(${buildFilter(transformValue)})`)
          }
          break;
        case 'groupby': // support both cases
        case 'groupBy':
          result.push(`groupby(${buildGroupBy(transformValue)})`)
          break;
        default:
          // TODO: support as many of the following:
          //   topcount, topsum, toppercent,
          //   bottomsum, bottomcount, bottompercent,
          //   identity, concat, expand, search, compute, isdefined
          throw new Error(`Unsupported transform: '${transformKey}'`)
      }
    })

    return result;
  }, [])

  return transformsResult.join('/') || undefined;
}

function buildAggregate(aggregate) {
  // Wrap single object in an array for simplified processing
  const aggregateArray = Array.isArray(aggregate) ? aggregate : [aggregate];

  return aggregateArray.map(aggregateItem => {
    return Object.keys(aggregateItem).map(aggregateKey => {
      const aggregateValue = aggregateItem[aggregateKey];

      // TODO: Are these always required?  Can/should we default them if so?
      if (aggregateValue.with === undefined) {
        throw new Error(`'with' property required for '${aggregateKey}'`)
      }
      if (aggregateValue.as === undefined) {
        throw new Error(`'as' property required for '${aggregateKey}'`)
      }

      return `${aggregateKey} with ${aggregateValue.with} as ${aggregateValue.as}`
    })
  }).join(',')
}

function buildGroupBy(groupBy) {
  if (groupBy.properties === undefined) {
    throw new Error(`'properties' property required for groupBy:'${aggregateKey}'`)
  }

  let result = `(${groupBy.properties.join(',')})`;

  if (groupBy.transform) {
    result += `,${buildTransforms(groupBy.transform)}`;
  }

  return result;
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
