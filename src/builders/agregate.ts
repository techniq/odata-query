import {Aggregate, AggregateObject} from './../odata-types';

export function buildAggregate(aggregate: Aggregate | Aggregate[]): string {
    // Wrap single object in an array for simplified processing
    const aggregateArray = Array.isArray(aggregate) ? aggregate : [aggregate];

    return aggregateArray
        .map(aggregateItem => {
            return typeof aggregateItem === "string"
                ? aggregateItem
                : buildAggregateItem(aggregateItem);
        })
        .join(',');
}

function buildAggregateItem(aggregateItem: AggregateObject) {
    return Object.keys(aggregateItem).map(aggregateKey => {
        const aggregateValue = aggregateItem[aggregateKey];

        // TODO: Are these always required?  Can/should we default them if so?
        if (!aggregateValue.with) {
            throw new Error(`'with' property required for '${aggregateKey}'`);
        }
        if (!aggregateValue.as) {
            throw new Error(`'as' property required for '${aggregateKey}'`);
        }

        return `${aggregateKey} with ${aggregateValue.with} as ${aggregateValue.as}`;
    });
}
