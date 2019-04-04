/// <reference types="jasmine" />
import {AdjustedRandIndex, JaccardSimilarity, ChiSquareTest, ChiSquareIndependenceTest} from '../src/Measures';
import {PRECISION} from './index.test';



describe('Jaccard index', () => {
  let jaccard;

  beforeAll(function() {
    jaccard = new JaccardSimilarity();
  });

  it('Perfect Match', async () => {
    const j = await jaccard.calc(['a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a']);
    expect(j.scoreValue).toEqual(1);
    expect(j.pValue).toEqual(0);
  });

  it('3/4 match', async () => {
    let j = await jaccard.calc(['a', 'a', 'a', 'a'], ['a', 'a', 'a', 'b']);
    expect(j.scoreValue).toEqual(3/5);
    j = await jaccard.calc(['a', 'a', 'a', 'a'], ['a', 'a', 'b', 'a']);
    expect(j.scoreValue).toEqual(3/5);
    j = await jaccard.calc(['a', 'a', 'a', 'a'], ['a', 'b', 'a', 'a']);
    expect(j.scoreValue).toEqual(3/5);
    j = await jaccard.calc(['a', 'a', 'a', 'a'], ['b', 'a', 'a', 'a']);
    expect(j.scoreValue).toEqual(3/5);

    j = await jaccard.calc(['a', 'a', 'a', 'a'], ['a', 'a', 'a']);
    expect(j.scoreValue).toEqual(3/4);
  });

  it('2/4  match', async () => {
    let j = await jaccard.calc(['a', 'a', 'a', 'a'], ['a', 'a', 'b', 'b']);
    expect(j.scoreValue).toEqual(2/6);
    j = await jaccard.calc(['a', 'a', 'a', 'a'], ['a', 'b', 'b', 'a']);
    expect(j.scoreValue).toEqual(2/6);
    j = await jaccard.calc(['a', 'a', 'a', 'a'], ['a', 'b', 'a', 'b']);
    expect(j.scoreValue).toEqual(2/6);
    j = await jaccard.calc(['a', 'a', 'a', 'a'], ['b', 'b', 'a', 'a']);
    expect(j.scoreValue).toEqual(2/6);

    j = await jaccard.calc(['a', 'a', 'a', 'a'], ['a', 'a']);
    expect(j.scoreValue).toEqual(2/4);
  });

  it('Total  Mismatch', async () => {
    const j = await jaccard.calc(['a', 'a', 'a'], ['b', 'b', 'b']);
    expect(j.scoreValue).toEqual(0);
    expect(j.pValue).toEqual(1);
  });

  it('No p-Value', async () => {
    const j = await jaccard.calc(['a', 'a', 'a'], ['b', 'a', 'b']);
    expect(j.pValue).toEqual(-1); //there is no data for randomization
  });

  // TODO test randomization
});



describe('Adjusted Rand', () => {
  let adjRand;

  beforeAll(function() {
    adjRand = new AdjustedRandIndex();
  });

  it('Perfect Match', async () => {
    let ari = await adjRand.calc(['a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a']);
    expect(ari.scoreValue).toEqual(1);
    expect(ari.pValue).toEqual(0);
    ari = await adjRand.calc(['a', 'a', 'a', 'b'], ['e', 'e', 'e', 'f']);
    expect(ari.scoreValue).toEqual(1);
    expect(ari.pValue).toEqual(0);
    ari = await adjRand.calc(['a', 'a', 'a', 'a'], ['b', 'b', 'b', 'b']);
    expect(ari.scoreValue).toEqual(1);
    expect(ari.pValue).toEqual(0);
  });

  it('should throw on different set sizes', async() => {
    const a = ['a', 'a', 'b'];
    const b = ['a', 'b', 'b', 'c'];

    let error = undefined;
    try {
      await adjRand.calc(a, b);
    } catch(e) {
      error = e;
    }
    expect(error).toBeDefined();

    error = undefined;
    try {
      await adjRand.calc(b, a);
    } catch(e) {
      error = e;
    }
    expect(error).toBeDefined();
  });

  it('3/4 match', async () => {
    let ari = await adjRand.calc(['a', 'a', 'b', 'c'], ['a', 'a', 'b', 'b']);
    expect(ari.scoreValue).toBeCloseTo(0.5714285714285715, PRECISION);
    ari = await adjRand.calc(['a', 'a', 'b', 'c'], ['a', 'a', 'c', 'c']);
    expect(ari.scoreValue).toBeCloseTo(0.5714285714285715, PRECISION);
    ari = await adjRand.calc(['a', 'a', 'c', 'b'], ['a', 'a', 'b', 'b']);
    expect(ari.scoreValue).toBeCloseTo(0.5714285714285715, PRECISION);
    ari = await adjRand.calc(['c', 'b', 'a', 'a'], ['a', 'a', 'b', 'b']);
    expect(ari.scoreValue).toBeCloseTo(0.5714285714285715, PRECISION);
  });

  it('Total  Mismatch', async () => {
    const ari = await adjRand.calc(['a', 'a', 'a'], ['b', 'c', 'd']);
    expect(ari.scoreValue).toEqual(0);
    expect(ari.pValue).toEqual(1);
  });

  // TODO test randomization
});
