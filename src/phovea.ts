/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */
import {IRegistry} from 'phovea_core';
import {EP_TDP_CORE_LINEUP_PANEL_TAB} from 'tdp_core';
import {IPanelTabExtensionDesc} from 'tdp_core/dist/lineup/internal/LineUpPanelActions';

export default function (registry: IRegistry) {
  // registry.push('extension-type', 'extension-id', function() { return import('./extension_impl'); }, {});
  // generator-phovea:begin

  registry.push(EP_TDP_CORE_LINEUP_PANEL_TAB, 'statisticalAnalysisPanel', function () {
    return import('./app/TouringPanel').then((m) => m.TouringPanel);
  }, <IPanelTabExtensionDesc>{
    cssClass: 'fa-calculator',
    title: 'Statistical Analysis',
    order: 10,
    width: '45em',
    shortcut: true
  });
  // generator-phovea:end
}
