import { IColumnDesc } from 'lineupjs';
import { RankingAdapter } from './RankingAdapter';
export declare class TaskUtils {
    private static readonly EVENT_DATA_LOADED;
    /**
     * Deep copy function for TypeScript.
     * @param T Generic type of target/copied value.
     * @param target Target value to be copied.
     * @see Source project, ts-deepcopy https://github.com/ykdr2017/ts-deepcopy
     * @see Code pen https://codepen.io/erikvullings/pen/ejyBYg
     */
    static deepCopy<T>(target: T): T;
    static score2color(score: number): {
        background: string;
        foreground: string;
    };
    static textColor4Background(backgroundColor: string): string;
    /**
     * This functions returns a promise that gets resolved, once the score column is loaded.
     * The notification is implemented based on a flag or an event.
     */
    static waitUntilScoreColumnIsLoaded(ranking: RankingAdapter, desc: IColumnDesc): Promise<any>;
}
