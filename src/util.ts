import {IMeasureResult} from './interfaces';
import {IAccessorFunc} from 'tdp_core/src/lineup/internal/utils';
import {IColumnDesc, Column} from 'lineupjs';

/**
 * Returns:
 *  intersection: elements in both items
 *  arr1: eleents only in arr1
 *  arr2: eleents only in arr2
 */
export function intersection(arr1: Array<any>, arr2: Array<any>) {
  const intersection = [];
  const filtered2 = arr2.slice(0); // Slice is fastest (internally optimized) method on blink browsers (e.g. chrome) to copy an array
  const filtered1 = arr1.filter((itemA) => {
    const indexB = filtered2.findIndex((itemB) => itemB === itemA); // check if there is a corresponding entry in the setB
    if (indexB >= 0) {
      intersection.push(itemA);
      filtered2.splice(indexB, 1);
      return false; // selItem will drop out of setA
    }
    return true;
  });

  return {'intersection': intersection, 'arr1': filtered1, 'arr2': filtered2};
}
// const union = selectionSet.concat(categorySet).sort().filter((item, i, arr) => !i || item != arr[i-1]) // !i => if first elemnt, or if unqueal to previous item (item != arr[i-1]) include in arr

export function binom2(n: number): number {
  return n*(n-1)/2;
}

/**
 * Get a reasonable value to modulo against.
 * @param n total number
 * @param hits number of times the modulo operator should equal 0
 */
export function getModulo(n: number, hits: number): number {
  return Math.floor(n/hits); // this will happen hits times
}

/**
 * Returns a defined object for a measure
 * @param scoreVal score value for the current measure
 * @param pVal p-value calculated for the current measure
 */
export function measureResultObj(scoreVal: number, pVal: number, setSizeA: number, setSizeB: number, addData?: any): IMeasureResult {
  if(addData !== undefined) {
    return {
      scoreValue: scoreVal,
      pValue: pVal,
      setSizeA,
      setSizeB,
      additionalData: addData
    };
  } else {
    return {
      scoreValue: scoreVal,
      pValue: pVal,
      setSizeA,
      setSizeB
    };
  }
}

/** Helper for async tests */
export function sleep(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}


/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 * See: https://stackoverflow.com/a/1527820/2549748
 */
export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


/**
 * Returns n unqiue integers between 0 and max
 * @param n number of integers
 * @param max maimum integer
 */
export function getRandomUniqueIntegers(n, max) {
  if (n > max+1) {
    throw new Error(`You requested more unique numbers than can fit between 0 and ${max}. n=${n}`);
  }

  if (n > max/4) {
    const integers = [...Array(max+1)].map((_,i) => i); // start with all integers between 0 and max

    while (integers.length !== n) { // skipped if n = max+1  --> all integers between 0 and max
      integers.splice(getRandomInt(0, integers.length), 1); // definetly one hit per iteration
    }
    return integers;
  } else {
    const integers = [];
    while (integers.length < n) {
      const integer = getRandomInt(0, max);
      if (integers.indexOf(integer) === -1) { // not every iteration might add an element
        integers.push(integer);
      }
    }
    return integers;
  }
}

/**
 * Shuffles array in place. From: https://stackoverflow.com/a/6274381/2549748
 * @param {Array} arr An array containing the items.
 */
export function shuffle(arr: Array<any>): Array<any> {
  let index, rndIndex, helper;
  for (index = arr.length - 1; index > 0; index--) {
      rndIndex = Math.floor(Math.random() * (index + 1));
      helper = arr[index];
      arr[index] = arr[rndIndex];
      arr[rndIndex] = helper;
  }
  return arr;
}

/**
 * Identify scores through their `lazyLoaded` attribute.
 * The `lazyLoaded` property is set in `addLazyColumn()` in in tdp_core\src\lineup\internal\column.ts
 * @param column Column description
 */
export function isScoreColumn(colDesc: IColumnDesc) {
  return colDesc.hasOwnProperty('lazyLoaded');
}

