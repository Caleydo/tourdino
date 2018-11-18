import {jStat} from 'jStat';
import { IMeasureResult } from './interfaces';
import {Big} from 'big.js'; // to calc binomial coefficient

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


const binomMap = new Map<String, Big>(); // Array is key, first item=n, 2nd item = k

export function binom(n: number, k:number): Big {
  //console.time('binom')
  if (k == 0 || n === k) {
    return new Big(1);
  }

  let i=1;
  let binomCoeff = new Big(1); // 1 because multiply in for-loop

  if (binomMap.has([n,k].toString())) {
    return binomMap.get([n,k].toString()); //already calculated, yeay!
  } else if (binomMap.has([n, k-1].toString())) {
      // we dont have [n, k] calculated, but already [n, k-1], so just add one multplication (y) --> probably that could be more efficiently handled if this function would be recursive
      binomCoeff = binomMap.get([n, k-1].toString());
      i= k; // i.e. only (n + 1 -k)/k will be multiplicated below
  }

  // Multiplicative formula
  // https://en.wikipedia.org/wiki/Binomial_coefficient#Multiplicative_formula
  for (/* i is already defined */ ;i <= k; i++) {
    binomCoeff = binomCoeff.times((n + 1 - i)/i); // Big variable is immutable
  }

  binomMap.set([n, k].toString(), binomCoeff);
  //console.timeEnd('binom')
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