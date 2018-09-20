
export enum TYPE {
  NUMERICAL = "NUMERICAL",
  CATEGORICAL = "CATEGORICAL"
}

export type COMPARISON = [TYPE, TYPE]; // tuple, (e.g. NUM-NUM, CAT-CAT, NUM-CAT)

/**
 * Describes an attribute.
 * Compatible with lineupjs.
 */
export interface IAttributeDesc {
  label: string;
  type: TYPE;
}

/**
 * Describes an attributes category or group of items
 */
export interface IGroupDesc {
  label: string;
  parent: IAttributeDesc;
  type: TYPE;
  values: [];
}

/**
 * Base properties for a every similarity measure.
 */
export interface ISimilarityClass {
  label: string;
  description?: string;

  type: COMPARISON;
}

/**
 * A function to compare two sets of values
 */
export interface ISetSimilarityFunc {
  (setA: [], setB: []): number;
}

/**
 * Similarity measures that compares sets.
 */
export interface ISetSimilarityClass extends ISimilarityClass {
  calc : ISetSimilarityFunc;
}