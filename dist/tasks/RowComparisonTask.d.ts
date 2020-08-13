import { ATouringTask } from './ATouringTask';
export declare class RowComparison extends ATouringTask {
    constructor();
    initContent(): void;
    update(forceTableUpdate: boolean): void;
    private updateSelectors;
    updateTable(): void;
    /**
     * For each attribute in rowAttributes, we want to comapre the rows inside colGroups with the rows of rowGroups.
     * That means that the number of table rows is: |rowAttributes| * |rowGroups| and there are |colGroups| columns
     * (+ plus the rows and columns where we put labels).
     *
     * @param colGroups Selected groups (in column direction)
     * @param rowGroups Selected groups (in row direction)
     * @param rowAttributes Selected column description
     * @param filterMissingValues Filter missing values?
     * @param updateRow Update function, which gets called once all cells of a row are calculated
     */
    private getAttrTableBody;
    /**
     * Retrieve a cell result for the given row and column.
     * A result can be either a score, an null value for self-references, or an error.
     *
     * @param colGroup Selected groups (in column direction)
     * @param rowGroup Selected groups (in row direction)
     * @param rowAttr Selected column description
     * @param filterMissingValues Filter missing values?
     */
    private getScoreCellResult;
    /**
     * Calculate a score for the given measurement and dataset.
     * Score values are stored with the given hash value in the session store.
     * The calculation is skipped if an exisitng score for the hash value is found in the session store.
     *
     * @param hashValue Hash value for lookup in the session store
     * @param data Data used for the score calculation
     * @param measure Selected measurment class
     */
    private getMeasurementScore;
}
