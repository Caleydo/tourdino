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

