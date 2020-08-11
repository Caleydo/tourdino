import { Comparison, SCOPE, ISimilarityMeasure, IMeasureResult, IMeasureVisualization } from '../base/interfaces';
export declare const registeredClasses: ASimilarityMeasure[];
export declare abstract class ASimilarityMeasure implements ISimilarityMeasure {
    id: string;
    label: string;
    description: string;
    visualization: IMeasureVisualization;
    type: Comparison;
    scope: SCOPE;
    abstract calc(setA: any[], setB: any[], allData: any[]): Promise<IMeasureResult>;
    protected pValueAvailability(original: number, valid: number, threshold?: number): boolean;
}
export declare class ChiSquareTest extends ASimilarityMeasure {
    constructor();
    calc(setA: any[], setB: any[]): Promise<IMeasureResult>;
    getSum(total: number, numb: number): number;
}
/**
 * Also known as the Tanimoto distance metric.
 */
export declare class JaccardSimilarity extends ASimilarityMeasure {
    constructor();
    calc(setA: any[], setB: any[], allData: any[]): Promise<IMeasureResult>;
    calc_Randomize(setA: any[], setB: any[], allData: any[]): Promise<{
        score: number;
        p: number;
    }>;
}
export declare class ChiSquareIndependenceTest extends ChiSquareTest {
    constructor();
    calc(arrA: any[], arrB: any[]): Promise<IMeasureResult>;
}
/**
 * Also known as the Tanimoto distance metric.
 */
export declare class AdjustedRandIndex extends ASimilarityMeasure {
    constructor();
    calc(arr1: any[], arr2: any[]): Promise<IMeasureResult>;
    calcP_Randomize(arr1: any[], arr2: any[]): Promise<{
        score: number;
        p: number;
    }>;
}
export declare class WilcoxonRankSumTest extends ASimilarityMeasure {
    constructor();
    calc(setA: any[], setB: any[]): Promise<IMeasureResult>;
}
/**
 * MannWhitneyUTest === WilcoxonRankSumTest, therefore this class is just a rename
 */
export declare class MannWhitneyUTest extends WilcoxonRankSumTest {
    constructor();
}
export declare class StudentTTest extends ASimilarityMeasure {
    constructor();
    calc(setA: any[], setB: any[]): Promise<IMeasureResult>;
}
export declare class SpearmanCorrelation extends ASimilarityMeasure {
    constructor();
    calc(set1: any[], set2: any[]): Promise<IMeasureResult>;
    protected pValueAvailability(original: number, valid: number, threshold?: number): boolean;
}
export declare class PearsonCorrelation extends ASimilarityMeasure {
    constructor();
    calc(set1: any[], set2: any[]): Promise<IMeasureResult>;
}
export declare class EnrichmentScore extends ASimilarityMeasure {
    constructor();
    isArrayOfNumbers(arr: any): arr is number[];
    calc(set1: any[], set2: any[]): Promise<IMeasureResult>;
    calcPValuePermutation(numericSet: any[], categorySet: any[], actualScores: any[]): Promise<{
        category: string;
        pvalue: number;
    }[]>;
    calcEnrichmentScoreCategory(setCombined: any[], currCategory: string, amountCategory: number): {
        category: string;
        enrichmentScore: number;
    };
}
