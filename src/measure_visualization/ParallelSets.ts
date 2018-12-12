import {IMeasureVisualization, intersection, ISetParameters, IMeasureResult} from '../';
import * as d3 from 'd3';
import 'd3.parsets';


export class ParallelSets implements IMeasureVisualization{

  private formatData(setParameters: ISetParameters)
  {
    // console.log('Parallel Sets - formatData');
      const num = setParameters.setB.length;

      let label = ''
      if(setParameters.setBCategory) {
        label = setParameters.setBCategory;
      }
      if(setParameters.setBCategory && setParameters.setBCategory.label){
        label = setParameters.setBCategory.label;
      }

      let diffLable = '';
      if (setParameters.setBDesc && setParameters.setBDesc.categories){
        const category = setParameters.setBDesc.categories.filter((item) => (item.name === label))[0];
        diffLable = (category === undefined || category === null) ? '' : category.label;
      }


      let currCategoryParts = {
        attributeLabel: setParameters.setBDesc.label,
        categoryLabel: diffLable === '' ? label : diffLable,
        categoryAmount: num,
        parts: {}
      };

      const currHeaderNum = setParameters.setA.length;

      const {intersection: intersect} = intersection(setParameters.setA,setParameters.setB);
      const numHeader = intersect.length;
      
      label = '';
      if(setParameters.setACategory) {
        label = setParameters.setACategory;
      }
      if(setParameters.setACategory && setParameters.setACategory.label){
        label = setParameters.setACategory.label;
      }

      diffLable = '';
      if (setParameters.setADesc && setParameters.setADesc.categories){
        const category = setParameters.setADesc.categories.filter((item) => (item.name === label))[0];
        diffLable = (category === undefined || category === null) ? '' : category.label;
      }

      const currCatForHead = {
        label: diffLable === '' ? label : diffLable,
        intersectionAmount: numHeader,
        currHeaderAmount: currHeaderNum
      };

      currCategoryParts.parts = currCatForHead;

    return currCategoryParts;
  }

  public generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult)
  {
    let formatData = this.formatData(setParameters) as any;
    console.log('Parallel Sets - generateVisualization',{setParameters,formatData});

    // delete old tooltip
    let tooltipParSets = d3.select("body").selectAll("div.parsets.tooltip").remove();

    let width = Number(miniVisualisation.style('width').slice(0, -2)); //-25 because the scroll bar (15px) on the left is dynamically added
    let svgWidth = width - 25;
    let svgHeight = 175;
    let svg2DimLabelHeight = 45;
    // console.log('svgContainer.style("width"): ',svgContainer.style('width'));
    // console.log('width: ',width);


    //dimensions for the parallel sets
    //added prefix of dimension, otherwise the parallel sets can't be drawn with the same dimension twice
    let dimension1 = setParameters.setBDesc.label+'\uFEFF'; //append ZERO WIDTH NO-BREAK SPACE 
    let dimension2 = (setParameters.setACategory === 'Selected') ? 'Selection' : 'Stratification Groups';

    let parSetData = [];

          let pSDIntersection = {};
          pSDIntersection['value'] = formatData.parts.intersectionAmount;
          pSDIntersection[dimension1] = formatData.categoryLabel;
          pSDIntersection[dimension2] = formatData.parts.label;
          if((pSDIntersection as any).value > 0){
            parSetData.push(pSDIntersection);
          }

          let pSDCategoryOther = {};
          pSDCategoryOther['value'] = formatData.categoryAmount - formatData.parts.intersectionAmount;
          pSDCategoryOther[dimension1] = formatData.categoryLabel;
          pSDCategoryOther[dimension2] = 'Others';
          if((pSDCategoryOther as any).value > 0){
            parSetData.push(pSDCategoryOther);
          }

          let pSDOtherCategory = {};
          pSDOtherCategory['value'] = formatData.parts.currHeaderAmount - formatData.parts.intersectionAmount;
          pSDOtherCategory[dimension1] = 'Others';
          pSDOtherCategory[dimension2] = formatData.parts.label;
          if((pSDOtherCategory as any).value > 0){
            parSetData.push(pSDOtherCategory);
          }


    console.log('ParSets - data: ', parSetData);

    // console.log('SVG Conatiner - width: ',width);
    let chart = (<any>d3).parsets()
      .tension(0.5) //[0 .. 1] -> 1 = straight line 
      .dimensions([dimension1, dimension2])
      .value(function (d) {return d.value;})
      .width(svgWidth)
      .height(svgHeight)
      .spacing(10);

    let svgCanvas = miniVisualisation.append('svg')
      .attr('width', chart.width())
      .attr('height', chart.height()+svg2DimLabelHeight);
    // .attr('height',chart.height());
    // .attr('width','100%')
    // .attr('height','100%');

    let svgFigureGroup = svgCanvas.append('g').attr('class', 'parSets');
                                              // .attr('width', chart.width())
                                              // .attr('height', chart.height() + svg2DimLabelHeight);
    
    // draw parallel sets
    svgFigureGroup.datum(parSetData).call(chart);

    // add class to tooltip
    d3.select("body").selectAll("div.parsets.tooltip").classed('measure',true);

    //rotation um 90 von den SVG parallel sets
    //svgFigureGroup.attr('transform','rotate(-90) translate(-'+width+',0)');

    let svgRibbons = svgFigureGroup.selectAll('g.ribbon');
    // console.log('svgRibon: ',svgRibbons);

    const category = setParameters.setBDesc.categories.filter((item) => (item.name === setParameters.setBCategory))[0];
    const categoryLabel = (category === undefined || category === null) ? setParameters.setBCategory.label : category.label;

    
    const columnTable = setParameters.setADesc.categories.filter((item) => (item.name === setParameters.setACategory))[0];
    const columnLabel = (columnTable === undefined || columnTable === null) ? setParameters.setACategory.label : columnTable.label;

    //highlight and color ribbons
    this.highlightAndColorParSetsRibbons(setParameters, svgRibbons, dimension1, categoryLabel, columnLabel);
    svgFigureGroup.selectAll('g.ribbon-mouse').remove();
    svgRibbons.on('.drag',null)

    //move label dimensions underneath parallel sets
    let svgDimensions = svgFigureGroup.selectAll('g.dimension');
    this.moveParSetsDimensionLabels(svgDimensions);
    svgDimensions.selectAll('text.dimension').selectAll('tspan.sort').remove();
    svgDimensions.on('.drag', null);
    svgDimensions.selectAll('g.category').on('.drag', null);
  }


  // sets the ribbon color and highlights the selected on in the parallel sets vis
  private highlightAndColorParSetsRibbons(setParameters: ISetParameters, svgRibbons: d3.Selection<any>, dimensionName: string, category: string, tableColumn: string)
  {
    console.log('highlight and color ribbons: ', {setParameters, svgRibbons, dimensionName, category, tableColumn});
    //highlight current path
    let svgPaths = svgRibbons.selectAll('path')
      .each(function (d) {
        d3.select(this).classed('selected', false);

        //the path between the selected row and column will be marked as selected (higher opacity)
        if ((d.parent.name === category && d.node.name === tableColumn) || (d.parent.name === tableColumn && d.node.name === category)) {
          d3.select(this).classed('selected', true);
        }

        if (setParameters.setBDesc.categories && setParameters.setBDesc.categories.filter((a) => (a.name===setParameters.setBCategory)).length === 1 ){
          
          //all paths connected to the category of the dimension will be coloured in category's color
          if((d.parent.dimension === dimensionName && d.parent.name === category) || (d.node.dimension === dimensionName && d.node.name === category)){
            const color = setParameters.setBDesc.categories.filter((a) => (a.name===setParameters.setBCategory))[0].color;
            if (color !== null) {
              d3.select(this).style('fill', color);
              d3.select(this).style('stroke', color);
            }
          }else{
            d3.select(this).attr('class','category-gray');
          }
        }else{
          if (setParameters.setBCategory && setParameters.setBCategory.color) {
            const color = setParameters.setBCategory.color;
            if((d.parent.dimension === dimensionName && d.parent.name === category) || (d.node.dimension === dimensionName && d.node.name === category)){
              d3.select(this).style('fill', color);
              d3.select(this).style('stroke', color);
            }else {
              d3.select(this).classed('category-gray',true);
            }
          }else {
          d3.select(this).classed('category-selected',true); //make all selected
            if((d.parent.name === 'Others' && d.node.name !== category) || (d.node.name === 'Others' && d.parent.name !== category)) {
              //only the path between others and not the current category are coloured gray
              d3.select(this).classed('category-selected',false);
              d3.select(this).classed('category-gray',true);
            }
          }
        }
        console.log('path.this: ', d3.select(this));
        console.log('path.d: ',d);
      });
  }

  // moves the label of the second dimension underneath the parralel sets vis
  private moveParSetsDimensionLabels(svgDimensions: d3.Selection<any>)
  {
    // console.log('move dimension labels: ', {svgDimensions});

    // parameters for the dimension translation
    const dimensionTranslate = [-25,40];
    const categoryTranslate = [0,20];
    let index = 0;

    svgDimensions.each(function (d) {
      // console.log('dim.d: ',d);
      // console.log('dim.this: ',d3.select(this));
       
      //identifiy the current dimension
      if(d.y === 45){
        index = 0;
      }else{
        index = 1;
      }

      const currTransform = d3.select(this).attr('transform').split(',');
      const currTransformX = Number(currTransform[0].split('(')[1]);

      // //dimension label
      d3.select(this).select('rect').attr('transform',`translate(${currTransformX},${dimensionTranslate[index]})`);
      d3.select(this).select('text').attr('transform',`translate(${currTransformX},${dimensionTranslate[index]})`);
      
      // //category labels
      let categoryLabel = d3.select(this).selectAll('g');
      categoryLabel.selectAll('rect').attr('transform',`translate(${currTransformX},${categoryTranslate[index]})`);
      categoryLabel.selectAll('text').attr('transform',`translate(${currTransformX},${categoryTranslate[index]})`);
    });
  }

}