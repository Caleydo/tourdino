import colCmpHtml from 'html-loader!./ColumnComparison.html'; // webpack imports html to variable
import colCmpIcon from './colCmp.png';

import * as XXH from 'xxhashjs';
import {IColumnDesc} from 'lineupjs';
import {IScoreCell, IHighlightData, ATouringTask} from './ATouringTask';
import {IMeasureResult, Type, SCOPE} from '../interfaces';
import {IServerColumn} from 'tdp_core/src/rest';
import {MethodManager} from '../Managers';
import {WorkerManager} from '../Workers/WorkerManager';
import {removeMissingValues} from '../util';

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
    function updateTableBody(bodyData: Array<Array<Array<IScoreCell>>>) {
      if (that.nodeObject.attr('data-timestamp') !== timestamp) {
        return; // skip outdated result
      }

      that.updateTableDescription(bodyData.length === 0);


      // create a table body for every column
      const bodies = that.nodeObject.select('table').selectAll('tbody').data(bodyData, (d) => d[0][0].label); // the data of each body is of type: Array<Array<IScoreCell>>
      bodies.enter().append('tbody'); // For each IColumnTableData, create a tbody

      // the data of each row is of type: Array<IScoreCell>
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

    this.getAttrTableBody(colData, rowData, filterMissingValues, true, null).then(updateTableBody); // initialize
    this.getAttrTableBody(colData, rowData, filterMissingValues, false, updateTableBody).then(updateTableBody); // set values
  }

  /**
   * async: return promise
   * @param attr1 columns
   * @param arr2 rows
   * @param scaffold only create the matrix with row headers, but no value calculation
   */
  private async getAttrTableBody(colAttributes: IColumnDesc[], rowAttributes: IColumnDesc[], filterMissingValues: boolean, scaffold: boolean, update: (bodyData: IScoreCell[][][]) => void, ): Promise<Array<Array<Array<IScoreCell>>>> {
    const data = this.prepareDataArray(colAttributes, rowAttributes);
    console.log(data);

    if (scaffold) {
      return data;
    } else {
      const promises = [];
      for (const [rowIndex, row] of rowAttributes.entries()) {
        const rowPromises = [];
        for (const [colIndex, col] of colAttributes.entries()) {
          const colIndexInRows = rowAttributes.indexOf(col);
          const rowIndexInCols = colAttributes.indexOf(row);

          if (row.label === col.label) {
            // identical attributes
            data[rowIndex][0][colIndex + 1] = { label: '<span class="circle"/>', measure: null };
          } else if (rowIndexInCols >= 0 && colIndexInRows >= 0 && colIndexInRows < rowIndex) {
            // the row is also part of the column array, and the column is one of the previous rows
          } else {
            const measures = MethodManager.getMeasuresByType(Type.get(row.type), Type.get(col.type), SCOPE.ATTRIBUTES);
            if (measures.length > 0) { // start at
              const measure = measures[0]; // Always the first
              const first = this.ranking.getAttributeDataDisplayed((col as IServerColumn).column); // minus one because the first column is headers
              const second = this.ranking.getAttributeDataDisplayed((row as IServerColumn).column);

              // const [data1, data2] = filterMissingValues ? removeMissingValues(first, second) : [first, second];
              const [data1, data2] = [first, second];
              console.log(data1, data2);

              const setParameters = {
                setA: data1,
                setADesc: col,
                setB: data2,
                setBDesc: row
              };

              const highlight: IHighlightData[] = [
                { column: (row as IServerColumn).column, label: row.label },
                { column: (col as IServerColumn).column, label: col.label }];

              // generate HashObject and hash value
              const hashObject = {
                ids: this.ranking.getDisplayedIds(),
                selection: this.ranking.getSelection(),
                row: { lable: (row as IServerColumn).label, column: (row as IServerColumn).column },
                column: { lable: (col as IServerColumn).label, column: (col as IServerColumn).column },
              };

              // remove selection ids, if both row and column are not 'Selection'
              if (hashObject.row.lable !== 'Selection' && hashObject.column.lable !== 'Selection') {
                delete hashObject.selection;
              }
              // sort the ids, if both row and column are not 'Rank'
              if (hashObject.row.lable !== 'Rank' && hashObject.column.lable !== 'Rank') {
                hashObject.ids = this.ranking.getDisplayedIds().sort();
              }

              // console.log('hashObject: ', hashObject, ' | unsortedSelction: ', this.ranking.getSelectionUnsorted());
              const hashObjectString = JSON.stringify(hashObject);
              // console.log('hashObject.srtringify: ', hashObjectString);
              const hashValue = XXH.h32(hashObjectString, 0).toString(16);
              // console.log('Hash: ', hashValue);

              let isStoredScoreAvailable = false; // flag for the availability of a stored score

              rowPromises.push(new Promise<IMeasureResult>((resolve, reject) => {

                // get score from sessionStorage
                const sessionScore = sessionStorage.getItem(hashValue);
                // console.log('sessionScore: ', sessionScore);
                // score for the measure
                let score: Promise<IMeasureResult> = null;

                if (sessionScore === null || sessionScore === undefined || sessionScore.length === 2) {
                  score = measure.calc(data1, data2, null);
                } else if (sessionScore !== null || sessionScore !== undefined) {
                  score = Promise.resolve(JSON.parse(sessionScore)) as Promise<IMeasureResult>;
                  isStoredScoreAvailable = true;
                }

                // check if all values are NaN
                const uniqueData1 = data1.filter((item) => Number.isNaN(item));
                const uniqueData2 = data2.filter((item) => Number.isNaN(item));
                if (data1.length === uniqueData1.length || data2.length === uniqueData2.length) {
                  isStoredScoreAvailable = true;
                }

                // return score
                resolve(score);

              }).then((score) => {

                if (!isStoredScoreAvailable) {
                  const scoreString = JSON.stringify(score);
                  // console.log('new score: ', score);
                  // console.log('new scoreString: ', scoreString);
                  sessionStorage.setItem(hashValue, scoreString);
                }

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
              })
              );


            }
          }
        }

        promises.concat(rowPromises);
        Promise.all(rowPromises).then(() => { update(data); this.updateSelectionAndVisuallization(row); });
      }

      await Promise.all(promises); // rather await all at once: https://developers.google.com/web/fundamentals/primers/async-functions#careful_avoid_going_too_sequential
      return data; // then return the data
    }
  }

  prepareDataArray(colAttributes: IColumnDesc[], rowAttributes: IColumnDesc[]) {
    if (rowAttributes.length === 0 || colAttributes.length === 0) {
      return [];
    }
    const data = new Array(rowAttributes.length); // n2 arrays (bodies)
    for (const i of data.keys()) {
      data[i] = new Array(1); // currently just one row per attribute
      data[i][0] = new Array(colAttributes.length + 1).fill({ label: '<i class="fa fa-circle-o-notch fa-spin"></i>', measure: null } as IScoreCell); // containing n1+1 elements (header + n1 vlaues)
      data[i][0][0] = { label: `<b>${rowAttributes[i].label}</b>`, type: rowAttributes[i].type };
    }

    return data;
  }
}
