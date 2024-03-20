import buildQuery, {Expand, OrderBy, alias, json, ITEM_ROOT, decimal, TypedFilter } from '../src/index';
import { Square } from './test-interface'; 

it('should return an empty string by default', () => {
  expect(buildQuery()).toEqual('');
});

describe('filter', () => {
  describe('comparison operators', () => {
    it('should handle basic filter without operator', () => {
      const filter = { SomeProp: 1 };
      const expected = '?$filter=SomeProp eq 1';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle filter with operator', () => {
      const filter = { SomeProp: { lt: 5 } };
      const expected = '?$filter=SomeProp lt 5';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow passing filter as string and use verbatim', () => {
      const filter = 'SomeProp eq 1 and AnotherProp eq 2';
      const expected = '?$filter=SomeProp eq 1 and AnotherProp eq 2';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow passing filter as an array of objects and strings', () => {
      const filter = [
        { SomeProp: 1 },
        { AnotherProp: 2 },
        "startswith(Name, 'R')",
      ];
      const expected =
        "?$filter=SomeProp eq 1 and AnotherProp eq 2 and startswith(Name, 'R')";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });
    
    it('should handle basic typed filter without operator', () => {
      const filter: TypedFilter<Square> = { Height: 1 };
      const expected = '?$filter=Height eq 1';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle typed filter with operator', () => {
      const filter: TypedFilter<Square> = { Height: { lt: 5 } };
      const expected = '?$filter=Height lt 5';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow passing filter as an array of typed filters and strings', () => {
      const filter: Array<TypedFilter<Square> | string> = [
        { Height: 1 },
        { Width: { lt: 5 } },
        "startswith(Name, 'R')",
      ];
      const expected =
        "?$filter=Height eq 1 and Width lt 5 and startswith(Name, 'R')";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow "has" operator', () => {
      const filter = { SomeProp: { has: { type: "raw", value: "Sales.Pattern'Yellow'" } } };
      const expected =
        "?$filter=SomeProp has Sales.Pattern'Yellow'";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow "in" operator', () => {
      const filter = { SomeProp: { in: [1, 2, 3] } };
      const expected =
        '?$filter=SomeProp in (1,2,3)';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow "in" operator in combination with other conditions', () => {
      const filter = {
        SomeNames: {
          contains: 'Bob',
          in: ['Peter Newman', 'Bob Ross', 'Bobby Parker', 'Mike Bobson'],
        },
      };
      const expected =
        "?$filter=contains(SomeNames,'Bob') and SomeNames in ('Peter Newman','Bob Ross','Bobby Parker','Mike Bobson')";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('allows "in" operator when using in an array', () => {
      const filter = [{ SomeProp: { in: [1, 2, 3] }, AnotherProp: 4 }];
      const expected =
        '?$filter=SomeProp in (1,2,3) and AnotherProp eq 4';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('allows "in" operator in negated case', () => {
      const filter = { not: { SomeProp: { in: [1, 2, 3] } } };
      const expected =
        '?$filter=not (SomeProp in (1,2,3))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should ignore/omit filter if set to undefined', () => {
      const filter = { IgnoreProp: undefined };
      const expected = '';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should check for null (and not be omitted/ignored)', () => {
      const filter = { SomeProp: null };
      const expected = '?$filter=SomeProp eq null';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should support nested properties', () => {
      const filter = { SomeProp: { Value: 1 } };
      const expected = '?$filter=SomeProp/Value eq 1';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it.skip('should handle nested properties on the same property (implicit "and")', () => {
      const filter = {
        SomeProp: {
          NestedProp1: 1,
          NestedProp2: 2,
        },
      };
      const expected =
        '?$filter=(SomeProp/NestedProp1 eq 1 and SomeProp/NestedProp2 eq 2)';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle nested properties on the same property (explicit "and")', () => {
      const filter = {
        SomeProp: {
          and: {
            NestedProp1: 1,
            NestedProp2: 2,
          },
        },
      };
      const expected =
        '?$filter=(SomeProp/NestedProp1 eq 1 and SomeProp/NestedProp2 eq 2)';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });
  });

  describe('logical operators', () => {
    it('should handle simple logical operators (not) as an object', () => {
      const filter = {
        and: [
          { not: { FooProp: { startswith: 'foo' } } },
          { not: { BarProp: { startswith: 'bar' } } },
          { FooBarProp: { startswith: 'foobar' } },
        ],
      };
      const expected =
        "?$filter=((not (startswith(FooProp,'foo'))) and (not (startswith(BarProp,'bar'))) and (startswith(FooBarProp,'foobar')))";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle logical operators (not) as an object', () => {
      const filter = {
        and: [
          {
            not: {
              FooProp: { startswith: 'foo' },
              BarProp: { startswith: 'bar' },
            },
          },
          { FooBarProp: { startswith: 'bar' } },
        ],
      };
      const expected =
        "?$filter=((not (startswith(FooProp,'foo') and startswith(BarProp,'bar'))) and (startswith(FooBarProp,'bar')))";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle simple logical operators (not) as an array', () => {
      const filter = {
        not: [
          { FooProp: { startswith: 'foo' } },
          { BarProp: { startswith: 'bar' } },
          { FizProp: { in: [1, 2, 3]     } },
        ],
      };
      const expected =
        "?$filter=not ((startswith(FooProp,'foo')) and (startswith(BarProp,'bar')) and (FizProp in (1,2,3)))";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle logical operators (not) as an array', () => {
      const filter = {
        or: [
          {
            not: [
              { FooProp: { startswith: 'foo' } },
              { BarProp: { startswith: 'bar' } },
              { FizProp: { in: [1, 2, 3]     } },
            ],
          },
        ],
      };
      const expected =
        "?$filter=((not ((startswith(FooProp,'foo')) and (startswith(BarProp,'bar')) and (FizProp in (1,2,3)))))";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle simple logical operators (and, or, etc) as an array', () => {
      const filter = { and: [{ SomeProp: 1 }, { AnotherProp: 2 }] };
      const expected = '?$filter=((SomeProp eq 1) and (AnotherProp eq 2))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle simple logical operators (and, or, etc) as an object (no parens)', () => {
      const filter = { and: { SomeProp: 1, AnotherProp: 2 } };
      const expected = '?$filter=(SomeProp eq 1 and AnotherProp eq 2)';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle nested logical operators', () => {
      const filter = {
        and: [{ SomeProp: 1 }, { or: [{ AnotherProp: 2 }, { ThirdProp: 3 }] }],
      };
      const expected =
        '?$filter=((SomeProp eq 1) and (((AnotherProp eq 2) or (ThirdProp eq 3))))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle logical operators with a single filter', () => {
      const filter = { and: [{ SomeProp: 1 }] };
      const expected = '?$filter=((SomeProp eq 1))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should ignore implied logical operator with no filters', () => {
      const filter: any[] = [];
      const expected = '';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should ignore implied logical operator with undefined filters', () => {
      const filter = [undefined];
      const expected = '';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should ignore implied logical operator with null filters', () => {
      const filter = [null];
      const expected = '';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should ignore implied logical operator with empty object filters', () => {
      const filter = [{}];
      const expected = '';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should omit/ignore logical operators with no filters', () => {
      const filter = { and: [] };
      const expected = '';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should omit/ignore undefined filters', () => {
      const filter = { and: [undefined] };
      const expected = '';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should omit/ignore null filters', () => {
      const filter = { and: [null] };
      const expected = '';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should omit/ignore empty object filters', () => {
      const filter = { and: [{}] };
      const expected = '';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle implied logical operator on a single property', () => {
      const startDate = new Date(Date.UTC(2017, 0, 1));
      const endDate = new Date(Date.UTC(2017, 2, 1));
      const filter = { DateProp: { ge: startDate, le: endDate } };
      const expected =
        '?$filter=DateProp ge 2017-01-01T00:00:00.000Z and DateProp le 2017-03-01T00:00:00.000Z';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle implied logical operator on a single property using alises', () => {
      const start = alias("start", new Date(Date.UTC(2017, 0, 1)));
      const end = alias("end", new Date(Date.UTC(2017, 2, 1)));
      const filter = { DateProp: { ge: start, le: end } };
      let expected =
        '?$filter=DateProp ge @start and DateProp le @end&@start=2017-01-01T00:00:00.000Z&@end=2017-03-01T00:00:00.000Z';
      let actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
      end.value = new Date(Date.UTC(2017, 5, 1));
      expected =
        '?$filter=DateProp ge @start and DateProp le @end&@start=2017-01-01T00:00:00.000Z&@end=2017-06-01T00:00:00.000Z';
      actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle nested logical operators', () => {
      const filter = {
        or: [
          { Prop1: 1 },
          {
            and: {
              Prop2: 2,
              Prop3: 3,
            },
          },
        ],
      };
      const expected = '?$filter=((Prop1 eq 1) or ((Prop2 eq 2 and Prop3 eq 3)))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });
    
    it('should have parens in nested logical operators', () => {
      const filter = {
        Prop1: 1,
        or: {
          Prop2: 2,
          Prop3: 3,
        },
      };
      const expected = '?$filter=Prop1 eq 1 and (Prop2 eq 2 or Prop3 eq 3)';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle nested properties using "/" selectors', () => {
      const filter = {
        Prop1: {
          NestedProp1: 1,
        },
        or: [
          {
            'Prop2/NestedProp2/DeeplyNestedProp2': 2,
            'Prop3/NestedProp3': { ne: null },
          },
          {
            'Prop4/NestedProp4/DeeplyNestedProp4': 4,
          },
        ],
      };
      const expected =
        '?$filter=Prop1/NestedProp1 eq 1 and ((Prop2/NestedProp2/DeeplyNestedProp2 eq 2 and Prop3/NestedProp3 ne null) or (Prop4/NestedProp4/DeeplyNestedProp4 eq 4))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle nested properties using objects', () => {
      const filter = {
        Prop1: {
          NestedProp1: 1,
        },
        or: [
          {
            Prop2: {
              NestedProp2: {
                DeeplyNestedProp2: 2,
              },
            },
            Prop3: {
              NestedProp3: {
                ne: null,
              },
            },
          },
          {
            Prop4: {
              NestedProp4: {
                DeeplyNestedProp4: 4,
              },
            },
          },
        ],
      };
      const expected =
        '?$filter=Prop1/NestedProp1 eq 1 and ((Prop2/NestedProp2/DeeplyNestedProp2 eq 2 and Prop3/NestedProp3 ne null) or (Prop4/NestedProp4/DeeplyNestedProp4 eq 4))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle more stuff jason stadler throws at it - not working', () => {
      const filter = {
        Prop1: {
          NestedProp1: 1,
        },
        Prop2: {
          or: [
            {
              'NestedProp2/DeeplyNestedProp2': 2,
              NestedProp3: { ne: null },
            },
            {
              'NestedProp4/DeeplyNestedProp4': 4,
            },
          ],
        },
      };
      const expected =
        '?$filter=Prop1/NestedProp1 eq 1 and (Prop2/NestedProp2/DeeplyNestedProp2 eq 2 and Prop2/NestedProp3 ne null) or (Prop2/NestedProp4/DeeplyNestedProp4 eq 4)';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle nested logical operators and nested properties using "/" selectors', () => {
      const filter = {
        Prop1: {
          NestedProp1: 1,
        },
        or: [
          {
            'Prop2/NestedProp2/DeeplyNestedProp2': 2,
            'Prop2/NestedProp3': { ne: null },
          },
          {
            'Prop4/NestedProp4/DeeplyNestedProp4': 4,
          },
        ],
      };
      const expected =
        '?$filter=Prop1/NestedProp1 eq 1 and ((Prop2/NestedProp2/DeeplyNestedProp2 eq 2 and Prop2/NestedProp3 ne null) or (Prop4/NestedProp4/DeeplyNestedProp4 eq 4))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    // TODO: duplicating filter clauses `(Prop2/NestedProp2/DeeplyNestedProp2 eq 2 and Prop2/NestedProp3 ne null)`.  Still logically the same result
    it.skip('should handle nested logical operators and deeply nested properties on same property using objects (shorthand)', () => {
      const filter = {
        Prop1: {
          NestedProp1: 1,
        },
        or: [
          {
            Prop2: {
              NestedProp2: {
                DeeplyNestedProp2: 2,
              },
              NestedProp3: {
                ne: null,
              },
            },
          },
          {
            Prop4: {
              NestedProp4: {
                DeeplyNestedProp4: 4,
              },
            },
          },
        ],
      };
      const expected =
        '?$filter=Prop1/NestedProp1 eq 1 and ((Prop2/NestedProp2/DeeplyNestedProp2 eq 2 and Prop2/NestedProp3 ne null) or (Prop4/NestedProp4/DeeplyNestedProp4 eq 4))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle nested logical operators and deeply nested properties on same property using objects (expanded)', () => {
      const filter = {
        Prop1: {
          NestedProp1: 1,
        },
        or: [
          {
            Prop2: {
              and: {
                NestedProp2: {
                  DeeplyNestedProp2: 2,
                },
                NestedProp3: {
                  ne: null,
                },
              },
            },
          },
          {
            Prop4: {
              NestedProp4: {
                DeeplyNestedProp4: 4,
              },
            },
          },
        ],
      };
      const expected =
        '?$filter=Prop1/NestedProp1 eq 1 and (((Prop2/NestedProp2/DeeplyNestedProp2 eq 2 and Prop2/NestedProp3 ne null)) or (Prop4/NestedProp4/DeeplyNestedProp4 eq 4))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });
  });

  describe('collection operators', () => {
    it('should generate empty collection operator with an empty object of filters', () => {
      const filter = {
        Tasks: {
          any: {},
        },
      };
      const expected = '?$filter=Tasks/any()';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should generate empty collection operator with an empty array of filters', () => {
      const filter = {
        Tasks: {
          any: [],
        },
      };
      const expected = '?$filter=Tasks/any()';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should ignore collection operator with null filters', () => {
      const filter = {
        Tasks: {
          any: null,
        },
      };
      const expected = '';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle collection operator with object as implied `and`', () => {
      const filter = {
        Tasks: {
          any: {
            AssignedGroupId: 1234,
            StatusId: 300,
          },
        },
      };
      const expected =
        '?$filter=Tasks/any(tasks:tasks/AssignedGroupId eq 1234 and tasks/StatusId eq 300)';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle collection operator with array of objects as implied `and`', () => {
      const filter = {
        Tasks: {
          any: [{ AssignedGroupId: 1234 }, { StatusId: 300 }],
        },
      };
      const expected =
        '?$filter=Tasks/any(tasks:tasks/AssignedGroupId eq 1234 and tasks/StatusId eq 300)';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle collection operator with nested collection operator', () => {
      const filter = {
        Tasks: {
          any: {
            SubTasks: {
              any: [{ AssignedGroupId: 1234 }, { StatusId: 300 }],
            },
          },
        },
      };
      const expected =
        '?$filter=Tasks/any(tasks:tasks/SubTasks/any(subtasks:subtasks/AssignedGroupId eq 1234 and subtasks/StatusId eq 300))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle collection operator with nested collection operators', () => {
      const filter = {
        Tasks: {
          any: {
            SubTasks: {
              any: {
                AssignedGroupId: 1234,
                StatusId: 300,
              },
            },
            OtherTasks: {
              all: {
                StatusId: 122,
                AssignedGroupId: 2345,
              },
            },
          },
        },
      };
      const expected =
        '?$filter=Tasks/any(tasks:tasks/SubTasks/any(subtasks:subtasks/AssignedGroupId eq 1234 and subtasks/StatusId eq 300) and tasks/OtherTasks/all(othertasks:othertasks/StatusId eq 122 and othertasks/AssignedGroupId eq 2345))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle collection operator with object specifying operator', () => {
      const filter = {
        Tasks: {
          any: {
            or: [{ AssignedGroupId: 1234 }, { StatusId: 300 }],
          },
        },
      };
      const expected =
        '?$filter=Tasks/any(tasks:((tasks/AssignedGroupId eq 1234) or (tasks/StatusId eq 300)))';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle collection operator with nested property', () => {
      const filter = {
        Tasks: {
          any: [
            {
              CreatedBy: {
                Name: 'Sean Lynch',
              },
              StatusId: 300,
            },
          ],
        },
      };
      const expected =
        "?$filter=Tasks/any(tasks:tasks/CreatedBy/Name eq 'Sean Lynch' and tasks/StatusId eq 300)";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle collection operator with a function', () => {
      const filter = {
        Tasks: {
          any: {
            'toupper(searchProp)': {
              contains: 'foo',
            },
          },
        },
      };
      const expected =
        "?$filter=Tasks/any(tasks:contains(toupper(tasks/searchProp),'foo'))";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle collection operator with a function indexof', () => {
      const filter = {
        Tasks: {
          any: {
            "indexof(toupper(searchProp),'foo')": {
              eq: -1,
            },
          },
        },
      };
      const expected =
        "?$filter=Tasks/any(tasks:indexof(toupper(tasks/searchProp),'foo') eq -1)";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle collection operator over simple string collection with any', () => {
      const filter = {
        MacAddress: {
          any: "3C:4A:92:F1:98:E2"
        }
      };      
      const expected = "?$filter=MacAddress/any(macaddress: macaddress eq '3C:4A:92:F1:98:E2')";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    })

    it('should handle collection operator over simple string collection with all', () => {
      const filter = {
        MacAddress: {
          all: "3C:4A:92:F1:98:E2"
        }
      };      
      const expected = "?$filter=MacAddress/all(macaddress: macaddress ne '3C:4A:92:F1:98:E2')";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    })

    it('should handle collection operator with "in" operator on the item of a simple collection', () => {
      const filter = {
        tags: {
          any: {
            [ITEM_ROOT]: { in: ['tag1', 'tag2']},
          },
        },
      };
      const expected = "?$filter=tags/any(tags:tags in ('tag1','tag2'))";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    })


    it('should handle collection operator with "or" operator on the item of a simple collection', () => {
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

      const expected = "?$filter=tags/any(tags:((tags eq 'tag1') or (tags eq 'tag2')))";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    })

    it('should handle collection operator with "and" operator on the item of a simple collection', () => {
      const filter = {
        tags: {
          any: [
              { [ITEM_ROOT]: 'tag1'},
              { [ITEM_ROOT]: 'tag2'},
              { prop: 'tag3'},
            ]
        }
      };

      const expected = "?$filter=tags/any(tags:tags eq 'tag1' and tags eq 'tag2' and tags/prop eq 'tag3')";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    })

    it('should handle collection operator with a function on the item of a simple collection', () => {
      const filter = {
        tags: {
          any: {
            [`tolower(${ITEM_ROOT})`]: 'tag1'
          }
        }
      }
      const expected =
          "?$filter=tags/any(tags:tolower(tags) eq 'tag1')";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });
  });

  describe('data types', () => {
    it('should handle a number', () => {
      const filter = { NumberProp: 1 };
      const expected = '?$filter=NumberProp eq 1';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle decimal number', () => {
      const filter = { NumberProp: decimal('1.23456789') };
      const expected = '?$filter=NumberProp eq 1.23456789M';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle a string', () => {
      const filter = { StringProp: '2' };
      const expected = "?$filter=StringProp eq '2'";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it("should escape the `'` character in strings", () => {
      const filter = { StringProp: "O'Dimm" };
      const expected = "?$filter=StringProp eq 'O''Dimm'";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle a boolean', () => {
      const filter = { BooleanProp: true };
      const expected = '?$filter=BooleanProp eq true';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle a Date', () => {
      const filter = { DateProp: new Date(Date.UTC(2017, 2, 30, 7, 30)) };
      const expected = '?$filter=DateProp eq 2017-03-30T07:30:00.000Z';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle GUID values', () => {
      const filter = {
        someProp: {
          eq: { type: 'guid', value: 'cd5977c2-4a64-42de-b2fc-7fe4707c65cd' },
        },
      };
      const expected =
        '?$filter=someProp eq cd5977c2-4a64-42de-b2fc-7fe4707c65cd';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle GUID values with explicit eq ', () => {
      const filter = {
        someProp: {
          type: 'guid',
          value: 'cd5977c2-4a64-42de-b2fc-7fe4707c65cd',
        },
      };
      const expected =
        '?$filter=someProp eq cd5977c2-4a64-42de-b2fc-7fe4707c65cd';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle GUID values with an in operator', () => {
      const filter = {
        someProp: {
          in: {
            type: 'guid',
            value: [
              'cd5977c2-4a64-42de-b2fc-7fe4707c65cd',
              'cd5977c2-4a64-42de-b2fc-7fe4707c65ce',
            ],
          },
        },
      };
      const expected =
        '?$filter=someProp in (cd5977c2-4a64-42de-b2fc-7fe4707c65cd,cd5977c2-4a64-42de-b2fc-7fe4707c65ce)';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });    
    
    it('should handle Duration values', () => {
      const filter = {
        someProp: {
          eq: { type: 'duration', value: 'PT1H' },
        },
      };
      const expected =
        '?$filter=someProp eq duration\'PT1H\'';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle Duration values with explicit eq ', () => {
      const filter = {
        someProp: {
          type: 'duration',
          value: 'PT1H',
        },
      };
      const expected =
        '?$filter=someProp eq duration\'PT1H\'';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle Duration values with an in operator', () => {
      const filter = {
        someProp: {
          in: {
            type: 'duration',
            value: [
              'PT1H',
              'PT2H',
            ],
          },
        },
      };
      const expected =
        '?$filter=someProp in (duration\'PT1H\',duration\'PT2H\')';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle raw values', () => {
      const filter = { someProp: { eq: { type: 'raw', value: '2018-03-30' } } };
      const expected = '?$filter=someProp eq 2018-03-30';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle shorthand raw values', () => {
      const filter = { someProp: { type: 'raw', value: '2018-03-30' } };
      const expected = '?$filter=someProp eq 2018-03-30';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle binary values', () => {
      const filter = {
        someProp: { eq: { type: 'binary', value: 'YmluYXJ5RGF0YQ==' } },
      };
      const expected = "?$filter=someProp eq binary'YmluYXJ5RGF0YQ=='";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should handle shorthand raw values', () => {
      const filter = {
        someProp: { type: 'binary', value: 'YmluYXJ5RGF0YQ==' },
      };
      const expected = "?$filter=someProp eq binary'YmluYXJ5RGF0YQ=='";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });
  });

  describe('functions', () => {
    it('should allow passing boolean functions as operators', () => {
      const filter = { Name: { contains: 'foo' } };
      const expected = "?$filter=contains(Name,'foo')";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow functions as part of the property name', () => {
      const filter = { 'length(Name)': { gt: 10 } };
      const expected = '?$filter=length(Name) gt 10';
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow functions with multiple parameters as part of the property name', () => {
      const filter = { "indexof(Name, 'foo')": { eq: 3 } };
      const expected = "?$filter=indexof(Name, 'foo') eq 3";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });

    it('should allow functions on nested properties', () => {
      const filter = { Department: { Name: { contains: 'foo' } } };
      const expected = "?$filter=contains(Department/Name,'foo')";
      const actual = buildQuery({ filter });
      expect(actual).toEqual(expected);
    });
  });
});

describe('search', () => {
  it('should handle basic search string', () => {
    const search = 'blue OR green';
    const expected = '?$search=blue OR green';
    const actual = buildQuery({ search });
    expect(actual).toEqual(expected);
  });
});

describe('transform', () => {
  it('simple aggregation as object', () => {
    const transform = {
      aggregate: {
        Amount: {
          with: 'sum',
          as: 'Total',
        },
      },
    };
    const expected = '?$apply=aggregate(Amount with sum as Total)';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('multiple aggregations with different properties as object', () => {
    const transform = [
      {
        aggregate: {
          Amount: {
            with: 'sum',
            as: 'Total',
          },
          Id: {
            with: 'countdistinct',
            as: 'Count',
          },
        },
      },
    ];
    const expected =
      '?$apply=aggregate(Amount with sum as Total,Id with countdistinct as Count)';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('multiple aggregations with same property as array', () => {
    const transform = [
      {
        aggregate: [
          {
            Amount: {
              with: 'sum',
              as: 'Total',
            },
          },
          {
            Amount: {
              with: 'max',
              as: 'Max',
            },
          },
        ],
      },
    ];
    const expected =
      '?$apply=aggregate(Amount with sum as Total,Amount with max as Max)';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('custom aggregation as string', () => {
    const transform = {
      aggregate: "Forecast",
    };
    const expected = '?$apply=aggregate(Forecast)';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });


  it('multiple aggregations with same property as array', () => {
    const transform = [
      {
        aggregate: [
          "Forecast",
          {
            Amount: {
              with: 'max',
              as: 'Max',
            },
          },
        ],
      },
    ];
    const expected =
      '?$apply=aggregate(Forecast,Amount with max as Max)';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });
  
    it('simple aggregation as object without "with"', () => {
    const transform = {
      aggregate: {
        Amount: {
          as: "Total",
        },
      },
    };
    const expected = "?$apply=aggregate(Amount as Total)";
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('multiple aggregations with different properties as object without "with"', () => {
    const transform = [
      {
        aggregate: {
          Amount: {
            as: "Total",
          },
          Id: {
            as: "Count",
          },
        },
      },
    ];
    const expected = "?$apply=aggregate(Amount as Total,Id as Count)";
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('multiple aggregations with same property as array without "with"', () => {
    const transform = [
      {
        aggregate: [
          {
            Amount: {
              as: "Total",
            },
          },
          {
            Amount: {
              as: "Max",
            },
          },
        ],
      },
    ];
    const expected = "?$apply=aggregate(Amount as Total,Amount as Max)";
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('simple filter', () => {
    const transform = [
      {
        filter: {
          PropName: 1,
        },
      },
    ];
    const expected = '?$apply=filter(PropName eq 1)';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('should omit/ignore undefined filters', () => {
    const transform = { filter: undefined };
    const expected = '';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('should omit/ignore null filters', () => {
    const transform = { filter: null };
    const expected = '';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('should omit/ignore empty object filters', () => {
    const transform = { filter: {} };
    const expected = '';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('simple groupby', () => {
    const transform = [
      {
        groupBy: {
          properties: ['SomeProp'],
        },
      },
    ];
    const expected = '?$apply=groupby((SomeProp))';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('groupby with multiple columns', () => {
    const transform = [
      {
        groupBy: {
          properties: ['SomeProp', 'AnotherProp'],
        },
      },
    ];
    const expected = '?$apply=groupby((SomeProp,AnotherProp))';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('groupby with aggregation', () => {
    const transform = [
      {
        groupBy: {
          properties: ['SomeProp'],
          transform: [
            {
              aggregate: {
                Id: {
                  with: 'countdistinct',
                  as: 'Total',
                },
              },
            },
          ],
        },
      },
    ];
    const expected =
      '?$apply=groupby((SomeProp),aggregate(Id with countdistinct as Total))';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('group by with filter before as object', () => {
    const transform = {
      filter: {
        PropName: 1,
      },
      groupBy: {
        properties: ['SomeProp'],
        transform: {
          aggregate: {
            Id: {
              with: 'countdistinct',
              as: 'Total',
            },
          },
        },
      },
    };
    const expected =
      '?$apply=filter(PropName eq 1)/groupby((SomeProp),aggregate(Id with countdistinct as Total))';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });

  it('group by with filter before and after as array', () => {
    const transform = [
      {
        filter: {
          PropName: 1,
        },
      },
      {
        groupBy: {
          properties: ['SomeProp'],
          transform: [
            {
              aggregate: {
                Id: {
                  with: 'countdistinct',
                  as: 'Total',
                },
              },
            },
          ],
        },
      },
      {
        filter: {
          Total: { ge: 5 },
        },
      },
    ];
    const expected =
      '?$apply=filter(PropName eq 1)/groupby((SomeProp),aggregate(Id with countdistinct as Total))/filter(Total ge 5)';
    const actual = buildQuery({ transform });
    expect(actual).toEqual(expected);
  });
});

describe('select', () => {
  it('should support passing an array of strings', () => {
    const select = ['foo', 'bar'];
    const expected = '?$select=foo,bar';
    const actual = buildQuery({ select });
    expect(actual).toEqual(expected);
  });

  it('should support passing a string and use verbatim', () => {
    const select = 'foo,bar';
    const expected = '?$select=foo,bar';
    const actual = buildQuery({ select });
    expect(actual).toEqual(expected);
  });

  // TOOD: Support dot '.' and slash '/' smart expansion
});

describe('orderBy', () => {
  it('should support passing an array of strings', () => {
    const orderBy = ['foo', 'bar'];
    const expected = '?$orderby=foo,bar';
    const actual = buildQuery({ orderBy });
    expect(actual).toEqual(expected);
  });

  it('should support passing a string and use verbatim', () => {
    const orderBy = 'foo,bar';
    const expected = '?$orderby=foo,bar';
    const actual = buildQuery({ orderBy });
    expect(actual).toEqual(expected);
  });

  it('should support passing an array of fields', () => {
    type Bar = {foo: any, bar: any};
    const orderBy = ['foo', 'bar'] as OrderBy<Bar>;
    const expected = '?$orderby=foo,bar';
    const actual = buildQuery({ orderBy });
    expect(actual).toEqual(expected);
  });

  it('should support passing an array of [fields, order]', () => {
    type Bar = {foo: any, bar: any};
    const orderBy = [['foo', 'asc'], ['bar', 'desc']] as OrderBy<Bar>;
    const expected = '?$orderby=foo asc,bar desc';
    const actual = buildQuery({ orderBy });
    expect(actual).toEqual(expected);
  });

  it('should support passing an object', () => {
    type Bar = {foo: {bar: any}};
    const orderBy = {foo: ['bar']} as OrderBy<Bar>;
    const expected = '?$orderby=foo/bar';
    const actual = buildQuery({ orderBy });
    expect(actual).toEqual(expected);
  });

  it('should support passing an object of [fields, order]', () => {
    type Bar = {foo: {bar: any}};
    const orderBy = {foo: [['bar', 'asc']]} as OrderBy<Bar>;
    const expected = '?$orderby=foo/bar asc';
    const actual = buildQuery({ orderBy });
    expect(actual).toEqual(expected);
  });

  it('should support ordering a nested property within an expand', () => {
    const query = {
      expand: {
        Memberships: {
          orderBy: 'Group/Name',
        },
      },
    };
    const expected = '?$expand=Memberships($orderby=Group/Name)';
    const actual = buildQuery(query);
    expect(actual).toEqual(expected);
  });

  it('should support ordering multiple nested property within an expand', () => {
    const query = {
      expand: {
        Memberships: {
          orderBy: ['Group/Name', 'Group/Description'],
        },
      },
    };
    const expected =
      '?$expand=Memberships($orderby=Group/Name,Group/Description)';
    const actual = buildQuery(query);
    expect(actual).toEqual(expected);
  });
});

describe('key', () => {
  it('should support key as simple value', () => {
    const key = 1;
    const expected = '(1)';
    const actual = buildQuery({ key });
    expect(actual).toEqual(expected);
  });

  it('should support key as object', () => {
    const key = { Id: 1 };
    const expected = '(Id=1)';
    const actual = buildQuery({ key });
    expect(actual).toEqual(expected);
  });

  it('should support key as object with multiple keys', () => {
    const key = { OrderID: 1, ItemNo: 2 };
    const expected = '(OrderID=1,ItemNo=2)';
    const actual = buildQuery({ key });
    expect(actual).toEqual(expected);
  });

  it('should support key with filter', () => {
    const key = 1;
    const filter = { SomeProp: 123 };
    const expected = '(1)?$filter=SomeProp eq 123';
    const actual = buildQuery({ key, filter });
    expect(actual).toEqual(expected);
  });

  it('should support key with expand', () => {
    type Bar = { Foo: any };
    const key = 1;
    const expand = ['Foo'] as Expand<Bar>;
    const expected = '(1)?$expand=Foo';
    const actual = buildQuery<Bar>({ key, expand });
    expect(actual).toEqual(expected);
  });
});

describe('count', () => {
  it('should support include counts', () => {
    const count = true;
    const expected = '?$count=true';
    const actual = buildQuery({ count });
    expect(actual).toEqual(expected);
  });

  it('should query for only count', () => {
    const count = {};
    const expected = '/$count';
    const actual = buildQuery({ count });
    expect(actual).toEqual(expected);
  });

  it('should query for only count with filter', () => {
    const count = { PropName: 1 };
    const expected = '/$count?$filter=PropName eq 1';
    const actual = buildQuery({ count });
    expect(actual).toEqual(expected);
  });

  it('should allow groupby when querying for only count', () => {
    const count = {};
    const transform = [
      {
        filter: {
          PropName: 1,
        },
        groupBy: {
          properties: ['SomeProp'],
          transform: [
            {
              aggregate: {
                Id: {
                  with: 'countdistinct',
                  as: 'Total',
                },
              },
            },
          ],
        },
      },
    ];
    const expected =
      '/$count?$apply=filter(PropName eq 1)/groupby((SomeProp),aggregate(Id with countdistinct as Total))';
    const actual = buildQuery({ count, transform });
    expect(actual).toEqual(expected);
  });
});

describe('pagination', () => {
  it('should support limiting (top)', () => {
    const top = 25;
    const expected = '?$top=25';
    const actual = buildQuery({ top });
    expect(actual).toEqual(expected);
  });

  it('should support skipping', () => {
    const skip = 50;
    const expected = '?$skip=50';
    const actual = buildQuery({ skip });
    expect(actual).toEqual(expected);
  });

  it('should support skipping by token', () => {
    const skiptoken = 'Id: 1';
    const expected = '?$skiptoken=Id: 1';
    const actual = buildQuery({ skiptoken });
    expect(actual).toEqual(expected);
  });

  it('should support paginating (skip and limiting)', () => {
    const page = 3;
    const perPage = 25;
    const top = perPage;
    const skip = perPage * (page - 1);
    const expected = '?$top=25&$skip=50';
    const actual = buildQuery({ top, skip });
    expect(actual).toEqual(expected);
  });

  it('should support skipping zero items', () => {
    const skip = 0;
    const expected = '?$skip=0';
    const actual = buildQuery({ skip });
    expect(actual).toEqual(expected);
  });

  it('should support limiting to zero items', () => {
    const top = 0;
    const expected = '?$top=0';
    const actual = buildQuery({ top });
    expect(actual).toEqual(expected);
  });

  it('should support limiting and skipping zero items', () => {
    const top = 0;
    const skip = 0;
    const expected = '?$top=0&$skip=0';
    const actual = buildQuery({ top, skip });
    expect(actual).toEqual(expected);
  });
});

describe('expand', () => {
  it('should support basic expansion', () => {
    const expand = 'Foo';
    const expected = '?$expand=Foo';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should support multiple expands as an array', () => {
    type Bar = { Foo: any, Bar: any };
    const expand = ['Foo', 'Bar'] as Expand<Bar>;
    const expected = '?$expand=Foo,Bar';
    const actual = buildQuery<Bar>({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow nested expands with slash seperator', () => {
    const expand = 'Friends/Photos';
    const expected = '?$expand=Friends($expand=Photos)';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should support multiple nested expands with slash seperator as an array', () => {
    const expand = ['Foo/Bar/Baz', 'One/Two'];
    const expected = '?$expand=Foo($expand=Bar($expand=Baz)),One($expand=Two)';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow nested expands with objects', () => {
    const expand = { Friends: { expand: 'Photos' } };
    const expected = '?$expand=Friends($expand=Photos)';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow multiple expands with objects', () => {
    const expand = { Friends: {}, One: { orderBy: 'Two' } };
    const expected = '?$expand=Friends,One($orderby=Two)';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow multiple nested expands with objects', () => {
    type Bar = { Friends: { Photos: any}, One: { Two: any }};
    const expand: Expand<Bar> = [
      { Friends: { expand: 'Photos' } },
      { One: { expand: 'Two' } },
    ];
    const expected = '?$expand=Friends($expand=Photos),One($expand=Two)';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow multiple expands mixing objects and strings', () => {
    type Bar = { Friends: { Photos: any}, One: { Two: any }};
    const expand: Expand<Bar> = [{ Friends: { expand: 'Photos' } }, 'Foo/Bar/Baz'];
    const expected =
      '?$expand=Friends($expand=Photos),Foo($expand=Bar($expand=Baz))';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow expand with select', () => {
    const expand = { Friends: { select: 'Name' } };
    const expected = '?$expand=Friends($select=Name)';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow expand with skip', () => {
    const expand = { Friends: { skip: 10 } };
    const expected = '?$expand=Friends($skip=10)';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow expand with top', () => {
    const expand = { Friends: { top: 10 } };
    const expected = '?$expand=Friends($top=10)';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow expand with count', () => {
    const expand = { Friends: { count: true } };
    const expected = '?$expand=Friends($count=true)';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow expand with levels', () => {
    type Bar = { Friends: { Photos: any}, One: { Two: any }};
    const expand: Expand<Bar> = { Friends: { expand: { Photos: { levels: 10 }}} };
    const expected = '?$expand=Friends($expand=Photos($levels=10))';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow expand with max levels', () => {
    type Bar = { Friends: { Photos: any}, One: { Two: any }};
    const expand: Expand<Bar> = { Friends: { expand: { Photos: { levels: 'max' }}} };
    const expected = '?$expand=Friends($expand=Photos($levels=max))';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow expand with select and top', () => {
    const expand = { Friends: { select: 'Name', top: 10 } };
    const expected = '?$expand=Friends($select=Name;$top=10)';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow expand with select as array and top', () => {
    const expand = { Friends: { select: ['Name', 'Age'], top: 10 } };
    const expected = '?$expand=Friends($select=Name,Age;$top=10)';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow expand with filter', () => {
    const expand = { Trips: { filter: { Name: 'Trip in US' } } };
    const expected = "?$expand=Trips($filter=Name eq 'Trip in US')";
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });

  it('should allow expand with orderby', () => {
    const expand = { Products: { orderBy: 'ReleaseDate asc' } };
    const expected = '?$expand=Products($orderby=ReleaseDate asc)';
    const actual = buildQuery({ expand });
    expect(actual).toEqual(expected);
  });
});

describe('action', () => {
  it('should support an action on a collection', () => {
    const action = 'Test';
    const expected = '/Test';
    const actual = buildQuery({ action });
    expect(actual).toEqual(expected);
  });

  it('should support an action on an entity', () => {
    const key = 1;
    const action = 'Test';
    const expected = '(1)/Test';
    const actual = buildQuery({ key, action });
    expect(actual).toEqual(expected);
  });
});

describe('function', () => {
  it('should support a function on a collection', () => {
    const func = 'Test';
    const expected = '/Test';
    const actual = buildQuery({ func });
    expect(actual).toEqual(expected);
  });

  it('should support a function on an entity', () => {
    const key = 1;
    const func = 'Test';
    const expected = '(1)/Test';
    const actual = buildQuery({ key, func });
    expect(actual).toEqual(expected);
  });

  it('should support a function on a collection with parameters', () => {
    const func = { Test: { One: 1, Two: 2 } };
    const expected = '/Test(One=1,Two=2)';
    const actual = buildQuery({ func });
    expect(actual).toEqual(expected);
  });

  it('should support a function on a collection with one null parameter', () => {
    const func = { Test: { One: 1, Two: null } };
    const expected = '/Test(One=1,Two=null)';
    const actual = buildQuery({ func });
    expect(actual).toEqual(expected);
  });

  it('should support a function on a collection with undefined parameter', () => {
    const func = { Test: { One: 1, Two: undefined } };
    const expected = '/Test(One=1)';
    const actual = buildQuery({ func });
    expect(actual).toEqual(expected);
  });

  it('should support a function on an entity with parameters', () => {
    const key = 1;
    const func = { Test: { One: 1, Two: 2 } };
    const expected = '(1)/Test(One=1,Two=2)';
    const actual = buildQuery({ key, func });
    expect(actual).toEqual(expected);
  });

  it('should support a function on a collection with a raw parameter', () => {
    const func = { Test: { SomeDate: { type: 'raw', value: '2018-08-01' } } };
    const expected = '/Test(SomeDate=2018-08-01)';
    const actual = buildQuery({ func });
    expect(actual).toEqual(expected);
  });

  it('should support a function on a collection with an array/collection parameter of a simple type (number)', () => {
    const func = { Test: { SomeCollection: [1, 2, 3] } };
    const expected = '/Test(SomeCollection=[1,2,3])';
    const actual = buildQuery({ func });
    expect(actual).toEqual(expected);
  });

  it('should support a function on a collection with an array/collection parameter of a simple type (string)', () => {
    const func = { Test: { SomeCollection: ['One', 'Two', 'Three'] } };
    const expected = "/Test(SomeCollection=['One','Two','Three'])";
    const actual = buildQuery({ func });
    expect(actual).toEqual(expected);
  });

  it('should support a function on a collection with an array/collection parameter of a strings', () => {
    const someCollection = alias("SomeCollection", ['Sean', 'Jason']);
    const func = {
      Test: { SomeCollection: someCollection },
    };
    const expected =
      "/Test(SomeCollection=@SomeCollection)?@SomeCollection=['Sean','Jason']";
    const actual = buildQuery({ func });
    expect(actual).toEqual(expected);
  });

  it('should support a function on a collection with an array/collection parameter of a complex type', () => {
    const someCollection = alias("SomeCollection", json([{ Name: 'Sean' }, { Name: 'Jason' }]));
    const func = {
      Test: { SomeCollection: someCollection },
    };
    const expected =
      '/Test(SomeCollection=@SomeCollection)?@SomeCollection=%5B%7B%22Name%22%3A%22Sean%22%7D%2C%7B%22Name%22%3A%22Jason%22%7D%5D';
    const actual = buildQuery({ func });
    expect(actual).toEqual(expected);
  });
});

describe('format', () => {
  it('should support format', () => {
    const format = 'json';
    const expected = '?$format=json';
    const actual = buildQuery({ format });
    expect(actual).toEqual(expected);
  });
});
