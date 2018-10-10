import {IAttributeDesc, Comparison, SCOPE, ISimilarityClass, ISetSimilarityClass, IMeasureOptions, Type} from './interfaces';
import {defaultMeasureOptions} from './config';
import * as d3 from 'd3';

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
    let intersection = [];
    const filteredsetA = setA.filter((itemA) => {
      const indexB = setB.findIndex((itemB) => itemB === itemA); // check if there is a corresponding entry in the setB
      if (indexB >= 0) {
        intersection.push(itemA);
        setB.splice(indexB, 1);
        return false; // selItem will drop out of setA
      }
      return true;
    });

    // const intersection = selectionSet.filter(item => categorySet.indexOf(item) >= 0); // filter elements not in the second array
    // const union = selectionSet.concat(categorySet).sort().filter((item, i, arr) => !i || item != arr[i-1]) // !i => if first elemnt, or if unqueal to previous item (item != arr[i-1]) include in arr

    const score = intersection.length / (intersection.length + filteredsetA.length + setB.length);

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
    const minSize = Math.min(setA.length, setB.length);

    let intersection = [];
    setA.filter((selItem) => {
      const indexB = setB.findIndex((catItem) => catItem === selItem);
      if (indexB >= 0) {
        intersection.push(selItem);
        setB.splice(indexB, 1);
        return false; // selItem will drop out of selectionSet
      }
      return true;
    });

    const score = intersection.length / minSize;

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
    const nSelection = setA.length;
    const muSelection = d3.mean(setA);
    const varSelection = d3.variance(setA);

    //category
    const nCategory = setB.length;
    const muCategory = d3.mean(setB);
    const varCategory = d3.variance(setB);

    let scoreP1 = Math.sqrt((nSelection * nCategory * (nSelection + nCategory - 2)) / (nSelection + nCategory));
    let scoreP2 = (muSelection - muCategory) / Math.sqrt((nSelection - 1) * varSelection + (nCategory - 1) * varCategory);
    let score = scoreP1 * scoreP2;

    return score || 0;
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