import { Comparison, SCOPE } from '../base/interfaces';
import { registeredClasses } from './Measures';
export class MethodManager {
    constructor() {
        throw new Error('This class is just a container for the static methods.');
    } // only work with the static functions
    static getSetMethods(a, b, type) {
        return MethodManager.getMeasuresbyData(a, b, SCOPE.SETS);
    }
    static getAttributeMethods(a, b, type) {
        return MethodManager.getMeasuresbyData(a, b, SCOPE.ATTRIBUTES);
    }
    static getMeasuresbyData(a, b, scope) {
        if (!a || !b) {
            throw new Error('Attribute arrays a & b must be defined.');
        }
        const measures = new Map();
        // first get all types, that make a set to get each type once
        const aTypes = new Set(a.map((measure) => measure.type));
        const bTypes = new Set(b.map((measure) => measure.type));
        for (const aType of aTypes) {
            for (const bType of bTypes) {
                const type = Comparison.get(a, b);
                const typeMeasures = this.getMeasuresByType(aType, bType, scope);
                if (!measures.has(type)) {
                    measures.set(type, typeMeasures); // init nested set
                }
                else {
                    measures.get(type).concat(typeMeasures);
                }
            }
        }
        return measures;
    }
    static getMeasuresByType(a, b, scope) {
        const measures = [];
        for (const measure of registeredClasses) {
            if (measure.scope === scope && measure.type.equals(Comparison.get(a, b))) {
                measures.push(measure);
            }
        }
        return measures;
    }
}
//# sourceMappingURL=MethodManager.js.map