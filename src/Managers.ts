import {IAttributeDesc, COMPARISON, SCOPE, ISimilarityClass, ISetSimilarityClass} from './interfaces';

export class MethodManager{
  private static _registeredMeasures = new Set<ISimilarityClass>();

  constructor() {} //only work with the static functions

  static register(measure: ISimilarityClass) : boolean {
    let isNew = !this._registeredMeasures.has(measure)
    this._registeredMeasures.add(measure);
    return isNew;
  }

  static getSetMethods(a: IAttributeDesc[] , b: IAttributeDesc[], type?: COMPARISON) : Map<COMPARISON, Set<ISimilarityClass>>{
    const measures = new Map<COMPARISON, Set<ISimilarityClass>>();
    for(let aAttr of a) {
      for(let bAttr of b) {
        this._registeredMeasures.forEach((measure) => { //for of did not work (type was string)
          if(measure.scope == SCOPE.SETS && measure.type === [aAttr.type,bAttr.type]) {
            if(!measures.has(measure.type)) {
              measures.set(measure.type, new Set<ISimilarityClass>())
            }
            measures.get(measure.type).add(measure);
          }
        });
      }
    }
    
    return measures;
  }

  //TODO remove
  static sayHello() {
    console.log("Hello")
  }
}
