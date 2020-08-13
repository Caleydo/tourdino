import * as $ from 'jquery';
import * as d3 from 'd3';
import 'select2';
import { WorkerManager } from '../workers/WorkerManager';
import { LocalDataProvider } from 'lineupjs';
import { TaskUtils } from './TaskUtils';
import { isNumber } from 'util';
import { UniqueIdManager } from 'phovea_core';
export class ATouringTask {
    constructor() {
        this.order = 0; // order of the tasks, the higher the more important
    }
    abort() {
        WorkerManager.terminateAll();
    }
    init(ranking, node) {
        this.ranking = ranking;
        this.nodeObject = d3.select(node).append('div').attr('class', `task ${this.id}`);
        this.hide(); // hide initially
        this.initContent();
    }
    show() {
        this.nodeObject.attr('hidden', null);
        this.addEventListeners();
        this.update(true);
    }
    hide() {
        this.nodeObject.attr('hidden', true);
        this.removeEventListeners();
    }
    initContent() {
        this.addFilterCheckbox();
        // add legend for the p-values
        this.createLegend(this.nodeObject.select('div.legend'));
    }
    /**
     * Add a checkbox to filter missing values from the compared columns/rows data
     */
    addFilterCheckbox() {
        const updateTable = this.updateTable.bind(this);
        const uniqueID = UniqueIdManager.getInstance().uniqueId();
        this.nodeObject.select('.form-horizontal').append('div')
            .attr('class', `form-group filter-missing`)
            .html(`
        <label class="col-sm-4 control-label" for="${uniqueID}">
          Do you want to exclude missing values in each comparison?
        </label>
        <div class="col-sm-8">
          <input type="checkbox" checked id="${uniqueID}">
        </div>
      `)
            .select('input[type="checkbox"]')
            .on('change', updateTable);
    }
    createSelect2() {
        // make selectors functional
        const updateTable = this.updateTable.bind(this);
        this.nodeObject.selectAll('select').each(function () {
            const select2 = this;
            // console.log('convert', select2.name);
            const $select2 = $(select2).select2({ width: '100%', allowClear: true, closeOnSelect: false, placeholder: 'Select one or more columns. ' });
            $select2.on('select2:select select2:unselect', updateTable);
            $select2.on('select2:open', () => {
                setTimeout(() => {
                    const optgroups = d3.selectAll('.select2-results__group');
                    optgroups.on('click', function () {
                        const hoverGrp = d3.select(this).text(); // get text of hovered select2 label
                        // update html in the actual select html element
                        const optGroup = d3.select(select2).select(`optgroup[label="${hoverGrp}"]`); // get optgroup of hovered select2 label
                        const options = optGroup.selectAll('option');
                        const newState = !options.filter(':not(:checked)').empty(); // if not all options are selected --> true = select all, deselect if all options are already selected
                        options.each(function () { this.selected = newState; }); // set state of all child options
                        // update styles in open dropdown
                        $(this).next().find('li').attr('aria-selected', newState.toString()); // accesability and styling
                        $select2.trigger('change').trigger(newState ? 'select2:select' : 'select2:unselect'); // notify select2 of these updates
                    });
                }, 0);
            });
        });
    }
    updateSelect2() {
        // console.log('update select2');
        this.destroySelect2();
        this.createSelect2();
    }
    destroySelect2() {
        // check if initialized with class, see: https://select2.org/programmatic-control/methods#checking-if-the-plugin-is-initialized
        this.nodeObject.selectAll('select.select2-hidden-accessible').each(function () {
            $(this).select2('destroy'); // reset to standard select element
            // unbind events: https://select2.org/programmatic-control/methods#event-unbinding
            $(this).off('select2:select');
            $(this).off('select2:unselect');
        });
    }
    updateTableDescription(isTableEmpty) {
        if (isTableEmpty) {
            const text = 'Please specify the data to compare with the select boxes above.';
            this.nodeObject.select('header').style('width', null).select('p').text(text);
        }
        else {
            const text = 'Click on a p-Value in the table for details.';
            this.nodeObject.select('header').style('width', '13em').select('p').text(text);
        }
    }
    addEventListeners() {
        // DATA CHANGE LISTENERS
        // -----------------------------------------------
        // change in selection
        //  might cause changes the displayed table / scores
        this.ranking.getProvider().on(LocalDataProvider.EVENT_SELECTION_CHANGED + ATouringTask.EVENTTYPE, () => this.update(true)); // fat arrow to preserve scope in called function (this)
        // column of a table was added/removed
        //  causes changes in the available attributes (b)
        //  might cause changes the displayed table / scores
        this.ranking.getProvider().on(LocalDataProvider.EVENT_ADD_COLUMN + ATouringTask.EVENTTYPE, () => { /*console.log('added column');*/ setTimeout(() => this.update(false), 100); });
        this.ranking.getProvider().on(LocalDataProvider.EVENT_REMOVE_COLUMN + ATouringTask.EVENTTYPE, () => { /*console.log('rem column');*/ this.update(false); });
        // for filter changes and grouping changes
        //  After the number of items has changed, the score change aswell
        // If the grouping changes, the "Group" attribute and possibly the table has to be changed
        this.ranking.getProvider().on(LocalDataProvider.EVENT_ORDER_CHANGED + ATouringTask.EVENTTYPE, () => this.update(true));
    }
    removeEventListeners() {
        this.ranking.getProvider().on(LocalDataProvider.EVENT_SELECTION_CHANGED + ATouringTask.EVENTTYPE, null);
        this.ranking.getProvider().on(LocalDataProvider.EVENT_ADD_COLUMN + ATouringTask.EVENTTYPE, null);
        this.ranking.getProvider().on(LocalDataProvider.EVENT_REMOVE_COLUMN + ATouringTask.EVENTTYPE, null);
        this.ranking.getProvider().on(LocalDataProvider.EVENT_ORDER_CHANGED + ATouringTask.EVENTTYPE, null);
    }
    getAttriubuteDescriptions() {
        let descriptions = this.ranking.getDisplayedAttributes().map((col) => {
            const desc = TaskUtils.deepCopy(col.desc);
            if (col.categories) {
                const displayedCategories = this.ranking.getAttributeCategoriesDisplayed(col.desc.column);
                desc.categories = TaskUtils.deepCopy(col.categories).filter((category) => displayedCategories.has(category.name));
            }
            return desc;
        });
        const validTypes = ['categorical', 'number'];
        descriptions = descriptions.filter((desc) => validTypes.includes(desc.type)); // filter attributes by type
        const groupDesc = this.ranking.getGroupDesc();
        const reallyGrouped = groupDesc.categories.length > 1; // grouping is only the "default group"
        const groupingHierarchy = reallyGrouped && groupDesc.categories.some((cat) => cat.label.indexOf('∩') >= 0); // not grouping hierachy if intersection symbol is not in label (https://github.com/lineupjs/lineupjs/blob/60bffa3b8c665bd7fa28c1ab577ba24dba84913c/src/model/internal.ts#L31)
        if (groupingHierarchy) {
            descriptions.unshift(groupDesc);
        }
        descriptions.unshift(this.ranking.getSelectionDesc());
        descriptions.unshift(this.ranking.getRankDesc());
        return descriptions;
    }
    toScoreCell(score, measure, setParameters, highlightData) {
        let color = TaskUtils.score2color(score.pValue);
        let cellLabel = score.pValue.toFixed(3);
        cellLabel = cellLabel.startsWith('0') ? cellLabel.substring(1) : score.pValue.toFixed(2); // [0,1) --> .123, 1 --> 1.00
        if (score.pValue > 0.1) {
            color = {
                background: '#ffffff',
                foreground: '#ffffff',
            };
        }
        if (score.pValue === -1) {
            cellLabel = '-';
            color = {
                background: '#ffffff',
                foreground: '#ffffff',
            };
        }
        return {
            label: cellLabel,
            background: color.background,
            foreground: color.foreground,
            score,
            measure,
            setParameters,
            highlightData
        };
    }
    // creates legend for the p-value
    createLegend(parentElement) {
        const divLegend = parentElement.append('div').classed('measure-legend', true);
        const svgLegendContainer = divLegend.append('svg')
            .attr('width', '100%')
            .attr('height', 50);
        // .attr('viewBox','0 0 100% 35')
        // .attr('preserveAspectRatio','xMaxYMin meet');
        const legendId = Date.now();
        const svgDefs = svgLegendContainer.append('defs').append('linearGradient')
            .attr('id', 'pValue-gradLegend-' + legendId);
        svgDefs.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#000000');
        // svgDefs.append('stop')
        //         .attr('offset','50%')
        //         .attr('stop-color','#F1F1F1');
        svgDefs.append('stop')
            .attr('offset', '25%')
            .attr('stop-color', '#FFFFFF');
        let xStart = 0;
        const yStart = 0;
        const barWidth = 300;
        const barHeight = 10;
        const space = 5;
        const textHeight = 15;
        const textWidth = 50;
        const tickLength = 5;
        const lineWidth = 1;
        xStart = xStart + textWidth;
        const svgLegend = svgLegendContainer.append('g');
        const svgLegendLabel = svgLegend.append('g');
        // label
        svgLegendLabel.append('text')
            .attr('x', xStart)
            .attr('y', yStart + barHeight)
            .attr('text-anchor', 'end')
            .text('p-Value');
        xStart = xStart + space;
        const svgLegendGroup = svgLegend.append('g');
        // bar + bottom line
        svgLegendGroup.append('rect')
            .attr('x', xStart).attr('y', yStart)
            .attr('width', barWidth)
            .attr('height', barHeight)
            .style('fill', 'url(#pValue-gradLegend-' + legendId + ')');
        svgLegendGroup.append('line')
            .attr('x1', xStart).attr('y1', yStart + barHeight)
            .attr('x2', xStart + barWidth).attr('y2', yStart + barHeight)
            .style('stroke-width', lineWidth).style('stroke', 'black');
        // label: 0 + tick
        svgLegendGroup.append('text')
            .attr('x', xStart).attr('y', yStart + barHeight + textHeight)
            .attr('text-anchor', 'middle').text('0');
        svgLegendGroup.append('line')
            .attr('x1', xStart).attr('y1', yStart)
            .attr('x2', xStart).attr('y2', yStart + barHeight - (lineWidth / 2) + tickLength)
            .style('stroke-width', lineWidth / 2).style('stroke', 'black');
        // label: 0.05 + tick
        svgLegendGroup.append('text')
            .attr('x', xStart + (barWidth * 0.25)).attr('y', yStart + barHeight + textHeight)
            .attr('text-anchor', 'middle').text('0.05');
        svgLegendGroup.append('line')
            .attr('x1', xStart + (barWidth * 0.25)).attr('y1', yStart + barHeight - (lineWidth / 2))
            .attr('x2', xStart + (barWidth * 0.25)).attr('y2', yStart + barHeight - (lineWidth / 2) + tickLength)
            .style('stroke-width', lineWidth / 2).style('stroke', 'black');
        // label: 0.05 + tick
        svgLegendGroup.append('text')
            .attr('x', xStart + (barWidth * 0.5)).attr('y', yStart + barHeight + textHeight)
            .attr('text-anchor', 'middle').text('0.1');
        svgLegendGroup.append('line')
            .attr('x1', xStart + (barWidth * 0.5)).attr('y1', yStart + barHeight - (lineWidth / 2))
            .attr('x2', xStart + (barWidth * 0.5)).attr('y2', yStart + barHeight - (lineWidth / 2) + tickLength)
            .style('stroke-width', lineWidth / 2).style('stroke', 'black');
        // label: 0.5 + tick
        svgLegendGroup.append('text')
            .attr('x', xStart + (barWidth * 0.75)).attr('y', yStart + barHeight + textHeight)
            .attr('text-anchor', 'middle').text('0.5');
        svgLegendGroup.append('line')
            .attr('x1', xStart + (barWidth * 0.75)).attr('y1', yStart + barHeight - (lineWidth / 2))
            .attr('x2', xStart + (barWidth * 0.75)).attr('y2', yStart + barHeight - (lineWidth / 2) + tickLength)
            .style('stroke-width', lineWidth / 2).style('stroke', 'black');
        // label: 1 + tick
        svgLegendGroup.append('text')
            .attr('x', xStart + barWidth).attr('y', yStart + barHeight + textHeight)
            .attr('text-anchor', 'middle').text('1');
        svgLegendGroup.append('line')
            .attr('x1', xStart + barWidth).attr('y1', yStart)
            .attr('x2', xStart + barWidth).attr('y2', yStart + barHeight - (lineWidth / 2) + tickLength)
            .style('stroke-width', lineWidth / 2).style('stroke', 'black');
        // label: no p-value correction
        svgLegendLabel.append('text')
            .attr('x', xStart)
            .attr('y', yStart + barHeight + 2 * textHeight)
            .attr('text-anchor', 'start')
            .text('No p-Value correction for multiple comparisons.');
    }
    // removes mini visualization with details, and highlighting
    removeCellDetails(details) {
        // remove bg highlighting from all tds
        this.nodeObject.selectAll('div.table-container').selectAll('td').classed('selectedCell', false);
        // remove saved selection from session storage
        const selCellObj = { task: this.id, colLabel: null, rowLabels: null };
        // console.log('selectionLabels: ', selCellObj);
        const selCellObjString = JSON.stringify(selCellObj);
        sessionStorage.setItem('touringSelCell', selCellObjString);
        // remove mini visualization with details
        details.selectAll('*').remove();
    }
    // generates the detail inforamtion to the test and the remove button
    generateVisualDetails(miniVisualisation, measure, measureResult, setParameters) {
        const divDetailInfoContainer = miniVisualisation.append('div')
            .classed('detailVisContainer', true);
        // button for mini visualization removal
        const that = this;
        const detailRemoveButton = divDetailInfoContainer.append('button');
        detailRemoveButton.attr('class', 'btn btn-default removeMiniVis-btn');
        detailRemoveButton.on('click', function () { that.removeCellDetails.bind(that)(miniVisualisation); });
        detailRemoveButton.html('x');
        const divDetailInfo = divDetailInfoContainer.append('div')
            .classed('detailVis', true);
        // the 2 compared sets
        const setALabel = setParameters.setACategory ? setParameters.setACategory.label : setParameters.setADesc.label;
        const setBLabel = setParameters.setBCategory ? setParameters.setBCategory.label : setParameters.setBDesc.label;
        const detailSetInfo = divDetailInfo.append('div')
            .classed('detailDiv', true);
        if (setParameters.setACategory) {
            detailSetInfo.append('span')
                .classed('detail-label', true)
                .text('Data Column: ')
                .append('span')
                .text(setParameters.setADesc.label);
            detailSetInfo.append('span')
                .text(' / ');
        }
        detailSetInfo.append('span')
            .classed('detail-label', true)
            .text('Comparing ');
        detailSetInfo.append('span')
            .text(setALabel + ' ')
            .append('span')
            .text('[' + measureResult.setSizeA + ']');
        detailSetInfo.append('span')
            .classed('detail-label', true)
            .text(' vs. ');
        detailSetInfo.append('span')
            .text(setBLabel + ' ')
            .append('span')
            .text('[' + measureResult.setSizeB + ']');
        // test value + p-value
        const scoreValue = isNumber(measureResult.scoreValue) && !isNaN(measureResult.scoreValue) ? measureResult.scoreValue.toFixed(3) : 'n/a';
        const pValue = measureResult.pValue === -1 ? 'n/a' : measureResult.pValue.toExponential(3);
        const detailInfoValues = divDetailInfo.append('div')
            .classed('detailDiv', true);
        // .text(`Test-Value: ${scoreValue}, p-Value: ${pValue}`);
        detailInfoValues.append('span')
            .classed('detail-label', true)
            .text(measure.label + ': ');
        detailInfoValues.append('span')
            .text(scoreValue);
        detailInfoValues.append('span')
            .text(', ');
        detailInfoValues.append('span')
            .classed('detail-label', true)
            .text('p-Value: ');
        detailInfoValues.append('span')
            .text(pValue);
        // test description
        divDetailInfo.append('div')
            .classed('detailDiv', true)
            .text('Description: ')
            .append('span')
            .text(measure.description);
    }
    updateSelectionAndVisualization(row) {
        // current task
        const currTask = this.nodeObject.attr('class');
        // save selection
        const selCellObjString = sessionStorage.getItem('touringSelCell');
        const selCellObj = JSON.parse(selCellObjString);
        // console.log('stored selection labels: ', selCellObj);
        if (selCellObj && currTask === selCellObj.task) {
            let rowLabel = null;
            let categoryLabel = null;
            if (selCellObj.rowLabels !== null && selCellObj.rowLabels.length === 1) {
                rowLabel = selCellObj.rowLabels[0];
            }
            else if (selCellObj.rowLabels !== null && selCellObj.rowLabels.length === 2) {
                const firstEle = selCellObj.rowLabels[0];
                rowLabel = firstEle.rowspan !== null ? firstEle : selCellObj.rowLabels[1];
                categoryLabel = firstEle.rowspan !== null ? selCellObj.rowLabels[1] : firstEle;
            }
            // console.log('selected labels: ',{selCellObj,rowLabel,categoryLabel});
            // get index for column
            let colIndex = null;
            this.nodeObject.select('thead').selectAll('th').each(function (d, i) {
                const classedHead = d3.select(this).classed('head');
                const classedRotate = d3.select(this).classed('rotate');
                if (classedHead && classedRotate) {
                    const currCol = d3.select(this) === null ? '' : d3.select(this).text();
                    // console.log('currCol:', currCol, ' | index: ', i);
                    if (currCol === selCellObj.colLabel) {
                        colIndex = i;
                    }
                }
            });
            // get table body
            let tableBody = null;
            this.nodeObject.selectAll('tbody').select('tr:nth-child(1)').select('td:nth-child(1)').each(function (d) {
                const currRow = d3.select(this).select('b').text();
                if (rowLabel !== null && currRow === rowLabel.label) {
                    tableBody = this.parentNode.parentNode;
                }
            });
            let selectedCell = null;
            // look for last selected cell
            if (colIndex !== null && tableBody !== null) {
                // console.log('selectedBody: ', tableBody, ' | colIndex: ' ,colIndex);
                if (categoryLabel === null) {
                    const allTds = d3.select(tableBody).select('tr').selectAll('td');
                    selectedCell = allTds[0][colIndex];
                }
                else {
                    d3.select(tableBody).selectAll('tr').each(function (d, i) {
                        const currTds = d3.select(this).selectAll('td');
                        const catIndex = i === 0 ? 1 : 0;
                        const cellIndex = i === 0 ? colIndex : colIndex - 1;
                        const currCate = d3.select(currTds[0][catIndex]).text();
                        if (currCate === categoryLabel.label) {
                            selectedCell = currTds[0][cellIndex];
                        }
                    });
                }
                // console.log('updateSelectionAndVisuallization: ', {row, tableBody, colIndex, selectedCell});
                // highlight selected cell and update visualization
                if (selectedCell) {
                    const cellData = d3.select(selectedCell).datum();
                    // console.log('selectedCell data: ', cellData);
                    // highlight selected cell
                    this.highlightSelectedCell(selectedCell, cellData);
                    if (row !== null && row.label === rowLabel.label) {
                        // generate visualization for cell
                        this.visualizeSelectedCell(selectedCell, cellData);
                    }
                }
            }
        }
    }
    highlightSelectedCell(tableCell, cellData) {
        // remove bg highlighting from all tds
        this.nodeObject.selectAll('td').classed('selectedCell', false);
        if (cellData.score) { // Currenlty only cells with a score are calculated (no category or attribute label cells)
            // Color table cell
            d3.select(tableCell).classed('selectedCell', true); // add bg highlighting
        }
    }
    visualizeSelectedCell(tableCell, cellData) {
        // remove all old details
        const details = this.nodeObject.select('div.details');
        details.selectAll('*').remove(); // avada kedavra outdated details!
        if (cellData.score) { // Currenlty only cells with a score are calculated (no category or attribute label cells)
            const resultScore = cellData.score;
            const measure = cellData.measure;
            // Display details
            if (measure) {
                this.generateVisualDetails(details, measure, resultScore, cellData.setParameters); // generate description into details div
            }
            else {
                details.append('p').text('There are no details for the selected table cell.');
            }
            // display visualisation
            if (measure.visualization) {
                const visualization = measure.visualization;
                if (cellData.setParameters) {
                    visualization.generateVisualization(details, cellData.setParameters, cellData.score);
                }
            }
        }
    }
    onClick(tableCell) {
        const cellData = d3.select(tableCell).datum();
        // console.log('Cell click - data: ', cellData);
        // save data for selected cell in sesisonStorage
        let selCellObj;
        const task = this.nodeObject.attr('class');
        // save selected cell in sessionStorage
        if (cellData.measure !== null && cellData.score) {
            const colLabel = this.nodeObject.selectAll('span.cross-selection').text();
            const rowLabels = [];
            this.nodeObject.selectAll('td.cross-selection').each(function (d) {
                const label = d3.select(this).text();
                const rowspan = d3.select(this).attr('rowspan');
                const obj = { label, rowspan };
                rowLabels.push(obj);
            });
            // create selected cell object
            selCellObj = { task, colLabel, rowLabels };
        }
        else {
            selCellObj = { task, colLabel: null, rowLabels: null };
        }
        // console.log('selectionLabels: ', selCellObj);
        const selCellObjString = JSON.stringify(selCellObj);
        sessionStorage.setItem('touringSelCell', selCellObjString);
        this.highlightSelectedCell(tableCell, cellData);
        this.visualizeSelectedCell(tableCell, cellData);
    }
    onMouseOver(tableCell, state) {
        if (d3.select(tableCell).classed('score')) {
            const tr = tableCell.parentNode; // current row
            const tbody = tr.parentNode; // current body
            const table = tbody.parentNode; // current table
            const allTds = d3.select(tr).selectAll('td');
            // console.log('allTds', allTds[0]);
            let index = -1;
            const currLength = allTds[0].length;
            // get current index of cell in row
            for (let i = 0; i < currLength; i++) {
                if (allTds[0][i] === tableCell) {
                    index = i;
                }
            }
            // highlight all label cells in row
            d3.select(tr).selectAll('td:not(.score)').classed('cross-selection', state);
            // highlight the first cell in the first row of the cells tbody
            d3.select(tbody).select('tr').select('td').classed('cross-selection', state);
            // maxIndex is the maximum number of table cell in the table
            const maxLength = d3.select(tbody).select('tr').selectAll('td')[0].length;
            // if currMaxIndex and maxIndex are not the same -> increase headerIndex by one
            // because the current row has one cell fewer
            const headerIndex = (currLength === maxLength) ? index : index + 1;
            // highlight column label
            const allHeads = d3.select(table).select('thead').selectAll('th');
            if (index > -1) {
                // use header index
                d3.select(allHeads[0][headerIndex]).select('div').select('span').classed('cross-selection', state);
            }
            const cellData = d3.select(tableCell).datum();
            this.setLineupHighlight(cellData, state, 'touring-highlight-hover');
        }
    }
    setLineupHighlight(cellData, enable, cssClass) {
        const focusedLineupNode = d3.select(this.nodeObject.node().closest('.lu-taggle')); // select the closest lineup node to highlight -`lu-taggle` is set in ARankingView
        if (cellData && cellData.highlightData) {
            if (enable) {
                this.hoverTimerId = window.setTimeout(() => {
                    // highlight col headers
                    let id;
                    for (const attr of cellData.highlightData.filter((data) => data.category === undefined)) {
                        const header = focusedLineupNode.select(`.lineup-engine header  .lu-header[title^="${attr.label}"]`).classed(`${cssClass}`, true); // |= starts with whole word (does not work for selection checkboxes)
                        id = header.attr('data-col-id');
                    }
                    if (id) {
                        // highlight cat rows
                        let i = 1;
                        for (const attr of cellData.highlightData.filter((data) => data.category !== undefined)) {
                            const indices = this.ranking.getAttributeDataDisplayed(attr.column).reduce((indices, cat, index) => cat === attr.category ? [...indices, index] : indices, []);
                            for (const index of indices) {
                                const elem = focusedLineupNode.select(` .lineup-engine main .le-tr[data-index="${index}"][data-agg="detail"] [data-id="${id}"]`);
                                if (!elem.empty()) {
                                    const setDarker = elem.classed(`${cssClass}-1`); // if previous class is already set
                                    elem.classed(`${cssClass}-${i}`, true)
                                        .classed(`${cssClass}-dark`, setDarker);
                                    const catId = focusedLineupNode.select(` .lineup-engine header .lu-header[title^="${attr.label}"]`).attr('data-col-id');
                                    focusedLineupNode.select(`.lineup-engine main .le-tr[data-index="${index}"] [data-id="${catId}"]`).classed(`${cssClass}-border`, true);
                                }
                            }
                            i++;
                        }
                    }
                }, 200);
            }
            else {
                window.clearTimeout(this.hoverTimerId);
                d3.selectAll(`.${cssClass},.${cssClass}-dark,.${cssClass}-1,.${cssClass}-2,.${cssClass}-border`).classed(`${cssClass} ${cssClass}-1 ${cssClass}-2 ${cssClass}-dark ${cssClass}-border`, false);
            }
        }
    }
    createToolTip(tableCell) {
        if (d3.select(tableCell).classed('score') && d3.select(tableCell).classed('action')) {
            const tr = tableCell.parentNode; // current row
            const tbody = tr.parentNode; // current body
            const table = tbody.parentNode; // current table
            const allTds = d3.select(tr).selectAll('td');
            // console.log('allTds', allTds[0]);
            let index = -1;
            const currLength = allTds[0].length;
            // get current index of cell in row
            for (let i = 0; i < currLength; i++) {
                if (allTds[0][i] === tableCell) {
                    index = i;
                }
            }
            // all label cells in row
            const rowCategories = [];
            d3.select(tr).selectAll('td:not(.score)').each(function () {
                rowCategories.push(d3.select(this).text());
            });
            // the first cell in the first row of the cells tbody
            const row = d3.select(tbody).select('tr').select('td').text();
            // maxIndex is the maximum number of table cell in the table
            const maxLength = d3.select(tbody).select('tr').selectAll('td')[0].length;
            // if currMaxIndex and maxIndex are not the same -> increase headerIndex by one
            // because the current row has one cell fewer
            const headerIndex = (currLength === maxLength) ? index : index + 1;
            // column label
            const allHeads = d3.select(table).select('thead').selectAll('th');
            const header = d3.select(allHeads[0][headerIndex]).select('div').select('span').text();
            const category = rowCategories.pop();
            const isColTask = category === row ? true : false;
            const cellData = d3.select(tableCell).datum();
            const scoreValue = isNumber(cellData.score.scoreValue) && !isNaN(cellData.score.scoreValue) ? cellData.score.scoreValue.toFixed(3) : 'n/a';
            let scorePvalue = cellData.score.pValue;
            if (scorePvalue === -1) {
                scorePvalue = 'n/a';
            }
            else {
                scorePvalue = scorePvalue.toExponential(3);
            }
            let tooltipText = '';
            if (isColTask) {
                tooltipText = `Column: ${header}\nRow: ${row}\nScore: ${scoreValue}\np-Value: ${scorePvalue}`;
            }
            else {
                tooltipText = `Data Column: ${row}\nColumn: ${header}\nRow: ${category}\nScore: ${scoreValue}\np-Value: ${scorePvalue}`;
            }
            return tooltipText;
        }
        else {
            // cell that have no p-values
            return null;
        }
    }
}
ATouringTask.EVENTTYPE = '.touringTask';
//# sourceMappingURL=ATouringTask.js.map