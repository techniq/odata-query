export type Raw = { type: 'raw'; value: any; }
export type Guid = { type: 'guid'; value: any; }
export type Duration = { type: 'duration'; value: any; }
export type Binary = { type: 'binary'; value: any; }
export type Json = { type: 'json'; value: any; }
export type Alias = { type: 'alias'; name: string; value: any; }
export type Decimal = { type: 'decimal'; value: any; }
export type Value = string | Date | number | boolean | Raw | Guid | Duration | Binary | Json | Alias | Decimal;

export const COMPARISON_OPERATORS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
export const LOGICAL_OPERATORS = ['and', 'or', 'not'];
export const COLLECTION_OPERATORS = ['any', 'all'];
export const BOOLEAN_FUNCTIONS = ['startswith', 'endswith', 'contains'];
export const SUPPORTED_EXPAND_PROPERTIES = [
    'expand',
    'levels',
    'select',
    'top',
    'count',
    'orderby',
    'filter',
];
export const FUNCTION_REGEX = /\((.*)\)/;
export type PlainObject = { [property: string]: any };
export type Select<T> = string | keyof T | Array<keyof T>;
export type OrderBy<T> = string | OrderByOptions<T> | Array<OrderByOptions<T>> | { [P in keyof T]?: OrderBy<T[P]> };
export type Filter = string | PlainObject | Array<string | PlainObject>;
export type NestedExpandOptions<T> = { [P in keyof T]?: (T[P] extends Array<infer E> ? Partial<ExpandOptions<E>> : Partial<ExpandOptions<T[P]>>) };
export type Expand<T> =
    string
    | keyof T
    | NestedExpandOptions<T>
    | Array<keyof T | NestedExpandOptions<T>>
    | Array<string | NestedExpandOptions<T>>;

export enum StandardAggregateMethods {
    sum = "sum",
    min = "min",
    max = "max",
    average = "average",
    countdistinct = "countdistinct",
}

export type Aggregate = string | { [propertyName: string]: { with: StandardAggregateMethods, as: string } };
export type OrderByOptions<T> = keyof T | [keyof T, 'asc' | 'desc'];
export type ExpandOptions<T> = {
    select: Select<T>;
    filter: Filter;
    orderBy: OrderBy<T>;
    top: number;
    levels: number | 'max';
    count: boolean | Filter;
    expand: Expand<T>;
}
export type Transform<T> = {
    aggregate?: Aggregate | Array<Aggregate>;
    filter?: Filter;
    groupBy?: GroupBy<T>;
}
export type GroupBy<T> = {
    properties: Array<keyof T>;
    transform?: Transform<T>;
}
export type QueryOptions<T> = ExpandOptions<T> & {
    search: string;
    transform: PlainObject | PlainObject[];
    skip: number;
    skiptoken: string;
    key: string | number | PlainObject;
    count: boolean | Filter;
    action: string;
    func: string | { [functionName: string]: { [parameterName: string]: any } };
    format: string;
    aliases: Alias[];
}
