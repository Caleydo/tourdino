import * as d3 from 'd3';
import { IMeasureResult, IMeasureVisualization, ISetParameters } from '../base/interfaces';
export declare class BoxPlot implements IMeasureVisualization {
    private formatData;
    generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult): void;
}
