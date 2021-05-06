import * as d3 from 'd3';
import {IMeasureResult, IMeasureVisualization, ISetParameters} from '../base/interfaces';
import vegaEmbed from 'vega-embed';
import {TopLevelSpec as VegaLiteSpec} from 'vega-lite';

export class BoxPlot implements IMeasureVisualization {

  private formatData(setParameters: ISetParameters) {
    const labelA = setParameters.setACategory?.label || '';
    const setAValid = setParameters.setA.filter((item) => {return (item !== undefined) && (item !== null) && (!Number.isNaN(item));});
    const colorA = setParameters.setADesc?.color || setParameters.setACategory?.color || '#EFEFEF';

    let labelB = setParameters.setBCategory?.label || '';
    labelB = '​'+labelB; // add zero width space
    const setBValid = setParameters.setB.filter((item) => {return (item !== undefined) && (item !== null) && (!Number.isNaN(item));});
    const colorB = setParameters.setBDesc?.color || setParameters.setBCategory?.color || '#EFEFEF';

    return [
      ...setAValid.map((valA) => ({'group': labelA, 'value': valA, color: colorA})),
      ...setBValid.map((valB) => ({'group': labelB, 'value': valB, color: colorB})),
    ];
  }

  public generateVisualization(miniVisualisation: d3.Selection<any>, setParameters: ISetParameters, score: IMeasureResult) {
    const spec: VegaLiteSpec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: {values: this.formatData(setParameters)},
      title: {
        text: setParameters.setBDesc.label,
        limit: 400, dx: -100
      },
      width: 'container',
      mark: {
        type: 'boxplot',
        median: {color: 'black'}
      },
      encoding: {
        x: {
          field: 'value',
          type: 'quantitative',
          scale: {zero: false},
          axis: {grid: false},
          title: null
        },
        y: {field: 'group', type: 'nominal', title: null},
        color: {field: 'color', type: 'nominal', legend: null, scale: null}
      },
      padding: {left: 5, top: 0, right: 5, bottom: 0},
      config: {
        axis: {
          titleFontSize: 16, titleFontWeight: 500, titleFont: 'Yantramanav',
          labelFontSize: 12, labelLimit: 200, labelFont: 'Yantramanav',
          labelOverlap: 'parity', // hide if labels overlap
          labelSeparation: 5,
          labelBound: true // clip labels if they are not within chart area
        },
        legend: {
          titleFontSize: 16, titleFontWeight: 500, titleFont: 'Yantramanav',
          labelFontSize: 12, labelLimit: 200, labelFont: 'Yantramanav',
          labelOverlap: 'parity'
        },
        header: {
          titleFontSize: 16, titleFontWeight: 500, titleFont: 'Yantramanav',
          labelFontSize: 12, labelLimit: 200, labelFont: 'Yantramanav'
        },
        title: {
          fontSize: 16, fontWeight: 500, font: 'Yantramanav',
        }
      }
    };

    vegaEmbed(miniVisualisation.append('div').style('width','100%').node() as HTMLElement, spec, {actions: false});
  }

}
