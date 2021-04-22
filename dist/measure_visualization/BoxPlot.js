import vegaEmbed from 'vega-embed';
export class BoxPlot {
    formatData(setParameters) {
        var _a, _b, _c, _d, _e, _f;
        const labelA = ((_a = setParameters.setACategory) === null || _a === void 0 ? void 0 : _a.label) || '';
        const setAValid = setParameters.setA.filter((item) => { return (item !== undefined) && (item !== null) && (!Number.isNaN(item)); });
        const colorA = ((_b = setParameters.setADesc) === null || _b === void 0 ? void 0 : _b.color) || ((_c = setParameters.setACategory) === null || _c === void 0 ? void 0 : _c.color) || '#EFEFEF';
        const labelB = ((_d = setParameters.setBCategory) === null || _d === void 0 ? void 0 : _d.label) || '';
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
            title: setParameters.setBDesc.label,
            width: { step: 30 },
            mark: {
                type: 'boxplot',
                median: { color: 'black' }
            },
            encoding: {
                x: { field: 'group', type: 'nominal', axis: { labelAngle: 45 }, title: null },
                color: { field: 'color', type: 'nominal', legend: null, scale: null },
                y: {
                    field: 'value',
                    type: 'quantitative',
                    scale: { zero: false },
                    axis: { grid: false },
                    title: null
                }
            }
        };
        vegaEmbed(miniVisualisation.append('div').node(), spec, { actions: false, renderer: 'canvas' });
    }
}
//# sourceMappingURL=BoxPlot.js.map