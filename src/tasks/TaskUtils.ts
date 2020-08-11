import * as d3 from 'd3';
import {IColumnDesc} from 'lineupjs';
import {IServerColumn} from 'tdp_core';
import {RankingAdapter} from './RankingAdapter';
import {UniqueIdManager} from 'phovea_core';

export class TaskUtils {

  private static readonly EVENT_DATA_LOADED = 'dataLoaded';

  // SOURCE: https://stackoverflow.com/a/51592360/2549748
  /**
   * Deep copy function for TypeScript.
   * @param T Generic type of target/copied value.
   * @param target Target value to be copied.
   * @see Source project, ts-deepcopy https://github.com/ykdr2017/ts-deepcopy
   * @see Code pen https://codepen.io/erikvullings/pen/ejyBYg
   */
  static deepCopy<T>(target: T): T {
    if (target === null) {
      return target;
    }
    if (target instanceof Date) {
      return new Date(target.getTime()) as any;
    }
    if (target instanceof Array) {
      const cp = [] as any[];
      (target as any[]).forEach((v) => { cp.push(v); });
      return cp.map((n: any) => TaskUtils.deepCopy<any>(n)) as any;
    }
    if (typeof target === 'object' && target !== {}) {
      const cp = { ...(target as { [key: string]: any }) } as { [key: string]: any };
      Object.keys(cp).forEach((k) => {
        cp[k] = TaskUtils.deepCopy<any>(cp[k]);
      });
      return cp as T;
    }
    return target;
  }

  static score2color(score: number): { background: string, foreground: string } {
    let background = '#ffffff'; // white
    let foreground = '#333333'; // kinda black


    if (score <= 0.05) {
      // console.log('bg color cahnge')
      const calcColor = d3.scale.linear().domain([0, 0.05]).range(<any[]>['#000000', '#FFFFFF']);

      background = calcColor(score).toString();
      foreground = TaskUtils.textColor4Background(background);
    }

    return { background, foreground };
  }


  static textColor4Background(backgroundColor: string) {
    let color = '#333333';
    if ('transparent' !== backgroundColor && d3.hsl(backgroundColor).l < 0.5) { // transparent has lightness of zero
      color = 'white';
    }

    return color;
  }


  /**
   * This functions returns a promise that gets resolved, once the score column is loaded.
   * The notification is implemented based on a flag or an event.
   */
  static waitUntilScoreColumnIsLoaded(ranking: RankingAdapter, desc: IColumnDesc): Promise<any> {
    const scoreColumn = (<any[]>ranking.getScoreColumns()).find((col) => (<IServerColumn>col.desc).column === (<IServerColumn>desc).column);

    if(!scoreColumn) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      if(scoreColumn.isLoaded()) {
        // console.log('data already loaded for', scoreColumn.desc.label);
        resolve();
        return;
      }

      const uniqueSuffix = `.tourdino${UniqueIdManager.getInstance().uniqueId()}`;

      scoreColumn.on(TaskUtils.EVENT_DATA_LOADED + uniqueSuffix, () => { // add suffix with unique Id to resolve all promises for each instance of scoreColumn
        scoreColumn.on(TaskUtils.EVENT_DATA_LOADED + uniqueSuffix, null);
        // console.log('data loaded (notified by event) for', scoreColumn.desc.label);
        resolve();
      });
    });
  }
}
