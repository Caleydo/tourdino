import { IMeasureVisualization, ISetParameters, IMeasureResult } from '../base/interfaces';
import * as d3 from 'd3';
export declare class GroupedBarChart implements IMeasureVisualization {
    protected formatData(setParameters: ISetParameters, score: IMeasureResult): {
        setADef: any;
        setBDef: any;
        bargroups: any[];
        yDomain: number[];
    };
    generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult): void;
    protected getYAxis(yScale: d3.scale.Linear<number, number>): any;
}
