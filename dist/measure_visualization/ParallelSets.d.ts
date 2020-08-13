import { IMeasureVisualization, ISetParameters, IMeasureResult } from '../base/interfaces';
import * as d3 from 'd3';
export declare class ParallelSets implements IMeasureVisualization {
    private formatData;
    private formatDataSelectionAgainstCatOrGroup;
    private formatDataAttribute;
    generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult): void;
    private highlightAndColorRibbons;
    private colorRibbonsAttribute;
    private moveParSetsDimensionLabels;
}
