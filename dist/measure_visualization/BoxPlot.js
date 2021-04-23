import vegaEmbed from 'vega-embed';
export class BoxPlot {
    formatData(setParameters) {
        var _a, _b, _c, _d, _e, _f;
        const labelA = ((_a = setParameters.setACategory) === null || _a === void 0 ? void 0 : _a.label) || '';
        const setAValid = setParameters.setA.filter((item) => { return (item !== undefined) && (item !== null) && (!Number.isNaN(item)); });
        const colorA = ((_b = setParameters.setADesc) === null || _b === void 0 ? void 0 : _b.color) || ((_c = setParameters.setACategory) === null || _c === void 0 ? void 0 : _c.color) || '#EFEFEF';
        let labelB = ((_d = setParameters.setBCategory) === null || _d === void 0 ? void 0 : _d.label) || '';
        labelB = '​' + labelB; // add zero width space
        const setBValid = setParameters.setB.filter((item) => { return (item !== undefined) && (item !== null) && (!Number.isNaN(item)); });
        const colorB = ((_e = setParameters.setBDesc) === null || _e === void 0 ? void 0 : _e.color) || ((_f = setParameters.setBCategory) === null || _f === void 0 ? void 0 : _f.color) || '#EFEFEF';
        return [
            ...setAValid.map((valA) => ({ 'group': labelA, 'value': valA, color: colorA })),
            ...setBValid.map((valB) => ({ 'group': labelB, 'value': valB, color: colorB })),
        ];
    }
    generateVisualization(miniVisualisation, setParameters, score) {
        const spec = {
            '$schema': 'https://vega.github.io/schema/vega-lite/v4.json',
            data: { values: this.formatData(setParameters) },
            title: {
                text: setParameters.setBDesc.label,
                limit: 400, dx: -100
            },
            width: 'container',
            mark: {
                type: 'boxplot',
                median: { color: 'black' }
            },
            encoding: {
                x: {
                    field: 'value',
                    type: 'quantitative',
                    scale: { zero: false },
                    axis: { grid: false },
                    title: null
                },
                y: { field: 'group', type: 'nominal', title: null },
                color: { field: 'color', type: 'nominal', legend: null, scale: null }
            },
            padding: { left: 5, top: 0, right: 5, bottom: 0 },
            config: {
                axis: {
                    titleFontSize: 16, titleFontWeight: 500, titleFont: 'Yantramanav',
                    labelFontSize: 12, labelLimit: 200, labelFont: 'Yantramanav',
                    labelOverlap: 'parity',
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
        vegaEmbed(miniVisualisation.append('div').style('width', '100%').node(), spec, { actions: false });
    }
}
//# sourceMappingURL=BoxPlot.js.map