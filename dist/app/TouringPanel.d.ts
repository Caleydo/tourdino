import 'd3.parsets/d3.parsets';
import 'd3-grubert-boxplot/box';
import { LocalDataProvider } from 'lineupjs';
import { PanelTab } from 'tdp_core/dist/lineup/internal/panel/PanelTab';
import { IPanelTabExtensionDesc } from 'tdp_core/dist/lineup/internal/LineUpPanelActions';
import { RowComparison } from '../tasks/RowComparisonTask';
import { ColumnComparison } from '../tasks/ColumnComparisonTask';
export declare const tasks: (RowComparison | ColumnComparison)[];
export declare class TouringPanel {
    private readonly _desc;
    private readonly tab;
    private readonly provider;
    private readonly node;
    private ranking;
    private currentTask;
    private active;
    constructor(_desc: IPanelTabExtensionDesc, tab: PanelTab, provider: LocalDataProvider);
    private init;
    private initTasks;
    private insertTasks;
    private addEventListeners;
    updateOutput(forceUpdate?: boolean): Promise<void>;
    private updateTask;
    /**
     *
     * @param tab PanelTab
     * @param provider Instance of the LocalDataProvider that contains all ranking
     * @param desc Options provided through the extension point i.e `headerCssClass, headerTitle`
     */
    static create(desc: IPanelTabExtensionDesc, tab: PanelTab, provider: LocalDataProvider): void;
}
