## Features
- Supprt `$search` and `$format`?
- Support `not` operator - https://github.com/ODataOrg/tutorials/blob/master/src/logic-operators.md
- Improvements to expand
  - arrays, dotted-syntax, objects with additional filtering
- Support specifying types
  - See: https://github.com/devnixs/ODataAngularResources/blob/master/src/odatavalue.js
- Add integration tests using `http://services.odata.org/V4/TripPinService/People` or another public V4 endpoint
- [Support as much of the spec as makes since](http://docs.oasis-open.org/odata/odata/v4.0/errata03/os/complete/part2-url-conventions/odata-v4.0-errata03-os-part2-url-conventions-complete.html)

## Document
- License (including on README)
- How to deploy (`npm install -g np; np --no-check`)
- Examples (select, filter, groupBy, orderBy, top, skip, count, expand, ...)
- Example using [odata-filter-builder](https://github.com/bodia-uz/odata-filter-builder) project and passing filter={} as it's string output
- Syntax inspiration
  - [Mongo DB](https://docs.mongodb.com/manual/reference/operator/query/)
  - [js-data](http://www.js-data.io/v3.0/docs/query-syntax)
