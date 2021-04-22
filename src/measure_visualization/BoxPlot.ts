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
      '$schema': 'https://vega.github.io/schema/vega-lite/v4.json',
      data: {values: this.formatData(setParameters)},
      title: setParameters.setBDesc.label,
      width: {step: 30},
      mark: {
        type: 'boxplot',
        median: {color: 'black'}
      },
      encoding: {
        x: {field: 'group', type: 'nominal', axis: {labelAngle: 45}, title: null},
        color: {field: 'color', type: 'nominal', legend: null, scale: null},
        y: {
          field: 'value',
          type: 'quantitative',
          scale: {zero: false},
          axis: {grid: false},
          title: null
        }
      }
    };

    vegaEmbed(miniVisualisation.append('div').node() as HTMLElement, spec, {actions: false, renderer: 'canvas'});
  }

}
