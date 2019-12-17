/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */
import {IRegistry} from 'phovea_core/src/plugin';


export default function (registry: IRegistry) {
  //registry.push('extension-type', 'extension-id', function() { return import('./extension_impl'); }, {});
  // generator-phovea:begin

  registry.push('tdpLineupPanelTab', 'openTourdino', function () {
    return System.import('./TouringPanel');
  }, {
    cssClass: 'fa-calculator',
    title: 'Start Touring',
    options: {
      tabWidth: '40em'
    }

  });
  // generator-phovea:end

}
