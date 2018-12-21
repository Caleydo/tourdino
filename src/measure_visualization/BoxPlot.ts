import {IMeasureVisualization, ISetParameters, IMeasureResult} from '../';
import * as d3 from 'd3';
import 'd3-grubert-boxplot';

export class BoxPlot implements IMeasureVisualization {

  private formatData(setParameters: ISetParameters) {
    // console.log('Box Plot - formatData');

    const rowBoxData = [];

    let label = '';

    // setA
    const setABoxData = [];
    let min = Infinity;
    let max = -Infinity;
    if(setParameters.setACategory) {
      label = setParameters.setACategory;
    }
    if(setParameters.setACategory && setParameters.setACategory.label) {
      label = setParameters.setACategory.label;
    }
    setABoxData.push(''+label);
    const setAValid = setParameters.setA.filter((item) => { return (item !== undefined) && (item !== null) && (!Number.isNaN(item)); });
    setABoxData.push(setAValid);
    min = Math.min(min,Math.min(...(<number[]> setAValid)));
    max = Math.max(max,Math.max(...(<number[]> setAValid)));
    setABoxData.push({'min': min, 'max': max});

    // add the boxplot to all boxplots for this row
    rowBoxData.push(setABoxData);

    // setB
    const setBBoxData = [];
    min = Infinity;
    max = -Infinity;
    if(setParameters.setBCategory) {
      label = setParameters.setBCategory;
    }
    if(setParameters.setBCategory && setParameters.setBCategory.label) {
      label = setParameters.setBCategory.label;
    }
    setBBoxData.push(''+label);
    const setBValid = setParameters.setB.filter((item) => { return (item !== undefined) && (item !== null) && (!Number.isNaN(item)); });
    min = Math.min(min,Math.min(...(<number[]> setBValid)));
    max = Math.max(max,Math.max(...(<number[]> setBValid)));

    // second elemnt is an array with all the values
    setBBoxData.push(setBValid);
    setBBoxData.push({'min': min, 'max': max});

    // add the boxplot to all boxplots for this row
    rowBoxData.push(setBBoxData);


    const boxColor = setParameters.setBDesc.color ? setParameters.setBDesc.color : null;
    const rowBoxObj = {
      color: boxColor,
      data: rowBoxData,
      domainMin: setParameters.setBDesc.domain ? setParameters.setBDesc.domain[0] : Math.min(rowBoxData[0][2].min,rowBoxData[1][2].min),
      domainMax: setParameters.setBDesc.domain ? setParameters.setBDesc.domain[1] : Math.min(rowBoxData[0][2].max,rowBoxData[1][2].max)
    };

    return rowBoxObj;
  }

  public generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult) {
    const formatData = this.formatData(setParameters);
    // console.log('Box Plot - generateVisualization');

    //remove old tooltip
    d3.select('body').selectAll('div.measure.tooltip').remove();

    const tooltipBoxplot = d3.select('body').append('div')
                                          .style('display', 'none')
                                          .style('opacity', 0)
                                          .attr('class', 'tooltip measure');

    let data = formatData.data;
    let min = Math.min(...data.map((a) => (a[2].min)));
    let max = Math.max(...data.map((a) => (a[2].max)));

    // check if the min and may are not infinte
    min = isFinite(min) ? min : formatData.domainMin;
    max = isFinite(max) ? max : formatData.domainMax;
    // start min with 0 or highest negatice value
    min = Math.min(min,0);

    // remove all empty sets
    data = data.filter((item) => {return (item[1].length !== 0); });
    // console.log('BoxPlot: ',{data,min,max});


    const containerWidth = Number(miniVisualisation.style('width').slice(0,-2)) - 25; //-25 because of the scroll bar

    const calcWidth = Math.max(containerWidth,data.length * 50 + 30);

    const maxHeight = 220;
    const margin = {top: 10, right: 0, bottom: 50, left: 55};
    const  width = calcWidth - margin.left - margin.right;
    const height = maxHeight - margin.top - margin.bottom;

    const chart = (d3 as any).box()
          .whiskers(function(d) {
              const q1 = d.quartiles[0],
                    q3 = d.quartiles[2],
                    iqr = (q3 - q1) * 1.5;
              let i = -1,
                  j = d.length;
                // tslint:disable-next-line:curly
                while (d[++i] < q1 - iqr);
                // tslint:disable-next-line:curly
                while (d[--j] > q3 + iqr);
                return [i, j];
          })
          .height(height)
          .domain([min, max])
          .showLabels(false);


    const svgCanvas = miniVisualisation.append('svg')
          .attr('width',width + margin.left + margin.right)
          .attr('height',height + margin.top + margin.bottom);

    const svgFigureGroup = svgCanvas.append('g')
                                  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                                  .attr('class','boxplot');

    	// the x-axis
    const x = d3.scale.ordinal()
    .domain( data.map(function(d) { return d[0]; } ) )
    .rangeRoundBands([0 , width], 0.7, 0.3);

    const xAxis = d3.svg.axis()
      .scale(x)
      .orient('bottom');

    // the y-axis
    const y = d3.scale.linear()
      .domain([min, max]).nice()
      .range([height + margin.top, 0 + margin.top]);

    const yAxis = d3.svg.axis()
      .scale(y)
      .orient('left');

    yAxis.tickFormat((d) => {
      if((Math.abs(d)<1000 && Math.abs(d)>0.01) || d === 0) {
        return ''+Math.round(d*100)/100;
      }
      return d3.format('0.1e')(d);
    });

    // draw the boxplots
    svgFigureGroup.selectAll('.boxplot')
      .data(data)
      .enter().append('g')
      .attr('class',function(d,i) {
        const classString = 'box-element';
        const dataLabel = `${d[0]}`;
        const colorLabel = `category-gray`;

        return `${classString} ${dataLabel} ${colorLabel}`;
      })
      .attr('transform', function(d) { return 'translate(' +  x(d[0])  + ',' + margin.top + ')'; } )
      .call(chart.width(x.rangeBand()));

    // add a title
    svgFigureGroup.append('text')
        .attr('x', (width / 2))
        .attr('y', 0 + (margin.top / 2))
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        //.style('text-decoration', 'underline')
        .text(setParameters.setBDesc.label);

    // draw y axis
    svgFigureGroup.append('g')
      .attr('class', 'y axis')
      .call(yAxis);
      // .append('text') // and text1
      // .attr('transform', 'rotate(-90)')
      // .attr('y', 6)
      // .attr('dy', '.71em')
      // .style('text-anchor', 'end')
      // .style('font-size', '16px')
      // .text(cell.columnLabel);

    // draw x axis
    svgFigureGroup.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + (height  + margin.top + 10) + ')')
      .call(xAxis);
      // .append('text')             // text label for the x axis
      //   .attr('x', (width / 2) )
      //   .attr('y',  10 )
      // .attr('dy', '.71em')
      //   .style('text-anchor', 'middle')
      // .style('font-size', '16px')
      //   .text(cell.columnLabel);


    const boxElements = svgFigureGroup.selectAll('g.box-element').classed('selected',true);

    const cirlceElements = boxElements.selectAll('circle')
                                    .attr('r',2);
    if(formatData.color) {
      const rectElements = boxElements.selectAll('rect').style('fill',formatData.color);
      const cirlceElements = boxElements.selectAll('circle').style('fill',formatData.color).style('stroke','black');
    }

    // tooltip
    boxElements.on('mouseover', function(d) {
                  // console.log('boxplot.tooltip.d',d)
                  const m = d3.mouse(d3.select('body').node());
                  tooltipBoxplot.transition()
                      .duration(500)
                      .style('display','block')
                      .style('opacity', .9);
                  const min = (d[1][0]).toFixed(2);
                  const q1 = (d[1].quartiles[0]).toFixed(2);
                  const median = (d[1].quartiles[1]).toFixed(2);
                  const q3 = (d[1].quartiles[2]).toFixed(2);
                  const max = (d[1][d[1].length-1]).toFixed(2);
                  tooltipBoxplot	.html(`min = ${min}</br>q1 = ${q1}</br>median = ${median}</br>q3 = ${q3}</br>max = ${max}`)
                      .style('left', m[0] + 30 + 'px')
                      .style('top', m[1] - 20 + 'px');
                })
                .on('mouseout', function(d) {
                  tooltipBoxplot.transition()
                        .duration(500)
                        .style('display','none')
                        .style('opacity', 0);
                });

  }

}
