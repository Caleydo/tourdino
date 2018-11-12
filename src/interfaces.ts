/**
 * Constants that describes a type like numerical or categorical.
 */
export class Type {
  // TODO make an enum again (string enums need at least typescript 2.4)

  private constructor(private value: string) {}

  public toString() {
    return this.value;
  }

  static NUMERICAL = new Type("number");
  static CATEGORICAL = new Type("categorical");
}

/**
 * Describes an comparison of two types
 */
export class Comparison {

  private static comparisons = new Map<String, Comparison>();
  public readonly typeA: Type;
  public readonly typeB: Type;

  constructor(typeA: Type, typeB: Type) {
    if (typeA < typeB) {
      this.typeA = typeA;
      this.typeB = typeB;
    } else {
      this.typeA = typeB;
      this.typeB = typeA;
    }
  }

  public toString() {
    // as Comparisons should be equal independent of the order, their string representations should be equal aswell, so the types are always sorted alphabetically
    return `${this.typeA}-${this.typeB}`;
  }


  public compares(typeA: Type, typeB: Type) {
    return this.equals(Comparison.get(typeA, typeB));
  }

  public equals(anotherCmp: Comparison) {
    // NUM-CAT and CAT-NUM should be the same:
    // [A,B] === [A,B]
    // [A,B] === [B,A]
    // [B,A] === [A,B]
    // [B,A] === [B,A]
    return (this.typeA === anotherCmp.typeA && this.typeB === anotherCmp.typeB) || (this.typeA === anotherCmp.typeB && this.typeB === anotherCmp.typeA);
  }

  static get(typeA, typeB) {
    const helper = new Comparison(typeA, typeB);
    const stored = this.comparisons.get(helper.toString())
    if (stored) {
      return stored;
    } else {
      this.comparisons.set(helper.toString(), helper);
      return helper;
    }
  }
}


// Rathern than type and comparison, this is an enum because it the enum items  don't need string values.
export enum SCOPE {
  ATTRIBUTES,
  SETS
}

export type MeasureMap = Map<Comparison, ISimilarityMeasure[]>;

/**
 * Describes an attribute.
 * Compatible with lineupjs.
 */
export interface IAttributeDesc {
  label: string;
  type: Type;
}

/**
 * Describes an attributes category or group of items
 */
export interface IGroupDesc {
  label: string;
  parent: IAttributeDesc;
  type: Type;
  values: Array<any>;
}

/**
 * Base properties for a every similarity measure.
 */
export interface ISimilarityMeasure {
  id: string;
  label: string;
  description?: string;

  type: Comparison;
  scope: SCOPE;

  calc: ISimilarityFunc;
}

/**
 * A function to compare two arrays of values
 */
export interface ISimilarityFunc {
  (setA: Array<any>, setB: Array<any>): Promise<IMeasureResult>;
}


export interface IMeasureOptions {
  /**
   * With custom weights, the order of similarity measures returned by the manager can be influenced.
   * Measures with higher weight are prioritized.
   * @default 0
   */
  weight: number;

  /**
   * Option to enable/disbale a measure.
   * @default true
   */
  enabled: boolean;
}

export interface IMeasureResult {
  /**
   * Value of the used measure type (e.g. z-value,t-value)
   */
  scoreValue: number;
  
  /**
   * p-value of the used measure type 
   */
  pValue: number
}
