import {IAttributeDesc, Comparison, SCOPE, ISimilarityClass, ISetSimilarityClass, IMeasureOptions, Type} from './interfaces';
import {defaultMeasureOptions} from './config';


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
    return 1 - Math.random(); // ]0,1]
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
    return 1 - Math.random(); // ]0,1]
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

    this.type = Comparison.get(Type.NUMERICAL, Type.NUMERICAL);
    this.scope = SCOPE.SETS;
  }


  calc(setA: Array<any>, setB: Array<any>) {
    return 1 - Math.random(); // ]0,1]
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