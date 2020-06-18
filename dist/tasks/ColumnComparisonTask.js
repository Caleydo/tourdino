import colCmpHtml from 'html-loader!./templates/ColumnComparison.html'; // webpack imports html to variable
import colCmpIcon from './assets/colCmp.png';
import * as XXH from 'xxhashjs';
import { cloneDeep } from 'lodash';
import { ATouringTask } from './ATouringTask';
import { Type, SCOPE } from '../base/interfaces';
import { MethodManager } from '../measures/MethodManager';
import { WorkerManager } from '../workers/WorkerManager';
import { BaseUtils } from '../base/BaseUtils';
import { TaskUtils } from './TaskUtils';
export class ColumnComparison extends ATouringTask {
    constructor() {
        super();
        this.id = 'colCmp';
        this.label = 'Columns';
        this.order = 20;
        this.icon = colCmpIcon;
        this.scope = SCOPE.ATTRIBUTES;
    }
    initContent() {
        this.nodeObject.node().insertAdjacentHTML('beforeend', colCmpHtml);
        super.initContent();
        const headerDesc = this.nodeObject.select('thead tr').select('th').classed('head-descr', true).append('header');
        headerDesc.append('h1').text('Similarity of Columns');
        headerDesc.append('p').text('Click on a p-Value in the table for details.');
    }
    update(forceTableUpdate) {
        const tableChanged = this.updateAttributeSelectors();
        if (forceTableUpdate || tableChanged) {
            this.updateTable();
        }
    }
    updateAttributeSelectors() {
        // console.log('update selectors');
        const descriptions = this.getAttriubuteDescriptions();
        const attrSelectors = this.nodeObject.selectAll('select.attr optgroup');
        const options = attrSelectors.selectAll('option').data(descriptions, (desc) => desc.label); // duplicates are filtered automatically
        options.enter().append('option').text((desc) => desc.label);
        let tableChanged = !options.exit().filter(':checked').empty(); // if checked attributes are removed, the table has to update
        const attrSelect1 = this.nodeObject.select('select.attr[name="attr1[]"]');
        if (attrSelect1.selectAll('option:checked').empty()) { // make a default selection
            attrSelect1.selectAll('option').each(function (desc, i) { this.selected = i === descriptions.length - 1 ? true : false; }); // by default, select last column. set the others to null to remove the selected property
            tableChanged = true; // attributes have changed
        }
        const attrSelect2 = this.nodeObject.select('select.attr[name="attr2[]"]');
        if (attrSelect2.selectAll('option:checked').empty()) { // make a default selection
            attrSelect2.selectAll('option').each(function () { this.selected = true; }); // by default, select all
            tableChanged = true; // attributes have changed
        }
        options.exit().remove();
        options.order();
        super.updateSelect2();
        return tableChanged;
    }
    updateTable() {
        // console.log('update table');
        WorkerManager.terminateAll(); // Abort all calculations as their results are no longer needed
        const timestamp = new Date().getTime().toString();
        this.nodeObject.attr('data-timestamp', timestamp);
        let colData = this.nodeObject.selectAll('select.attr[name="attr1[]"] option:checked').data();
        let rowData = this.nodeObject.selectAll('select.attr[name="attr2[]"]  option:checked').data();
        const filterMissingValues = !this.nodeObject.select('input[type="checkbox"]:checked').empty(); // check if checkbox to filter missing values is checked
        if (colData.length > rowData.length) {
            [rowData, colData] = [colData, rowData]; // avoid having more columns than rows --> flip table
        }
        const colHeads = this.nodeObject.select('thead tr').selectAll('th.head').data(colData, (d) => d.column); // column is key
        const colHeadsSpan = colHeads.enter().append('th')
            .attr('class', 'head rotate').append('div').append('span').append('span'); // th.head are the column headers
        const that = this; // for the function below
        function updateTableBody(bodyData) {
            if (that.nodeObject.attr('data-timestamp') !== timestamp) {
                return; // skip outdated result
            }
            that.updateTableDescription(bodyData.length === 0);
            // create a table body for every column
            const bodies = that.nodeObject.select('table').selectAll('tbody').data(bodyData, (d) => d[0][0].label); // the data of each body is of type: IScoreCell[][]
            bodies.enter().append('tbody'); // For each IColumnTableData, create a tbody
            // the data of each row is of type: IScoreCell[]
            const trs = bodies.selectAll('tr').data((d) => d, (d) => d[0].label); // had to specify the function to derive the data (d -> d)
            trs.enter().append('tr');
            const tds = trs.selectAll('td').data((d) => d);
            tds.enter().append('td');
            // Set colheads in thead
            colHeadsSpan.html((d) => `<b>${d.label}</b>`);
            colHeadsSpan.attr('data-type', (d) => (d.type));
            // set data in tbody
            tds.attr('colspan', (d) => d.colspan);
            tds.attr('rowspan', (d) => d.rowspan);
            tds.style('color', (d) => d.foreground);
            tds.style('background-color', (d) => d.background);
            tds.attr('data-type', (d) => d.type);
            tds.classed('action', (d) => d.score !== undefined);
            tds.classed('score', (d) => d.measure !== undefined);
            tds.html((d) => d.label);
            tds.on('click', function () { that.onClick.bind(that)(this); });
            tds.on('mouseover', function () { that.onMouseOver.bind(that)(this, true); });
            tds.on('mouseout', function () { that.onMouseOver.bind(that)(this, false); });
            tds.attr('title', function () { return that.createToolTip.bind(that)(this); });
            // Exit
            colHeads.exit().remove(); // remove attribute columns
            colHeads.order();
            tds.exit().remove(); // remove cells of removed columns
            trs.exit().remove(); // remove attribute rows
            bodies.exit().remove();
            trs.order();
            bodies.order();
            const svgWidth = 120 + 33 * colData.length; // calculated width for the svg and polygon
            that.nodeObject.select('th.head.rotate svg').remove();
            that.nodeObject.select('th.head.rotate') // select first
                .insert('svg', ':first-child')
                .attr('width', svgWidth)
                .attr('height', 120)
                .append('polygon').attr('points', '0,0 ' + svgWidth + ',0 0,120'); // 120 is thead height, 45° rotation --> 120 is also width
        }
        // initialize
        const data = prepareDataArray(colData, rowData);
        updateTableBody(data);
        // set values
        this.getAttrTableBody(colData, rowData, filterMissingValues, updateTableBody)
            .then(updateTableBody);
    }
    /**
     * Retrieve the values for each table cell and return the data structure.
     *
     * @param colAttributes Selected column descriptions (in column direction)
     * @param rowAttributes Selected column descriptions (in row direction)
     * @param filterMissingValues Filter missing values?
     * @param updateRow Update function, which gets called once all cells of a row are calculated
     */
    async getAttrTableBody(colAttributes, rowAttributes, filterMissingValues, updateRow) {
        const data = prepareDataArray(colAttributes, rowAttributes);
        // cache cell for faster lookup and reuse results for inverse cells
        const cellCache = new Map();
        const rowPromises = rowAttributes.map((row, rowIndex) => {
            const colPromises = colAttributes.map((col, colIndex) => {
                // regular cache key (row + col)
                const cacheKey = `${row.column}_${col.column}`;
                // inverse cache key (col + row) to check for cell across the diagonal
                const inverseCacheKey = `${col.column}_${row.column}`;
                let promise;
                // check if already some inverse cell exists
                if (cellCache.has(inverseCacheKey)) {
                    promise = cellCache.get(inverseCacheKey);
                    promise.then((result) => {
                        // clone result as it is identical, except ...
                        const inverseResult = cloneDeep(result);
                        // ... switch set parameters A -> B and B -> A
                        if (inverseResult.setParameters) {
                            inverseResult.setParameters = {
                                setA: inverseResult.setParameters.setB,
                                setADesc: inverseResult.setParameters.setBDesc,
                                setACategory: inverseResult.setParameters.setBCategory,
                                setB: inverseResult.setParameters.setA,
                                setBDesc: inverseResult.setParameters.setADesc,
                                setBCategory: inverseResult.setParameters.setACategory,
                            };
                        }
                        data[rowIndex][0][colIndex + 1] = inverseResult;
                    });
                }
                else {
                    promise = this.getScoreCellResult(col, row, filterMissingValues);
                    promise.then((result) => {
                        data[rowIndex][0][colIndex + 1] = result;
                    });
                    // store in cache for possible inverse cells
                    cellCache.set(cacheKey, promise);
                }
                return promise;
            });
            return Promise.all(colPromises)
                .then(() => {
                // update the table with the new row data and update visualization for the selected row
                updateRow(data);
                this.updateSelectionAndVisualization(row);
            });
        });
        await Promise.all(rowPromises); // rather await all at once: https://developers.google.com/web/fundamentals/primers/async-functions#careful_avoid_going_too_sequential
        return data; // then return the data
    }
    /**
     * Retrieve a cell result for the given row and column.
     * A result can be either a score, an null value for self-references, or an error.
     *
     * @param col Column description (in column direction)
     * @param row Column description (in row direction)
     * @param filterMissingValues Filter missing values?
     */
    async getScoreCellResult(col, row, filterMissingValues) {
        if (row.label === col.label) {
            // identical attributes
            return { label: '<span class="circle"/>', measure: null };
        }
        // wait until score columns are loaded before proceeding to the calculation
        await TaskUtils.waitUntilScoreColumnIsLoaded(this.ranking, row);
        // console.log('row is loaded', row);
        await TaskUtils.waitUntilScoreColumnIsLoaded(this.ranking, col);
        // console.log('col is loaded', col);
        const measures = MethodManager.getMeasuresByType(Type.get(row.type), Type.get(col.type), SCOPE.ATTRIBUTES);
        // skip if no measures found
        if (measures.length === 0) {
            console.error('no measurement method found for type', row.type, col.type);
            return { label: 'err' };
        }
        // use always the first measure
        const measure = measures[0];
        const hashObject = generateHashObject(col, row, this.ranking.getDisplayedIds(), this.ranking.getSelection(), filterMissingValues);
        const hashValue = generateHashValue(hashObject);
        const first = this.ranking.getAttributeDataDisplayed(col.column); // minus one because the first column is headers
        const second = this.ranking.getAttributeDataDisplayed(row.column);
        const [data1, data2] = filterMissingValues ? BaseUtils.removeMissingValues(first, second) : [first, second];
        try {
            const score = await this.getMeasurementScore(hashValue, { setA: data1, setB: data2, allData: null }, measure);
            // check if all values are NaN
            // necessary for score columns that are lazy loaded
            // TODO the score column is flaged as `loaded`, but the data is still not available. needs further investigation
            // if(data1.every((item) => Number.isNaN(item))) {
            //   // wait until score column is loaded before calculating the score
            //   console.warn('all NaN!!!! should have waited for it', col);
            // }
            // TODO the score column is flaged as `loaded`, but the data is still not available. needs further investigation
            // if(data2.every((item) => Number.isNaN(item))) {
            //   // wait until score column is loaded before calculating the score
            //   console.warn('all NaN!!!! should have waited for it', row);
            // }
            const setParameters = {
                setA: data1,
                setADesc: col,
                setB: data2,
                setBDesc: row
            };
            const highlight = [
                { column: row.column, label: row.label },
                { column: col.column, label: col.label }
            ];
            return this.toScoreCell(score, measure, setParameters, highlight);
        }
        catch (err) {
            console.error(err);
            return { label: 'err', measure };
        }
    }
    /**
     * Calculate a score for the given measurement and dataset.
     * Score values are stored with the given hash value in the session store.
     * The calculation is skipped if an exisitng score for the hash value is found in the session store.
     *
     * @param hashValue Hash value for lookup in the session store
     * @param data Data used for the score calculation
     * @param measure Selected measurment class
     */
    async getMeasurementScore(hashValue, data, measure) {
        const sessionScore = sessionStorage.getItem(hashValue);
        // use cached score if available
        if (sessionScore !== null && sessionScore !== undefined && sessionScore.length !== 2) {
            return Promise.resolve(JSON.parse(sessionScore));
        }
        const score = await measure.calc(data.setA, data.setB, data.allData);
        // cache score result in session storage
        const scoreString = JSON.stringify(score);
        // console.log('new score: ', score);
        // console.log('new scoreString: ', scoreString);
        sessionStorage.setItem(hashValue, scoreString);
        return score;
    }
}
/**
 * Prepare data array with loading icon to visualize with D3
 * @param colAttributes selected columns (in column direction)
 * @param rowAttributes selected columns (in row direction)
 */
function prepareDataArray(colAttributes, rowAttributes) {
    if (rowAttributes.length === 0 || colAttributes.length === 0) {
        return [];
    }
    const data = rowAttributes.map((rowAttribute) => {
        return [[
                { label: `<b>${rowAttribute.label}</b>`, type: rowAttribute.type },
                ...colAttributes.map((_) => {
                    return { label: '<i class="fa fa-circle-o-notch fa-spin"></i>', measure: null }; // containing n1+1 elements (header + n1 values)
                })
            ]];
    });
    return data;
}
/**
 * Generate a (unique) hash object that can be used to create a hash value
 * @param col Column description (in column direction)
 * @param row Column description (in row direction)
 * @param ids List of visible ids in the ranking
 * @param selection List of selected rows in the ranking
 * @param filterMissingValues Filter missing values?
 */
function generateHashObject(col, row, ids, selection, filterMissingValues) {
    // sort the ids, if both row and column are not 'Rank'
    if (row.label !== 'Rank' && col.label !== 'Rank') {
        ids = ids.sort();
    }
    const hashObject = {
        ids,
        selection,
        row: { label: row.label, column: row.column },
        column: { label: col.label, column: col.column },
        filterMissingValues
    };
    // remove selection ids, if both row and column are not 'Selection'
    if (row.label !== 'Selection' && col.label !== 'Selection') {
        delete hashObject.selection;
    }
    return hashObject;
}
/**
 * Generate a (unique) hash value from the given hash object
 * @param hashObject hash object to be hashed
 */
function generateHashValue(hashObject) {
    // console.log('hashObject: ', hashObject, ' | unsortedSelction: ', this.ranking.getSelectionUnsorted());
    const hashObjectString = JSON.stringify(hashObject);
    // console.log('hashObject.srtringify: ', hashObjectString);
    const hashValue = XXH.h32(hashObjectString, 0).toString(16);
    // console.log('Hash: ', hashValue);
    return hashValue;
}
//# sourceMappingURL=ColumnComparisonTask.js.map