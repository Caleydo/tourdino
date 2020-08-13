import * as d3 from 'd3';
export class GroupedBarChart {
    formatData(setParameters, score) {
        const allCategories = setParameters.setADesc.categories.map((item) => {
            if (typeof (item) === 'string') {
                return { name: item, label: item, color: '#808080' };
            }
            else {
                return { name: item.name, label: item.label, color: item.color };
            }
        });
        allCategories.push({ name: 'Missing values', label: 'Missing values', color: '#808080' });
        console.log('allCategories: ', allCategories);
        let yMax = 0;
        const bargroups = [];
        for (const currCat of allCategories) {
            let currCatInSetA = setParameters.setA.filter((item) => (item === currCat.name)).length;
            let currCatInSetB = setParameters.setB.filter((item) => (item === currCat.name)).length;
            if (currCat.label === 'Missing values') {
                let setAcount = setParameters.setA.filter((item) => (item === null)).length;
                setAcount += setParameters.setA.filter((item) => (item === '')).length;
                currCatInSetA += setAcount;
                let setBcount = setParameters.setB.filter((item) => (item === null)).length;
                setBcount += setParameters.setB.filter((item) => (item === '')).length;
                currCatInSetB += setBcount;
            }
            yMax = Math.max(yMax, currCatInSetA);
            yMax = Math.max(yMax, currCatInSetB);
            const bargrp = {
                dataColumnLabel: setParameters.setADesc.label,
                categoryLabel: currCat.label,
                color: currCat.color,
                amountSetA: currCatInSetA,
                defSetA: setParameters.setACategory,
                amountSetB: currCatInSetB,
                defSetB: setParameters.setBCategory
            };
            if (bargrp.defSetA.color === bargrp.defSetB.color) {
                bargrp.defSetB.color = d3.hsl(bargrp.defSetB.color).brighter();
            }
            // only categories which have a value dedicated to themselfs
            if (currCatInSetA > 0 || currCatInSetB > 0) {
                bargroups.push(bargrp);
            }
        }
        const yDomain = [0, yMax];
        const groupedBarChart = {
            setADef: setParameters.setACategory,
            setBDef: setParameters.setBCategory,
            bargroups,
            yDomain
        };
        return groupedBarChart;
    }
    generateVisualization(miniVisualisation, setParameters, score) {
        const formatData = this.formatData(setParameters, score);
        console.log('Grouped Bar Chart - generateVisualization', { setParameters, score, formatData });
        // only for more than one category should a visulization be created
        if (formatData.bargroups.length > 1) {
            const containerWidth = Number(miniVisualisation.style('width').slice(0, -2)) - 25; // -25 because of the scroll bar
            const barWidth = 15;
            const dataCategorySpace = 2;
            const calcWidth = Math.max(containerWidth, formatData.bargroups.length * (barWidth * 2 + dataCategorySpace + 5) * 1.2);
            const extraSpaceAxisLabels = 40;
            const extraSpaceLegend = 33;
            const maxHeight = 220 + extraSpaceAxisLabels + extraSpaceLegend;
            const margin = { top: 10 + extraSpaceLegend, right: 0, bottom: 50 + extraSpaceAxisLabels, left: 55 };
            const width = calcWidth - margin.left - margin.right;
            const height = maxHeight - margin.top - margin.bottom;
            const xDomainCategories = formatData.bargroups.map((item) => (item.categoryLabel));
            // yAxis: scale + domain
            const yScale = d3.scale.linear()
                .domain(formatData.yDomain).nice()
                .range([height, 0]);
            const yAxis = this.getYAxis(yScale);
            // console.log('height: ', height);
            // xAxis: scale for both xAxis + domain
            const x0Scale = d3.scale.ordinal()
                .domain(xDomainCategories)
                .rangeBands([0, width], 0.2);
            // scale.rangeBand() -> is the space for 1 band
            const x1Scale = d3.scale.ordinal()
                .domain(['0', '1'])
                .rangeBands([0, x0Scale.rangeBand()]);
            const xAxis = d3.svg.axis().scale(x0Scale).orient('bottom');
            // svg canvas
            const svgCanvas = miniVisualisation.append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom);
            const svgFigureGroup = svgCanvas.append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .attr('class', 'barchart');
            // draw y axis
            svgFigureGroup.append('g')
                .attr('class', 'y axis')
                .call(yAxis);
            // draw x axis
            svgFigureGroup.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + (height) + ')')
                .call(xAxis)
                .selectAll('text')
                .attr('y', 3)
                .attr('x', -5)
                .attr('transform', 'rotate(-45)')
                .style('text-anchor', 'end')
                .text(function (d) {
                const maxLen = 15;
                const label = d.length > maxLen ? d.slice(0, maxLen - 3) + '...' : d;
                return label;
            })
                .append('title')
                .classed('tooltip.measure', true)
                .text(function (d) {
                return d;
            });
            // draw grouped bar chart
            svgFigureGroup.append('g')
                .attr('class', 'all-bargroups')
                .selectAll('g')
                .data(formatData.bargroups)
                .enter().append('g')
                .attr('class', 'bargroup')
                // .style('fill', '#808080')
                .attr('transform', function (d, i) { return 'translate(' + x0Scale(d.categoryLabel) + ',0)'; })
                .selectAll('rect')
                .data(function (d) {
                const setA = {
                    categoryLabel: d.dataColumnLabel,
                    amount: d.amountSetA,
                    def: d.defSetA
                };
                const setB = {
                    categoryLabel: d.dataColumnLabel,
                    amount: d.amountSetB,
                    def: d.defSetB
                };
                return [setA, setB];
            })
                .enter().append('rect')
                .attr('class', 'bar')
                .style('fill', (d) => (d.def.color))
                .attr('width', barWidth)
                .attr('height', (d) => {
                const barH = height - yScale(d.amount);
                return barH;
            })
                .attr('x', function (d, i) {
                const offset = i === 0 ? x1Scale.rangeBand() - barWidth - dataCategorySpace / 2 : dataCategorySpace / 2;
                return x1Scale('' + i) + offset;
            })
                .attr('y', function (d) { return yScale(d.amount); })
                .append('title')
                .classed('tooltip.measure', true)
                .text(function (d) {
                const tooltipText = `Data Column: ${d.categoryLabel}\nCategory: ${d.def.label}\nAmount: ${d.amount}`;
                return tooltipText;
            });
            // add legend
            const legendData = [formatData.setADef, formatData.setBDef];
            const legend = svgCanvas.append('g')
                .attr('class', 'legend')
                .selectAll('g')
                .data(legendData)
                .enter().append('g')
                .attr('transform', function (d, i) {
                const offset = i === 0 ? 0 : 17;
                return `translate(${margin.left + 1},${offset})`;
            });
            legend.append('rect')
                .attr('x', 0)
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', (d) => (d.color));
            legend.append('text')
                .attr('x', 19)
                .attr('y', 7.5)
                .attr('dy', '0.32em')
                .text(function (d) { return d.label; });
        }
    }
    getYAxis(yScale) {
        return d3.svg.axis().scale(yScale).orient('left');
    }
}
//# sourceMappingURL=GroupedBarChart.js.map