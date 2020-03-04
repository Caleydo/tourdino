/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */
import {IRegistry} from 'phovea_core/src/plugin';
import {EP_TDP_CORE_LINEUP_PANEL_TAB, IPanelTabExtensionDesc} from 'tdp_core/src/extensions';

export default function (registry: IRegistry) {
  // registry.push('extension-type', 'extension-id', function() { return import('./extension_impl'); }, {});
  // generator-phovea:begin

  registry.push(EP_TDP_CORE_LINEUP_PANEL_TAB, 'statisticalAnalysisPanel', function () {
    return System.import('./TouringPanel');
  }, <IPanelTabExtensionDesc>{
    cssClass: 'fa-calculator',
    title: 'Statistical Analysis',
    order: 10,
    width: '45em',
    shortcut: true
  });

  // generator-phovea:end

}
