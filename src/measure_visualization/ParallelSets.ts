import {IMeasureVisualization, intersection, ISetParameters, IMeasureResult} from '../';
import * as d3 from 'd3';
import 'd3.parsets';


interface IFormatedDataParallelSet {
  dimension1: string;
  dimension2: string;
  data: Array<any>;
}

export class ParallelSets implements IMeasureVisualization {

  private formatData(setParameters: ISetParameters, isAdjRand: boolean): IFormatedDataParallelSet {
    // console.log('Parallel Sets - formatData');
    const dimension1 = setParameters.setBDesc.label;
    let dimension2 = setParameters.setADesc.label;
    let data: Array<any>;

    if(isAdjRand) {
      data = this.formatDataAdjRand(setParameters, dimension1, dimension2);
    } else {
      dimension2 += '\uFEFF'; //append ZERO WIDTH NO-BREAK SPACE, so that both dimension can have the same label
      data = this.formatDataSelectionAgainstCatOrGroup(setParameters, dimension1, dimension2);
    }

    return {dimension1, dimension2, data};
  }

  private formatDataSelectionAgainstCatOrGroup(setParameters: ISetParameters, dimension1: string, dimension2: string): any {
    // console.log('Parallel Sets - formatDataSelectionAgainstCatOrGroup');
    const num = setParameters.setB.length;

    let label = '';
    // if(setParameters.setBCategory) {
    //   label = setParameters.setBCategory;
    // }
    if(setParameters.setBCategory && setParameters.setBCategory.label) {
      label = setParameters.setBCategory.label;
    }

    let diffLable = '';
    if (setParameters.setBDesc && setParameters.setBDesc.categories) {
      const category = setParameters.setBDesc.categories.filter((item) => (item.name === label))[0];
      diffLable = (category === undefined || category === null) ? '' : category.label;
    }


    const currCategoryParts : any = {
      attributeLabel: setParameters.setBDesc.label,
      categoryLabel: diffLable === '' ? label : diffLable,
      categoryAmount: num,
      parts: {}
    };

    const currHeaderNum = setParameters.setA.length;

    const {intersection: intersect} = intersection(setParameters.setA,setParameters.setB);
    const numHeader = intersect.length;

    label = '';
    // if(setParameters.setACategory) {
    //   label = setParameters.setACategory;
    // }
    if(setParameters.setACategory && setParameters.setACategory.label) {
      label = setParameters.setACategory.label;
    }

    diffLable = '';
    if (setParameters.setADesc && setParameters.setADesc.categories) {
      const category = setParameters.setADesc.categories.filter((item) => (item.name === label))[0];
      diffLable = (category === undefined || category === null) ? '' : category.label;
    }

    const currCatForHead = {
      label: diffLable === '' ? label : diffLable,
      intersectionAmount: numHeader,
      currHeaderAmount: currHeaderNum
    };

    currCategoryParts.parts = currCatForHead;

    // create data
    const data = [];

    const pSDIntersection = { value: 0};
    pSDIntersection.value = currCategoryParts.parts.intersectionAmount;
    pSDIntersection[dimension1] = currCategoryParts.categoryLabel;
    pSDIntersection[dimension2] = currCategoryParts.parts.label;
    if((pSDIntersection as any).value > 0) {
      data.push(pSDIntersection);
    }

    const pSDCategoryOther = { value: 0};
    pSDCategoryOther.value = currCategoryParts.categoryAmount - currCategoryParts.parts.intersectionAmount;
    pSDCategoryOther[dimension1] = currCategoryParts.categoryLabel;
    pSDCategoryOther[dimension2] = 'Others';
    if((pSDCategoryOther as any).value > 0) {
      data.push(pSDCategoryOther);
    }

    const pSDOtherCategory = { value: 0};
    pSDOtherCategory.value = currCategoryParts.parts.currHeaderAmount - currCategoryParts.parts.intersectionAmount;
    pSDOtherCategory[dimension1] = 'Others';
    pSDOtherCategory[dimension2] = currCategoryParts.parts.label;
    if((pSDOtherCategory as any).value > 0) {
      data.push(pSDOtherCategory);
    }


    return data;
  }

  private formatDataAdjRand(setParameters: ISetParameters, dimension1: string, dimension2: string): any {
    console.log('Parallel Sets - formatDataAdjRand');
    const len = setParameters.setA.length;
    const setA = [];
    const setB = [];
    for(let i=0; i<len; i++) {
      setA.push({id: i, value: setParameters.setA[i]});
      setB.push({id: i, value: setParameters.setB[i]});
    }

    const dim1 = setParameters.setADesc.label;
    const setACategories = setParameters.setA.filter((item, index, self) => self.indexOf(item) === index);
    const dim2 = setParameters.setBDesc.label;
    const setBCategories = setParameters.setB.filter((item, index, self) => self.indexOf(item) === index);
    console.log('parameters: ',{'setA': {set: setA, dim: dim1, cate: setACategories}, 'setB': {set: setB, dim: dim2, cate: setBCategories}});
    const parts = [];
    for (const categoryA of setACategories) {
      const currCatAIds = setA.filter((item) => (item.value === categoryA)).map((item) => (item.id));
      let categoryALabel;

      const defCategoryA = setParameters.setADesc.categories.filter((item) => (item.name === categoryA));
      if (defCategoryA.length === 0) {
        categoryALabel = 'Missing values';
      } else {
        categoryALabel = defCategoryA[0].label;
      }

      for (const categoryB of setBCategories) {
        const currCatBIds = setB.filter((item) => (item.value === categoryB)).map((item) => (item.id));
        let categoryBLabel;

        const defCategoryB = setParameters.setBDesc.categories.filter((item) => (item.name === categoryB));
        if (defCategoryB.length === 0) {
          categoryBLabel = 'Missing values';
        } else {
          categoryBLabel = defCategoryB[0].label;
        }
        const intersect = intersection(currCatAIds,currCatBIds);
        const amounts = {
          intersectAmount: intersect.intersection.length,
          setARestAmount: intersect.arr1.length,
          setBRestAmount: intersect.arr2.length};

        if(amounts.intersectAmount > 0) {
          parts.push({
            'dim1': dim1,
            'cat1': categoryALabel,
            'amountCat1': currCatAIds.length,
            'dim2': dim2,
            'cat2': categoryBLabel,
            'amountCat2': currCatBIds.length,
            'intersection': amounts
          });
        }
      }

    }

    console.log('parts: ',parts);

    const data = [];

    for (const part of parts) {
      const dataItem = {value :0};
      dataItem.value = part.intersection.intersectAmount;
      dataItem[part.dim1] = part.cat1;
      dataItem[part.dim2] = part.cat2;

      data.push(dataItem);
    }

    return data;

  }

  public generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult) {
    const isAdjRand = (score.additionalData && score.additionalData === 'adjrand') ? true : false;

    const formatData = this.formatData(setParameters, isAdjRand) as any;

    console.log('Parallel Sets - generateVisualization',{setParameters, score, formatData, IsAdjRand: isAdjRand});

    const width = Number(miniVisualisation.style('width').slice(0, -2)); //-25 because the scroll bar (15px) on the left is dynamically added
    const svgWidth = width - 25;
    const svgHeight = 175;
    const svg2DimLabelHeight = 45;
    // console.log('svgContainer.style('width'): ',svgContainer.style('width'));
    // console.log('width: ',width);


    // console.log('ParSets - formatData.data: ', formatData.data);

    // console.log('SVG Conatiner - width: ',width);
    const chart = (<any>d3).parsets()
      .tension(0.5) //[0 .. 1] -> 1 = straight line
      .dimensions([formatData.dimension1, formatData.dimension2])
      .value(function (d) {return d.value;})
      .width(svgWidth)
      .height(svgHeight)
      .spacing(10);

      const svgCanvas = miniVisualisation.append('svg')
      .attr('width', chart.width())
      .attr('height', chart.height()+svg2DimLabelHeight);
    // .attr('height',chart.height());
    // .attr('width','100%')
    // .attr('height','100%');

    const svgFigureGroup = svgCanvas.append('g').attr('class', 'parSets');
                                              // .attr('width', chart.width())
                                              // .attr('height', chart.height() + svg2DimLabelHeight);

    // draw parallel sets
    svgFigureGroup.datum(formatData.data).call(chart);

    // remove tooltip (parsets.js), is automatically created when the chart is genereted
    d3.select('body').selectAll('div.parsets.tooltip').remove();


    // edit dimensions
    const svgDimensions = svgFigureGroup.selectAll('g.dimension');
    // remove interactions for the dimensions
    svgDimensions.selectAll('text.dimension').selectAll('tspan.sort').remove();
    svgDimensions.on('.drag', null);
    svgDimensions.selectAll('g.category').on('.drag', null);
    // move label dimensions underneath parallel sets
    this.moveParSetsDimensionLabels(svgDimensions);


    // edit ribbons
    const svgRibbons = svgFigureGroup.selectAll('g.ribbon');
    // console.log('svgRibon: ',svgRibbons);

    // remove interations for the ribbons
    svgFigureGroup.selectAll('g.ribbon-mouse').remove();
    svgRibbons.on('.drag',null);

    // coloring of the ribbons
    if(isAdjRand) {
      this.colorRibbonsAdjRand(setParameters, svgRibbons, formatData.dimension1);
    } else {
      this.highlightAndColorRibbons(setParameters, svgRibbons, formatData.dimension1);
    }

    //add tooltip for categories
    svgDimensions.each(function (d) {
      const categories = d3.select(this).selectAll('g.category');

      categories.append('title')
        .classed('tooltip.measure',true)
        .text(function(d) {
          let total = 0;
          const allCats = d.dimension.categories;

          for(const cat of allCats) {
            total += cat.count;
          }
          const percentage = ((d.count/total)*100).toFixed(2);

          return `Category; ${d.name}\nCount: ${d.count} (${percentage}%)`;
        });
    });

    // add tooltip for ribbons
    svgRibbons.selectAll('path')
      .each(function (d) {

        d3.select(this).append('title')
          .classed('tooltip.measure',true)
          .text(function(d) {
            const dim1Name = d.parent.name;
            const dim2Name = d.node.name;

            return `Ribbon: ${dim1Name} x ${dim2Name}\nCount: ${d.count}`;
          });
      });


  }


  // sets the ribbon color and highlights the selected on in the parallel sets vis
  private highlightAndColorRibbons(setParameters: ISetParameters, svgRibbons: d3.Selection<any>, dimensionName: string) {
    // console.log('highlight and color ribbons: ', {setParameters, svgRibbons, dimensionName});

    const category = setParameters.setBDesc.categories.filter((item) => (item.name === setParameters.setBCategory.label))[0];
    const categoryLabel = (category === undefined || category === null) ? setParameters.setBCategory.label : category.label;

    const columnTable = setParameters.setADesc.categories.filter((item) => (item.name === setParameters.setACategory.label))[0];
    const columnLabel = (columnTable === undefined || columnTable === null) ? setParameters.setACategory.label : columnTable.label;

    //highlight and color paths
    svgRibbons.selectAll('path')
      .each(function (d) {
        d3.select(this).classed('selected', false);

        //the path between the selected row and column will be marked as selected (higher opacity)
        if ((d.parent.name === categoryLabel && d.node.name === columnLabel) || (d.parent.name === columnLabel && d.node.name === categoryLabel)) {
          d3.select(this).classed('selected', true);
        }

        if (setParameters.setBDesc.categories && setParameters.setBDesc.categories.filter((a) => (a.name===setParameters.setBCategory.label)).length === 1 ) {

          //all paths connected to the category of the dimension will be coloured in category's color
          if((d.parent.dimension === dimensionName && d.parent.name === categoryLabel) || (d.node.dimension === dimensionName && d.node.name === categoryLabel)) {
            const color = setParameters.setBDesc.categories.filter((a) => (a.name===setParameters.setBCategory.label))[0].color;
            if (color !== null) {
              d3.select(this).style('fill', color);
              d3.select(this).style('stroke', color);
            }
          } else {
            d3.select(this).attr('class','category-gray');
          }
        } else {
          if (setParameters.setBCategory && setParameters.setBCategory.color) {
            const color = setParameters.setBCategory.color;
            if((d.parent.dimension === dimensionName && d.parent.name === categoryLabel) || (d.node.dimension === dimensionName && d.node.name === categoryLabel)) {
              d3.select(this).style('fill', color);
              d3.select(this).style('stroke', color);
            } else {
              d3.select(this).classed('category-gray',true);
            }
          } else {
          d3.select(this).classed('category-selected',true); //make all selected
            if((d.parent.name === 'Others' && d.node.name !== categoryLabel) || (d.node.name === 'Others' && d.parent.name !== categoryLabel)) {
              //only the path between others and not the current category are coloured gray
              d3.select(this).classed('category-selected',false);
              d3.select(this).classed('category-gray',true);
            }
          }
        }
        // console.log('path.this: ', d3.select(this));
        // console.log('path.d: ',d);
      });
  }

  private colorRibbonsAdjRand(setParameters: ISetParameters, svgRibbons: d3.Selection<any>, dimensionName: string) {
    const categories = setParameters.setBDesc.categories;
    svgRibbons.selectAll('path')
      .each(function (d) {

        let categoryName = '';
        if (d.node.dimension === dimensionName) {
          categoryName = d.node.name;
        } else {
          categoryName = d.parent.name;
        }

        const category = categories.filter((item) => (item.label === categoryName));
        if(category.length !== 0) {
          d3.select(this).style('fill', category[0].color);
          d3.select(this).style('stroke', category[0].color);
        } else {
          d3.select(this).style('fill', '#808080');
          d3.select(this).style('stroke', '#808080');
        }

        // console.log('path.this: ', d3.select(this));
        // console.log('path.d: ',d);
      });
  }

  // moves the label of the second dimension underneath the parralel sets vis
  private moveParSetsDimensionLabels(svgDimensions: d3.Selection<any>) {
    // console.log('move dimension labels: ', {svgDimensions});

    // parameters for the dimension translation
    const dimensionTranslate = [-25,40];
    const categoryTranslate = [0,20];
    let index = 0;

    svgDimensions.each(function (d) {
      // console.log('dim.d: ',d);
      // console.log('dim.this: ',d3.select(this));

      //identifiy the current dimension
      if(d.y === 45) {
        index = 0;
      } else {
        index = 1;
      }

      const currTransform = d3.select(this).attr('transform').split(',');
      const currTransformX = Number(currTransform[0].split('(')[1]);

      // //dimension label
      d3.select(this).select('rect').attr('transform',`translate(${currTransformX},${dimensionTranslate[index]})`);
      d3.select(this).select('text').attr('transform',`translate(${currTransformX},${dimensionTranslate[index]})`);

      // //category labels
      const categoryLabel = d3.select(this).selectAll('g');
      categoryLabel.selectAll('rect').attr('transform',`translate(${currTransformX},${categoryTranslate[index]})`);
      categoryLabel.selectAll('text').attr('transform',`translate(${currTransformX},${categoryTranslate[index]})`);
    });
  }

}
