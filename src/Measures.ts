import {IAttributeDesc, Comparison, SCOPE, ISimilarityMeasure, IMeasureOptions, Type} from './interfaces';
import {defaultMeasureOptions} from './config';
import {intersection, binom2} from './util'
import * as d3 from 'd3';
import {jStat} from 'jStat';


export const registeredClasses = new Array<ASimilarityMeasure>();
export function MeasureDecorator() {
  return function (target: {new(): ASimilarityMeasure}) { //only instantiable subtypes of ASimilarityClass can be passed.
    registeredClasses.push(new target()); //TODO apply options
  };
}


export abstract class ASimilarityMeasure implements ISimilarityMeasure {
  
  public id: string;
  public label: string;
  public description: string;
  
  public type: Comparison;
  public scope: SCOPE;
  
  protected readonly options: IMeasureOptions;
  
  constructor(options = defaultMeasureOptions()) {
    this.options = options;
  }  

  public abstract calc(setA: Array<any>, setB: Array<any>);
}

/**
 * Also known as the Tanimoto distance metric. 
 */
@MeasureDecorator()
export class JaccardSimilarity extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = "jaccard"
    this.label = "Jaccard Index"
    this.description = "The size of the intersection divided by the size of the union of the sample sets."

    this.type = Comparison.get(Type.CATEGORICAL, Type.CATEGORICAL);
    this.scope = SCOPE.SETS;
  }


  public calc(setA: Array<any>, setB: Array<any>) {
    const {intersection: intersect, arr1: filteredsetA, arr2: filteredsetB} = intersection(setA, setB);
    const score = intersect.length / (intersect.length + filteredsetA.length + filteredsetB.length);
    
    return score || 0;
  }
}


@MeasureDecorator()
export class OverlapSimilarity extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = "overlap"
    this.label = "Overlap coefficient" //Szymkiewicz-Simpson
    this.description = "The size of the intersection divided by the size of the smaller set."

    this.type = Comparison.get(Type.CATEGORICAL, Type.CATEGORICAL);
    this.scope = SCOPE.SETS;
  }


  calc(setA: Array<any>, setB: Array<any>) {
    const {intersection: intersect} = intersection(setA, setB);
    const score = intersect.length /  Math.min(setA.length, setB.length);

    return score || 0;
  }
}


@MeasureDecorator()
export class StudentTTest extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = 'student_test';
    this.label = "Student's t-test";
    this.description = "Compares the means of two samples (assuimg equal variances in their respective normal distributions).";

    this.type = Comparison.get(Type.CATEGORICAL, Type.NUMERICAL);
    this.scope = SCOPE.SETS;
  }


  calc(setA: Array<any>, setB: Array<any>) {
    const setAValid = setA.filter((value) => {return (value !== null && value !== undefined);});
    const nSelection = setAValid.length;
    const muSelection = d3.mean(setAValid);
    const varSelection = d3.variance(setAValid);

    //category
    const setBValid = setB.filter((value) => {return (value !== null && value !== undefined);});
    const nCategory = setBValid.length;
    const muCategory = d3.mean(setBValid);
    const varCategory = d3.variance(setBValid);

    let scoreP1 = Math.sqrt((nSelection * nCategory * (nSelection + nCategory - 2)) / (nSelection + nCategory));
    let scoreP2 = (muSelection - muCategory) / Math.sqrt((nSelection - 1) * varSelection + (nCategory - 1) * varCategory);
    let score = scoreP1 * scoreP2;

    let intersect = intersection(setAValid,setBValid);
    if((intersect.intersection.length === setAValid.length) && (setAValid.length === setBValid.length))
    {
      score = 0.000001;
    }

    console.log('T-Test - t-score (own): ',score, '| df: ',nCategory + nSelection-2);

    return score ? jStat.jStat.ttest(score, nCategory + nSelection, 2) : 0;
  }
}


@MeasureDecorator()
export class WelchTTest extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = 'welch_test';
    this.label = "Welch's t-test";
    this.description = "Compares the means of two samples (normal distributed).";

    this.type = Comparison.get(Type.NUMERICAL, Type.NUMERICAL);
    this.scope = SCOPE.SETS;
  }


  calc(setA: Array<any>, setB: Array<any>) {
    return 1 - Math.random(); // ]0,1]
  }
}

@MeasureDecorator()
export class MannWhitneyUTest extends ASimilarityMeasure {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = 'mwu_test';
    this.label = "Mann-Whitney-U-Test";
    this.description = "Compares two samples of homogenity (non-parametric test)";

    this.type = Comparison.get(Type.CATEGORICAL, Type.NUMERICAL);
    this.scope = SCOPE.SETS;
  }


  calc(setA: Array<any>, setB: Array<any>) {
    let setAValid = setA.filter((value) => {return (value !== null && value !== undefined);});
    let selectionRankObj = setAValid.map((a) => { 
        let returnObj = {
          set: 'selection',
          value: a
        };
        return returnObj; 
      });

    let setBValid = setB.filter((value) => {return (value !== null && value !== undefined);});
    let categoryRankObj = setBValid.map((b) => { 
        let returnObj = {
          set: 'category',
          value: b
        };
        return returnObj; 
      });

    let collectiveRankSet = selectionRankObj.concat(categoryRankObj);
    //sort the set
    collectiveRankSet.sort((a,b) => { return a.value - b.value;});

    //assing rank 
    let regionRange = [];
    let region = false;
    for(let i=0;i< collectiveRankSet.length; i++)
    {
      if(i>=1 && collectiveRankSet[i-1].value === collectiveRankSet[i].value)
      {
        region = true;
        regionRange.push(i-1); 
        regionRange.push(i); 
      }

      if(region && collectiveRankSet[i-1].value !== collectiveRankSet[i].value && regionRange.length > 1)
      {
        let uniqueRegionRange = regionRange.filter((v,i) => {return regionRange.indexOf(v) === i;});
        let regionRank = (uniqueRegionRange.reduce((a, b) => a + b, 0) + uniqueRegionRange.length) / uniqueRegionRange.length;

        for(let r=0;r<uniqueRegionRange.length; r++)
        {
          collectiveRankSet[uniqueRegionRange[r]]['rank'] = regionRank;
        }
        regionRange = [];
        region = false;
      }

      collectiveRankSet[i]['rank'] = i+1;
      
    }

    if(region && regionRange.length > 1)
    {
      let uniqueRegionRange = regionRange.filter((v,i) => {return regionRange.indexOf(v) === i;});
      let regionRank = (uniqueRegionRange.reduce((a, b) => a + b, 0) + uniqueRegionRange.length) / uniqueRegionRange.length;

      for(let r=0;r<uniqueRegionRange.length; r++)
      {
        collectiveRankSet[uniqueRegionRange[r]]['rank'] = regionRank;
      }
      regionRange = [];
      region = false;
    }


    let selectionRanks = [];
    let categoryRanks = [];

    for(let i=0;i< collectiveRankSet.length; i++)
    { 
      if(collectiveRankSet[i].set === 'selection')
      {
        selectionRanks.push((collectiveRankSet[i] as any).rank);
      }else
      {
        categoryRanks.push((collectiveRankSet[i] as any).rank);
      }
    }

    let nSelection = selectionRanks.length;
    let selectionRankSum = selectionRanks.reduce((a, b) => a + b, 0);
    
    let nCategroy = categoryRanks.length;
    let categoryRankSum = categoryRanks.reduce((a, b) => a + b, 0);    



    // ----- alternative
    // let sBeforeC = 0;
    // let cBeforeS = 0;
    // let TTselectionRanks = [];
    // let TTcategoryRanks = [];
    // for(let i=0;i< collectiveRankSet.length; i++)
    // {
    //   if(collectiveRankSet[i].set === 'selection')
    //   { // selection
    //     TTcategoryRanks.push(cBeforeS);
    //     sBeforeC++;
    //   }else
    //   { // category
    //     TTselectionRanks.push(sBeforeC);
    //     cBeforeS++;
    //   }
    // }



    // console.log('collectiveRankSet: ',collectiveRankSet);
    let selectionU = nSelection * nCategroy + ( nSelection*(nSelection+1)/2) - selectionRankSum;
    let categoryU = nSelection * nCategroy + ( nCategroy*(nCategroy+1)/2) - categoryRankSum;


    // console.log('selectionU: ',selectionU,' | TTselectionRanks-score: ',TTselectionRanks.reduce((a, b) => a + b, 0),' -> array: ',TTselectionRanks);
    // console.log('categoryU: ',categoryU,' | TTcategoryRanks-score: ',TTcategoryRanks.reduce((a, b) => a + b, 0),' -> array: ',TTcategoryRanks);
    // console.log('sBeforeC: ',sBeforeC,' | nSelection: ',nSelection);
    // console.log('cBeforeS: ',cBeforeS,' | nCategroy: ',nCategroy);
    // let minU = Math.min(TTselectionRanks.reduce((a, b) => a + b, 0),TTcategoryRanks.reduce((a, b) => a + b, 0));


    let minU = Math.min(selectionU,categoryU);
    
    let zValue = (minU - (nSelection * nCategroy)/2) / Math.sqrt((nSelection * nCategroy * (nSelection + nCategroy +1))/12);
    // console.log('minU: ',minU);
    console.log('zValue: ',zValue);
    let intersect = intersection(setAValid,setBValid);
    if(zValue === 0)
    {
      zValue = 0.000001;
    }

    let score = zValue;

    return score ? jStat.jStat.ztest(score, 2) : 0;
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
    this.id = "adjrand"
    this.label = "Adjusted Rand Index"
    this.description = "blablabla"

    this.type = Comparison.get(Type.CATEGORICAL, Type.CATEGORICAL);
    this.scope = SCOPE.ATTRIBUTES;
  }


  public calc(arr1: Array<any>, arr2: Array<any>) {
    // deduce catgeories from strings, e.g.: ['Cat1', 'Cat3', 'Cat2', 'Cat2', 'Cat1', 'Cat3']
    // and build a contingency table:
    //        A.1   A.2   A.3
    //  B.1   n11   n12   n13
    //  B.2   n21   n22   n23
    //  B.3   n31   n32   n33

    if (arr1.length != arr2.length) {
      throw Error('Value Pairs are compared, therefore the array sizes have to be equal.');
    }

    const A = [...new Set(arr1)]; // The set removes duplicates, and the conversion to array gives the content an order
    const B = [...new Set(arr2)];

    const table = new Array(B.length).fill([]); // rows
    table.forEach((row, i) => table[i] = new Array(A.length).fill(0)) // columns

    for (let i of arr1.keys()) { // iterate over indices
      const Ai = A.indexOf(arr1[i]);
      const Bi = B.indexOf(arr2[i]);
      table[Bi][Ai] += 1; // count the co-occurences 
    }

    // https://web.archive.org/web/20171205003116/https://davetang.org/muse/2017/09/21/adjusted-rand-index/
    const rowsSums = table.map((row) => row.reduce((sum, curr) => sum += curr)); // reduce each row to the sum
    const colSums = A.map((cat, i) => table.reduce((sum, curr) => sum += curr[i], 0)); // reduce each all rows to the sum of column i

    //const cellBinomSum = table.reduce((rowsum, row) => rowsum + row.reduce((colsum, col) => colsum += binom2(col), 0), 0);
    const cellBinomSum = table.reduce((sum, row) => {
      return sum + row.reduce((colsum, col) => colsum += binom2(col), 0)
    }, 0); // set accumulator to zero!
    const rowBinomSum = rowsSums.reduce((sum, curr) => sum += binom2(curr));
    const colBinomSum = colSums.reduce((sum, curr) => sum += binom2(curr));

    const index = cellBinomSum;
    const expectedIndex = (rowBinomSum * colBinomSum) / binom2(arr1.length);
    const maxIndex = 0.5 * (rowBinomSum + colBinomSum);

    // calc 
    return (index - expectedIndex) / (maxIndex - expectedIndex);
  }
}