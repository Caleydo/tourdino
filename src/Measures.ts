import {IAttributeDesc, Comparison, SCOPE, ISimilarityMeasure, IMeasureOptions, Type, IMeasureResult, IMeasureVisualization} from './interfaces';
import {defaultMeasureOptions} from './config';
import {ParallelSets} from './measure_visualization/ParallelSets';
import {BoxPlot} from './measure_visualization/BoxPlot';
import {ScatterPlot} from './measure_visualization/ScatterPlot';
import {intersection, binom2, measureResultObj, sleep, binom, getModulo} from './util';
import * as d3 from 'd3';
import {jStat} from 'jStat';
import { LineChart } from './measure_visualization/LineChart';



export class Workers {
  private static workers = new Array<Worker>();

  public static register(worker: Worker) {
    console.log('register worker #'+ (1 + Workers.workers.length), worker);
    Workers.workers.push(worker);
  }

  public static deregister(worker: Worker) {
    console.log('de-register worker', worker);
    console.log('is in array?', Workers.workers.includes(worker));
  }

  public static terminateAll() {
    for (const worker of Workers.workers) {
      worker.terminate();
    }

    Workers.workers = new Array<Worker>();
  }
}

export const registeredClasses = new Array<ASimilarityMeasure>();
export function MeasureDecorator() {
  return function (target: {new(): ASimilarityMeasure}) { // only instantiable subtypes of ASimilarityClass can be passed.
    registeredClasses.push(new target()); //TODO apply options
  };
}


export abstract class ASimilarityMeasure implements ISimilarityMeasure {

  public id: string;
  public label: string;
  public description: string;
  public visualization: IMeasureVisualization;

  public type: Comparison;
  public scope: SCOPE;

  protected readonly options: IMeasureOptions;

  constructor(options = defaultMeasureOptions()) {
    this.options = options;
  }

  public abstract calc(setA: Array<any>, setB: Array<any>, allData: Array<any>): Promise<IMeasureResult>;
}

/**
 * Also known as the Tanimoto distance metric.
 */
@MeasureDecorator()
export class JaccardSimilarity extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = 'jaccard';
    this.label = 'Jaccard Index';
    this.description = 'The size of the intersection divided by the size of the union of the sample sets.';
    this.visualization = new ParallelSets();

    this.type = Comparison.get(Type.CATEGORICAL, Type.CATEGORICAL);
    this.scope = SCOPE.SETS;
  }


  public async calc(setA: Array<any>, setB: Array<any>, allData: Array<any>) {
    const {intersection: intersect, arr1: filteredsetA, arr2: filteredsetB} = intersection(setA, setB);
    let score = intersect.length / (intersect.length + filteredsetA.length + filteredsetB.length);
    score = score || 0;

    const p = await this.calcP_Randomize(setA, setB, allData);
    return measureResultObj(score, p);
  }

  async calcP_Randomize(setA: Array<any>, setB: Array<any>, allData: Array<any>): Promise<number> {
    const p: Promise<number> = new Promise((resolve, reject) => {
      const myWorker: Worker = new (<any>require('worker-loader?name=JaccardRandom.js!./Workers/JaccardRandom'))();
      Workers.register(myWorker);
      myWorker.onmessage = (event) => Number.isNaN(event.data) ? reject() : resolve(event.data);
      myWorker.postMessage({setA, setB, allData});
    });

    return p;
  }


  /**
   * As described by Real & Vargas in "The probabilistic basis of Jaccard's index of similarity"
   * @param unionSize
   * @param intersectionSize
   */
  //e.g. const p = await this.calcP_RealVargas(filteredsetA.length + filteredsetB.length + intersect.length, intersect.length);
  async calcP_RealVargas(unionSize: number, intersectionSize: number): Promise<number> {
    const p: Promise<number> = new Promise((resolve, reject) => {
      const myWorker: Worker = new (<any>require('worker-loader?name=JaccardPermutator.js!./Workers/JaccardProbabilistic'))();
      myWorker.onmessage = (event) => Number.isNaN(event.data) ? reject() : resolve(event.data);
      myWorker.postMessage({union: unionSize, intersection: intersectionSize});
    });

    return p;
  }
}


@MeasureDecorator()
export class OverlapSimilarity extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = 'overlap';
    this.label = 'Overlap Coefficient'; //Szymkiewicz-Simpson
    this.description = 'The size of the intersection divided by the size of the smaller set.';
    this.visualization = new ParallelSets();

    this.type = Comparison.get(Type.CATEGORICAL, Type.CATEGORICAL);
    this.scope = SCOPE.SETS;
  }


  public async calc(setA: Array<any>, setB: Array<any>) {
    await sleep(0);
    const {intersection: intersect} = intersection(setA, setB);
    let score = intersect.length /  Math.min(setA.length, setB.length);

    score = score || 0;

    return measureResultObj(score, Number.NaN);
  }
}


@MeasureDecorator()
export class StudentTTest extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = 'student_test';
    this.label = 'Student\'s t-Test';
    this.description = 'Compares the means of two groups (assuimg equal variances in their respective normal distributions).';
    this.visualization = new BoxPlot();

    this.type = Comparison.get(Type.NUMERICAL, Type.NUMERICAL);
    this.scope = SCOPE.SETS;
  }


  public async calc(setA: Array<any>, setB: Array<any>) {
    await sleep(0);
    const setAValid = setA.filter((value) => {return (value !== null && value !== undefined);});
    const nSelection = setAValid.length;
    const muSelection = d3.mean(setAValid);
    const varSelection = d3.variance(setAValid);

    //category
    const setBValid = setB.filter((value) => {return (value !== null && value !== undefined);});
    const nCategory = setBValid.length;
    const muCategory = d3.mean(setBValid);
    const varCategory = d3.variance(setBValid);

    // console.log('Input: ',{set : {setA,setB},
    //                        ValidSet : {setAValid,setBValid}});

    const scoreP1 = Math.sqrt((nSelection * nCategory * (nSelection + nCategory - 2)) / (nSelection + nCategory));
    const scoreP2 = (muSelection - muCategory) / Math.sqrt((nSelection - 1) * varSelection + (nCategory - 1) * varCategory);
    let score = scoreP1 * scoreP2;
    let scoreForPCalc = score;

    const intersect = intersection(setAValid,setBValid);
    if ((intersect.intersection.length === setAValid.length) && (setAValid.length === setBValid.length)) {
      scoreForPCalc = 0.000001;
    }

    // console.log('Result: ', {selction: {muSelection,varSelection},
    //                         category: {muCategory,varCategory},
    //                         scores: {scoreP1,scoreP2,score},
    //                         intersectSets: {intersect}
    //                         });
    // console.log('T-Test: ',score, '| df: ',nCategory + nSelection-2);
    // console.log('-------');

    let pValue = jStat.jStat.ttest(scoreForPCalc, nCategory + nSelection, 2);

    score = score || 0;
    pValue = pValue || 0;

    return measureResultObj(score,pValue);
  }
}

interface IRankObJ {
 set: string;
 value: any;
 rank?: number;
}

@MeasureDecorator()
export class WilcoxonRankSumTest extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = 'wilcoxon-rank-sum_test';
    this.label = 'Wilcoxon Rank-Sum Test';
    this.description = 'Compares two samples of homogenity (non-parametric test).';
    this.visualization = new BoxPlot();

    this.type = Comparison.get(Type.NUMERICAL, Type.NUMERICAL);
    this.scope = SCOPE.SETS;
  }



  public async calc(setA: Array<any>, setB: Array<any>) {
    await sleep(0);
    const setAValid = setA.filter((value) => {return (value !== null && value !== undefined);});
    const selectionRankObj: IRankObJ[] = setAValid.map((a) => {
        return {
          set: 'selection',
          value: a
        };
      });

      const setBValid: IRankObJ[] = setB.filter((value) => {return (value !== null && value !== undefined);});
      const categoryRankObj = setBValid.map((b) => {
        return {
          set: 'category',
          value: b
        };
      });

    // console.log('Input: ',{set : {setA,setB},
    //                        ValidSet : {setAValid,setBValid},
    //                        RankObj: {selectionRankObj,categoryRankObj}});

    //create array with all values and their affiliation
    const collectiveRankSet = selectionRankObj.concat(categoryRankObj);
    //sort the set from low to high
    collectiveRankSet.sort((a,b) => { return a.value - b.value;});

    // assing rank
    // array for the idecies of the redion with the same values
    let regionRange = [];
    // flag to indicate a two or more values are equal
    let region = false;
    for (let i=0;i< collectiveRankSet.length; i++) {
      // check if previous and current values are equal
      if (i>=1 && collectiveRankSet[i-1].value === collectiveRankSet[i].value) {
        // if previous === current
        // set region flag = ture and save indicies in regionRange array
        region = true;
        regionRange.push(i-1);
        regionRange.push(i);
      }

      // check if a region exists (flag = true) and the previous != current values
      if (region && collectiveRankSet[i-1].value !== collectiveRankSet[i].value && regionRange.length > 1) {
        // region = true and previous != current -> region over
        // remove duplicate idex values
        const uniqueRegionRange = regionRange.filter((v,i) => {return regionRange.indexOf(v) === i;});
        // calculate rank for the region
        const regionRank = (uniqueRegionRange.reduce((a, b) => a + b, 0) + uniqueRegionRange.length) / uniqueRegionRange.length;

        //cahnge the ranks in the privous items
        for (const regionRange of uniqueRegionRange) {
          collectiveRankSet[regionRange].rank = regionRank;
        }
        regionRange = [];
        region = false;
      }

      // set rank = index + 1
      collectiveRankSet[i].rank = i+1;

    }

    // check if the last values where in a region
    if (region && regionRange.length > 1) {
      // region = true and previous != current -> region over
      // remove duplicate idex values
      const uniqueRegionRange = regionRange.filter((v,i) => {return regionRange.indexOf(v) === i;});
      // calculate rank for the region
      const regionRank = (uniqueRegionRange.reduce((a, b) => a + b, 0) + uniqueRegionRange.length) / uniqueRegionRange.length;

      //cahnge the ranks in the privous items
      for (const regionRange of uniqueRegionRange) {
        collectiveRankSet[regionRange].rank = regionRank;
      }
      regionRange = [];
      region = false;
    }

    // console.log('collectiveRankSet: ',collectiveRankSet);

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
    const selectionU = nSelection * nCategroy + ( nSelection*(nSelection+1)/2) - selectionRankSum;
    const categoryU = nSelection * nCategroy + ( nCategroy*(nCategroy+1)/2) - categoryRankSum;

    const minU = Math.min(selectionU,categoryU);

    // calculate z-value -> for big sample sizes each more than 10 use normal distribution (z-value)
    let zValue = (minU - (nSelection * nCategroy)/2) / Math.sqrt((nSelection * nCategroy * (nSelection + nCategroy +1))/12);
    // console.log('minU: ',minU);
    // console.log('zValue: ',zValue);
    // console.log('Us + Uc: ',selectionU+categoryU,'| n1*n2: ',nSelection*nCategroy);

    // console.log('Results: ',{rankSum: {selectionRankSum,categoryRankSum},
    //                          U_statistic: {selectionU,categoryU},
    //                          minU: {minU},
    //                          z_value: {zValue}});
    // console.log('-------');
    let score = zValue;

    if (zValue === 0) {
      zValue = 0.000001;
    }

    let pValue = jStat.jStat.ztest(zValue, 2);

    score = score || 0;
    pValue = pValue || 0;

    return measureResultObj(score,pValue);
  }
}


/**
 * MannWhitneyUTest === WilcoxonRankSumTest, therefore this class is just a rename
 */
@MeasureDecorator()
export class MannWhitneyUTest extends WilcoxonRankSumTest {

  constructor(options?: IMeasureOptions) {
    super(options);

    this.id = 'mwu_test';
    this.label = 'Mann-Whitney U Test';
  }
}


/**
 * Also known as the Tanimoto distance metric.
 */
@MeasureDecorator()
export class AdjustedRandIndex extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = 'adjrand';
    this.label = 'Adjusted Rand Index';
    this.description = 'Is a measure for the similarity between two data sets.';
    this.visualization = new ParallelSets();

    this.type = Comparison.get(Type.CATEGORICAL, Type.CATEGORICAL);
    this.scope = SCOPE.ATTRIBUTES;
  }


  public async calc(arr1: Array<any>, arr2: Array<any>) {
    await sleep(0);

    if (arr1.length !== arr2.length) {
      throw Error('Value Pairs are compared, therefore the array sizes have to be equal.');
    }

    // deduce catgeories from strings, e.g.: ['Cat1', 'Cat3', 'Cat2', 'Cat2', 'Cat1', 'Cat3']
    const A = [...new Set(arr1)]; // The set removes duplicates, and the conversion to array gives the content an order
    const B = [...new Set(arr2)];

    // and build a contingency table:
    //        A.1   A.2   A.3
    //  B.1   n11   n12   n13
    //  B.2   n21   n22   n23
    //  B.3   n31   n32   n33
    const table = new Array(B.length).fill([]); // rows
    table.forEach((row, i) => table[i] = new Array(A.length).fill(0)); // columns

    for (const i of arr1.keys()) { // iterate over indices
      const ai = A.indexOf(arr1[i]);
      const bi = B.indexOf(arr2[i]);
      table[bi][ai] += 1; // count the co-occurences
    }

    // https://web.archive.org/web/20171205003116/https://davetang.org/muse/2017/09/21/adjusted-rand-index/
    const rowsSums = table.map((row) => row.reduce((sum, curr) => sum += curr)); // reduce each row to the sum
    const colSums = A.map((cat, i) => table.reduce((sum, curr) => sum += curr[i], 0)); // reduce each all rows to the sum of column i

    //const cellBinomSum = table.reduce((rowsum, row) => rowsum + row.reduce((colsum, col) => colsum += binom2(col), 0), 0);
    const cellBinomSum = table.reduce((sum, row) => sum + row.reduce((colsum, col) => colsum += binom2(col), 0), 0); // set accumulator to zero!

    //use 0 as initial value, otherwise reduce takes the first element as initial value and the binom coefficient is nt calculated for it!
    const rowBinomSum = rowsSums.reduce((sum, curr) => sum += binom2(curr), 0);
    const colBinomSum = colSums.reduce((sum, curr) => sum += binom2(curr), 0);

    const index = cellBinomSum;
    const expectedIndex = (rowBinomSum * colBinomSum) / binom2(arr1.length);
    const maxIndex = 0.5 * (rowBinomSum + colBinomSum);

    // await sleep(5000); //test asynchronous behaviour
    // calc

    if (0 === (maxIndex - expectedIndex)) {
      // division by zero --> adj_index = NaN
      return measureResultObj(1, Number.NaN, this.id);
    }
    const adjIndex = (index - expectedIndex) / (maxIndex - expectedIndex);

    const p = await this.calcP_Randomize(arr1, arr2);
    return measureResultObj(adjIndex, p, this.id); // async function --> returns promise
  }

  async calcP_Randomize(arr1: any[], arr2: any[]): Promise<number> {
    const p: Promise<number> = new Promise((resolve, reject) => {
      const myWorker: Worker = new (<any>require('worker-loader?name=AdjRandRandom.js!./Workers/AdjRandRandom'))();
      Workers.register(myWorker);
      myWorker.onmessage = (event) => Number.isNaN(event.data) ? reject() : resolve(event.data);
      myWorker.postMessage({setA: arr1, setB: arr2});
    });

    return p;
  }


}

@MeasureDecorator()
export class SpearmanCorrelation extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = 'spearmanCor';
    this.label = 'Spearman\'s Rank Correlation Coefficient';
    this.description = 'The Spearman\'s rank correlation coefficient is a nonparametic measure for statistical dependence between rankings of two sets. '+
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
    for (let i=0; i<set1.length; i++) {
      points.push({x: set1[i],
                   y: set2[i]});
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
    const spearmanCorr = jStat.jStat.spearmancoeff(validPoints.map((item) => item.x), validPoints.map((item) => item.y));
    // console.log('spearman rho', spearmanCorr)

    // calc p-value
    let tValue = (spearmanCorr * Math.sqrt(n-2)) / Math.sqrt(1 - spearmanCorr * spearmanCorr);

    if (tValue === 0) {
      tValue = 0.000001;
    }

    // console.log(tValue, n)
    let pValue = jStat.jStat.ttest(tValue, n, 2);
    // console.log('spear p val', pValue)
    pValue = pValue >= 0 && pValue <= 1 ? pValue : Number.NaN;

    return measureResultObj(spearmanCorr, pValue); // async function --> returns promise
  }
}

@MeasureDecorator()
export class PearsonCorrelation extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = 'pearsonCor';
    this.label = 'Pearson Correlation Coefficient';
    this.description = 'The Pearson correlation coefficient is a measure for the linear correlation between two data sets. '+
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
    for (let i=0; i<set1.length; i++) {
      points.push({x: set1[i],
                   y: set2[i]});
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

    const pearsonCorr = jStat.jStat.corrcoeff(seqX,seqY);


    // calc p-value
    let tValue = (pearsonCorr * Math.sqrt(n-2)) / Math.sqrt(1 - pearsonCorr * pearsonCorr);

    if (tValue === 0) {
      tValue = 0.000001;
    }

    let pValue = jStat.jStat.ttest(tValue, n, 2);
    pValue = pValue || 0;

    return measureResultObj(pearsonCorr,pValue); // async function --> returns promise
  }
}

@MeasureDecorator()
export class EnrichmentScore extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = 'enrichment';
    this.label = 'Enrichment Score';
    this.description = 'The enrichment score determines if a set is differentially expressed in different categories.';
    this.visualization = new LineChart();

    this.type = Comparison.get(Type.NUMERICAL, Type.CATEGORICAL);
    this.scope = SCOPE.ATTRIBUTES;
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

    let numericSet;
    let categorySet;
    let categories;
    // get destinct values
    const uniqueSet1 = set1.filter((item, index, self) => self.indexOf(item) === index);
    const uniqueSet2 = set2.filter((item, index, self) => self.indexOf(item) === index);

    // define number and category sets

    if ((typeof set1[0] === 'number') && (typeof set2[0] === 'string')) {
      numericSet = set1;
      categorySet = set2;
      categories = uniqueSet2;
    } else if ((typeof set1[0] === 'string') && (typeof set2[0] === 'number')) {
      categorySet = set1;
      categories = uniqueSet1;
      numericSet = set2;
    } else if (uniqueSet1.length < uniqueSet2.length) {
      if(isNaN(Number(set1[0]))) { // first element of set 1 is NOT a number
        categorySet = set1;
        categories = uniqueSet1;
        numericSet = set2;
      } else { // first element of set 1 is a number
        categorySet = set2;
        categories = uniqueSet2;
        numericSet = set1;
      }
    } else {
      if (isNaN(Number(set2[0]))) { // first element of set 2 is NOT a number
        categorySet = set2;
        categories = uniqueSet2;
        numericSet = set1;
      } else { // first element of set 2 is a number
        categorySet = set1;
        categories = uniqueSet1;
        numericSet = set2;
      }
    }

    // combine both sets
    const combinedSet = [];
    for (let i=0; i<set1.length; i++) {
      combinedSet.push({
        category: categorySet[i],
        value: numericSet[i]
      });
    }

    const validCombinedSet = combinedSet.filter((item) => { return (item.value !== undefined) && (item.value !== null) && (!Number.isNaN(item.value)); });
    // sort the combined set
    validCombinedSet.sort((a,b) => { return b.value - a.value;});

    // console.log('combinedSet: ',combinedSet);
    // console.log('validCombinedSet: ',validCombinedSet);
    //define category sets
    const propertyCategories = [];
    for (const currCategory of categories) {
      const numCategory = validCombinedSet.filter((item) => { return item.category === currCategory; }).length;
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

    let overallScore = 0;
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

    const properties = await this.calcPValuePermutation(numericSet, categorySet,enrichmentScoreCategories);
    const p = Math.min(...properties.map((item) => (item.pvalue)));

    return measureResultObj(overallScore,p,properties); // async function --> returns promise
  }

  async calcPValuePermutation(numericSet: Array<any>, categorySet: Array<any>, actualScores: Array<any>): Promise<Array<{category: string,pvalue: number}>> {
    const properties: Promise<Array<{category: string,pvalue: number}>> = new Promise((resolve, reject) => {
      const myWorker: Worker = new (<any>require('worker-loader?name=EnrichmentScorePermutation.js!./Workers/EnrichmentScorePermutation'))();
      Workers.register(myWorker);
      myWorker.onmessage = function (event) { return event.data === null ? reject() : resolve(event.data);};
      myWorker.postMessage({setNumber: numericSet, setCategory: categorySet, actualScores});
    });
    return properties;
  }

  // function to calculate enrichment score for one category
  calcEnrichmentScoreCategory(setCombined: Array<any>, currCategory: string, amountCategory: number): {
    category: string,
    enrichmentScore: number} {

    const propertiesCategory = {
      category: currCategory,
      values: [],
      enrichmentScore: 0};

    const amountItems = setCombined.length;
    const termPlus = Math.sqrt((amountItems-amountCategory)/amountCategory);
    const termMinus = Math.sqrt(amountCategory/(amountItems-amountCategory));
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

