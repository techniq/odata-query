# odata-query

OData v4 query builder that uses a simple object-based syntax similar to [MongoDB](https://docs.mongodb.com/manual/reference/operator/query/) and [js-data](http://www.js-data.io/v3.0/docs/query-syntax)

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
fetch(`http://localhost${query}`)
``` 
where the query object syntax for `{...}` is defined below.  There is also [react-odata](https://github.com/techniq/react-odata) which utilizies this library for a declarative React component.

## Usage
See [tests](src/index.test.js) for examples as well

### Filtering
```js
buildQuery({ filter: {...} })
=> '?$filter=...'
```

#### Simple filter
```js
const filter = { PropName: 1 };
buildQuery({ filter })
=> '?$filter=PropName eq 1'
```

#### Comparison operators
```js
const filter = { PropName: { gt: 5 } };
buildQuery({ filter })
=> '?$filter=PropName gt 5'
```
Supported operators: `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `in`

#### Logical operators
```js
// `and` implied by using an array
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
=> '?$filter=SomeProp eq 1 and AnotherProp eq 2 and startswith(Name, "foo")'
```
Supported operators: `and`, `or`

#### Collection operators
##### Implied `and`

Using an object
```js
const filter = {
  ItemsProp: {
    any: {
      SomeProp: 1,
      AnotherProp: 2
    }
  }
};
    
buildQuery({ filter })
=> '?$filter=ItemsProp/any(i:i/SomeProp eq 1 and i/AnotherProp eq 2)'
```

or also as an array of object
```js
const filter = {
  ItemsProp: {
    any: [
      { SomeProp: 1 },
      { AnotherProp: 2},
    ]
  }
};
    
buildQuery({ filter })
=> '?$filter=ItemsProp/any(i:i/SomeProp eq 1 and i/AnotherProp eq 2)'
```

##### Specify logical operator (and, or)
```js
const filter = {
  ItemsProp: {
    any: {
      or: [
        { SomeProp: 1 },
        { AnotherProp: 2},
      ]
    }
  }
};
    
buildQuery({ filter })
=> '?$filter=ItemsProp/any(i:(i/SomeProp eq 1 or i/AnotherProp eq 2)'
```

Supported operators: `any`, `all`

#### Functions
##### String functions returning boolean
```js
const filter = { PropName: { contains: 'foo' } };
buildQuery({ filter })
=> "$filter=contains(PropName, 'foo')"
```
Supported operators: `startswith`, `endswith`, `contains`

##### Functions returning non-boolean values (string, int)
```js
const filter = { 'length(PropName)': { gt: 10 } };
buildQuery({ filter })
=> "$filter=length(PropName) gt 10"
```
Supported operators: `length`, `tolower`, `toupper`, `trim`,
`day`, `month`, `year`, `hour`, `minute`, `second`,
`round`, `floor`, `ceiling`

##### Functions returning non-boolean values (string, int) with parameters
```js
const filter = { "indexof(PropName, 'foo')": { eq: 3 } };
buildQuery({ filter })
=> "$filter=indexof(PropName, 'foo') eq 3"
```
Supported operators: `indexof`, `substring`

#### Data types
Coming soon

#### Strings
A string can also be passed as the value of the filter and it will be taken as is.  This can be useful when using something like [odata-filter-builder](https://github.com/bodia-uz/odata-filter-builder) or if you want to just write the OData filter sytnax yourself but use the other benefits of the library, such as groupBy, expand, etc.
```js
import f from 'odata-filter-builder';

const filter = f().eq('TypeId', '1')
                  .contains(x => x.toLower('Name'), 'a')
                  .toString();
buildQuery({ filter })
```

### Selecting
```js
const select = ['Foo', 'Bar'];
buildQuery({ select })
=> '?$select=Foo,Bar'
```

### Ordering
```js
const orderBy = ['Foo desc', 'Bar'];
buildQuery({ orderBy })
=> '?$orderby=Foo desc,Bar'
```

### Expanding
Coming soon

### Pagination (skip and top)
#### Get page 3 (25 records per page)
```js
const page = 3;
const perPage = 25;
const top = perPage;
const skip = perPage * (page - 1);
buildQuery({ top, skip })
=> '?$top=25&$skip=50'
```

### Counting
Include count inline with result
```js
const count = true;
buildQuery({ count })
=> '?$count=true'
```

Or you can return only the count by passing a filter object to `count` (instead of `filter`)
```js
const count = { PropName: 1 }
const query = buildQuery({ count })
=> '/$count?PropName eq 1'
```

### Grouping / aggregation
Coming soon
