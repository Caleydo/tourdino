import {IAttributeDesc, Comparison, SCOPE, ISimilarityClass, ISetSimilarityClass, IMeasureOptions, Type} from './interfaces';
import {defaultMeasureOptions} from './config';


export const registeredClasses = new Array<ASimilarityClass>();
export function MeasureDecorator() {
     return function(target: {new(): ASimilarityClass}) { //only instantiable subtypes of ASimilarityClass can be passed.
          registeredClasses.push(new target()); //TODO apply options
     };
}


export abstract class ASimilarityClass implements ISimilarityClass {

  public id: string;
  public label: string;
  public description: string;

  public type: Comparison;
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

    this.type = Comparison.get(Type.CATEGORICAL, Type.CATEGORICAL);
    this.scope = SCOPE.SETS;
  }


  calc(setA: Array<any>, setB: Array<any>) {
    return 1-Math.random(); // ]0,1]
  }
}
