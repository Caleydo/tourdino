import * as d3 from 'd3';
import 'd3-grubert-boxplot/box';
import { IMeasureResult, IMeasureVisualization, ISetParameters } from '../base/interfaces';
export declare class BoxPlot implements IMeasureVisualization {
    private formatData;
    generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult): void;
}
