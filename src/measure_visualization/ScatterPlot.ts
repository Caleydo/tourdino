import {IMeasureVisualization, ISetParameters, IMeasureResult} from '../';
import * as d3 from 'd3';


export class ScatterPlot implements IMeasureVisualization {

  private formatData(setParameters: ISetParameters) {
    // data points
    const dataPoints = [];
    // tslint:disable-next-line:prefer-for-of
    for(let i=0; i<setParameters.setA.length; i++) {
      dataPoints.push({x: setParameters.setA[i],
                      y: setParameters.setB[i]});
    }

    const validDataPoints = dataPoints.filter((item) => {
      let valid = true;
      // x
      if((item.x === undefined) || (item.x === null) || (Number.isNaN(item.x))) {
        valid = false;
      }

      // y
      if((item.y === undefined) || (item.y === null) || (Number.isNaN(item.y))) {
        valid = false;
      }
      return valid;
    });

    // domains
    const domainSpace = 0.01; //add space to domain so that the data points are not on the axis
    const xValue = validDataPoints.map(((item) => (item.x)));
    const yValue = validDataPoints.map(((item) => (item.y)));
    const xDomain = [Math.min(...xValue),Math.max(...xValue)];
    const yDomain = [Math.min(...yValue),Math.max(...yValue)];

    // add space to x-domain
    xDomain[0] = Math.min(xDomain[0],0);
    xDomain[1] = xDomain[1];
    // add space to y-domain
    yDomain[0] = Math.min(yDomain[0],0);
    yDomain[1] = yDomain[1];

    const yOriginalLabel = setParameters.setBDesc.label;
    const yLabel = yOriginalLabel.length > 27 ? yOriginalLabel.substring(0,27)+'...' : yOriginalLabel;
    const scatterPlot = {
      'dataPoints': validDataPoints,
      'xLabel': setParameters.setADesc.label,
      'xDomain': xDomain,
      'yLabel': yLabel,
      'yDomain': yDomain
    };

    return scatterPlot;
  }

  public generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult) {
    const formatData = this.formatData(setParameters);
    console.log('Scatter Plot - generateVisualization', {setParameters, formatData});

    // remove old tooltip
    d3.select('body').selectAll('div.measure.tooltip').remove();

    // new tooltip
    const tooltipScatterPlot = d3.select('body').append('div')
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

    // svg canvas
    const svgCanvas = miniVisualisation.append('svg')
          .attr('width',width + margin.left + margin.right)
          .attr('height',height + margin.top + margin.bottom);

    const svgFigureGroup = svgCanvas.append('g')
                                  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                                  .attr('class','scatterplot');

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

    // add dots to canvas
    svgFigureGroup.selectAll('.datapoint')
    .data(formatData.dataPoints)
    .enter().append('circle')
      .attr('class', 'datapoint')
      .attr('r', 2)
      .attr('cx', xMap)
      .attr('cy', yMap)
      .append('title')
        .classed('tooltip.measure',true)
        .text(function(d) {

          return `${formatData.xLabel}: ${d.x}\n${formatData.yLabel}: ${d.y}`;
        });


  }

}
