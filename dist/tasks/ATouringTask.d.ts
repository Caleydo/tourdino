import * as d3 from 'd3';
import 'select2';
import { IMeasureResult, ISimilarityMeasure, ISetParameters, SCOPE } from '../base/interfaces';
import { RankingAdapter } from './RankingAdapter';
import { IColumnDesc } from 'lineupjs';
export interface ITouringTask {
    id: string;
    label: string;
    scope: SCOPE;
}
export interface IScoreCell {
    key?: string;
    label: string;
    type?: string;
    background?: string;
    foreground?: string;
    rowspan?: number;
    colspan?: number;
    score?: IMeasureResult;
    measure?: ISimilarityMeasure;
    setParameters?: ISetParameters;
    highlightData?: IHighlightData[];
}
export interface IHighlightData {
    column: string;
    label: string;
    category?: string;
    color?: string;
}
export declare abstract class ATouringTask implements ITouringTask {
    static EVENTTYPE: string;
    id: string;
    label: string;
    nodeObject: d3.Selection<HTMLDivElement>;
    icon: string;
    scope: SCOPE;
    order: number;
    ranking: RankingAdapter;
    private hoverTimerId;
    abort(): void;
    init(ranking: RankingAdapter, node: HTMLElement): void;
    show(): void;
    hide(): void;
    initContent(): void;
    /**
     * Add a checkbox to filter missing values from the compared columns/rows data
     */
    addFilterCheckbox(): void;
    createSelect2(): void;
    updateSelect2(): void;
    destroySelect2(): void;
    updateTableDescription(isTableEmpty: boolean): any;
    addEventListeners(): void;
    removeEventListeners(): void;
    abstract update(forceTableUpdate: boolean): void;
    abstract updateTable(): void;
    getAttriubuteDescriptions(): IColumnDesc[];
    toScoreCell(score: IMeasureResult, measure: ISimilarityMeasure, setParameters: ISetParameters, highlightData: IHighlightData[]): IScoreCell;
    private createLegend;
    private removeCellDetails;
    private generateVisualDetails;
    protected updateSelectionAndVisualization(row: any): void;
    private highlightSelectedCell;
    private visualizeSelectedCell;
    onClick(tableCell: any): void;
    onMouseOver(tableCell: any, state: boolean): void;
    setLineupHighlight(cellData: IScoreCell, enable: boolean, cssClass: string): void;
    createToolTip(tableCell: any): String;
}
