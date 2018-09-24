import {IAttributeDesc, COMPARISON, SCOPE, ISimilarityClass} from './interfaces';
import {registeredClasses} from './Measures'


export class MethodManager{

  constructor() {} //only work with the static functions

  static getSetMethods(a: IAttributeDesc[] , b: IAttributeDesc[], type?: COMPARISON) : Map<COMPARISON, Set<ISimilarityClass>>{

    console.log("Hello", registeredClasses)

    if(!a || !b)
      throw new Error("Attribute sets a & b must be defined.");

    const measures = new Map<COMPARISON, Set<ISimilarityClass>>();
    
    const aTypes = new Set(a.map((measure) => measure.type)) //first get all types, that make a set to get each type once
    const bTypes = new Set(b.map((measure) => measure.type))

    for(let aType of aTypes) {
      for(let bType of bTypes) {
        for(let measure of registeredClasses) {
          if(measure.scope == SCOPE.SETS && measure.type === [aType, bType]) {
            if(!measures.has(measure.type)) {
              measures.set(measure.type, new Set<ISimilarityClass>()) //init nested set
            }
            measures.get(measure.type).add(measure);
          }
        }
      }
    }
    
    return measures;
  }
}
