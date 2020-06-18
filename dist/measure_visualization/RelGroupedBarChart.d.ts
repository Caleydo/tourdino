import { ISetParameters, IMeasureResult } from '../base/interfaces';
import { GroupedBarChart } from './GroupedBarChart';
import * as d3 from 'd3';
export declare class RelGroupedBarChart extends GroupedBarChart {
    protected formatData(setParameters: ISetParameters, score: IMeasureResult): {
        setADef: any;
        setBDef: any;
        bargroups: any[];
        yDomain: number[];
    };
    protected getYAxis(yScale: d3.scale.Linear<number, number>): any;
}
