import {IAttributeDesc, Comparison, SCOPE, ISimilarityClass, ISetSimilarityClass, IMeasureOptions, Type} from './interfaces';
import {defaultMeasureOptions} from './config';
import {intersection} from './util'
import * as d3 from 'd3';
import {jStat} from 'jStat';


export const registeredClasses = new Array<ASimilarityClass>();
export function MeasureDecorator() {
  return function (target: {new(): ASimilarityClass}) { //only instantiable subtypes of ASimilarityClass can be passed.
    registeredClasses.push(new target()); //TODO apply options
  };
}


export abstract class ASimilarityClass implements ISimilarityClass {

  public id: string;
  public label: string;
  public description: string;

  public type: Comparison;
  public scope: SCOPE;

  protected readonly options: IMeasureOptions;

  constructor(options = defaultMeasureOptions()) {
    this.options = options;
  }

}

/**
 * Also known as the Tanimoto distance metric. 
 */
@MeasureDecorator()
export class JaccardSimilarity extends ASimilarityClass implements ISetSimilarityClass {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = "jaccard"
    this.label = "Jaccard Index"
    this.description = "The size of the intersection divided by the size of the union of the sample sets."

    this.type = Comparison.get(Type.CATEGORICAL, Type.CATEGORICAL);
    this.scope = SCOPE.SETS;
  }


  calc(setA: Array<any>, setB: Array<any>) {
    const {intersection: intersect, arr1: filteredsetA, arr2: filteredsetB} = intersection(setA, setB);
    const score = intersect.length / (intersect.length + filteredsetA.length + filteredsetB.length);
    
    return score || 0;
  }
}


@MeasureDecorator()
export class OverlapSimilarity extends ASimilarityClass implements ISetSimilarityClass {

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
export class StudentTTest extends ASimilarityClass implements ISetSimilarityClass {

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
export class WelchTTest extends ASimilarityClass implements ISetSimilarityClass {

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
export class MannWhitneyUTest extends ASimilarityClass implements ISetSimilarityClass {

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

    // console.log({TTselectionRanks,TTcategoryRanks});
    // let selectionUalternative = TTselectionRanks.reduce((a, b) => a + b, 0);
    // let categoryUalternative = TTcategoryRanks.reduce((a, b) => a + b, 0);
    
    // console.log('selectionU: ',selectionU,' | TTselectionRanks-U: ',selectionUalternative);
    // console.log('categoryU: ',categoryU,' | TTcategoryRanks-U: ',categoryUalternative);
    // console.log('sBeforeC: ',sBeforeC,' | nSelection: ',nSelection);
    // console.log('cBeforeS: ',cBeforeS,' | nCategroy: ',nCategroy);
    // let minUalternative = Math.min(selectionUalternative,categoryUalternative);
    // let zValuealternative = (minUalternative - (sBeforeC * cBeforeS)/2) / Math.sqrt((sBeforeC * cBeforeS * (sBeforeC + cBeforeS +1))/12);
    // console.log('zValuealternative: ',zValuealternative);
    // console.log('UaltS + UaltC: ',selectionUalternative+categoryUalternative,'| sBc*cBs: ',sBeforeC*cBeforeS);


    let minU = Math.min(selectionU,categoryU);
    
    let zValue = (minU - (nSelection * nCategroy)/2) / Math.sqrt((nSelection * nCategroy * (nSelection + nCategroy +1))/12);
    // console.log('minU: ',minU);
    console.log('zValue: ',zValue);
    console.log('Us + Uc: ',selectionU+categoryU,'| n1*n2: ',nSelection*nCategroy);
    let intersect = intersection(setAValid,setBValid);
    if(zValue === 0)
    {
      zValue = 0.000001;
    }

    let score = zValue;

    return score ? jStat.jStat.ztest(score, 2) : 0;
  }
}