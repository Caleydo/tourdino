/**
 * Constants that describes a type like numerical or categorical.
 */
export class Type {

  private constructor(private value: string) {}

  public toString() {
    return this.value;
  }

  static NUMERICAL = new Type('number');
  static CATEGORICAL = new Type('categorical');

  public static get(type: string): Type {
    if(type === Type.NUMERICAL.toString()) {
      return Type.NUMERICAL;
    } else if (type === Type.CATEGORICAL.toString()) {
      return Type.CATEGORICAL;
    } else {
      throw new Error(`Given type '${type}' does not exist.`);
    }
  }
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
    const stored = this.comparisons.get(helper.toString());
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
  values: any[];
}

/**
 * Base properties for a every similarity measure.
 */
export interface ISimilarityMeasure {
  id: string;
  label: string;
  description?: string;
  visualization: IMeasureVisualization;

  type: Comparison;
  scope: SCOPE;

  calc: ISimilarityFunc;
}

/**
 * A function to compare two arrays of values
 */
export interface ISimilarityFunc {
  (setA: any[], setB: any[], allData: any[]): Promise<IMeasureResult>;
}

export interface IMeasureResult {
  /**
   * Value of the used measure type (e.g. z-value,t-value)
   */
  scoreValue: number;

  /**
   * p-value of the used measure type
   */
  pValue: number;

  /**
   * Number of values after filtering out undesirable values for set A
   */
  setSizeA: number;

  /**
   * Number of values after filtering out undesirable values for set B
   */
  setSizeB: number;

  /**
   * additional data of the measure
   */
  additionalData?: any;
}

export interface IMeasureVisualization {
  generateVisualization: IGenerateVisualizationFunc;
}

export interface IGenerateVisualizationFunc {
  (miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult);
}

export interface ISetParameters {
    setA: any[];
    setADesc: any;
    setACategory?: any;
    setB: any[];
    setBDesc: any;
    setBCategory?: any;
}
