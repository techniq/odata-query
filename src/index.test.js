import buildQuery from './';

it('should return an empty string by default', () => {
  expect(buildQuery()).toEqual('');
});

describe('filter', () => {

  describe('comparison operators', () => {
    it('should handle basic filter without operator', () => {
      const filter = { SomeProp: 1 };
      const expected = '$filter=SomeProp eq 1';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle filter with operator', () => {
      const filter = { SomeProp: { lt: 5 } };
      const expected = '$filter=SomeProp lt 5'
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow passing filter as string and use verbatim', () => {
      const filter = 'SomeProp eq 1 and AnotherProp eq 2';
      const expected = '$filter=SomeProp eq 1 and AnotherProp eq 2'
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow passing filter as an array of objects and strings', () => {
      const filter = [{ SomeProp: 1 }, { AnotherProp: 2 }, 'startswith(Name, "foo")'];
      const expected = '$filter=SomeProp eq 1 and AnotherProp eq 2 and startswith(Name, "foo")'
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should convert "in" operator to "or" statement', () => {
      const filter = { SomeProp: {'in': [1, 2, 3] } };
      const expected = '$filter=SomeProp eq 1 or SomeProp eq 2 or SomeProp eq 3'
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });
  });

  describe('logical operators', () => {
    it('should handle simple logical operators (and, or, etc)', () => {
      const filter = { and: [{ SomeProp: 1 }, { AnotherProp: 2 }] }
      const expected = "$filter=(SomeProp eq 1 and AnotherProp eq 2)"
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle nested logical operators', () => {
      const filter = { and: [{ SomeProp: 1 }, { or: [{ AnotherProp: 2 }, { ThirdProp: 3 }] }] }
      const expected = "$filter=(SomeProp eq 1 and (AnotherProp eq 2 or ThirdProp eq 3))"
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle logical operators with a single filter', () => {
      const filter = { and: [{ SomeProp: 1 }] }
      const expected = "$filter=(SomeProp eq 1)"
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle logical operators with no filters', () => {
      const filter = { and: [] }
      const expected = "$filter=()"
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });
  })

  describe('collection operators', () => {
    it('should handle simple collection operators (all, any)', () => {
      const filter = {
        Tasks: {
          any: [
            {
              AssignedGroupId: 1234,
              StatusId: 300
            }
          ]
        }
      }
      const expected = "$filter=Tasks/any(t:(t/AssignedGroupId eq 1234 and t/StatusId eq 300))"
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    // TODO: Fix
    // it('should handle simple collection operators (all, any) with multiple filter objects', () => {
    //   const filter = {
    //     Tasks: {
    //       any: [
    //         { AssignedGroupId: 1234 },
    //         { StatusId: 300 }
    //       ]
    //     }
    //   }
    //   const expected = "$filter=Tasks/any(t:(t/AssignedGroupId eq 1234 and t/StatusId eq 300))"
    //   const actual = buildQuery({ filter });
    //   expect(actual).toEqual(expected);
    // });
  });

  describe('data types', () => {
    it('should handle numbers', () => {
      const filter = { NumberProp: 1 };
      const expected = "$filter=NumberProp eq 1"
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle strings', () => {
      const filter = { StringProp: '2' };
      const expected = "$filter=StringProp eq '2'"
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle dates', () => {
      const filter = { DateProp: new Date(Date.UTC(2017, 2, 30, 7, 30)) };
      const expected = "$filter=DateProp eq 2017-03-30T07:30:00Z"
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });
  });

  describe('functions', () => {
    it('should allow passing boolean functions as operators', () => {
      const filter = { Name: { contains: 'foo'} }
      const expected = "$filter=contains(Name, 'foo')"
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow functions as part of the property name', () => {
      const filter = { 'length(Name)': { gt: 10 } }
      const expected = "$filter=length(Name) gt 10"
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow functions with multiple parameters as part of the property name', () => {
      const filter = { "indexof(Name, 'foo')": { eq: 3 } }
      const expected = "$filter=indexof(Name, 'foo') eq 3"
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

  });
})

describe('groupBy', () => {
  it('should allow passing since property as string', () => {
    const groupBy = 'SomeProp';
    const expected = '$apply=groupby((SomeProp),aggregate(Id with countdistinct as Total))';
    const actual = buildQuery({ groupBy });
    expect(actual).toEqual(expected);
  });

  it('should allow passing multiple properites as an array', () => {
    const groupBy = ['FirstProp', 'SecondProp'];
    const expected = '$apply=groupby((FirstProp,SecondProp),aggregate(Id with countdistinct as Total))';
    const actual = buildQuery({ groupBy });
    expect(actual).toEqual(expected);
  });

  it('should allow ordering', () => {
    const groupBy = 'SomeProp';
    const orderBy = 'SomeProp'
    const expected = '$apply=groupby((SomeProp),aggregate(Id with countdistinct as Total))&$orderby=SomeProp';
    const actual = buildQuery({ groupBy, orderBy });
    expect(actual).toEqual(expected);
  });
})