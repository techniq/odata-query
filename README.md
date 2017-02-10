# odata-query

OData v4 query builder

## Install
```
yarn add odata-query
```
or
```
npm install --save odata-query
```

and then use the library
```js
import buildQuery from 'odata-query'

const query = buildQuery({...})
``` 
where the query object syntax for `{...}` is defined below

## Examples
See [tests](src/index.test.js) for examples as well

### Filtering
```js
buildQuery({ filter: {...} })
=> '$filter=...'
```

#### Simple filter
```js
const filter = { PropName: 1 };
buildQuery({ filter })
=> '$filter=PropName eq 1'
```

#### Comparison operators
```js
buildQuery({ filter: { PropName: { gt: 5 } } })
=> '$filter=PropName gt 5'
```
Supported operators: `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `in`

#### Logical operators
```js
// `and` implied by user an array
const filter = [{ SomeProp: 1 }, { AnotherProp: 2 }, 'startswith(Name, "foo")'];

// or you can be explicit
const filter = {
  and: [
    { SomeProp: 1 },
    { AnotherProp: 2 },
    'startswith(Name, "foo")'
  ]
};
    
buildQuery({ filter })
=> '$filter=SomeProp eq 1 and AnotherProp eq 2 and startswith(Name, "foo")'
```
Supported operators: `and`, `or`

#### Collection operators
```js
const filter = {
  SomeCollection: {
    any: [{
      SomeProp: 1,
      AnotherProp: 2
    }]
  }
};
    
buildQuery({ filter })
=> '$filter=SomeCollection/any(t:(t/SomeProp eq 1 and t/AnotherProp eq 2)'
```

Supported operators: `any`, `all`

#### Strings
A string can also be passed as the value of the filter and it will be taken as is.  This can be useful when using something like [odata-filter-builder](https://github.com/bodia-uz/odata-filter-builder) or if you want to just write the OData filter sytnax yourself but use the other benefits of the library (groupBy, etc)
```js
import f from 'odata-filter-builder';

const filter = f().eq('TypeId', '1')
                  .contains(x => x.toLower('Name'), 'a');
buildQuery({ filter: filter.toString() })
```

### Selecting
Coming soon

### Ordering
Coming soon

### Expanding
Coming soon

### Pagination (skip and top)
Coming soon

### Counting
Coming soon

### Grouping / aggregation
Coming soon