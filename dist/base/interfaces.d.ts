/// <reference types="d3" />
/**
 * Constants that describes a type like numerical or categorical.
 */
export declare class Type {
    private value;
    private constructor();
    toString(): string;
    static NUMERICAL: Type;
    static CATEGORICAL: Type;
    static get(type: string): Type;
}
/**
 * Describes an comparison of two types
 */
export declare class Comparison {
    private static comparisons;
    readonly typeA: Type;
    readonly typeB: Type;
    constructor(typeA: Type, typeB: Type);
    toString(): string;
    compares(typeA: Type, typeB: Type): boolean;
    equals(anotherCmp: Comparison): boolean;
    static get(typeA: any, typeB: any): Comparison;
}
export declare enum SCOPE {
    ATTRIBUTES = 0,
    SETS = 1
}
export declare type MeasureMap = Map<Comparison, ISimilarityMeasure[]>;
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
    (miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult): any;
}
export interface ISetParameters {
    setA: any[];
    setADesc: any;
    setACategory?: any;
    setB: any[];
    setBDesc: any;
    setBCategory?: any;
}
