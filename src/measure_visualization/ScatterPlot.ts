import {IMeasureVisualization, ISetParameters} from '../';
import * as d3 from 'd3';


export class ScatterPlot implements IMeasureVisualization{

  private formatData(setParameters: ISetParameters)
  {
    // data points
    let dataPoints = [];
    for(let i=0; i<setParameters.setA.length; i++) {
      dataPoints.push({x: setParameters.setA[i],
                      y: setParameters.setB[i]})
    }

    // domains
    let domainSpace = 0.01; //add sapce to domain so that the data points are not on the axis
    // let xDomain = setParameters.setADesc.domain;
    // let yDomain = setParameters.setBDesc.domain;

    // if(!xDomain) {
      let xDomain = [Math.min(...setParameters.setA),Math.max(...setParameters.setA)];
    // }
    // if(!yDomain) {
      let yDomain = [Math.min(...setParameters.setB),Math.max(...setParameters.setB)];
    // }

    // add space to x-domain
    xDomain[0] = xDomain[0]-Math.abs(xDomain[1]*(domainSpace/2));
    xDomain[1] = xDomain[1]+Math.abs(xDomain[1]*(domainSpace/2));
    // add space to y-domain
    yDomain[0] = yDomain[0]-Math.abs(yDomain[1]*domainSpace);
    yDomain[1] = yDomain[1]+Math.abs(yDomain[1]*domainSpace);

    let scatterPlot = {
      dataPoints: dataPoints,
      xLabel: setParameters.setADesc.label,
      xDomain: xDomain,
      yLabel: setParameters.setBDesc.label,
      yDomain: yDomain
    }

    


    return scatterPlot;
  }

  public generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters)
  {
    let formatData = this.formatData(setParameters);
    console.log('Scatter Plot - generateVisualization', setParameters);

    // remove old tooltip
    d3.select('body').selectAll('div.boxplot.scatterplot').remove();

    // new tooltip
    let tooltipScatterPlot = d3.select('body').append('div')
                                              // .style('display', 'none')
                                              .style('opacity', 0)
                                              .attr('class', 'tooltip scatterplot');
    

    // get size of space and calculate scatter plot size
    let containerWidth = Number(miniVisualisation.style('width').slice(0,-2)) - 25; //-25 because of the scroll bar

    let maxHeight = 220;
    let margin = {top: 10, right: 20, bottom: 20, left: 100};
    let width = containerWidth - margin.left - margin.right;
    let height = maxHeight - margin.top - margin.bottom;

    // x: scales + axis + map function for the data points
    let xScale = d3.scale.linear().range([0, width]);
    let xAxis = d3.svg.axis().scale(xScale).orient('bottom');
    let xMap = function(d) { return xScale(d.x);};
    
    // y: scale + axis + map function for the data points
    let yScale = d3.scale.linear().range([height, 0]);
    let yAxis = d3.svg.axis().scale(yScale).orient('left');
    let yMap = function(d) { return yScale(d.y);};

    // svg canvas
    let svgCanvas = miniVisualisation.append('svg')
          .attr('width',width + margin.left + margin.right)
          .attr('height',height + margin.top + margin.bottom);      

    let svgFigureGroup = svgCanvas.append('g')
                                  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                                  .attr('class','scatterplot');

    // set scale.domain
    xScale.domain(formatData.xDomain);
    yScale.domain(formatData.yDomain);

    // add axis to the canvas
    // x-axis
    svgFigureGroup.append('g')
                  .attr('class', 'x axis')
                  .attr('transform', 'translate(0,' + height + ')')
                  .call(xAxis)
                  .append('text')
                    .attr('class', 'label')
                    .attr('x', width)
                    .attr('y', -6)
                    .style('text-anchor', 'end')
                    .text(formatData.xLabel);

    // y-axis
    svgFigureGroup.append('g')
                  .attr('class', 'y axis')
                  .call(yAxis)
                  .append('text')
                    .attr('class', 'label')
                    .attr('transform', 'rotate(-90)')
                    .attr('y', 6)
                    .attr('dy', '.71em')
                    .style('text-anchor', 'end')
                    .text(formatData.yLabel);

    // add dots to canvas
    svgFigureGroup.selectAll('.dot')
    .data(formatData.dataPoints)
    .enter().append('circle')
      .attr('class', 'dot')
      .attr('r', 3.5)
      .attr('cx', xMap)
      .attr('cy', yMap)
      .style('opacity', 0.2)
      .style('fill', '#808080') 
      .on('mouseover', function(d) {
                        let m = d3.mouse(d3.select('body').node());
                        tooltipScatterPlot.transition()
                                          .duration(500)
                                          .style('opacity', .9);
                        tooltipScatterPlot.html('(xValue, yValue)')
                                          .style('left', (m[0] + 5) + 'px')
                                          .style('top', (m[1]- 28) + 'px');
                      })
      .on('mouseout', function(d) {
                        tooltipScatterPlot.transition()
                                          .duration(500)
                                          .style('opacity', 0);
                      });


  }

}