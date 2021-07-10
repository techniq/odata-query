import {Alias, Binary, Decimal, Duration, Guid, Json, PlainObject, Raw} from './odata-types';

export const raw = (value: string): Raw => ({type: 'raw', value});
export const guid = (value: string): Guid => ({type: 'guid', value});
export const duration = (value: string): Duration => ({type: 'duration', value});
export const binary = (value: string): Binary => ({type: 'binary', value});
export const json = (value: PlainObject): Json => ({type: 'json', value});
export const alias = (name: string, value: PlainObject): Alias => ({type: 'alias', name, value});
export const decimal = (value: string): Decimal => ({type: 'decimal', value});
