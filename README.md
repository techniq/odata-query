# odata-query

OData v4 query builder that uses a simple object-based syntax similar to [MongoDB](https://docs.mongodb.com/manual/reference/operator/query/) and [js-data](http://www.js-data.io/v3.0/docs/query-syntax)

## Install
```
npm install odata-query
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

- [Filtering](#filtering)
  - [Simple equality filter](#simple-equality-filter)
  - [Comparison operators](#comparison-operators)
  - [Logical operators](#logical-operators)
    - [Implied `and` with an array of objects](#implied-and-with-an-array-of-objects)
    - [Implied `and` with multiple comparison operators for a single property](#implied-and-with-multiple-comparison-operators-for-a-single-property)
    - [Explicit operator](#explicit-operator)
  - [Collection operators](#collection-operators) - `any`, `all`
    - [Implied and with an object or array of objects](#implied-and)
    - [Explicit operator (`and`, `or`, and `not`)](#explicit-operator-and-or)
    - [Implied all operators on collection item itself](#implied-all-operators-on-collection-item-itself)
  - [Functions](#functions)
    - [String functions returning boolean](#string-functions-returning-boolean)
    - [Functions returning non-boolean values (string, int)](#functions-returning-non-boolean-values-string-int)
    - [Functions returning non-boolean values (string, int) with parameters](#functions-returning-non-boolean-values-string-int-with-parameters)
  - [Strings](#strings)
  - [Data types](#data-types)
  - [Search](#search)
- [Selecting](#selecting)
- [Ordering](#ordering)
- [Expanding](#expanding)
  - [Nested expand using slash seperator](#nested-expand-using-slash-seperator)
  - [Nested expand with an object](#nested-expand-with-an-object)
  - [Multiple expands as an array](#multiple-expands-as-an-array)
  - [Filter expanded items](#filter-expanded-items)
  - [Select only specific properties of expanded items](#select-only-specific-properties-of-expanded-items)
  - [Return only a subset of expanded items](#return-only-a-subset-of-expanded-items)
  - [Order expanded items](#order-expanded-items)
  - [filter, select, top, and orderBy can be used together](#filter-select-top-and-orderby-can-be-used-together)
- [Pagination (skip and top)](#pagination-skip-and-top)
- [Single-item (key)](#single-item-key)
- [Counting](#counting)
- [Actions](#actions)
- [Functions](#functions-1)
- [Transforms](#transforms)

### Filtering
```js
buildQuery({ filter: {...} })
=> '?$filter=...'
```

#### Simple equality filter
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

Using the `in` operator is also similar to the previous example.

```js
const filter = { PropName: { in: [1, 2, 3] } };
buildQuery({ filter })
=> '?$filter=PropName in (1,2,3)'
```

#### Logical operators
##### Implied `and` with an array of objects
```js
const filter = [{ SomeProp: 1 }, { AnotherProp: 2 }, 'startswith(Name, "foo")'];
buildQuery({ filter })
=> '?$filter=SomeProp eq 1 and AnotherProp eq 2 and startswith(Name, "foo")'
```

##### Implied `and` with multiple comparison operators for a single property
Useful to perform a `between` query on a `Date` property
```js
const startDate = new Date(Date.UTC(2017, 0, 1))
const endDate = new Date(Date.UTC(2017, 2, 1))
const filter = { DateProp: { ge: startDate, le: endDate } }
buildQuery({ filter })
=> "?$filter=DateProp ge 2017-01-01T00:00:00Z and DateProp le 2017-03-01T00:00:00Z"
```

##### Explicit operator
```js
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

```js
const filter = {
  not: {
    and:[
      {SomeProp: 1}, 
      {AnotherProp: 2}
    ]
  }
};

buildQuery({ filter })
=> '?$filter=(not (SomeProp eq 1) and (AnotherProp eq 2))'
```

Supported operators: `and`, `or`, and `not`.

#### Collection operators
##### Empty `any`
Using an empty object
```js
const filter = {
  ItemsProp: {
    any: {}
  }
};

buildQuery({ filter })
=> '?$filter=ItemsProp/any()'
```

or also as an empty array
```js
const filter = {
  ItemsProp: {
    any: []
  }
};

buildQuery({ filter })
=> '?$filter=ItemsProp/any()'
```

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

##### Explicit operator (`and`, `or`, and `not`)
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
```js
const filter = {
  not: {
    ItemsProp: {
      any: {
        or: [
          { SomeProp: 1 },
          { AnotherProp: 2},
        ]
      }
    }
  }
};

buildQuery({ filter })
=> '?$filter=not ItemsProp/any(i:((i/SomeProp eq 1) or (i/AnotherProp eq 2)))'
```

##### Implied all operators on collection item itself 
ITEM_ROOT is special constant to mark collection with primitive type

'in' operator
```js
const filter = {
    tags: {
      any: {
        [ITEM_ROOT]: { in: ['tag1', 'tag2']},
      },
    },
};

buildQuery({ filter })
=> "?$filter=tags/any(tags:tags in ('tag1','tag2'))"
```
'or' operator on collection item itself
```js
const filter = {
    tags: {
      any: {
        or: [
          { [ITEM_ROOT]: 'tag1'},
          { [ITEM_ROOT]: 'tag2'},
        ]
      }
    }
};

buildQuery({ filter })
=> "?$filter=tags/any(tags:((tags eq 'tag1') or (tags eq 'tag2')))";
```

'and' operator on collection item itself and nested item
```js
 const filter = {
    tags: {
      any: [
          { [ITEM_ROOT]: 'tag1'},
          { [ITEM_ROOT]: 'tag2'},
          { prop: 'tag3'},
        ]
    }
};

buildQuery({ filter });
=> "?$filter=tags/any(tags:tags eq 'tag1' and tags eq 'tag2' and tags/prop eq 'tag3')";
```
Function on collection item itself 
```js
const filter = {
    tags: {
      any: {
        [`tolower(${ITEM_ROOT})`]: 'tag1'
      }
    }
};

buildQuery({ filter });
=> "?$filter=tags/any(tags:tolower(tags) eq 'tag1')";
```

Supported operators: `any`, `all`

#### Functions
##### String functions returning boolean
```js
const filter = { PropName: { contains: 'foo' } };
buildQuery({ filter })
=> "$filter=contains(PropName,'foo')"
```
Supported operators: `startswith`, `endswith`, `contains`, `matchespattern`

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

#### Strings
A string can also be passed as the value of the filter and it will be taken as is.  This can be useful when using something like [odata-filter-builder](https://github.com/bodia-uz/odata-filter-builder) or if you want to just write the OData filter sytnax yourself but use the other benefits of the library, such as groupBy, expand, etc.
```js
import f from 'odata-filter-builder';

const filter = f().eq('TypeId', '1')
                  .contains(x => x.toLower('Name'), 'a')
                  .toString();
buildQuery({ filter })
```

#### Data types
GUID:
```js
const filter = { "someProp": { eq: { type: 'guid', value: 'cd5977c2-4a64-42de-b2fc-7fe4707c65cd' } } };
buildQuery({ filter })
=> "?$filter=someProp eq cd5977c2-4a64-42de-b2fc-7fe4707c65cd"
```

Duration:
```js
const filter = { "someProp": { eq: { type: 'duration', value: 'PT1H' } } };
buildQuery({ filter })
=> "?$filter=someProp eq duration'PT1H'"
```

Binary:
```js
const filter = { "someProp": { eq: { type: 'binary', value: 'YmluYXJ5RGF0YQ==' } } };
buildQuery({ filter })
=> "?$filter=someProp eq binary'YmluYXJ5RGF0YQ=='"
```

Decimal: 
```js
const filter = { "someProp": { eq: { type: 'decimal', value: '12.3456789' } } };
buildQuery({ filter })
=> "?$filter=someProp eq 12.3456789M"
```


Raw:
```js
const filter = { "someProp": { eq: { type: 'raw', value: `datetime'${date.toISOString()}'` } } };
buildQuery({ filter })
=> "?$filter=someProp eq datetime'2021-07-08T12:27:08.122Z'"
```
- Provides full control over the serialization of the value.  Useful to pass a data type.

Note that as per OData specification, binary data is transmitted as a base64 encoded string. Refer to [Primitive Types in JSON Format](https://www.odata.org/documentation/odata-version-2-0/json-format/), and [binary representation](https://www.odata.org/documentation/odata-version-2-0/overview/).

#### Search
```js
const search = 'blue OR green';
buildQuery({ search });
=> '?$search=blue OR green';
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
#### Nested expand using slash seperator
```js
const expand = 'Friends/Photos'
buildQuery({ expand })
=> '?$expand=Friends($expand=Photos)';
```

#### Nested expand with an object
```js
const expand = { Friends: { expand: 'Photos' } }
buildQuery({ expand })
=> '?$expand=Friends($expand=Photos)';
```

#### Multiple expands as an array
Supports both string (with slash seperators) and objects
```js
const expand = ['Foo', 'Baz'];
buildQuery({ expand })
=> '?$expand=Foo,Bar';
```
#### Filter expanded items
```js
const expand = { Trips: { filter: { Name: 'Trip in US' } } };
buildQuery({ expand })
=> "?$expand=Trips($filter=Name eq 'Trip in US')";
```

#### Select only specific properties of expanded items
```js
const expand = { Friends: { select: ['Name', 'Age'] } };
buildQuery({ expand })
=> '?$expand=Friends($select=Name,Age)';
```

#### Return only a subset of expanded items
```js
const expand = { Friends: { top: 10 } };
buildQuery({ expand })
=> '?$expand=Friends($top=10)';
```

#### Order expanded items
```js
const expand = { Products: { orderBy: 'ReleaseDate asc' } };
buildQuery({ expand })
=> "?$expand=Products($orderby=ReleaseDate asc)";
```

#### `filter`, `select`, `top`, and `orderBy` can be used together
Select only the first and last name of the top 10 friends who's first name starts with "R" and order by their last name
```js
const expand = {
  Friends: {
    select: ['FirstName', 'LastName'],
    top: 10,
    filter: {
      FirstName: { startswith: 'R' }
    },
    orderBy: 'LastName asc'
  }
};
buildQuery({ expand })
=> '?$expand=Friends($select=Name,Age;$top=10;$filter=startswith eq 'R'))';
```

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

### Single-item (key)
Simple value
```js
const key = 1;
buildQuery({ key })
=> '(1)'
```

As object (explicit key property
```js
const key = { Id: 1 };
buildQuery({ key })
=> '(Id=1)'
```

### Counting
Include count inline with result
```js
const count = true;
const filter = { PropName: 1}
buildQuery({ count, filter })
=> '?$count=true&$filter=PropName eq 1'
```

Or you can return only the count by passing a filter object to `count` (or empty object to count all)
```js
const count = { PropName: 1 }
const query = buildQuery({ count })
=> '/$count?$filter=PropName eq 1'
```

### Actions
Action on an entity
```js
const key = 1;
const action = 'Test';
buildQuery({ key, action })
=> '(1)/Test'
```

Action on a collection
```js
const action = 'Test';
buildQuery({ action })
=> '/Test'
```
Action parameters are passed in the body of the request.

### Functions
Function on an entity
```js
const key = 1;
const func = 'Test';
buildQuery({ key, func })
=> '(1)/Test'
```

Function on an entity with parameters
```js
const key = 1;
const func = { Test: { One: 1, Two: 2 } };
buildQuery({ key, func })
=> '(1)/Test(One=1,Two=2)'
```

Function on a collection
```js
const func = 'Test';
buildQuery({ func })
=> '/Test'
```

Function on a collection with parameters
```js
const func = { Test: { One: 1, Two: 2 } };
buildQuery({ func })
=> '/Test(One=1,Two=2)'
```


### Transforms
Transforms can be passed as an object or an array (useful when applying the same transform more than once, such as `filter`)

Aggregations
```js
const transform = {
  aggregate: {
    Amount: {
      with: 'sum',
      as: 'Total'
    }
  }
};
buildQuery({ transform });
=> '?$apply=aggregate(Amount with sum as Total)';
```
Supported aggregations: `sum`, `min`, `max`, `average`, `countdistinct`

Group by (simple)
```js
const transform = [{
  groupBy: {
    properties: ['SomeProp'],
  }
}]
buildQuery({ transform });
=> '?$apply=groupby((SomeProp))';
```

Group by with aggregation
```js
const transform = {
  groupBy: {
    properties: ['SomeProp'],
    transform: {
      aggregate: {
        Id: {
          with: 'countdistinct',
          as: 'Total'
        }
      }
    }
  }
}
buildQuery({ transform });
=> '?$apply=groupby((SomeProp),aggregate(Id with countdistinct as Total))';
```

Group by with filtering before and after
```js
const transform = [{
  filter: {
    PropName: 1
  }
},{
  groupBy: {
    properties: ['SomeProp'],
    transform: [{
      aggregate: {
        Id: {
          with: 'countdistinct',
          as: 'Total'
        }
      }
    }]
  }
},{
  filter: {
    Total: { ge: 5 }
  }
}]
buildQuery({ transform });
=> '?$apply=filter(PropName eq 1)/groupby((SomeProp),aggregate(Id with countdistinct as Total))/filter(Total ge 5)';
```

Supported transforms: `aggregate`, `groupby`, `filter`.  Additional transforms may be added later

## OData specs
- [OData Version 4.0. Part 1: Protocol Plus Errata 03](http://docs.oasis-open.org/odata/odata/v4.0/odata-v4.0-part1-protocol.html)
- [OData Version 4.0. Part 2: URL Conventions Plus Errata 03](http://docs.oasis-open.org/odata/odata/v4.0/odata-v4.0-part2-url-conventions.html)
- [OData Extension for Data Aggregation Version 4.0](http://docs.oasis-open.org/odata/odata-data-aggregation-ext/v4.0/odata-data-aggregation-ext-v4.0.html)
