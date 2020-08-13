/**
 * Constants that describes a type like numerical or categorical.
 */
export class Type {
    constructor(value) {
        this.value = value;
    }
    toString() {
        return this.value;
    }
    static get(type) {
        if (type === Type.NUMERICAL.toString()) {
            return Type.NUMERICAL;
        }
        else if (type === Type.CATEGORICAL.toString()) {
            return Type.CATEGORICAL;
        }
        else {
            throw new Error(`Given type '${type}' does not exist.`);
        }
    }
}
Type.NUMERICAL = new Type('number');
Type.CATEGORICAL = new Type('categorical');
/**
 * Describes an comparison of two types
 */
export class Comparison {
    constructor(typeA, typeB) {
        if (typeA < typeB) {
            this.typeA = typeA;
            this.typeB = typeB;
        }
        else {
            this.typeA = typeB;
            this.typeB = typeA;
        }
    }
    toString() {
        // as Comparisons should be equal independent of the order, their string representations should be equal aswell, so the types are always sorted alphabetically
        return `${this.typeA}-${this.typeB}`;
    }
    compares(typeA, typeB) {
        return this.equals(Comparison.get(typeA, typeB));
    }
    equals(anotherCmp) {
        // NUM-CAT and CAT-NUM should be the same:
        // [A,B] === [A,B]
        // [A,B] === [B,A]
        // [B,A] === [A,B]
        // [B,A] === [B,A]
        return (this.typeA === anotherCmp.typeA && this.typeB === anotherCmp.typeB) || (this.typeA === anotherCmp.typeB && this.typeB === anotherCmp.typeA);
    }
    static get(typeA, typeB) {
        const helper = new Comparison(typeA, typeB);
        const stored = this.comparisons.get(helper.toString());
        if (stored) {
            return stored;
        }
        else {
            this.comparisons.set(helper.toString(), helper);
            return helper;
        }
    }
}
Comparison.comparisons = new Map();
// Rathern than type and comparison, this is an enum because it the enum items  don't need string values.
export var SCOPE;
(function (SCOPE) {
    SCOPE[SCOPE["ATTRIBUTES"] = 0] = "ATTRIBUTES";
    SCOPE[SCOPE["SETS"] = 1] = "SETS";
})(SCOPE || (SCOPE = {}));
//# sourceMappingURL=interfaces.js.map