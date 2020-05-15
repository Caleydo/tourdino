import rowCmpHtml from 'html-loader!./RowComparison.html'; // webpack imports html to variable
import rowCmpIcon from './rowCmp.png';

import * as $ from 'jquery';
import * as d3 from 'd3';
import * as XXH from 'xxhashjs';
import {textColor4Background} from './utils';
import {IAttributeCategory} from '../RankingAdapter';
import {IColumnDesc, ICategoricalColumnDesc, ICategory} from 'lineupjs';
import {IScoreCell, IHighlightData, ATouringTask} from './ATouringTask';
import {IMeasureResult, Type, SCOPE} from '../interfaces';
import {IServerColumn} from 'tdp_core/src/rest';
import {MethodManager} from '../Managers';
import {WorkerManager} from '../Workers/WorkerManager';


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
    (<HTMLDivElement>this.nodeObject.node()).insertAdjacentHTML('beforeend', rowCmpHtml);
    super.initContent();

    const headerDesc = this.nodeObject.select('thead tr').select('th').classed('head-descr', true).append('header');
    headerDesc.append('h1').text('Difference of Rows');
    headerDesc.append('p').text('Click on a p-Value in the table for details.');

    this.nodeObject.selectAll('select.rowGrp').each(function () { // Convert to select2
      $(this).data('placeholder', 'Select one or more groups of rows.');
    });
  }


  public update(forceTableUpdate: boolean): void {
    const tableChanged = this.updateSelectors();
    if (forceTableUpdate || tableChanged) {
      this.updateTable();
    }
  }

  private updateSelectors(): boolean {
    const descriptions = this.getAttriubuteDescriptions();

    // Update Row Selectors
    // Rows are grouped by categories, so we filter the categorical attributes:
    const catDescriptions = descriptions.filter((desc) => (desc as ICategoricalColumnDesc).categories);
    catDescriptions.forEach((catDescription) => {
      (catDescription as ICategoricalColumnDesc).categories.forEach((category) => {
        (category as IAttributeCategory).attribute = (catDescription as IServerColumn); // store the attribute taht the category belongs to
      });
    });

    // For each attribute, create a <optgroup>
    const rowSelectors = this.nodeObject.selectAll('select.rowGrp');
    const optGroups = rowSelectors.selectAll('optgroup').data(catDescriptions, (desc) => desc.label);
    optGroups.enter().append('optgroup').attr('label', (desc) => desc.label);
    // For each category, create a <option> inside the optgroup
    const rowOptions = optGroups.selectAll('option').data((d: ICategoricalColumnDesc) => d.categories, (cat: ICategory) => cat.label);
    rowOptions.enter().append('option').text((cat: ICategory) => cat.label);

    let tableChanged = !rowOptions.exit().filter(':checked').empty(); // if checked categories are removed, the table has to update

    // Remove atribtues and categories that were removed and order the html elements
    rowOptions.exit().remove();
    rowOptions.order();
    optGroups.exit().remove();
    optGroups.order();

    rowSelectors.each(function () { // function to reference the <select> with 'this'
      const emptySelection = d3.select(this).selectAll('option:checked').empty();
      if (emptySelection) {
        d3.select(this).select('optgroup').selectAll('option').each(function () { (this as HTMLOptionElement).selected = true; }); // select the categories of the first attribute by default
        tableChanged = true;
      }
    });

    // Update Attribute Selectors
    const attrSelector = this.nodeObject.select('select.attr optgroup');
    const attrOptions = attrSelector.selectAll('option').data(descriptions, (desc) => desc.label); // duplicates are filtered automatically
    attrOptions.enter().append('option').text((desc) => desc.label);

    tableChanged = tableChanged || !attrOptions.exit().filter(':checked').empty(); // if checked attributes are removed, the table has to update

    if (attrSelector.selectAll('option:checked').empty()) { // make a default selection
      attrSelector.selectAll('option').each(function () { (this as HTMLOptionElement).selected = true; }); // by default, select all columns.
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
    const filterMissingValues = !this.nodeObject.select('input[type="checkbox"]:checked').empty() // check if checkbox to filter missing values is checked

    if (colGrpData.length > rowGrpData.length) {
      [rowGrpData, colGrpData] = [colGrpData, rowGrpData]; // avoid having more columns than rows --> flip table
    }

    const rowAttrData = this.nodeObject.selectAll('select.attr[name="attr[]"]  option:checked').data();
    const colHeadsCat = this.nodeObject.select('thead tr').selectAll('th.head').data(colGrpData, (cat) => cat.attribute.column + ':' + cat.name); // cat.name != label; add column to handle identical category names
    const colHeadsCatSpan = colHeadsCat.enter().append('th')
      .attr('class', 'head rotate').append('div').append('span').append('span'); // th.head are the column headers

    const that = this; // for the function below
    function updateTableBody(bodyData: Array<Array<Array<IScoreCell>>>, timestamp: string) {
      if (that.nodeObject.attr('data-timestamp') !== timestamp) {
        return; // skip outdated result
      }

      that.updateTableDescription(bodyData.length === 0);

      // create a table body for every column
      const bodies = that.nodeObject.select('table').selectAll('tbody').data(bodyData, (d) => d[0][0].label); // the data of each body is of type: Array<Array<IScoreCell>>
      bodies.enter().append('tbody').classed('bottom-margin', true); // For each IColumnTableData, create a tbody

      // the data of each row is of type: Array<IScoreCell>
      const trs = bodies.selectAll('tr').data((d) => d, (d) => d[0].key); // had to specify the function to derive the data (d -> d)
      trs.enter().append('tr');
      const tds = trs.selectAll('td').data((d) => d);   // the data of each td is of type: IScoreCell
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

    this.getAttrTableBody(colGrpData, rowGrpData, rowAttrData, filterMissingValues, true, null).then((data) => updateTableBody(data, timestamp)); // initialize
    this.getAttrTableBody(colGrpData, rowGrpData, rowAttrData, filterMissingValues, false, (data) => updateTableBody(data, timestamp)).then((data) => updateTableBody(data, timestamp)); // set values
  }

  /**
   *     For each attribute in rowAttributes, we want to comapre the rows inside colGroups with the rows of rowGroups
   *     i.e. the number of table rows is: |rowAttributes| * |rowGroups|
   *     and there are |colGroups| columns
   *     + plus the rows and columns where we put labels
   *
   * @param colGroups
   * @param rowGroups
   * @param rowAttributes
   * @param scaffold only create the matrix with row headers, but no value calculation
   * @param update
   */
  async getAttrTableBody(colGroups: IAttributeCategory[], rowGroups: IAttributeCategory[], rowAttributes: IColumnDesc[], filterMissingValues: boolean, scaffold: boolean, update: (bodyData: IScoreCell[][][]) => void): Promise<Array<Array<Array<IScoreCell>>>> {
    const data = this.prepareDataArray(colGroups, rowGroups, rowAttributes);

    if (scaffold) {
      return data;
    } else {
      const promises = [];

      // the row and column indices stay the same, only the data changes ->  we want to retrieve these indices only once.
      const rowGrpsIndices = rowGroups.map((rowGrp) => this.ranking.getRowsWithCategory(rowGrp));
      const colGrpsIndices = colGroups.map((colGrp) => this.ranking.getRowsWithCategory(colGrp));
      // if a group is part of the column and row item groups, we use these array to get the correct index (so we can avoid duplicate calculations)
      const rowIndex4colGrp = colGroups.map((colGrp) => rowGroups.indexOf(colGrp));
      const colIndex4rowGrp = rowGroups.map((rowGrp) => colGroups.indexOf(rowGrp));

      for (const [bodyIndex, attr] of rowAttributes.entries()) {
        const attrPromises = [];
        const attrData = this.ranking.getAttributeDataDisplayed((attr as IServerColumn).column); // minus one because the first column is headers
        const measures = MethodManager.getMeasuresByType(Type.get(attr.type), Type.get(attr.type), SCOPE.SETS); // Always compare selected elements with a group of elements of the same column
        if (measures.length > 0) {
          const measure = measures[0];

          for (const [rowIndex, rowGrp] of rowGroups.entries()) {
            // Get the data of 'attr' for the rows inside 'rowGrp'
            const rowData = rowGrpsIndices[rowIndex].map((i) => attrData[i]);
            for (const [colIndex, colGrp] of colGroups.entries()) {
              const colIndexOffset = rowIndex === 0 ? 2 : 1; // Two columns if the attribute label is in the same line, (otherwise 1 (because rowspan))

              if (rowGrp.label === colGrp.label) { // identical groups
                data[bodyIndex][rowIndex][colIndexOffset + colIndex] = { label: '<span class="circle"/>', measure };
              } else if (colIndex4rowGrp[rowIndex] >= 0 && rowIndex4colGrp[colIndex] >= 0 && rowIndex4colGrp[colIndex] < rowIndex) {
                // the rowGrp is also part of the colGroups array, and the colGrp is one of the previous rowGroups --> i.e. already calculated in a table row above the current one
              } else {
                const colData = colGrpsIndices[colIndex].map((i) => attrData[i]);
                const setParameters = {
                  setA: rowData,
                  setADesc: attr,
                  setACategory: { label: `${rowGrp.label} (${rowGrp.attribute.label})`, color: rowGrp.color },
                  setB: colData,
                  setBDesc: attr,
                  setBCategory: { label: `${colGrp.label} (${colGrp.attribute.label})`, color: colGrp.color }
                };

                const highlight: IHighlightData[] = [
                  { column: (attr as IServerColumn).column, label: attr.label },
                  { column: rowGrp.attribute.column, label: rowGrp.attribute.label, category: rowGrp.name, color: rowGrp.color },
                  { column: colGrp.attribute.column, label: colGrp.attribute.label, category: colGrp.name, color: colGrp.color }];


                // generate HashObject and hash value
                const hashObject = {
                  ids: this.ranking.getDisplayedIds(),
                  selection: this.ranking.getSelection(),
                  attribute: { lable: (attr as IServerColumn).label, column: (attr as IServerColumn).column },
                  setACategory: rowGrp.label,
                  setBCategory: colGrp.label
                };

                // remove selection ids, if both categories and the data column are not selection
                if (hashObject.attribute.lable !== 'Selection' &&
                  hashObject.setACategory !== 'Unselected' && hashObject.setACategory !== 'Selected' &&
                  hashObject.setBCategory !== 'Unselected' && hashObject.setBCategory !== 'Selected') {
                  delete hashObject.selection;
                }
                // sort the ids, if the data column is not 'Rank'
                if (hashObject.attribute.lable !== 'Rank') {
                  hashObject.ids = this.ranking.getDisplayedIds().sort();
                }

                // console.log('hashObject: ', hashObject);
                const hashObjectString = JSON.stringify(hashObject);
                // console.log('hashObject.srtringify: ', hashObjectString);
                const hashValue = XXH.h32(hashObjectString, 0).toString(16);
                // console.log('Hash: ', hash);

                let isStoredScoreAvailable = false; // flag for the availability of a stored score

                attrPromises.push(new Promise<IMeasureResult>((resolve, reject) => {
                  // get score from sessionStorage
                  const sessionScore = sessionStorage.getItem(hashValue);
                  // console.log('sessionScore: ', sessionScore);
                  // score for the measure
                  let score: Promise<IMeasureResult> = null;

                  if (sessionScore === null || sessionScore === undefined) {
                    score = measure.calc(rowData, colData, attrData);
                  } else if (sessionScore !== null || sessionScore !== undefined) {
                    score = Promise.resolve(JSON.parse(sessionScore)) as Promise<IMeasureResult>;
                    isStoredScoreAvailable = true;
                  }

                  // check if all values are NaN
                  const uniqueDataRow = rowData.filter((item) => Number.isNaN(item));
                  const uniqueDataCol = colData.filter((item) => Number.isNaN(item));
                  if (rowData.length === uniqueDataRow.length || colData.length === uniqueDataCol.length) {
                    isStoredScoreAvailable = true;
                  }

                  // return score;
                  resolve(score);

                }).then((score) => {

                  if (!isStoredScoreAvailable) {
                    const scoreString = JSON.stringify(score);
                    // console.log('new score: ', score);
                    // console.log('new scoreString: ', scoreString);
                    sessionStorage.setItem(hashValue, scoreString);
                  }

                  data[bodyIndex][rowIndex][colIndexOffset + colIndex] = this.toScoreCell(score, measure, setParameters, highlight);
                  if (colIndex4rowGrp[rowIndex] >= 0 && rowIndex4colGrp[colIndex] >= 0) {
                    const colIndexOffset4Duplicate = rowIndex4colGrp[colIndex] === 0 ? 2 : 1; // Currenlty, we can't have duplicates in the first line, so this will always be 1
                    data[bodyIndex][rowIndex4colGrp[colIndex]][colIndexOffset4Duplicate + colIndex4rowGrp[rowIndex]] = this.toScoreCell(score, measure, setParameters, highlight);
                  }

                }).catch((err) => {
                  // console.error(err);
                  const errorCell = { label: 'err', measure };
                  data[bodyIndex][rowIndex][colIndexOffset + colIndex] = errorCell;
                  if (colIndex4rowGrp[rowIndex] >= 0 && rowIndex4colGrp[colIndex] >= 0) {
                    const colIndexOffset4Duplicate = rowIndex4colGrp[colIndex] === 0 ? 2 : 1;
                    data[bodyIndex][rowIndex4colGrp[colIndex]][colIndexOffset4Duplicate + colIndex4rowGrp[rowIndex]] = errorCell;
                  }
                }));


              }
            }
          }
        }
        Promise.all(attrPromises).then(() => { update(data); this.updateSelectionAndVisuallization(attr); });
        promises.concat(attrPromises);
      }

      await Promise.all(promises); // rather await all at once: https://developers.google.com/web/fundamentals/primers/async-functions#careful_avoid_going_too_sequential
      return data; // then return the data
    }
  }

  prepareDataArray(colGroups: IAttributeCategory[], rowGroups: IAttributeCategory[], rowAttributes: IColumnDesc[]) {
    if (colGroups.length === 0 || rowGroups.length === 0 || rowAttributes.length === 0) {
      return []; // return empty array, will cause an empty table
    }
    const data = new Array(rowAttributes.length); // one array per attribute (number of table bodies)

    for (const [i, attr] of rowAttributes.entries()) {
      data[i] = new Array(rowGroups.length); // one array per rowGroup (number of rows in body)
      for (const [j, rowGrp] of rowGroups.entries()) {
        data[i][j] = new Array(colGroups.length + (j === 0 ? 2 : 1)).fill({ label: '<i class="fa fa-circle-o-notch fa-spin"></i>', measure: null } as IScoreCell);
        data[i][j][j === 0 ? 1 : 0] = { // through rowspan, this becomes the first array item
          label: `${rowGrp.label} (${rowGrp.attribute.label})`,
          background: rowGrp.color,
          foreground: textColor4Background(rowGrp.color)
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
}
