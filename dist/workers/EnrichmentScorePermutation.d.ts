/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 * See: https://stackoverflow.com/a/1527820/2549748
 */
declare function getRandomInt(min: any, max: any): any;
declare function calc(setNumber: any[], setCategory: any[]): any[];
declare function calcEnrichmentScoreCategory(setCombined: any[], currCategory: string, amountCategory: number): {
    category: string;
    enrichmentScore: number;
};
declare const ctx: Worker;
