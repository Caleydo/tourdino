import { IAttributeDesc, Type, Comparison, SCOPE, MeasureMap, ISimilarityMeasure } from '../base/interfaces';
export declare class MethodManager {
    constructor();
    static getSetMethods(a: IAttributeDesc[], b: IAttributeDesc[], type?: Comparison): MeasureMap;
    static getAttributeMethods(a: IAttributeDesc[], b: IAttributeDesc[], type?: Comparison): MeasureMap;
    private static getMeasuresbyData;
    static getMeasuresByType(a: Type, b: Type, scope: SCOPE): ISimilarityMeasure[];
}
