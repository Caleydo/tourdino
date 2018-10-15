import {IAttributeDesc, Type, Comparison, SCOPE, MeasureMap, ISimilarityMeasure} from './interfaces';
import {registeredClasses} from './Measures'


export class MethodManager {

  constructor() {} //only work with the static functions

  static getSetMethods(a: IAttributeDesc[], b: IAttributeDesc[], type?: Comparison): MeasureMap {
    return MethodManager.getMeasures(a,b, SCOPE.SETS);
  }

  static getAttributeMethods(a: IAttributeDesc[], b: IAttributeDesc[], type?: Comparison): MeasureMap {
    return MethodManager.getMeasures(a,b, SCOPE.ATTRIBUTES);
  }

  private static getMeasures(a: IAttributeDesc[], b: IAttributeDesc[], scope: SCOPE) {
    if (!a || !b)
      throw new Error("Attribute arrays a & b must be defined.");

    const measures = new Map<Comparison, ISimilarityMeasure[]>() as MeasureMap;

    //first get all types, that make a set to get each type once
    const aTypes = new Set(a.map((measure) => measure.type as Type));
    const bTypes = new Set(b.map((measure) => measure.type as Type));

    for (let aType of aTypes) {
      for (let bType of bTypes) {
        for (let measure of registeredClasses) {
          if (measure.scope === scope && measure.type.equals(Comparison.get(aType, bType))) {
            if (!measures.has(measure.type)) {
              measures.set(measure.type, new Array<ISimilarityMeasure>()) //init nested set
            }

            measures.get(measure.type).push(measure); // TODO: consider weights 
          }
        }
      }
    }

    return measures;
  }
}
