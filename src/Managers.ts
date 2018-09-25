import {IAttributeDesc, Type, Comparison, SCOPE, ISimilarityClass} from './interfaces';
import {registeredClasses} from './Measures'


export class MethodManager{

  constructor() {} //only work with the static functions

  static getSetMethods(a: IAttributeDesc[] , b: IAttributeDesc[], type?: Comparison) : Map<Comparison, ISimilarityClass[]> {

    if(!a || !b)
      throw new Error("Attribute sets a & b must be defined.");

    const measures = new Map<Comparison, ISimilarityClass[]>();

     //first get all types, that make a set to get each type once
    const aTypes = Array.from(new Set(a.map((measure) => measure.type as Type))); // TODO remove array.from (to iterate over sets, you needs at least typescript 2.3)
    const bTypes = Array.from(new Set(b.map((measure) => measure.type as Type)));

    for(let aType of aTypes) {
      for(let bType of bTypes) {
        for(let measure of registeredClasses) {
          if(measure.scope === SCOPE.SETS && measure.type.equals(Comparison.get(aType, bType))) {
            if(!measures.has(measure.type)) {
              measures.set(measure.type, new Array<ISimilarityClass>()) //init nested set
            }

            measures.get(measure.type).push(measure); // TODO: consider weights 
          }
        }
      }
    }
    
    return measures;
  }
}
