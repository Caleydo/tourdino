import {IMeasureVisualization, ISetParameters, IMeasureResult} from '../';
import * as d3 from 'd3';
import 'd3-grubert-boxplot';

export class BoxPlot implements IMeasureVisualization{

  private formatData(setParameters: ISetParameters)
  {
    // console.log('Box Plot - formatData');
    
    let rowBoxData = [];

    let label = '';
      
    // setA
    let setABoxData = []
    let min = Infinity;
    let max = -Infinity;
    if(setParameters.setACategory) {
      label = setParameters.setACategory;
    }
    if(setParameters.setACategory && setParameters.setACategory.label){
      label = setParameters.setACategory.label;
    }
    setABoxData.push(''+label);
    let setAValid = setParameters.setA.filter((item) => { return (item !== undefined) && (item !== null) && (!Number.isNaN(item)); });
    setABoxData.push(setAValid);
    min = Math.min(min,Math.min(...(<number[]> setAValid)));
    max = Math.max(max,Math.max(...(<number[]> setAValid)));
    setABoxData.push({min: min, max: max});

    // add the boxplot to all boxplots for this row
    rowBoxData.push(setABoxData);

    // setB
    let setBBoxData = [];
    min = Infinity;
    max = -Infinity;
    if(setParameters.setBCategory) {
      label = setParameters.setBCategory;
    }
    if(setParameters.setBCategory && setParameters.setBCategory.label){
      label = setParameters.setBCategory.label;
    }
    setBBoxData.push(''+label);
    let setBValid = setParameters.setB.filter((item) => { return (item !== undefined) && (item !== null) && (!Number.isNaN(item)); });
    min = Math.min(min,Math.min(...(<number[]> setBValid)));
    max = Math.max(max,Math.max(...(<number[]> setBValid)));

    // second elemnt is an array with all the values 
    setBBoxData.push(setBValid);
    setBBoxData.push({min: min, max: max});

    // add the boxplot to all boxplots for this row
    rowBoxData.push(setBBoxData);


    const boxColor = setParameters.setBDesc.color ? setParameters.setBDesc.color : null;
    let rowBoxObj = {
      color: boxColor,
      data: rowBoxData,
      domainMin: setParameters.setBDesc.domain ? setParameters.setBDesc.domain[0] : Math.min(rowBoxData[0][2].min,rowBoxData[1][2].min),
      domainMax: setParameters.setBDesc.domain ? setParameters.setBDesc.domain[1] : Math.min(rowBoxData[0][2].max,rowBoxData[1][2].max)
    };

    return rowBoxObj;
  }

  public generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult)
  {
    let formatData = this.formatData(setParameters);
    // console.log('Box Plot - generateVisualization');

    //remove old tooltip
    d3.select("body").selectAll("div.measure.tooltip").remove();

    let tooltipBoxplot = d3.select("body").append("div")
                                          .style("display", "none")
                                          .style('opacity', 0)
                                          .attr("class", "tooltip measure");
    

    let data = formatData.data;                                            
    let min = Math.min(...data.map((a) => (a[2].min)));
    let max = Math.max(...data.map((a) => (a[2].max)));
    
    // check if the min and may are not infinte
    min = isFinite(min) ? min : formatData.domainMin;
    max = isFinite(max) ? max : formatData.domainMax;
    // remove all empty sets
    data = data.filter((item) => {return (item[1].length !== 0)});
    // console.log('BoxPlot: ',{data,min,max});


    let containerWidth = Number(miniVisualisation.style('width').slice(0,-2)) - 25; //-25 because of the scroll bar

    let calcWidth = Math.max(containerWidth,data.length * 50 + 30);

    let maxHeight = 220;
    let margin = {top: 10, right: 0, bottom: 50, left: 55};
    let  width = calcWidth - margin.left - margin.right;
    let height = maxHeight - margin.top - margin.bottom;

    let chart = (d3 as any).box()
          .whiskers(function(d) {
                let q1 = d.quartiles[0],
                    q3 = d.quartiles[2],
                    iqr = (q3 - q1) * 1.5,
                    i = -1,
                    j = d.length;
                while (d[++i] < q1 - iqr);
                while (d[--j] > q3 + iqr);
                return [i, j];    
          })
          .height(height)	
          .domain([min, max])
          .showLabels(false);


    let svgCanvas = miniVisualisation.append('svg')
          .attr('width',width + margin.left + margin.right)
          .attr('height',height + margin.top + margin.bottom);      

    let svgFigureGroup = svgCanvas.append('g')
                                  .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                                  .attr('class','boxplot');

    	// the x-axis
    let x = d3.scale.ordinal()	   
    .domain( data.map(function(d) { return d[0] } ) )	    
    .rangeRoundBands([0 , width], 0.7, 0.3); 		

    let xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

    // the y-axis
    let y = d3.scale.linear()
      .domain([min, max])
      .range([height + margin.top, 0 + margin.top]);

    let yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

    yAxis.tickFormat((d) => {
        if(Math.abs(d)<1000){
          return d;
        }
        return d3.format('0.1e')(d); });  

    // draw the boxplots	
    svgFigureGroup.selectAll(".boxplot")
      .data(data)
      .enter().append("g")
      .attr('class',function(d,i) {
        let classString = 'box-element';
        let dataLabel = `${d[0]}`;
        let colorLabel = `category-gray`;

        return `${classString} ${dataLabel} ${colorLabel}`;
      })
      .attr("transform", function(d) { return "translate(" +  x(d[0])  + "," + margin.top + ")"; } )
      .call(chart.width(x.rangeBand())); 
     
    // add a title
    svgFigureGroup.append("text")
        .attr("x", (width / 2))             
        .attr("y", 0 + (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "18px") 
        //.style("text-decoration", "underline")  
        .text(setParameters.setBDesc.label);

    // draw y axis
    svgFigureGroup.append("g")
      .attr("class", "y axis")
      .call(yAxis);
      // .append("text") // and text1
      // .attr("transform", "rotate(-90)")
      // .attr("y", 6)
      // .attr("dy", ".71em")
      // .style("text-anchor", "end")
      // .style("font-size", "16px") 
      // .text(cell.columnLabel);		

    // draw x axis	
    svgFigureGroup.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + (height  + margin.top + 10) + ")")
      .call(xAxis);
      // .append("text")             // text label for the x axis
      //   .attr("x", (width / 2) )
      //   .attr("y",  10 )
      // .attr("dy", ".71em")
      //   .style("text-anchor", "middle")
      // .style("font-size", "16px") 
      //   .text(cell.columnLabel); 


    let boxElements = svgFigureGroup.selectAll('g.box-element').classed('selected',true);

    let cirlceElements = boxElements.selectAll('circle')
                                    .attr('r',2);
    if(formatData.color)
    {                                
      let rectElements = boxElements.selectAll('rect').style('fill',formatData.color);         
      let cirlceElements = boxElements.selectAll('circle').style('fill',formatData.color).style('stroke','black');              
    }

    // tooltip
    boxElements.on("mouseover", function(d) {
                  // console.log('boxplot.tooltip.d',d)		
                  let m = d3.mouse(d3.select("body").node());
                  tooltipBoxplot.transition()		
                      .duration(500)		
                      .style('display','block')
                      .style("opacity", .9);
                  let min = (d[1][0]).toFixed(2);
                  let q1 = (d[1].quartiles[0]).toFixed(2);
                  let median = (d[1].quartiles[1]).toFixed(2);
                  let q3 = (d[1].quartiles[2]).toFixed(2);
                  let max = (d[1][d[1].length-1]).toFixed(2);
                  tooltipBoxplot	.html(`min = ${min}</br>q1 = ${q1}</br>median = ${median}</br>q3 = ${q3}</br>max = ${max}`)	
                      .style("left", m[0] + 30 + "px")
                      .style("top", m[1] - 20 + "px")	
                })					
                .on("mouseout", function(d) {		
                  tooltipBoxplot.transition()		
                        .duration(500)
                        .style('display','none')
                        .style("opacity", 0);	
                });

  }

}