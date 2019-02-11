import {IMeasureVisualization, ISetParameters, IMeasureResult} from '../';
import * as d3 from 'd3';

export class LineChart implements IMeasureVisualization {

  private formatData(setParameters: ISetParameters, score: IMeasureResult) {
    let numericSet;
    let categorySet;
    let defCategories;
    let categories;
    let xLabel;

    if(setParameters.setADesc.type === 'number') {
      numericSet = setParameters.setA;
      xLabel = setParameters.setADesc.label;
      categorySet = setParameters.setB;
      defCategories = setParameters.setBDesc.categories;
      categories = setParameters.setB.filter((item, index, self) => self.indexOf(item) === index).map((item) => { return {'name': item};});
    }else {
      numericSet = setParameters.setB;
      xLabel = setParameters.setBDesc.label;
      categorySet = setParameters.setA;
      defCategories = setParameters.setADesc.categories;
      categories = setParameters.setA.filter((item, index, self) => self.indexOf(item) === index).map((item) => { return {'name': item};});
    }

    // combine both sets
    const combinedSet = [];
    for(let i=0; i<numericSet.length; i++) {
      combinedSet.push({
        category: categorySet[i],
        value: numericSet[i]
      });
    }

    const validCombinedSet = combinedSet.filter((item) => { return (item.value !== undefined) && (item.value !== null) && (!Number.isNaN(item.value)); });
    // sort the combined set
    validCombinedSet.sort((a,b) => { return b.value - a.value;});
    const amountItems = validCombinedSet.length;
    // console.log('properties: ', {validCombinedSet, categories, defCategories});
    //define category sets
    for(const category of categories) {
      const currCategory = category.name;

      const currDefCategory = defCategories.filter((item) => {return item.name === currCategory;});
      if(currDefCategory.length === 0) {
        category.label = 'Missing values';
        category.color = '#808080';
      }else {
        category.label = currDefCategory[0].label;
        category.color = currDefCategory[0].color;
      }
      const numCategory = validCombinedSet.filter((item) => { return item.category === currCategory; }).length;
      category.amount = numCategory;

      let pValueCategory;
      if(score.additionalData) {
        pValueCategory = score.additionalData.filter((item) => (item.category === currCategory)).map((item) => (item.pvalue))[0];
        pValueCategory = (Number.isNaN(pValueCategory) || pValueCategory===undefined || pValueCategory === null) ? null : pValueCategory;
      }
      category.pvalue = pValueCategory;
    }

    // sort the combined set
    validCombinedSet.sort((a,b) => { return a.value - b.value;});
    // console.log('combineSet: ', validCombinedSet);

    let dataLines = [];
    //
    for(let i=0; i<validCombinedSet.length; i++) {
      for(let c=0; c<categories.length; c++) {
        const currCategory = categories[c].name;
        const currCategoryLabel = categories[c].label;
        const amountCategory = categories[c].amount;
        const termPlus = Math.sqrt((amountItems-amountCategory)/amountCategory);
        const termMinus = Math.sqrt(amountCategory/(amountItems-amountCategory));

        if(i===0) {
          const temp = {category: currCategoryLabel,
                      color: categories[c].color,
                      pvalue: categories[c].pvalue,
                      values: []};
          let currValue;
          if(validCombinedSet[i].category === currCategory) {
            currValue = termPlus;
          }else {
            currValue = 0 - termMinus;
          }
          // extra value so that the line starts and ends with the value 0
          temp.values.push({y: 0,
                            x: i+1});
          //calculated value
          temp.values.push({y: currValue,
                            x: i+1});
          dataLines.push(temp);

        }else {
          const lastValue = dataLines[c].values[dataLines[c].values.length-1].y;
          let currValue;
          if(validCombinedSet[i].category === currCategory) {
            currValue = lastValue + termPlus;
          }else {
            currValue = lastValue - termMinus;
          }

          dataLines[c].values.push({y: currValue,
                                    x: i+1});
        }
      }
    }

    // sort data lines from low to high
    dataLines.sort((a,b) => { return a.pvalue - b.pvalue; });
    // console.log('dataLines: ', dataLines);
    const numbAllLines = dataLines.length;

    const maxNumberDataLines = 5;
    const numbPossibleDataLines = Math.min(numbAllLines,maxNumberDataLines);

    // filter out all data lines with a p-value bigger than 0.05
    // const filteredDataLines = dataLines.filter((item) => (item.pvalue <= 0.05));
    // console.log('filteredDataLines: ', filteredDataLines);

    // make sure at least one datarow will be displayed
    // if(filteredDataLines.length === 0) {
    //   if(numbDataLines > 0) {
    //     filteredDataLines.push(dataLines[0]);
    //   }
    // }

    // make sure only the defined number of lines are displayed
    const filteredDataLines = dataLines.slice(0,numbPossibleDataLines);

    dataLines = filteredDataLines;

    const minMaxValues = []; //for domains

    for(const dataLine of dataLines) {
      const min = Math.min(...dataLine.values.map((item) => (item.y)));
      minMaxValues.push(min);

      const max = Math.max(...dataLine.values.map((item) => (item.y)));
      minMaxValues.push(max);

      const score = Math.abs(max) > Math.abs(min) ? max : min;
      dataLine.enrichmentScore = score;
      dataLine.scorePos = dataLine.values.filter((item) => (item.y === score)).map((item) => (item.x));
    }

    // sort data lines from hight to low (-> allows better hover capabilities)
    dataLines.sort((a,b) => { return Math.abs(b.enrichmentScore) - Math.abs(a.enrichmentScore); });

    const domainSpace = 0.01; //add space to domain so that the data points are not on the axis
    const xValue = validCombinedSet.map(((item) => (item.value)));
    // const xDomain = [Math.min(...xValue),Math.max(...xValue)];
    const xDomain = [1,validCombinedSet.length];
    const yDomain = [Math.min(...minMaxValues),Math.max(...minMaxValues)];

    if(yDomain[0] === yDomain[1]) {
      yDomain[0] = yDomain[0] - 5;
      yDomain[1] = yDomain[1] + 5;
    }

    // add space to x-domain
    // xDomain[0] = xDomain[0]-Math.abs(xDomain[1]*(domainSpace/2));
    // xDomain[1] = xDomain[1]+Math.abs(xDomain[1]*(domainSpace/2));
    // add space to y-domain
    // yDomain[0] = yDomain[0]-Math.abs(yDomain[1]*domainSpace);
    // yDomain[1] = yDomain[1]+Math.abs(yDomain[1]*domainSpace);

    //switch min <--> max
    // let tmp = xDomain[0];
    // xDomain[0] = xDomain[1];
    // xDomain[1] = tmp;

    const lineChart = {
      'xLabel': xLabel+' (ranked)',
      'xDomain': xDomain,
      'dataLines': dataLines,
      'yLabel': 'Enrichment Score',
      'yDomain': yDomain
    };

    return lineChart;
  }

  public generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult) {
    const formatData = this.formatData(setParameters,score);
    console.log('Line Chart - generateVisualization', {setParameters, formatData, score});


    // remove old tooltip
    d3.select('body').selectAll('div.measure.tooltip').remove();

    if(score.pValue !== -1) {

      // new tooltip
      const tooltipLineChart = d3.select('body').append('div')
                                                .style('display', 'none')
                                                .style('opacity', 0)
                                                .attr('class', 'tooltip measure');


      // get size of space and calculate scatter plot size
      const containerWidth = Number(miniVisualisation.style('width').slice(0,-2)) - 25; //-25 because of the scroll bar

      const labelOffsetAxisX = 35;
      const labelOffsetAxisY = 15;
      const maxHeight = 220;
      const margin = {top: 10, right: 20, bottom: 20+labelOffsetAxisX, left: 55+labelOffsetAxisY};
      const width = containerWidth - margin.left - margin.right;
      const height = maxHeight - margin.top - margin.bottom;

      // create baseline values
      const baseline = formatData.xDomain.map((item) => { return {x: Number(item),
                                                                y: 0};}) as any;

      // x: scales + axis + map function for the data points
      const xScale = d3.scale.linear().range([0, width]);
      const xAxis = d3.svg.axis().scale(xScale).orient('bottom');
      xAxis.tickFormat((d) => {
        if((Math.abs(d)<1000 && Math.abs(d)>0.01) || d === 0) {
          return ''+Math.round(d*100)/100;
        }
        return d3.format('0.1e')(d); });
        const xMap = function(d) { return xScale(d.x);};

      // y: scale + axis + map function for the data points
      const yScale = d3.scale.linear().range([height, 0]);
      const yAxis = d3.svg.axis().scale(yScale).orient('left');
      yAxis.tickFormat((d) => {
        if((Math.abs(d)<1000 && Math.abs(d)>0.01) || d === 0) {
          return ''+Math.round(d*100)/100;
        }
        return d3.format('0.1e')(d); });
        const yMap = function(d) { return yScale(d.y);};

      // line function
      const line = d3.svg.line()
                          .x((d) => xMap(d))
                          .y((d) => yMap(d));

      // svg canvas
      const svgCanvas = miniVisualisation.append('svg')
            .attr('width',width + margin.left + margin.right)
            .attr('height',height + margin.top + margin.bottom);

            const svgFigureGroup = svgCanvas.append('g')
                                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                                    .attr('class','linechart');

      // set scale.domain
      xScale.domain(formatData.xDomain).nice();
      yScale.domain(formatData.yDomain).nice();

      // add axis to the canvas
      // x-axis
      svgFigureGroup.append('g')
                    .attr('class', 'x axis')
                    .attr('transform', 'translate(0,' + height + ')')
                    .call(xAxis)
                    .append('text')
                      .attr('class', 'label')
                      .attr('x', width/2)
                      .attr('y', 35)
                      .style('text-anchor', 'middle')
                      .text(formatData.xLabel);

      // y-axis
      svgFigureGroup.append('g')
                    .attr('class', 'y axis')
                    .call(yAxis)
                    .append('text')
                      .attr('class', 'label')
                      .attr('transform', 'rotate(-90)')
                      .attr('y', -margin.left+labelOffsetAxisY)
                      .attr('x', -(maxHeight-margin.bottom)/2)
                      .style('text-anchor', 'middle')
                      .text(formatData.yLabel);


      // data lines
      svgFigureGroup.append('g')
                    .attr('class', 'all-datalines')
                    .selectAll('path')
                      .data(formatData.dataLines)
                      .enter().append('path')
                        .attr('class','dataline')
                        .attr('d',(d) => line(d.values))
                        .style('stroke',(d) => d !== null  ? d.color : null)
                        .style('fill',(d) => d !== null  ? d.color : null)
                        .append('title')
                          .classed('tooltip.measure',true)
                          .text(function(d) {
                            const tooltipText = `Category: ${d.category}\nEnrichment Score: ${d.enrichmentScore.toFixed(3)}`;
                            let pValueText = '';
                            if(d.pvalue !== null) {
                              pValueText = d.pvalue.toFixed(3);
                              if (d.pvalue === 1) {
                                pValueText = d.pvalue.toFixed(2);
                              }else if(d.pvalue === -1) {
                                pValueText = 'n/a';
                              }
                            }
                            const textPValue = pValueText ===  '' ? '' : `\np-Value: ${pValueText}`;

                            return tooltipText+textPValue;
                          });

      // add baseline at 0
      svgFigureGroup.append('g')
                    .attr('class', 'baseline')
                    .append('path')
                      .attr('d',line(baseline))
                      .style('stroke','black');

                      const svgScorePoints = svgFigureGroup.append('g')
                                        .attr('class', 'score-datapoints');

      const lines = formatData.dataLines.length;

      for(let i=0; i<lines; i++) {
        if(formatData.dataLines[i].scorePos && formatData.dataLines[i].scorePos.length > 0) {
          // data point for enrichment score (onyl the first one will be drawn)
          svgScorePoints.append('circle')
                        .attr('r', 3)
                        .attr('cx', xScale(formatData.dataLines[i].scorePos[0]))
                        .attr('cy', yScale(formatData.dataLines[i].enrichmentScore));
        }
      }

    }
  }


}
