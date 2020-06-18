import { IMeasureResult } from './interfaces';
import { IColumnDesc } from 'lineupjs';
export declare class BaseUtils {
    /**
     * Returns:
     *  intersection: elements in both items
     *  arr1: eleents only in arr1
     *  arr2: eleents only in arr2
     */
    static intersection(arr1: any[], arr2: any[]): {
        intersection: any[];
        arr1: any[];
        arr2: any[];
    };
    /**
     * Remove missing values from both arrays. If a value is missing in the first array, remove it.
     * Remove the item in the second array with the same index.
     * @param arr1 First array
     * @param arr2 Second array
     * @returns An array containing two same length arrays with no null/missing values
     */
    static removeMissingValues(arr1: any[], arr2: any[]): any[][];
    static binom2(n: number): number;
    static isMissingValue(v: any): boolean;
    /**
     * Get a reasonable value to modulo against.
     * @param n total number
     * @param hits number of times the modulo operator should equal 0
     */
    static getModulo(n: number, hits: number): number;
    /**
     * Returns a defined object for a measure
     * @param scoreVal score value for the current measure
     * @param pVal p-value calculated for the current measure
     */
    static measureResultObj(scoreVal: number, pVal: number, setSizeA: number, setSizeB: number, addData?: any): IMeasureResult;
    /** Helper for async tests */
    static sleep(millis: number): Promise<unknown>;
    /**
     * Returns a random integer between min (inclusive) and max (inclusive).
     * The value is no lower than min (or the next integer greater than min
     * if min isn't an integer) and no greater than max (or the next integer
     * lower than max if max isn't an integer).
     * Using Math.round() will give you a non-uniform distribution!
     * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
     * See: https://stackoverflow.com/a/1527820/2549748
     */
    private static getRandomInt;
    /**
     * Returns n unqiue integers between 0 and max
     * @param n number of integers
     * @param max maimum integer
     */
    static getRandomUniqueIntegers(n: any, max: any): any[];
    /**
     * Shuffles array in place. From: https://stackoverflow.com/a/6274381/2549748
     * @param {Array} arr An array containing the items.
     */
    static shuffle(arr: any[]): any[];
    /**
     * Identify scores through their `lazyLoaded` attribute.
     * The `lazyLoaded` property is set in `addLazyColumn()` in in tdp_core\src\lineup\internal\column.ts
     * @param column Column description
     */
    static isScoreColumn(colDesc: IColumnDesc): boolean;
}
