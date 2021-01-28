import {Transform} from './../odata-types';
import {buildGroupBy} from './group-by';
import {buildAggregate} from './agregate';
import {buildFilter} from './filter';

export function buildTransforms<T>(transforms: Transform<T> | Transform<T>[]) {
    // Wrap single object an array for simplified processing
    const transformsArray = Array.isArray(transforms) ? transforms : [transforms];

    const transformsResult = transformsArray.reduce((result: string[], transform) => {
        const {aggregate, filter, groupBy, ...rest} = transform;

        // TODO: support as many of the following:
        //   topcount, topsum, toppercent,
        //   bottomsum, bottomcount, bottompercent,
        //   identity, concat, expand, search, compute, isdefined
        const unsupportedKeys = Object.keys(rest);
        if (unsupportedKeys.length) {
            throw new Error(`Unsupported transform(s): ${unsupportedKeys}`);
        }

        if (aggregate) {
            result.push(`aggregate(${buildAggregate(aggregate)})`);
        }
        if (filter) {
            const builtFilter = buildFilter(filter);
            if (builtFilter) {
                result.push(`filter(${buildFilter(builtFilter)})`);
            }
        }
        if (groupBy) {
            result.push(`groupby(${buildGroupBy(groupBy)})`);
        }

        return result;
    }, []);

    return transformsResult.join('/') || undefined;
}
