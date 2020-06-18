import {IAttributeDesc, Type, Comparison, SCOPE, MeasureMap, ISimilarityMeasure} from '../base/interfaces';
import {registeredClasses} from './Measures';


export class MethodManager {

  constructor() {
    throw new Error('This class is just a container for the static methods.');
  } // only work with the static functions

  static getSetMethods(a: IAttributeDesc[], b: IAttributeDesc[], type?: Comparison): MeasureMap {
    return MethodManager.getMeasuresbyData(a,b, SCOPE.SETS);
  }

  static getAttributeMethods(a: IAttributeDesc[], b: IAttributeDesc[], type?: Comparison): MeasureMap {
    return MethodManager.getMeasuresbyData(a,b, SCOPE.ATTRIBUTES);
  }

  private static getMeasuresbyData(a: IAttributeDesc[], b: IAttributeDesc[], scope: SCOPE) {
    if (!a || !b) {
      throw new Error('Attribute arrays a & b must be defined.');
    }

    const measures = new Map<Comparison, ISimilarityMeasure[]>() as MeasureMap;

    // first get all types, that make a set to get each type once
    const aTypes = new Set(a.map((measure) => measure.type as Type));
    const bTypes = new Set(b.map((measure) => measure.type as Type));

    for (const aType of aTypes) {
      for (const bType of bTypes) {
        const type = Comparison.get(a, b);
        const typeMeasures = this.getMeasuresByType(aType, bType, scope);
        if (!measures.has(type)) {
          measures.set(type, typeMeasures); // init nested set
        } else {
          measures.get(type).concat(typeMeasures);
        }
      }
    }

    return measures;
  }

  public static getMeasuresByType(a: Type, b: Type, scope: SCOPE) {
    const measures: ISimilarityMeasure[] = [];
    for (const measure of registeredClasses) {
      if (measure.scope === scope && measure.type.equals(Comparison.get(a, b))) {
        measures.push(measure);
      }
    }

    return measures;
  }
}


