import { EP_TDP_CORE_LINEUP_PANEL_TAB } from 'tdp_core';
export default function (registry) {
    // registry.push('extension-type', 'extension-id', function() { return import('./extension_impl'); }, {});
    // generator-phovea:begin
    registry.push(EP_TDP_CORE_LINEUP_PANEL_TAB, 'statisticalAnalysisPanel', function () {
        return import('./app/TouringPanel').then((m) => m.TouringPanel);
    }, {
        cssClass: 'fa-calculator',
        title: 'Statistical Analysis',
        order: 10,
        width: '45em',
        shortcut: true
    });
    // generator-phovea:end
}
//# sourceMappingURL=phovea.js.map