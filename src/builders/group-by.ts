import {GroupBy} from './../odata-types';
import {buildTransforms} from './transforms';

export function buildGroupBy<T>(groupBy: GroupBy<T>) {
    if (!groupBy.properties) {
        throw new Error(`'properties' property required for groupBy`);
    }

    let result = `(${groupBy.properties.join(',')})`;

    if (groupBy.transform) {
        result += `,${buildTransforms(groupBy.transform)}`;
    }

    return result;
}
