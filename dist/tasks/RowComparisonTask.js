import rowCmpHtml from '../templates/RowComparison.html'; // webpack imports html to variable
import rowCmpIcon from '../assets/rowCmp.png';
import * as $ from 'jquery';
import * as d3 from 'd3';
import * as XXH from 'xxhashjs';
import { TaskUtils } from './TaskUtils';
import { ATouringTask } from './ATouringTask';
import { Type, SCOPE } from '../base/interfaces';
import { MethodManager } from '../measures/MethodManager';
import { WorkerManager } from '../workers/WorkerManager';
import { BaseUtils } from '../base/BaseUtils';
export class RowComparison extends ATouringTask {
    constructor() {
        super();
        this.id = 'rowCmp';
        this.label = 'Rows';
        this.order = 10;
        this.icon = rowCmpIcon;
        this.scope = SCOPE.SETS;
    }
    initContent() {
        this.nodeObject.node().insertAdjacentHTML('beforeend', rowCmpHtml);
        super.initContent();
        const headerDesc = this.nodeObject.select('thead tr').select('th').classed('head-descr', true).append('header');
        headerDesc.append('h1').text('Difference of Rows');
        headerDesc.append('p').text('Click on a p-Value in the table for details.');
        this.nodeObject.selectAll('select.rowGrp').each(function () {
            $(this).data('placeholder', 'Select one or more groups of rows.');
        });
    }
    update(forceTableUpdate) {
        const tableChanged = this.updateSelectors();
        if (forceTableUpdate || tableChanged) {
            this.updateTable();
        }
    }
    updateSelectors() {
        const descriptions = this.getAttriubuteDescriptions();
        // Update Row Selectors
        // Rows are grouped by categories, so we filter the categorical attributes:
        const catDescriptions = descriptions.filter((desc) => desc.categories);
        catDescriptions.forEach((catDescription) => {
            catDescription.categories.forEach((category) => {
                category.attribute = catDescription; // store the attribute taht the category belongs to
            });
        });
        // For each attribute, create a <optgroup>
        const rowSelectors = this.nodeObject.selectAll('select.rowGrp');
        const optGroups = rowSelectors.selectAll('optgroup').data(catDescriptions, (desc) => desc.label);
        optGroups.enter().append('optgroup').attr('label', (desc) => desc.label);
        // For each category, create a <option> inside the optgroup
        const rowOptions = optGroups.selectAll('option').data((d) => d.categories, (cat) => cat.label);
        rowOptions.enter().append('option').text((cat) => cat.label);
        let tableChanged = !rowOptions.exit().filter(':checked').empty(); // if checked categories are removed, the table has to update
        // Remove atribtues and categories that were removed and order the html elements
        rowOptions.exit().remove();
        rowOptions.order();
        optGroups.exit().remove();
        optGroups.order();
        rowSelectors.each(function () {
            const emptySelection = d3.select(this).selectAll('option:checked').empty();
            if (emptySelection) {
                d3.select(this).select('optgroup').selectAll('option').each(function () { this.selected = true; }); // select the categories of the first attribute by default
                tableChanged = true;
            }
        });
        // Update Attribute Selectors
        const attrSelector = this.nodeObject.select('select.attr optgroup');
        const attrOptions = attrSelector.selectAll('option').data(descriptions, (desc) => desc.label); // duplicates are filtered automatically
        attrOptions.enter().append('option').text((desc) => desc.label);
        tableChanged = tableChanged || !attrOptions.exit().filter(':checked').empty(); // if checked attributes are removed, the table has to update
        if (attrSelector.selectAll('option:checked').empty()) { // make a default selection
            attrSelector.selectAll('option').each(function () { this.selected = true; }); // by default, select all columns.
            tableChanged = true; // attributes have changed
        }
        attrOptions.exit().remove();
        attrOptions.order();
        super.updateSelect2();
        return tableChanged;
    }
    updateTable() {
        WorkerManager.terminateAll(); // Abort all calculations as their results are no longer needed
        const timestamp = new Date().getTime().toString();
        this.nodeObject.attr('data-timestamp', timestamp);
        let colGrpData = this.nodeObject.selectAll('select.rowGrp[name="row1[]"] option:checked').data();
        let rowGrpData = this.nodeObject.selectAll('select.rowGrp[name="row2[]"]  option:checked').data();
        const filterMissingValues = !this.nodeObject.select('input[type="checkbox"]:checked').empty(); // check if checkbox to filter missing values is checked
        if (colGrpData.length > rowGrpData.length) {
            [rowGrpData, colGrpData] = [colGrpData, rowGrpData]; // avoid having more columns than rows --> flip table
        }
        const rowAttrData = this.nodeObject.selectAll('select.attr[name="attr[]"]  option:checked').data();
        const colHeadsCat = this.nodeObject.select('thead tr').selectAll('th.head').data(colGrpData, (cat) => cat.attribute.column + ':' + cat.name); // cat.name != label; add column to handle identical category names
        const colHeadsCatSpan = colHeadsCat.enter().append('th')
            .attr('class', 'head rotate').append('div').append('span').append('span'); // th.head are the column headers
        const that = this; // for the function below
        function updateTableBody(bodyData, timestamp) {
            if (that.nodeObject.attr('data-timestamp') !== timestamp) {
                return; // skip outdated result
            }
            that.updateTableDescription(bodyData.length === 0);
            // create a table body for every column
            const bodies = that.nodeObject.select('table').selectAll('tbody').data(bodyData, (d) => d[0][0].label); // the data of each body is of type: IScoreCell[][]
            bodies.enter().append('tbody').classed('bottom-margin', true); // For each IColumnTableData, create a tbody
            // the data of each row is of type: IScoreCell[]
            const trs = bodies.selectAll('tr').data((d) => d, (d) => d[0].key); // had to specify the function to derive the data (d -> d)
            trs.enter().append('tr');
            const tds = trs.selectAll('td').data((d) => d); // the data of each td is of type: IScoreCell
            tds.enter().append('td');
            // Set colheads in thead
            colHeadsCatSpan.text((d) => `${d.label} (${d.attribute.label})`);
            colHeadsCatSpan.each(function (d) {
                const parent = d3.select(this).node().parentNode; // parent span-element
                d3.select(parent).style('background-color', (d) => d && d.color ? d.color : '#FFF');
                let color = '#333333';
                if (d && d.color && 'transparent' !== d.color && d3.hsl(d.color).l < 0.5) { // transparent has lightness of zero
                    color = 'white';
                }
                d3.select(parent.parentNode).style('color', color)
                    .attr('title', (d) => `${d.label} (${d.attribute.label})`);
            });
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
            tds.exit().remove(); // remove cells of removed columns
            colHeadsCat.exit().remove(); // remove attribute columns
            trs.exit().remove(); // remove attribute rows
            bodies.exit().remove();
            colHeadsCat.order();
            trs.order(); // Order the trs is important, if you have no items selected and then do select some, the select category would be at the bottom and the unselect category at the top of the table
            bodies.order();
            const svgWidth = 120 + 33 * colGrpData.length; // 120 height with 45° widht also 120, calculated width for the svg and polygon
            that.nodeObject.select('th.head.rotate svg').remove();
            that.nodeObject.select('th.head.rotate') // select first
                .insert('svg', ':first-child')
                .attr('width', svgWidth)
                .attr('height', 120)
                .append('polygon').attr('points', '0,0 ' + svgWidth + ',0 0,120'); // 120 is thead height
        }
        // initialize
        const data = prepareDataArray(colGrpData, rowGrpData, rowAttrData);
        updateTableBody(data, timestamp);
        // set values
        this.getAttrTableBody(colGrpData, rowGrpData, rowAttrData, filterMissingValues, (data) => updateTableBody(data, timestamp)).then((data) => updateTableBody(data, timestamp));
    }
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
    async getAttrTableBody(colGroups, rowGroups, rowAttributes, filterMissingValues, updateRow) {
        const data = prepareDataArray(colGroups, rowGroups, rowAttributes);
        // the row and column indices stay the same, only the data changes ->  we want to retrieve these indices only once.
        const rowGroupsIndices = rowGroups.map((rowGroup) => this.ranking.getRowsWithCategory(rowGroup));
        const colGroupsIndices = colGroups.map((colGroup) => this.ranking.getRowsWithCategory(colGroup));
        // cache cell for faster lookup and reuse results for inverse cells
        const cellCache = new Map();
        const rowAttrPromises = rowAttributes.map((rowAttr, bodyIndex) => {
            const rowGroupPromises = rowGroups.map((rowGroup, rowIndex) => {
                const colGroupPromises = colGroups.map((colGroup, colIndex) => {
                    // regular cache key (row + col)
                    const cacheKey = `${rowAttr.column}_${rowGroup.name}_${colGroup.name}`;
                    // inverse cache key (col + row) to check for cell across the diagonal
                    const inverseCacheKey = `${rowAttr.column}_${colGroup.name}_${rowGroup.name}`;
                    let promise;
                    // check if already some inverse cell exists
                    if (cellCache.has(inverseCacheKey)) {
                        promise = cellCache.get(inverseCacheKey);
                        promise.then((result) => {
                            // two columns if the attribute label is in the same line, (otherwise 1 (because rowspan))
                            const colIndexOffset = (rowIndex === 0) ? 2 : 1;
                            data[bodyIndex][rowIndex][colIndexOffset + colIndex] = result;
                        });
                    }
                    else {
                        // note: pass the row and col indicies in addition to the group attributes
                        promise = this.getScoreCellResult({ ...colGroup, indices: colGroupsIndices[colIndex] }, { ...rowGroup, indices: rowGroupsIndices[rowIndex] }, rowAttr, filterMissingValues);
                        promise.then((result) => {
                            // two columns if the attribute label is in the same line, (otherwise 1 (because rowspan))
                            const colIndexOffset = (rowIndex === 0) ? 2 : 1;
                            data[bodyIndex][rowIndex][colIndexOffset + colIndex] = result;
                        });
                        // store in cache for possible inverse cells
                        cellCache.set(cacheKey, promise);
                    }
                    return promise;
                });
                return Promise.all(colGroupPromises);
            });
            return Promise.all(rowGroupPromises)
                .then(() => {
                // update the table with the new row data and update visualization for the selected row
                updateRow(data);
                this.updateSelectionAndVisualization(data);
            });
        });
        await Promise.all(rowAttrPromises); // rather await all at once: https://developers.google.com/web/fundamentals/primers/async-functions#careful_avoid_going_too_sequential
        return data; // then return the data
    }
    /**
     * Retrieve a cell result for the given row and column.
     * A result can be either a score, an null value for self-references, or an error.
     *
     * @param colGroup Selected groups (in column direction)
     * @param rowGroup Selected groups (in row direction)
     * @param rowAttr Selected column description
     * @param filterMissingValues Filter missing values?
     */
    async getScoreCellResult(colGroup, rowGroup, rowAttr, filterMissingValues) {
        if (rowGroup.label === colGroup.label) {
            // identical groups
            return { label: '<span class="circle"/>', measure: null };
        }
        // wait until score columns are loaded before proceeding to the calculation
        await TaskUtils.waitUntilScoreColumnIsLoaded(this.ranking, rowAttr);
        // console.log('row is loaded', rowAttr);
        // Always compare selected elements with a group of elements of the same column
        const measures = MethodManager.getMeasuresByType(Type.get(rowAttr.type), Type.get(rowAttr.type), SCOPE.SETS); // Always compare selected elements with a group of elements of the same column
        // skip if no measures found
        if (measures.length === 0) {
            console.error('no measurement method found for type', rowAttr.type);
            return { label: 'err' };
        }
        // use always the first measure
        const measure = measures[0];
        const hashObject = generateHashObject(colGroup, rowGroup, rowAttr, this.ranking.getDisplayedIds(), this.ranking.getSelection(), filterMissingValues);
        const hashValue = generateHashValue(hashObject);
        const attrData = this.ranking.getAttributeDataDisplayed(rowAttr.column); // minus one because the first column is headers
        // Get the data of 'attr' for the rows inside 'rowGrp'
        const unfilteredRowData = rowGroup.indices.map((i) => attrData[i]);
        const rowData = filterMissingValues ? unfilteredRowData.filter((value) => !BaseUtils.isMissingValue(value)) : unfilteredRowData;
        const unfilteredColData = colGroup.indices.map((i) => attrData[i]);
        const colData = filterMissingValues ? unfilteredColData.filter((value) => !BaseUtils.isMissingValue(value)) : unfilteredColData;
        try {
            const score = await this.getMeasurementScore(hashValue, { setA: rowData, setB: colData, allData: attrData }, measure);
            const setParameters = {
                setA: rowData,
                setADesc: rowAttr,
                setACategory: { label: `${rowGroup.label} (${rowGroup.attribute.label})`, color: rowGroup.color },
                setB: colData,
                setBDesc: rowAttr,
                setBCategory: { label: `${colGroup.label} (${colGroup.attribute.label})`, color: colGroup.color }
            };
            const highlight = [
                { column: rowAttr.column, label: rowAttr.label },
                { column: rowGroup.attribute.column, label: rowGroup.attribute.label, category: rowGroup.name, color: rowGroup.color },
                { column: colGroup.attribute.column, label: colGroup.attribute.label, category: colGroup.name, color: colGroup.color }
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
        if (sessionScore !== null && sessionScore !== undefined) {
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
 * @param colGroups Selected groups (in column direction)
 * @param rowGroups Selected groups (in row direction)
 * @param rowAttributes Selected column description
 */
function prepareDataArray(colGroups, rowGroups, rowAttributes) {
    if (colGroups.length === 0 || rowGroups.length === 0 || rowAttributes.length === 0) {
        return []; // return empty array, will cause an empty table
    }
    const data = new Array(rowAttributes.length); // one array per attribute (number of table bodies)
    for (const [i, attr] of rowAttributes.entries()) {
        data[i] = new Array(rowGroups.length); // one array per rowGroup (number of rows in body)
        for (const [j, rowGrp] of rowGroups.entries()) {
            data[i][j] = new Array(colGroups.length + (j === 0 ? 2 : 1)).fill({ label: '<i class="fas fa-circle-notch fa-spin"></i>', measure: null });
            data[i][j][j === 0 ? 1 : 0] = {
                label: `${rowGrp.label} (${rowGrp.attribute.label})`,
                background: rowGrp.color,
                foreground: TaskUtils.textColor4Background(rowGrp.color)
            };
            if (j === 0) {
                data[i][j][0] = {
                    label: `<b>${attr.label}</b>`,
                    rowspan: rowGroups.length,
                    type: attr.type
                };
            }
            data[i][j][0].key = `${attr.label}-${rowGrp.attribute.label}-${rowGrp.label}`;
        }
    }
    return data;
}
/**
 * Generate a (unique) hash object that can be used to create a hash value
 * @param colGroup Selected group (in column direction)
 * @param rowGroup Selected group (in row direction)
 * @param rowAttribute Selected column description
 * @param ids List of visible ids in the ranking
 * @param selection List of selected rows in the ranking
 * @param filterMissingValues Filter missing values?
 */
function generateHashObject(colGroup, rowGroup, rowAttr, ids, selection, filterMissingValues) {
    // sort the ids, if the data column is not 'Rank'
    if (rowAttr.label !== 'Rank') {
        ids = ids.sort();
    }
    const hashObject = {
        ids,
        selection,
        attribute: { label: rowAttr.label, column: rowAttr.column },
        setACategory: rowGroup.label,
        setBCategory: colGroup.label,
        filterMissingValues
    };
    // remove selection ids, if both categories and the data column are not selection
    if (rowAttr.label !== 'Selection' &&
        rowGroup.label !== 'Unselected' && rowGroup.label !== 'Selected' &&
        colGroup.label !== 'Unselected' && colGroup.label !== 'Selected') {
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
//# sourceMappingURL=RowComparisonTask.js.map