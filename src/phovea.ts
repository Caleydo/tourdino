/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */
import {IRegistry} from 'phovea_core/src/plugin';
import parseRange from 'phovea_core/src/range/parser';
import ActionNode from 'phovea_core/src/provenance/ActionNode';

export default function (registry: IRegistry) {
  //registry.push('extension-type', 'extension-id', function() { return import('./extension_impl'); }, {});
  // generator-phovea:begin

  registry.push('tdpRankingButton', 'openTourdino', function () {
    return System.import('./InitTourdino');
  }, {
      cssClass: 'fa-calculator',
      factory: 'initTourdino',
      title: 'Start Touring'
    });

  // generator-phovea:end

}
