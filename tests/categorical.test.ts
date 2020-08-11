/// <reference types="jest" />
import {AdjustedRandIndex, ChiSquareIndependenceTest} from '../src/measures';
import {WorkerUtils} from '../src/workers/WorkerUtils';
import {PRECISION} from './index.test';

describe('Jaccard index', () => {

  it('Perfect Match', async () => {
    const j = WorkerUtils.calcJaccard(['a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a']);
    expect(j).toEqual(1);
  });

  it('3/4 match', async () => {
    let j = WorkerUtils.calcJaccard(['a', 'a', 'a', 'a'], ['a', 'a', 'a', 'b']);
    expect(j).toEqual(3/5);
    j = WorkerUtils.calcJaccard(['a', 'a', 'a', 'a'], ['a', 'a', 'b', 'a']);
    expect(j).toEqual(3/5);
    j = WorkerUtils.calcJaccard(['a', 'a', 'a', 'a'], ['a', 'b', 'a', 'a']);
    expect(j).toEqual(3/5);
    j = WorkerUtils.calcJaccard(['a', 'a', 'a', 'a'], ['b', 'a', 'a', 'a']);
    expect(j).toEqual(3/5);
    j = WorkerUtils.calcJaccard(['a', 'a', 'a', 'a'], ['a', 'a', 'a']);
    expect(j).toEqual(3/4);
  });

  it('2/4  match', async () => {
    let j = WorkerUtils.calcJaccard(['a', 'a', 'a', 'a'], ['a', 'a', 'b', 'b']);
    expect(j).toEqual(2/6);
    j = WorkerUtils.calcJaccard(['a', 'a', 'a', 'a'], ['a', 'b', 'b', 'a']);
    expect(j).toEqual(2/6);
    j = WorkerUtils.calcJaccard(['a', 'a', 'a', 'a'], ['a', 'b', 'a', 'b']);
    expect(j).toEqual(2/6);
    j = WorkerUtils.calcJaccard(['a', 'a', 'a', 'a'], ['b', 'b', 'a', 'a']);
    expect(j).toEqual(2/6);
    j = WorkerUtils.calcJaccard(['a', 'a', 'a', 'a'], ['a', 'a']);
    expect(j).toEqual(2/4);
  });

  it('Total  Mismatch', async () => {
    const j = WorkerUtils.calcJaccard(['a', 'a', 'a'], ['b', 'b', 'b']);
    expect(j).toEqual(0);
  });

  it('No p-Value', async () => {
    const j = WorkerUtils.calcJaccard(['a', 'a', 'a'], ['b', 'a', 'b']);
    expect(j).toEqual(0.2); //there is no data for randomization
  });

  // TODO test randomization
});

describe('Adjusted Rand', () => {

  it('Perfect Match', async () => {
    let ari = WorkerUtils.calcAdjRand(['a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a']);
    expect(ari).toEqual(1);
    ari = WorkerUtils.calcAdjRand(['a', 'a', 'a', 'b'], ['e', 'e', 'e', 'f']);
    expect(ari).toEqual(1);
    ari = WorkerUtils.calcAdjRand(['a', 'a', 'a', 'a'], ['b', 'b', 'b', 'b']);
    expect(ari).toEqual(1);
  });

  it('should throw on different set sizes', async() => {
    const a = ['a', 'a', 'b'];
    const b = ['a', 'b', 'b', 'c'];
    let ari =  WorkerUtils.calcAdjRand(a, b);
    expect(ari).toBeCloseTo(-0.49999999999999994, PRECISION);
    let error = undefined;
    try {
      WorkerUtils.calcAdjRand(b, a);
    } catch(e) {
      error = e;
    }
    expect(error).toBeDefined();
  });

  it('3/4 match', async () => {
    let ari = WorkerUtils.calcAdjRand(['a', 'a', 'b', 'c'], ['a', 'a', 'b', 'b']);
    expect(ari).toBeCloseTo(0.5714285714285715, PRECISION);
    ari = WorkerUtils.calcAdjRand(['a', 'a', 'b', 'c'], ['a', 'a', 'c', 'c']);
    expect(ari).toBeCloseTo(0.5714285714285715, PRECISION);
    ari = WorkerUtils.calcAdjRand(['a', 'a', 'c', 'b'], ['a', 'a', 'b', 'b']);
    expect(ari).toBeCloseTo(0.5714285714285715, PRECISION);
    ari = WorkerUtils.calcAdjRand(['c', 'b', 'a', 'a'], ['a', 'a', 'b', 'b']);
    expect(ari).toBeCloseTo(0.5714285714285715, PRECISION);
  });

  it('Total  Mismatch', async () => {
    const ari = WorkerUtils.calcAdjRand(['a', 'a', 'a'], ['b', 'c', 'd']);
    expect(ari).toEqual(0);
  });

  // TODO test randomization
});


describe('Chi2 Independence Test', () => {
  let chi2Test;

  beforeAll(function() {
    chi2Test = new ChiSquareIndependenceTest(); // returns Cramers V !!
  });

  it('Perfect Match', async () => {
    let chi2 = await chi2Test.calc(['a', 'a', 'a', 'b'], ['e', 'e', 'e', 'f']);
    expect(chi2.scoreValue).toEqual(1);
    expect(chi2.pValue).toBeCloseTo(0.04550026, PRECISION); // calculated with https://www.danielsoper.com/statcalc/calculator.aspx?id=11 and another. scipy's p-value seems wrong.
    chi2 = await chi2Test.calc(['a', 'a', 'b', 'b'], ['c', 'c', 'z', 'z']);
    expect(chi2.scoreValue).toEqual(1);
    expect(chi2.pValue).toBeCloseTo(0.04550026, PRECISION);
  });

  it('Single Category sets', async() => {
    let chi2 = await chi2Test.calc(['a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a']);
    expect(chi2.scoreValue).toEqual(0);
    expect(chi2.pValue).toEqual(1);
    chi2 = await chi2Test.calc(['a', 'a', 'a', 'a'], ['b', 'b', 'b', 'b']);
    expect(chi2.scoreValue).toEqual(0);
    expect(chi2.pValue).toEqual(1);

    chi2 = await chi2Test.calc(['a', 'a', 'a', 'a'], ['a', 'b', 'c', 'd']);
    expect(chi2.scoreValue).toEqual(0);
    expect(chi2.pValue).toEqual(1);
    chi2 = await chi2Test.calc(['a', 'b', 'c', 'd'], ['e', 'e', 'e', 'e']);
    expect(chi2.scoreValue).toEqual(0);
    expect(chi2.pValue).toEqual(1);
  });

  it('should throw on different set sizes', async() => {
    const a = ['a', 'a', 'b'];
    const b = ['a', 'b', 'b', 'c'];

    let error = undefined;
    try {
      await chi2Test.calc(a, b);
    } catch(e) {
      error = e;
    }
    expect(error).toBeDefined();

    error = undefined;
    try {
      await chi2Test.calc(b, a);
    } catch(e) {
      error = e;
    }
    expect(error).toBeDefined();
  });
});
