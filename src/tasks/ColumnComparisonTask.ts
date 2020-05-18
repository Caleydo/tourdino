import colCmpHtml from 'html-loader!./ColumnComparison.html'; // webpack imports html to variable
import colCmpIcon from './colCmp.png';

import * as XXH from 'xxhashjs';
import {IColumnDesc, ValueColumn} from 'lineupjs';
import {IScoreCell, IHighlightData, ATouringTask} from './ATouringTask';
import {IMeasureResult, Type, SCOPE, ISimilarityMeasure} from '../interfaces';
import {IServerColumn} from 'tdp_core/src/rest';
import {MethodManager} from '../Managers';
import {WorkerManager} from '../Workers/WorkerManager';
import {cloneDeep} from 'lodash';

export class ColumnComparison extends ATouringTask {

  constructor() {
    super();
    this.id = 'colCmp';
    this.label = 'Columns';
    this.order = 20;
    this.icon = colCmpIcon;
    this.scope = SCOPE.ATTRIBUTES;
  }

  public initContent() {
    (<HTMLDivElement>this.nodeObject.node()).insertAdjacentHTML('beforeend', colCmpHtml);
    super.initContent();

    const headerDesc = this.nodeObject.select('thead tr').select('th').classed('head-descr', true).append('header');
    headerDesc.append('h1').text('Similarity of Columns');
    headerDesc.append('p').text('Click on a p-Value in the table for details.');
  }


  public update(forceTableUpdate: boolean): void {
    const tableChanged = this.updateAttributeSelectors();
    if (forceTableUpdate || tableChanged) {
      this.updateTable();
    }
  }

  public updateAttributeSelectors(): boolean {
    // console.log('update selectors');
    const descriptions = this.getAttriubuteDescriptions();

    const attrSelectors = this.nodeObject.selectAll('select.attr optgroup');
    const options = attrSelectors.selectAll('option').data(descriptions, (desc) => desc.label); // duplicates are filtered automatically
    options.enter().append('option').text((desc) => desc.label);

    let tableChanged = !options.exit().filter(':checked').empty(); // if checked attributes are removed, the table has to update

    const attrSelect1 = this.nodeObject.select('select.attr[name="attr1[]"]');
    if (attrSelect1.selectAll('option:checked').empty()) { // make a default selection
      attrSelect1.selectAll('option').each(function (desc, i) { (this as HTMLOptionElement).selected = i === descriptions.length - 1 ? true : false; }); // by default, select last column. set the others to null to remove the selected property
      tableChanged = true; // attributes have changed
    }

    const attrSelect2 = this.nodeObject.select('select.attr[name="attr2[]"]');
    if (attrSelect2.selectAll('option:checked').empty()) { // make a default selection
      attrSelect2.selectAll('option').each(function () { (this as HTMLOptionElement).selected = true; }); // by default, select all
      tableChanged = true; // attributes have changed
    }

    options.exit().remove();
    options.order();

    super.updateSelect2();

    return tableChanged;
  }

  public updateTable() {
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
    function updateTableBody(bodyData: IScoreCell[][][]) {
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
   * async: return promise
   * @param attr1 columns
   * @param arr2 rows
   * @param scaffold only create the matrix with row headers, but no value calculation
   */
  private async getAttrTableBody(colAttributes: IColumnDesc[], rowAttributes: IColumnDesc[], filterMissingValues: boolean, update: (bodyData: IScoreCell[][][]) => void): Promise<IScoreCell[][][]> {
    const data = prepareDataArray(colAttributes, rowAttributes);

    // cache cell for faster lookup and reuse results for inverse cells
    const cellCache: Map<string, Promise<IScoreCell>> = new Map();

    const rowPromises = rowAttributes.map((row, rowIndex) => {
      const colPromises = colAttributes.map((col, colIndex) => {
        // regular cache key (row + col)
        const cacheKey = `${(<IServerColumn>row).column}_${(<IServerColumn>col).column}`;

        // inverse cache key (col + row) to check for cell across the diagonal
        const inverseCacheKey = `${(<IServerColumn>col).column}_${(<IServerColumn>row).column}`;

        let promise;

        // check if already some inverse cell exists
        if(cellCache.has(inverseCacheKey)) {
          promise = cellCache.get(inverseCacheKey);

          promise.then((result: IScoreCell) => {
            // clone result as it is identical, except ...
            const inverseResult = cloneDeep(result) as IScoreCell;

            // ... switch set parameters A -> B and B -> A
            if(inverseResult.setParameters) {
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

        } else {
          promise = this.getScoreCellResult(row, col);

          promise.then((result: IScoreCell) => {
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
          update(data);
          this.updateSelectionAndVisualization(row);
        });
    });

    await Promise.all(rowPromises); // rather await all at once: https://developers.google.com/web/fundamentals/primers/async-functions#careful_avoid_going_too_sequential

    return data; // then return the data
  }

  private waitForScoreColumnLoaded(desc: IColumnDesc): Promise<any> {
    const scoreColumn = (<ValueColumn<any>[]>this.ranking.getScoreColumns()).find((col) => (<IServerColumn>col.desc).column === (<IServerColumn>desc).column);

    if(!scoreColumn) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      if(scoreColumn.isLoaded()) {
        console.log('data already loaded for', scoreColumn.desc.label);
        resolve();
        return;
      }

      scoreColumn.on(ValueColumn.EVENT_DATA_LOADED + '.touring', () => {
        scoreColumn.on(ValueColumn.EVENT_DATA_LOADED + '.touring', null);
        console.log('data loaded (notified by event) for', scoreColumn.desc.label);
        resolve();
      });
    });
  }

  private async getScoreCellResult(row: IColumnDesc, col: IColumnDesc) {
    if (row.label === col.label) {
      // identical attributes
      return { label: '<span class="circle"/>', measure: null };
    }

    // wait until score column is loaded before proceeding to the calculation + result
    await this.waitForScoreColumnLoaded(row);
    console.log('row is loaded', row);
    await this.waitForScoreColumnLoaded(col);
    console.log('col is loaded', col);

    const measures = MethodManager.getMeasuresByType(Type.get(row.type), Type.get(col.type), SCOPE.ATTRIBUTES);

    // skip if no measures found
    if (measures.length === 0) {
      console.error('no measurement method found for type', row.type, col.type);
      return { label: 'err' };
    }

    // use always the first measure
    const measure = measures[0];

    try {
      const score = await this.getMeasurementScore(row, col, measure);

      const data1 = this.ranking.getAttributeDataDisplayed((col as IServerColumn).column); // minus one because the first column is headers
      const data2 = this.ranking.getAttributeDataDisplayed((row as IServerColumn).column);

      // check if all values are NaN
      // necessary for score columns that are lazy loaded
      // TODO the score column is flaged as `loaded`, but the data is still not available. needs further investigation
      if(data1.every((item) => Number.isNaN(item))) {
        // wait until score column is loaded before calculating the score
        console.warn('all NaN!!!! should have waited for it', col);
      }

      // TODO the score column is flaged as `loaded`, but the data is still not available. needs further investigation
      if(data2.every((item) => Number.isNaN(item))) {
        // wait until score column is loaded before calculating the score
        console.warn('all NaN!!!! should have waited for it', row);
      }

      const setParameters = {
        setA: data1,
        setADesc: col,
        setB: data2,
        setBDesc: row
      };

      const highlight: IHighlightData[] = [
        { column: (row as IServerColumn).column, label: row.label },
        { column: (col as IServerColumn).column, label: col.label }
      ];

      return this.toScoreCell(score, measure, setParameters, highlight);

    } catch(err) {
      console.error(err);
      return { label: 'err', measure };
    }
  }

  private async getMeasurementScore(row: IColumnDesc, col: IColumnDesc, measure: ISimilarityMeasure) {
    const hashObject = generateHashObject(row, col, this.ranking.getDisplayedIds(), this.ranking.getSelection());
    const hashValue = generateHashValue(hashObject);

    const sessionScore = sessionStorage.getItem(hashValue);

    // use cached score if available
    if(sessionScore !== null && sessionScore !== undefined && sessionScore.length !== 2) {
      return Promise.resolve<IMeasureResult>(JSON.parse(sessionScore));
    }

    const first = this.ranking.getAttributeDataDisplayed((col as IServerColumn).column); // minus one because the first column is headers
    const second = this.ranking.getAttributeDataDisplayed((row as IServerColumn).column);

    // const [data1, data2] = filterMissingValues ? removeMissingValues(first, second) : [first, second];
    const [data1, data2] = [first, second];

    const score = await measure.calc(data1, data2, null);

    // cache score result in session storage
    const scoreString = JSON.stringify(score);
    // console.log('new score: ', score);
    // console.log('new scoreString: ', scoreString);
    sessionStorage.setItem(hashValue, scoreString);

    return score;
  }

  /**
   * async: return promise
   * @param attr1 columns
   * @param arr2 rows
   * @param scaffold only create the matrix with row headers, but no value calculation
   */
  private async getAttrTableBody__OLD(colAttributes: IColumnDesc[], rowAttributes: IColumnDesc[], filterMissingValues: boolean, update: (bodyData: IScoreCell[][][]) => void): Promise<IScoreCell[][][]> {
    const data = prepareDataArray(colAttributes, rowAttributes);
    console.log('input data', data);

    let promises = [];
    for (const [rowIndex, row] of rowAttributes.entries()) {
      const rowPromises = [];

      for (const [colIndex, col] of colAttributes.entries()) {
        const colIndexInRows = rowAttributes.indexOf(col);
        const rowIndexInCols = colAttributes.indexOf(row);

        // the row is also part of the column array, and the column is one of the previous rows
        if (rowIndexInCols >= 0 && colIndexInRows >= 0 && colIndexInRows < rowIndex) {
          continue;
        }

        if (row.label === col.label) {
          // identical attributes
          data[rowIndex][0][colIndex + 1] = { label: '<span class="circle"/>', measure: null };
        } else {
          const measures = MethodManager.getMeasuresByType(Type.get(row.type), Type.get(col.type), SCOPE.ATTRIBUTES);

          if (measures.length === 0) { // skip if no measures found
            continue;
          }

          const measure = measures[0]; // use always the first measure

          const promise = this.getMeasurementScore(row, col, measure);
          promise.then((score) => {

            const data1 = this.ranking.getAttributeDataDisplayed((col as IServerColumn).column); // minus one because the first column is headers
            const data2 = this.ranking.getAttributeDataDisplayed((row as IServerColumn).column);

            const setParameters = {
              setA: data1,
              setADesc: col,
              setB: data2,
              setBDesc: row
            };

            const highlight: IHighlightData[] = [
              { column: (row as IServerColumn).column, label: row.label },
              { column: (col as IServerColumn).column, label: col.label }
            ];

            data[rowIndex][0][colIndex + 1] = this.toScoreCell(score, measure, setParameters, highlight);

            if (rowIndexInCols >= 0 && colIndexInRows >= 0) {
              // invert A and B so that the axis labels are conistent
              const setParametersInverted = {
                setA: setParameters.setB,
                setADesc: setParameters.setBDesc,
                setB: setParameters.setA,
                setBDesc: setParameters.setADesc
              };
              data[colIndexInRows][0][rowIndexInCols + 1] = this.toScoreCell(score, measure, setParametersInverted, highlight);
            }
          }).catch((err) => {
            console.error(err);
            const errorCell = { label: 'err', measure };
            data[rowIndex][0][colIndex + 1] = errorCell;
            if (rowIndexInCols >= 0 && colIndexInRows >= 0) {
              data[colIndexInRows][0][rowIndexInCols + 1] = errorCell;
            }
          });
          rowPromises.push(promise);
        }
      }

      promises = [...promises, rowPromises];
      Promise.all(rowPromises).then(() => { update(data); this.updateSelectionAndVisualization(row); });
    }

    await Promise.all(promises); // rather await all at once: https://developers.google.com/web/fundamentals/primers/async-functions#careful_avoid_going_too_sequential

    console.log('final data', data);
    return data; // then return the data
  }

}


function prepareDataArray(colAttributes: IColumnDesc[], rowAttributes: IColumnDesc[]): any[] {
  if (rowAttributes.length === 0 || colAttributes.length === 0) {
    return [];
  }

  const data = rowAttributes.map((rowAttribute) => {
    return [[ // n2 arrays (bodies)
      { label: `<b>${rowAttribute.label}</b>`, type: rowAttribute.type },
      ...colAttributes.map((_) => {
        return { label: '<i class="fa fa-circle-o-notch fa-spin"></i>', measure: null } as IScoreCell; // containing n1+1 elements (header + n1 values)
      })
    ]];
  });

  return data;
}

interface IHashObject {
  ids: any[];
  selection: number[];
  row: {
      label: string;
      column: string;
  };
  column: {
      label: string;
      column: string;
  };
}

function generateHashObject(row: IColumnDesc, col: IColumnDesc, ids: any[], selection: number[]): IHashObject {
  // sort the ids, if both row and column are not 'Rank'
  if (row.label !== 'Rank' && col.label !== 'Rank') {
    ids = ids.sort();
  }

  const hashObject = {
    ids,
    selection,
    row: {label: (row as IServerColumn).label, column: (row as IServerColumn).column},
    column: {label: (col as IServerColumn).label, column: (col as IServerColumn).column},
  };

  // remove selection ids, if both row and column are not 'Selection'
  if (row.label !== 'Selection' && col.label !== 'Selection') {
    delete hashObject.selection;
  }

  return hashObject;
}

function generateHashValue(hashObject: IHashObject): string {
  // console.log('hashObject: ', hashObject, ' | unsortedSelction: ', this.ranking.getSelectionUnsorted());
  const hashObjectString = JSON.stringify(hashObject);
  // console.log('hashObject.srtringify: ', hashObjectString);
  const hashValue = XXH.h32(hashObjectString, 0).toString(16);
  // console.log('Hash: ', hashValue);
  return hashValue;
}
