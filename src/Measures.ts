import {Comparison, SCOPE, ISimilarityMeasure, Type, IMeasureResult, IMeasureVisualization} from './interfaces';
import {ParallelSets} from './measure_visualization/ParallelSets';
import {BoxPlot} from './measure_visualization/BoxPlot';
import {ScatterPlot} from './measure_visualization/ScatterPlot';
import {RelGroupedBarChart} from './measure_visualization/RelGroupedBarChart';
import {measureResultObj, sleep} from './util';
import * as d3 from 'd3';
import {jStat} from 'jStat';
import {LineChart} from './measure_visualization/LineChart';
import {JaccardRandomizationWorker, AdjustedRandRandomizationWorker, EnrichmentRandomizationWorker} from './Workers/WorkerManager';

export const registeredClasses = new Array<ASimilarityMeasure>();
export function MeasureDecorator() {
  return function (target: {new(): ASimilarityMeasure}) { // only instantiable subtypes of ASimilarityClass can be passed.
    registeredClasses.push(new target());
  };
}


export abstract class ASimilarityMeasure implements ISimilarityMeasure {

  public id: string;
  public label: string;
  public description: string;
  public visualization: IMeasureVisualization;

  public type: Comparison;
  public scope: SCOPE;

  public abstract calc(setA: Array<any>, setB: Array<any>, allData: Array<any>): Promise<IMeasureResult>;

  protected pValueAvailability(original: number, valid: number, threshold = 0.1): boolean {
    const ratio = valid / original;
    return (ratio >= threshold);
  }
}


//   _____       _______             _____       _______
//  / ____|   /\|__   __|           / ____|   /\|__   __|
// | |       /  \  | |     ______  | |       /  \  | |
// | |      / /\ \ | |    |______| | |      / /\ \ | |
// | |____ / ____ \| |             | |____ / ____ \| |
//  \_____/_/    \_\_|              \_____/_/    \_\_|
// =================================================================
// =================================================================

@MeasureDecorator()
export class ChiSquareTest extends ASimilarityMeasure {

  constructor() {
    super();

    this.id = 'chi2_test';
    this.label = 'Chi-Square Test';
    this.description = 'The Chi-Square test compares the distribution of categories in two sets.';
    this.visualization = new RelGroupedBarChart();

    this.type = Comparison.get(Type.CATEGORICAL, Type.CATEGORICAL);
    this.scope = SCOPE.SETS;
  }


  public async calc(setA: Array<any>, setB: Array<any>) {
    await sleep(0);
    const setACategories = setA.filter((item, index, self) => self.indexOf(item) === index);
    const setBCategories = setB.filter((item, index, self) => self.indexOf(item) === index);
    const allCategories = setACategories.concat(setBCategories).filter((item, index, self) => self.indexOf(item) === index);

    let score = 0;
    let pValue = -1;

    if (allCategories.length > 1) {
      const setASize = setA.length;
      const setBSize = setB.length;
      const overallSize = setASize + setBSize;

      const table = [];
      for (const currCat of allCategories) {
        const amountSetA = setA.filter((item) => (item === currCat)).length;
        const amountSetB = setB.filter((item) => (item === currCat)).length;
        const sum = amountSetA + amountSetB;
        const setAExp = (setASize * sum) / overallSize;
        const setAChi = Math.pow(amountSetA - setAExp, 2) / setAExp;

        const setBExp = (setBSize * sum) / overallSize;
        const setBChi = Math.pow(amountSetB - setBExp, 2) / setBExp;
        const sumChi = setAChi + setBChi;
        const currCell = {
          category: currCat,
          setA: amountSetA,
          setAExp,
          setAChi,
          setB: amountSetB,
          setBExp,
          setBChi,
          sum,
          sumChi
        };
        table.push(currCell);
      }


      const allChiForCategories = table.map((a) => (a.sumChi));
      const chiSquare = allChiForCategories.reduce(this.getSum);
      const rows = 2; // the two sets
      const columns = table.length; // number of categories in the two sets
      const df = (rows - 1) * (columns - 1);
      // Phi
      // const phi = Math.sqrt(chiSquare/overallSize);
      // Cramer's V
      const t = Math.min(rows - 1, columns - 1);
      const cramerV = Math.sqrt(chiSquare / (overallSize * t));

      score = cramerV;
      pValue = 1 - jStat.jStat.chisquare.cdf(chiSquare, df);
      // console.log('ChiSquare - table: ', {setA,setB,allCategories,table,chiSquare,df,pValue});
    }

    return measureResultObj(score, pValue, setA.length, setB.length);
  }

  public getSum(total: number, numb: number) {
    return total + numb;
  }

}

/**
 * Also known as the Tanimoto distance metric.
 */
@MeasureDecorator()
export class JaccardSimilarity extends ASimilarityMeasure {

  constructor() {
    super();

    this.id = 'jaccard';
    this.label = 'Jaccard Index';
    this.description = 'The index shows the similarity of two sets by normalizing their intersection with the union of the sets.';
    this.visualization = new ParallelSets();

    this.type = Comparison.get(Type.CATEGORICAL, Type.CATEGORICAL);
    this.scope = SCOPE.SETS;
  }


  public async calc(setA: Array<any>, setB: Array<any>, allData: Array<any>) {
    const {score, p} = await this.calc_Randomize(setA, setB, allData);
    return measureResultObj(score, p, setA.length, setB.length);
  }

  async calc_Randomize(setA: Array<any>, setB: Array<any>, allData: Array<any>): Promise<{score: number, p: number}> {
    return new JaccardRandomizationWorker().calculate({setA, setB, allData});
  }
}

@MeasureDecorator()
export class ChiSquareIndependenceTest extends ChiSquareTest {

  constructor() {
    super();

    this.id = 'chi2_indi_test';
    this.visualization = new ParallelSets();

    this.scope = SCOPE.ATTRIBUTES;
  }

  // compare: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3900058
  public async calc(arrA: Array<any>, arrB: Array<any>) {
    await sleep(0);

    if (arrA.length !== arrB.length) {
      throw Error('Value Pairs are compared, therefore the array sizes have to be equal.');
    }

    const n = arrA.length; // === arrB.length
    const setACategories = arrA.filter((item, index, self) => self.indexOf(item) === index);
    const rows = setACategories.length;
    const setBCategories = arrB.filter((item, index, self) => self.indexOf(item) === index);
    const columns = setBCategories.length;

    let score = 0;
    let pValue = -1;

    /* if (rows <= 1 && columns <= 1) {
      // 1:1 mapping between the category of attribute A and the one of attribute B --> high association
      // chi2 would be 0 though, because observed === expected value, and chi2 = (obs - expect)²/expect
      return measureResultObj(1, 0 , setACategories.length, setBCategories.length);
    } else */
    if (rows <= 1 || columns <= 1) {
      // chi2 is 0, because observed === expected value, and chi2 = (obs - expect)²/expect
      // chi2 is really 0, so we can set p to 1s
      return measureResultObj(score, 1, setACategories.length, setBCategories.length);
    }

    for (const catA of setACategories) { // contingency table rows
      for (const catB of setBCategories) { // contingency table columns
        const indices = [];
        const amountCatA = arrA.filter((val, index) => {  // items with cat A --> row marginal
          const match = val === catA;
          if (match) {
            indices.push(index); // get indices where val = category
          }
          return match;
        }).length;
        const amountCatB = arrB.filter((val) => val === catB).length;  // items with cat B -> column marginal
        const observed = indices.map((index) => arrB[index]).filter((val) => val === catB).length; // items with cat A & B
        const expected = (amountCatA * amountCatB) / n;
        // console.log('observed', observed, '\texpected', expected);
        const chi = Math.pow(observed - expected, 2) / expected;

        score += chi;
      }
    }

    const df = (rows - 1) * (columns - 1);
    pValue = 1 - jStat.jStat.chisquare.cdf(score, df);

    // Cramer's V
    const t = Math.min(rows - 1, columns - 1);
    const cramerV = Math.sqrt(score / (n * t));
    // console.log('score', score, 'n', n, 't', t);
    score = cramerV;

    return measureResultObj(score, pValue, setACategories.length, setBCategories.length, this.scope);
  }
}


/**
 * Also known as the Tanimoto distance metric.
 */
@MeasureDecorator()
export class AdjustedRandIndex extends ASimilarityMeasure {

  constructor() {
    super();

    this.id = 'adjrand';
    this.label = 'Adjusted Rand Index';
    this.description = 'Measures the similarity between two categorical attributes. \
    The adjusted Rand index is based on counting pairs of items that are in the same or different categories in the two attributes.';

    this.visualization = new ParallelSets();

    this.type = Comparison.get(Type.CATEGORICAL, Type.CATEGORICAL);
    this.scope = SCOPE.ATTRIBUTES;
  }


  public async calc(arr1: Array<any>, arr2: Array<any>) {
    if (arr1.length !== arr2.length) {
      throw Error('Value Pairs are compared, therefore the array sizes have to be equal.');
    }

    const {score, p} = await this.calcP_Randomize(arr1, arr2);
    return measureResultObj(score, p, arr1.length, arr2.length, this.scope); // async function --> returns promise
  }

  async calcP_Randomize(arr1: any[], arr2: any[]): Promise<{score: number, p: number}> {
    return new AdjustedRandRandomizationWorker().calculate({setA: arr1, setB: arr2});
  }
}

//  _   _ _    _ __  __            _   _ _    _ __  __
// | \ | | |  | |  \/  |          | \ | | |  | |  \/  |
// |  \| | |  | | \  / |  ______  |  \| | |  | | \  / |
// | . ` | |  | | |\/| | |______| | . ` | |  | | |\/| |
// | |\  | |__| | |  | |          | |\  | |__| | |  | |
// |_| \_|\____/|_|  |_|          |_| \_|\____/|_|  |_|
// =================================================================
// =================================================================


@MeasureDecorator()
export class WilcoxonRankSumTest extends ASimilarityMeasure {

  constructor() {
    super();

    this.id = 'wilcoxon-rank-sum_test';
    this.label = 'Wilcoxon Rank-Sum Test';
    this.description = 'Tests if the two groups of values stem from the same distribution. It is also known as Mann–Whitney U test.';
    this.visualization = new BoxPlot();

    this.type = Comparison.get(Type.NUMERICAL, Type.NUMERICAL);
    this.scope = SCOPE.SETS;
  }



  public async calc(setA: Array<any>, setB: Array<any>) {
    await sleep(0);
    const setAValid = setA.filter((value) => {return (value !== null && value !== undefined && !isNaN(value));});
    const selectionRankObj: IRankObJ[] = setAValid.map((a) => {
      return {
        set: 'selection',
        value: a
      };
    });

    const setBValid: IRankObJ[] = setB.filter((value) => {return (value !== null && value !== undefined && !isNaN(value));});
    const categoryRankObj = setBValid.map((b) => {
      return {
        set: 'category',
        value: b
      };
    });

    // create array with all values and their affiliation
    const collectiveRankSet = selectionRankObj.concat(categoryRankObj);
    // sort the set from low to high
    collectiveRankSet.sort((a, b) => {return a.value - b.value;});

    // assing rank
    // array for the idecies of the redion with the same values
    let regionRange = [];
    // flag to indicate a two or more values are equal
    let region = false;
    for (let i = 0; i < collectiveRankSet.length; i++) {
      // check if previous and current values are equal
      if (i >= 1 && collectiveRankSet[i - 1].value === collectiveRankSet[i].value) {
        // if previous === current
        // set region flag = ture and save indicies in regionRange array
        region = true;
        regionRange.push(i - 1);
        regionRange.push(i);
      }

      // check if a region exists (flag = true) and the previous != current values
      if (region && collectiveRankSet[i - 1].value !== collectiveRankSet[i].value && regionRange.length > 1) {
        // region = true and previous != current -> region over
        // remove duplicate idex values
        const uniqueRegionRange = regionRange.filter((v, i) => {return regionRange.indexOf(v) === i;});
        // calculate rank for the region
        const regionRank = (uniqueRegionRange.reduce((a, b) => a + b, 0) + uniqueRegionRange.length) / uniqueRegionRange.length;

        // cahnge the ranks in the privous items
        for (const regionRange of uniqueRegionRange) {
          collectiveRankSet[regionRange].rank = regionRank;
        }
        regionRange = [];
        region = false;
      }

      // set rank = index + 1
      collectiveRankSet[i].rank = i + 1;
    }

    // check if the last values where in a region
    if (region && regionRange.length > 1) {
      // region = true and previous != current -> region over
      // remove duplicate idex values
      const uniqueRegionRange = regionRange.filter((v, i) => {return regionRange.indexOf(v) === i;});
      // calculate rank for the region
      const regionRank = (uniqueRegionRange.reduce((a, b) => a + b, 0) + uniqueRegionRange.length) / uniqueRegionRange.length;

      // cahnge the ranks in the privous items
      for (const regionRange of uniqueRegionRange) {
        collectiveRankSet[regionRange].rank = regionRank;
      }
      regionRange = [];
      region = false;
    }

    // split the rankSet into the two categories and get only the rank property
    const selectionRanks = collectiveRankSet
      .filter((item) => (item.set === 'selection'))
      .map((a) => {return a.rank;});

    const categoryRanks = collectiveRankSet
      .filter((item) => (item.set === 'category'))
      .map((a) => {return a.rank;});

    // calculate rank sum for each category
    const nSelection = selectionRanks.length;
    const selectionRankSum = selectionRanks.reduce((a, b) => a + b, 0);

    const nCategroy = categoryRanks.length;
    const categoryRankSum = categoryRanks.reduce((a, b) => a + b, 0);



    // calculate the test statistic U
    const selectionU = nSelection * nCategroy + (nSelection * (nSelection + 1) / 2) - selectionRankSum;
    const categoryU = nSelection * nCategroy + (nCategroy * (nCategroy + 1) / 2) - categoryRankSum;

    const minU = Math.min(selectionU, categoryU);

    // calculate z-value -> for big sample sizes each more than 10 use normal distribution (z-value)
    let score = (minU - (nSelection * nCategroy) / 2) / Math.sqrt((nSelection * nCategroy * (nSelection + nCategroy + 1)) / 12);  // without tie correction: see https://en.wikipedia.org/wiki/Mann%E2%80%93Whitney_U_test#Normal_approximation_and_tie_correction
    score = Math.abs(score);

    const availA = this.pValueAvailability(setA.length, setAValid.length);
    const availB = this.pValueAvailability(setB.length, setBValid.length);
    let pValue = -1;

    if (availA && availB) {
      if (score === 0) {
        pValue = 1;
      } else if (score === Infinity || score === -Infinity) {
        pValue = 0; // at the distributions very tail
      } else {
        pValue = jStat.jStat.ztest(score, 2);
        pValue = pValue >= 0 && pValue <= 1 ? pValue : -1;
      }
    }

    return measureResultObj(score, pValue, setAValid.length, setBValid.length);
  }
}


/**
 * MannWhitneyUTest === WilcoxonRankSumTest, therefore this class is just a rename
 */
@MeasureDecorator()
export class MannWhitneyUTest extends WilcoxonRankSumTest {

  constructor() {
    super();

    this.id = 'mwu_test';
    this.label = 'Mann-Whitney U Test';
    this.description = 'Tests if the two groups of values stem from the same distribution. It is also known as Wilcoxon rank-sum test.';
  }
}


@MeasureDecorator()
export class StudentTTest extends ASimilarityMeasure {

  constructor() {
    super();

    this.id = 'student_test';
    this.label = 'Student\'s t-Test';
    this.description = 'Compares the means of two groups (assuimg equal variances in their respective normal distributions).';
    this.visualization = new BoxPlot();

    this.type = Comparison.get(Type.NUMERICAL, Type.NUMERICAL);
    this.scope = SCOPE.SETS;
  }


  public async calc(setA: Array<any>, setB: Array<any>) {
    await sleep(0);
    const setAValid = setA.filter((value) => {return (value !== null && value !== undefined && !isNaN(value));});
    const nSelection = setAValid.length;
    const muSelection = d3.mean(setAValid);
    const varSelection = d3.variance(setAValid);

    // category
    const setBValid = setB.filter((value) => {return (value !== null && value !== undefined && !isNaN(value));});
    const nCategory = setBValid.length;
    const muCategory = d3.mean(setBValid);
    const varCategory = d3.variance(setBValid);

    const scoreP1 = Math.sqrt((nSelection * nCategory * (nSelection + nCategory - 2)) / (nSelection + nCategory));
    const scoreP2 = (muSelection - muCategory) / Math.sqrt((nSelection - 1) * varSelection + (nCategory - 1) * varCategory);
    const score = scoreP1 * scoreP2;

    const availA = this.pValueAvailability(setA.length, setAValid.length);
    const availB = this.pValueAvailability(setB.length, setBValid.length);
    let pValue = -1;

    if (availA && availB) {
      if (score === 0) {
        pValue = 1; // in the middle of the t-distribution
      } else if (score === Infinity || score === -Infinity) {
        pValue = 0; // at the distributions very tail
      } else {
        pValue = jStat.jStat.ttest(score, nCategory + nSelection, 2);
        pValue = pValue >= 0 && pValue <= 1 ? pValue : -1;
      }
    }

    return measureResultObj(score, pValue, setAValid.length, setBValid.length);
  }
}


@MeasureDecorator()
export class SpearmanCorrelation extends ASimilarityMeasure {

  constructor() {
    super();

    this.id = 'spearmanCor';
    this.label = 'Spearman\'s Rank Correlation Coefficient';
    this.description = 'The Spearman\'s rank correlation coefficient is a nonparametic measure for statistical dependence between rankings of two sets. ' +
      'The p-value describes the probability that the Spearmann correlation between the two sets happend by chance, for the null hypothesis of a Spearmann correlation of 0 (no correlation).';
    this.visualization = new ScatterPlot();

    this.type = Comparison.get(Type.NUMERICAL, Type.NUMERICAL);
    this.scope = SCOPE.ATTRIBUTES;
  }


  public async calc(set1: Array<any>, set2: Array<any>) {
    // calculation: https://www.statisticshowto.datasciencecentral.com/spearman-rank-correlation-definition-calculate/
    await sleep(0);

    if (set1.length !== set2.length) {
      throw Error('Value Pairs are compared, therefore the array sizes have to be equal.');
    }

    const points = [];
    for (let i = 0; i < set1.length; i++) {
      points.push({
        x: set1[i],
        y: set2[i]
      });
    }

    const validPoints = points.filter((item) => {
      let valid = true;
      // x
      if ((item.x === undefined) || (item.x === null) || (Number.isNaN(item.x))) {
        valid = false;
      }

      // y
      if ((item.y === undefined) || (item.y === null) || (Number.isNaN(item.y))) {
        valid = false;
      }
      return valid;
    });

    const n = validPoints.length;

    // http://jstat.github.io/all.html#corrcoeff
    let spearmanCorr = jStat.jStat.spearmancoeff(validPoints.map((item) => item.x), validPoints.map((item) => item.y));
    // sanitize corelation (jstat returns 1.0000000000000002 for perfect correlation)
    if (Math.abs(spearmanCorr) > 1) {
      spearmanCorr = Math.round(spearmanCorr); // --> to -1 or 1
    }
    // console.log('spearman rho', spearmanCorr);

    const avail = this.pValueAvailability(points.length, validPoints.length);
    let pValue = -1;

    // calc p-value (Recommended for n >= 19)
    // https://ncss-wpengine.netdna-ssl.com/wp-content/themes/ncss/pdf/Procedures/PASS/Spearmans_Rank_Correlation_Tests-Simulation.pdf
    // http://janda.org/c10/Lectures/topic06/L24-significanceR.htm
    // https://en.wikipedia.org/wiki/Spearman%27s_rank_correlation_coefficient#Determining_significance
    // https://stats.stackexchange.com/a/22821/194427
    if (avail) {
      const df = n - 2; // n- 2 = degrees of freedom
      const tValue = (spearmanCorr * Math.sqrt(df)) / Math.sqrt(1 - spearmanCorr * spearmanCorr); // if correlation = 1 --> tValue = infinity (+/-) --> p = 1

      if (tValue === 0) {
        pValue = 1; // in the middle of the t-distribution
      } else if (tValue === Infinity || tValue === -Infinity) {
        pValue = 0; // at the distributions very tail
      } else {
        pValue = jStat.jStat.ttest(tValue, df, 2);
        pValue = pValue >= 0 && pValue <= 1 ? pValue : -1;
      }
    }

    return measureResultObj(spearmanCorr, pValue, validPoints.length, validPoints.length); // async function --> returns promise
  }

  protected pValueAvailability(original: number, valid: number, threshold = 0.1): boolean {
    // (Determining the significance via t-distribution is recommended for n >= 19), source: https://ncss-wpengine.netdna-ssl.com/wp-content/themes/ncss/pdf/Procedures/PASS/Spearmans_Rank_Correlation_Tests-Simulation.pdf
    return valid >= 19 && super.pValueAvailability(original, valid, threshold);
  }
}


@MeasureDecorator()
export class PearsonCorrelation extends ASimilarityMeasure {

  constructor() {
    super();

    this.id = 'pearsonCor';
    this.label = 'Pearson Correlation Coefficient';
    this.description = 'The Pearson correlation coefficient is a measure for the linear correlation between two data sets. ' +
      'The p-value describes the probability that the Pearson correlation between the two sets happend by chance, for the null hypothesis of a Pearson correlation of 0 (no correlation).';
    this.visualization = new ScatterPlot();

    this.type = Comparison.get(Type.NUMERICAL, Type.NUMERICAL);
    this.scope = SCOPE.ATTRIBUTES;
  }


  public async calc(set1: Array<any>, set2: Array<any>) {
    await sleep(0);

    if (set1.length !== set2.length) {
      throw Error('Value Pairs are compared, therefore the array sizes have to be equal.');
    }
    const points = [];
    for (let i = 0; i < set1.length; i++) {
      points.push({
        x: set1[i],
        y: set2[i]
      });
    }

    const validPoints = points.filter((item) => {
      let valid = true;
      // x
      if ((item.x === undefined) || (item.x === null) || (Number.isNaN(item.x))) {
        valid = false;
      }

      // y
      if ((item.y === undefined) || (item.y === null) || (Number.isNaN(item.y))) {
        valid = false;
      }
      return valid;
    });

    const n = validPoints.length;

    // http://jstat.github.io/all.html#corrcoeff
    const seqX = jStat.jStat.seq(validPoints.map((item) => item.x));
    const seqY = jStat.jStat.seq(validPoints.map((item) => item.y));

    const pearsonCorr = jStat.jStat.corrcoeff(seqX, seqY);


    const avail = this.pValueAvailability(points.length, validPoints.length);
    let pValue = -1;

    // calc p-value
    if (avail) {
      const tValue = (pearsonCorr * Math.sqrt(n - 2)) / Math.sqrt(1 - pearsonCorr * pearsonCorr);

      if (tValue === 0) {
        pValue = 1; // in the middle of the t-distribution
      } else if (tValue === Infinity || tValue === -Infinity) {
        pValue = 0; // at the distributions very tail
      } else {
        pValue = jStat.jStat.ttest(tValue, n, 2);
        pValue = pValue >= 0 && pValue <= 1 ? pValue : -1;
      }
    }

    return measureResultObj(pearsonCorr, pValue, validPoints.length, validPoints.length); // async function --> returns promise
  }
}


//   _____       _______            _   _ _    _ __  __
//  / ____|   /\|__   __|          | \ | | |  | |  \/  |
// | |       /  \  | |     ______  |  \| | |  | | \  / |
// | |      / /\ \ | |    |______| | . ` | |  | | |\/| |
// | |____ / ____ \| |             | |\  | |__| | |  | |
//  \_____/_/    \_\_|             |_| \_|\____/|_|  |_|
// =================================================================
// =================================================================


@MeasureDecorator()
export class EnrichmentScore extends ASimilarityMeasure {

  constructor() {
    super();

    this.id = 'enrichment';
    this.label = 'Enrichment Score';
    this.description = 'The enrichment score is calculated for every category and tests if any category\'s values are concentrated in a certain range.';

    this.visualization = new LineChart();

    this.type = Comparison.get(Type.NUMERICAL, Type.CATEGORICAL);
    this.scope = SCOPE.ATTRIBUTES;
  }

  isArrayOfNumbers(arr: any): arr is number[] {
    if (Array.isArray(arr)) {
      return arr.every((item) => item === null || typeof item === 'number' || isNaN(item));
    }
    return false;
  }


  public async calc(set1: Array<any>, set2: Array<any>) {
    await sleep(0);

    if (set1.length !== set2.length) {
      throw Error('Value Pairs are compared, therefore the array sizes have to be equal.');
    }

    // const now = new Date();
    // const id = `${now.getMinutes()}${now.getSeconds()}${now.getMilliseconds()}`;
    // console.groupCollapsed('enrichment-'+id);
    // console.time('enrichment-'+id+'-time');

    let numericSet: number[];
    let categorySet: string[];
    let categories: string[];

    // define number and category sets

    if (this.isArrayOfNumbers(set1)) {
      // Categories are in set2
      numericSet = set1;
      categorySet = set2;
      categories = set2.filter((item, index, self) => self.indexOf(item) === index); // get destinct values
    } else if (this.isArrayOfNumbers(set2)) {
      // Categories are in set1
      numericSet = set2 as any[];
      categorySet = set1;
      categories = set1.filter((item, index, self) => self.indexOf(item) === index);
    } else {
      // neither is a set of numbers
      throw new Error('Neither of the sets contains numbers. Cant calcute enrichment score.');
    }

    let overallScore = 0;
    let properties = [];
    let p = -1;
    let validCombinedSet = null;

    // only calculate if more than 1 category exists
    if (categories.length > 1) {

      // combine both sets
      const combinedSet = [];
      for (let i = 0; i < set1.length; i++) {
        combinedSet.push({
          category: categorySet[i],
          value: numericSet[i]
        });
      }

      validCombinedSet = combinedSet.filter((item) => {return (item.value !== undefined) && (item.value !== null) && (!Number.isNaN(item.value));});
      // sort the combined set
      validCombinedSet.sort((a, b) => {return a.value - b.value;});

      // console.log('combinedSet: ',combinedSet);
      // console.log('validCombinedSet: ',validCombinedSet);
      // define category sets
      const propertyCategories = [];
      for (const currCategory of categories) {
        const numCategory = validCombinedSet.filter((item) => {return item.category === currCategory;}).length;
        propertyCategories.push({
          name: currCategory,
          amount: numCategory
        });
      }

      const enrichmentScoreCategories = [];
      for (const propertyCategory of propertyCategories) {
        const currCategory = propertyCategory.name;
        const amountCategory = propertyCategory.amount;
        enrichmentScoreCategories.push(this.calcEnrichmentScoreCategory(validCombinedSet, currCategory, amountCategory));
      }


      // console.log('enrichmentScoreCategories.length: ',enrichmentScoreCategories.length);
      for (const esCategory of enrichmentScoreCategories) {
        const score = esCategory.enrichmentScore;
        overallScore = Math.abs(score) > Math.abs(overallScore) ? score : overallScore;
        // console.log('overallScore-loop: ',{score,overallScore});
      }

      // console.log('enrichmentScoreCategories: ',enrichmentScoreCategories);
      // console.log('overallScore: ',overallScore);

      // console.log('sumCategories: ', sumCategories);
      // console.timeEnd('enrichment-'+id+'-time');
      // console.groupEnd();

      const avail = this.pValueAvailability(combinedSet.length, validCombinedSet.length);

      // calc p-value
      properties = await this.calcPValuePermutation(numericSet, categorySet, enrichmentScoreCategories);
      p = Math.min(...properties.map((item) => (item.pvalue)));

      p = avail ? p : -1;

    }
    const calculatedLength = validCombinedSet === null ? set1.length : validCombinedSet.length;
    return measureResultObj(overallScore, p, calculatedLength, calculatedLength, properties); // async function --> returns promise
  }

  async calcPValuePermutation(numericSet: Array<any>, categorySet: Array<any>, actualScores: Array<any>): Promise<Array<{category: string, pvalue: number}>> {
    return new EnrichmentRandomizationWorker().calculate({setNumber: numericSet, setCategory: categorySet, actualScores});
  }

  // function to calculate enrichment score for one category
  calcEnrichmentScoreCategory(setCombined: Array<any>, currCategory: string, amountCategory: number): {
    category: string,
    enrichmentScore: number
  } {

    const propertiesCategory = {
      category: currCategory,
      values: [],
      enrichmentScore: 0
    };

    const amountItems = setCombined.length;
    const termPlus = Math.sqrt((amountItems - amountCategory) / amountCategory);
    const termMinus = Math.sqrt(amountCategory / (amountItems - amountCategory));
    let currValue = 0;

    // go through all items
    for (const i of setCombined.keys()) {
      if (setCombined[i].category === currCategory) {
        currValue = currValue + termPlus;
      } else {
        currValue = currValue - termMinus;
      }

      propertiesCategory.values.push(currValue);
    }


    const min = Math.min(...propertiesCategory.values);
    const max = Math.max(...propertiesCategory.values);

    const score = Math.abs(max) > Math.abs(min) ? max : min;
    propertiesCategory.enrichmentScore = score;
    delete propertiesCategory.values;

    return propertiesCategory;
  }
}

// ===========================================================================================
// ===========================================================================================
// ===========================================================================================


interface IRankObJ {
  set: string;
  value: any;
  rank?: number;
}
