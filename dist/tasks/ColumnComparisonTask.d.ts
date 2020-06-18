import { ATouringTask } from './ATouringTask';
export declare class ColumnComparison extends ATouringTask {
    constructor();
    initContent(): void;
    update(forceTableUpdate: boolean): void;
    updateAttributeSelectors(): boolean;
    updateTable(): void;
    /**
     * Retrieve the values for each table cell and return the data structure.
     *
     * @param colAttributes Selected column descriptions (in column direction)
     * @param rowAttributes Selected column descriptions (in row direction)
     * @param filterMissingValues Filter missing values?
     * @param updateRow Update function, which gets called once all cells of a row are calculated
     */
    private getAttrTableBody;
    /**
     * Retrieve a cell result for the given row and column.
     * A result can be either a score, an null value for self-references, or an error.
     *
     * @param col Column description (in column direction)
     * @param row Column description (in row direction)
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
