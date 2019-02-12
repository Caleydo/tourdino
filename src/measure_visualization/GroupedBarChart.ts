import {IMeasureVisualization, ISetParameters, IMeasureResult} from '../';
import * as d3 from 'd3';

export class GroupedBarChart implements IMeasureVisualization {

  private formatData(setParameters: ISetParameters, score: IMeasureResult) {
    const allCategories = setParameters.setADesc.categories.map((item) => {return {name: item.name, label: item.label, color: item.color};});
    allCategories.push({name: 'Missing values', label: 'Missing values', color: '#808080'});
    console.log('allCategories: ',allCategories);

    let yMax = 0;

    const bargroups = [];
    for (const currCat of allCategories) {
      let currCatInSetA = setParameters.setA.filter((item) => (item === currCat.name)).length;
      let currCatInSetB = setParameters.setB.filter((item) => (item === currCat.name)).length;

      if(currCat.label === 'Missing values') {
        let setAcount = setParameters.setA.filter((item) => (item === null)).length;
        setAcount += setParameters.setA.filter((item) => (item === '')).length;
        currCatInSetA += setAcount;

        let setBcount = setParameters.setB.filter((item) => (item === null)).length;
        setBcount += setParameters.setB.filter((item) => (item === '')).length;
        currCatInSetB += setBcount;
      }

      yMax = Math.max(yMax,currCatInSetA);
      yMax = Math.max(yMax,currCatInSetB);

      const bargrp = {
        categoryLabel: currCat.label,
        color: currCat.color,
        amountSetA: currCatInSetA,
        amountSetB: currCatInSetB
      };

      bargroups.push(bargrp);
    }

    const yDomain = [0,yMax];

    const groupedBarChart = {
      setALabel: setParameters.setACategory,
      setBLabel: setParameters.setBCategory,
      bargroups,
      yDomain
    };

    return groupedBarChart;
  }

  public generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult) {
    const formatData = this.formatData(setParameters,score);
    console.log('Grouped Bar Chart - generateVisualization', {setParameters, score, formatData});

    // only for more than one category should a visulization be created
    if(formatData.bargroups.length > 1) {
      const containerWidth = Number(miniVisualisation.style('width').slice(0,-2)) - 25; //-25 because of the scroll bar

      const calcWidth = Math.max(containerWidth, formatData.bargroups.length * 50 + 30);

      const maxHeight = 220;
      const margin = {top: 10, right: 0, bottom: 50, left: 55};
      const width = calcWidth - margin.left - margin.right;
      const height = maxHeight - margin.top - margin.bottom;

      const nCategories = formatData.bargroups.length;
      const nBarsInGroup = 2;
      const xDomainCategories = formatData.bargroups.map((item) => (item.categoryLabel));

      // yAxis: scale + domain
      const yScale = d3.scale.linear()
                            .domain(formatData.yDomain).nice()
                            .range([height , 0]);
      const yAxis = d3.svg.axis().scale(yScale).orient('left');
      console.log('height: ', height);

      // xAxis: 
      const x0Scale = d3.scale.ordinal()
                              .domain(xDomainCategories)
                              .rangeBands([0,width], 0.1);
      //scale.rangeBand() -> is the space for 1 band
      const x1Scale = d3.scale.ordinal()
                              .domain(['0','1'])
                              .rangeBands([0, x0Scale.rangeBand()]);
      const xAxis = d3.svg.axis().scale(x0Scale).orient('bottom');

      // svg canvas
      const svgCanvas = miniVisualisation.append('svg')
            .attr('width',width + margin.left + margin.right)
            .attr('height',height + margin.top + margin.bottom);

      const svgFigureGroup = svgCanvas.append('g')
                                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                                    .attr('class','barchart');

      // draw y axis
      svgFigureGroup.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

      // draw x axis
      svgFigureGroup.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + (height  + margin.top) + ')')
        .call(xAxis);

      svgFigureGroup.append('g')
                    .selectAll('g')
                    .data(formatData.bargroups)
                    .enter().append('g')
                      .style('fill', '#808080')
                      .attr('transform', function(d, i) { return 'translate(' + x0Scale(d.categoryLabel) + ',0)'; })
                      .selectAll('rect')
                      .data(function(d) {
                        return [d.amountSetA,d.amountSetB];
                      })
                      .enter().append('rect')
                        .attr('width', 25)//x1Scale.rangeBand())
                        .attr('height',(d) => {
                          const barH = height - yScale(d);
                          console.log('bar Height: ', {d,barH});
                          return barH;})
                        .attr('x', function(d, i) {
                          const offset = i === 0 ? x1Scale.rangeBand()-25 : 0;
                          return x1Scale(''+i)+offset;
                        })
                        .attr('y', function(d) { return yScale(d); });



    }
  }
}
