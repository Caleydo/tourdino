import {IMeasureVisualization, ISetParameters, IMeasureResult} from '../';
import * as d3 from 'd3';

export class LineChart implements IMeasureVisualization{

  private formatData(setParameters: ISetParameters, score: IMeasureResult)
  {
    let numericSet;
    let categorySet;
    let categories;
    let xLabel;

    if(setParameters.setADesc.type === 'number'){
      numericSet = setParameters.setA;
      xLabel = setParameters.setADesc.label;
      categorySet = setParameters.setB;
      categories = setParameters.setBDesc.categories;
    }else {
      numericSet = setParameters.setB;
      xLabel = setParameters.setBDesc.label;
      categorySet = setParameters.setA;
      categories = setParameters.setADesc.categories;
    }

    // combine both sets
    let combinedSet = [];
    for(let i=0; i<numericSet.length; i++)
    {
      combinedSet.push({
        category: categorySet[i],
        value: numericSet[i]
      });
    }

    let validCombinedSet = combinedSet.filter((item) => { return (item.value !== undefined) && (item.value !== null) && (!Number.isNaN(item.value)); });
    // sort the combined set
    validCombinedSet.sort((a,b) => { return b.value - a.value;});
    let amountItems = validCombinedSet.length;

    //define category sets
    for(let c=0; c<categories.length; c++)
    {
      const currCategory = categories[c].name;
      let numCategory = validCombinedSet.filter((item) => { return item.category === currCategory; }).length;
      categories[c]['amount'] = numCategory;
      
      let pValueCategory;
      if(score.additionalData){
        pValueCategory = score.additionalData.filter((item) => (item.category === currCategory)).map((item) => (item.pvalue))[0];
        pValueCategory = (Number.isNaN(pValueCategory) || pValueCategory===undefined || pValueCategory === null) ? null : pValueCategory;
      }
      categories[c]['pvalue'] = pValueCategory;
    }

    // sort the combined set
    validCombinedSet.sort((a,b) => { return b.value - a.value;});
    // console.log('combineSet: ', validCombinedSet);

    let dataLines = [];
    //
    for(let i=0; i<validCombinedSet.length; i++)
    {
      for(let c=0; c<categories.length; c++)
      {
        const currCategory = categories[c].name;
        const currCategoryLabel = categories[c].label;
        const amountCategory = categories[c].amount;
        const termPlus = Math.sqrt((amountItems-amountCategory)/amountCategory);
        const termMinus = Math.sqrt(amountCategory/(amountItems-amountCategory));

        if(i==0){
          let temp = {category: currCategoryLabel,
                      color: categories[c].color,
                      pvalue: categories[c].pvalue,
                      values: []};
          let currValue;
          if(validCombinedSet[i].category === currCategory){
            currValue = termPlus;
          }else {
            currValue = 0 - termMinus;
          }
          // extra value so that the line starts and ends with the value 0
          temp.values.push({y: 0,
                            x: validCombinedSet[i].value});
          //calculated value
          temp.values.push({y: currValue,
                            x: validCombinedSet[i].value});
          dataLines.push(temp);
          
        }else{
          const lastValue = dataLines[c].values[dataLines[c].values.length-1].y;
          let currValue;
          if(validCombinedSet[i].category === currCategory){
            currValue = lastValue + termPlus;
          }else {
            currValue = lastValue - termMinus;
          }

          dataLines[c].values.push({y: currValue,
                                    x: validCombinedSet[i].value});
        }
      }
    }
    
    console.log('dataLines: ', dataLines);

    let minMaxValues = []; //for domains

    for(let i=0; i<dataLines.length; i++)
    {
      const min = Math.min(...dataLines[i].values.map((item) => (item.y)));
      minMaxValues.push(min);

      const max = Math.max(...dataLines[i].values.map((item) => (item.y)));
      minMaxValues.push(max);

      const score = Math.abs(max) > Math.abs(min) ? max : min;
      dataLines[i]['enrichmentScore'] = score;
      dataLines[i]['scorePos'] = dataLines[i].values.filter((item) => (item.y === score)).map((item) => (item.x));
    }


    let domainSpace = 0.01; //add space to domain so that the data points are not on the axis
    const xValue = validCombinedSet.map((item => (item.value)));
    let xDomain = [Math.min(...xValue),Math.max(...xValue)];
    let yDomain = [Math.min(...minMaxValues),Math.max(...minMaxValues)];

    if(yDomain[0] === yDomain[1])
    {
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

    
    let lineChart = {
      xLabel: xLabel,
      xDomain: xDomain,
      dataLines: dataLines,
      yLabel: 'Enrichment Score',
      yDomain: yDomain
    }

    return lineChart;
  }

  public generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult)
  {
    let formatData = this.formatData(setParameters,score);
    console.log('Line Chart - generateVisualization', {setParameters, formatData});
    // console.log('formatData: ', formatData);


    // remove old tooltip
    d3.select('body').selectAll('div.measure.tooltip').remove();

    // new tooltip
    let tooltipLineChart = d3.select('body').append('div')
                                              .style('display', 'none')
                                              .style('opacity', 0)
                                              .attr('class', 'tooltip measure');
    

    // get size of space and calculate scatter plot size
    let containerWidth = Number(miniVisualisation.style('width').slice(0,-2)) - 25; //-25 because of the scroll bar

    let labelOffsetAxisX = 35;
    let labelOffsetAxisY = 15;
    let maxHeight = 220;
    let margin = {top: 10, right: 20, bottom: 20+labelOffsetAxisX, left: 55+labelOffsetAxisY};
    let width = containerWidth - margin.left - margin.right;
    let height = maxHeight - margin.top - margin.bottom;

    // create baseline values
    let baseline = formatData.xDomain.map((item) => { return {x: Number(item),
                                                              y: 0};}) as any;
    
    // x: scales + axis + map function for the data points
    let xScale = d3.scale.linear().range([0, width]);
    let xAxis = d3.svg.axis().scale(xScale).orient('bottom');
    xAxis.tickFormat((d) => {
      if(Math.abs(d)<1000){
        return d;
      }
      return d3.format('0.1e')(d); });
    let xMap = function(d) { return xScale(d.x);};
    
    // y: scale + axis + map function for the data points
    let yScale = d3.scale.linear().range([height, 0]);
    let yAxis = d3.svg.axis().scale(yScale).orient('left');
    yAxis.tickFormat((d) => {
      if(Math.abs(d)<1000){
        return d;
      }
      return d3.format('0.1e')(d); });
    let yMap = function(d) { return yScale(d.y);};

    // line function
    let line = d3.svg.line()
                        .x(d => xMap(d))
                        .y(d => yMap(d));

    // svg canvas
    let svgCanvas = miniVisualisation.append('svg')
          .attr('width',width + margin.left + margin.right)
          .attr('height',height + margin.top + margin.bottom);      

    let svgFigureGroup = svgCanvas.append('g')
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
                  .selectAll("path")
                    .data(formatData.dataLines)
                    .enter().append('path')
                      .attr('class','dataline')
                      .attr('d',d => line(d.values))
                      .style('stroke',(d) => d !== null  ? d.color : null)
                      .style('fill',(d) => d !== null  ? d.color : null)
                      .on('mouseover', function(d) {
                        let m = d3.mouse(d3.select('body').node());
                        tooltipLineChart.transition()
                                          .duration(500)
                                          .style('display','block')
                                          .style('opacity', .9);
                        let tooltipText = `Category: ${d.category}</br>Enrichment Score: ${d.enrichmentScore.toFixed(3)}`;
                        let textPValue = d.pvalue === null ? '' : `</br>p-Value: ${d.pvalue.toFixed(3)}`;
                        tooltipLineChart.html(tooltipText+textPValue)
                                          .style('left', (m[0] + 5) + 'px')
                                          .style('top', (m[1]- 28) + 'px');
                      })
                      .on('mouseout', function(d) {
                        tooltipLineChart.transition()
                                          .duration(500)
                                          .style('display','none')
                                          .style('opacity', 0);
                      });


    // add baseline at 0
    svgFigureGroup.append('g')
                  .attr('class', 'baseline')
                  .append('path')
                    .attr('d',line(baseline))
                    .style('stroke','black');                  

    let svgScorePoints = svgFigureGroup.append('g')
                                       .attr('class', 'score-datapoints');
                                                  
    const lines = formatData.dataLines.length;
    
    for(let i=0; i<lines; i++)
    {
      if(formatData.dataLines[i].scorePos && formatData.dataLines[i].scorePos.length > 0){
        // data point for enrichment score (onyl the first one will be drawn)
        svgScorePoints.append('circle')
                      .attr('r', 3)
                      .attr('cx', xScale(formatData.dataLines[i].scorePos[0]))
                      .attr('cy', yScale(formatData.dataLines[i].enrichmentScore));
      }
    }

  }



}