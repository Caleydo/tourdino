import {IAttributeDesc, COMPARISON, SCOPE, ISimilarityClass, ISetSimilarityClass, IMeasureOptions, TYPE} from './interfaces';
import {defaultMeasureOptions} from './config';


export const registeredClasses = [];
export function MeasureDecorator() {
     return function(target: typeof ASimilarityClass) {
          registeredClasses.push(new target()); //TODO apply options
     };
}


export abstract class ASimilarityClass implements ISimilarityClass {

  public id: string;
  public label: string;
  public description: string;

  public type: COMPARISON;
  public scope: SCOPE;

  protected readonly options : IMeasureOptions;
  
  constructor(options = defaultMeasureOptions()) {
    this.options = options;
  }

}


@MeasureDecorator()
export class JaccardSimilarity extends ASimilarityClass implements ISetSimilarityClass {

  constructor(options?: IMeasureOptions) {
    super(options);

    // TODO improve the measure description somehow:
    this.id = "jaccard"
    this.label = "Jaccard Index"
    this.description = "The size of the intersection divided by the size of the union of the sample sets."

    this.type = [TYPE.CATEGORICAL, TYPE.CATEGORICAL];
    this.scope = SCOPE.SETS;
  }


  calc(setA: [], setB: []) {
    return 1-Math.random(); // ]0,1]
  }
}
