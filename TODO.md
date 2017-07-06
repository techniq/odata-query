## Features
- Support `not` operator - https://github.com/ODataOrg/tutorials/blob/master/src/logic-operators.md
- Support specifying types
  - See: https://github.com/devnixs/ODataAngularResources/blob/master/src/odatavalue.js
- Support `$search` and `$format`?

- [Support as much of the spec as makes since](http://docs.oasis-open.org/odata/odata/v4.0/errata03/os/complete/part2-url-conventions/odata-v4.0-errata03-os-part2-url-conventions-complete.html)
  - https://docs.oasis-open.org/odata/odata/v4.0/os/part1-protocol/odata-v4.0-os-part1-protocol.html#_Functions_1
  - http://docs.oasis-open.org/odata/odata-data-aggregation-ext/v4.0/odata-data-aggregation-ext-v4.0.html
  - http://www.odata.org/getting-started/basic-tutorial/
  - http://services.odata.org/V4/Northwind/Northwind.svc/Customers?$select=CustomerID&$expand=Orders($select=OrderID;$expand=Order_Details($select=UnitPrice))

## Other
- Setup CI (Travis, etc)
- Document how to deploy (`npm install -g np; np --no-check`)