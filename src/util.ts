import {jStat} from 'jStat';
import { IMeasureResult } from './interfaces';


// const intersection = selectionSet.filter(item => categorySet.indexOf(item) >= 0); // filter elements not in the second array
// const union = selectionSet.concat(categorySet).sort().filter((item, i, arr) => !i || item != arr[i-1]) // !i => if first elemnt, or if unqueal to previous item (item != arr[i-1]) include in arr

/**
 * Returns:
 *  intersection: elements in both items
 *  arr1: eleents only in arr1
 *  arr2: eleents only in arr2
 */
export function intersection(arr1: Array<any>, arr2: Array<any>) {
  let intersection = [];
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

  return {"intersection": intersection, "arr1": filtered1, "arr2": filtered2};
}

export function binom2(n: number): number {
  return n*(n-1)/2;
}

export function binom(n: number, k:number): number {
  if (k == 0 || n === k) {
    return 1;
  }  
  // Multiplicative formula
  // https://en.wikipedia.org/wiki/Binomial_coefficient#Multiplicative_formula
  let binomCoeff = 1; // 1 because multiply in for-loop
  for (let i=1; i <= k; i++) {
    binomCoeff *= (n + 1 - i)/i
  }
  return binomCoeff;
}

export function measureResultObj(scoreVal: number, pVal: number): IMeasureResult {
  return {scoreValue: scoreVal,
          pValue: pVal};
}

/** Helper for async tests */
export function sleep(millis: number) {
  return new Promise(resolve => setTimeout(resolve, millis));
}