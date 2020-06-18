import { IMeasureVisualization, ISetParameters, IMeasureResult } from '../base/interfaces';
import * as d3 from 'd3';
export declare class ScatterPlot implements IMeasureVisualization {
    private formatData;
    private calcRegressionY;
    private calcRegressionX;
    generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult): void;
}
