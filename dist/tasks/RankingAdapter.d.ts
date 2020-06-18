import { LocalDataProvider, IColumnDesc, ICategory, Column, Ranking } from 'lineupjs';
import { IServerColumn } from 'tdp_core';
import { IAccessorFunc } from 'tdp_core';
export interface IAttributeCategory extends ICategory {
    attribute: IServerColumn;
}
export interface IAccessorColumn extends Column {
    accessor: IAccessorFunc<any>;
}
export declare class RankingAdapter {
    protected readonly provider: LocalDataProvider;
    private rankingIndex;
    static readonly RANK_COLUMN_ID = "rank";
    static readonly SELECTION_COLUMN_ID = "selection";
    static readonly GROUP_COLUMN_ID = "group_hierarchy";
    getRowsWithCategory(attrCategory: IAttributeCategory): number[];
    constructor(provider: LocalDataProvider, rankingIndex?: number);
    getProvider(): LocalDataProvider;
    /**
     * Identify scores through their `lazyLoaded` attribute.
     */
    getScoreColumns(): Column[];
    private oldOrder;
    private oldSelection;
    private oldAttributes;
    private data;
    /**
     * Return an array of displayed items, with their id and data (including selection status and rank).
     *  Data Template:
     *    [{
     *      _id: 123,
     *      rank: 0,
     *      selection: 'Selected,
     *      attr1: 3.14159
     *    },
     *    ...
     *    ]
     */
    getItemsDisplayed(sort?: boolean): Object[];
    getItems(): Object[];
    /**
     * Returns an array of indices for the providers data array
     */
    private getItemOrder;
    getDisplayedIds(): any[];
    getDisplayedAttributes(): Column[];
    /**
     * Return an array of displayed items, with their id and rank.
     *  Data Template:
     *   [{
     *     _id: 123,
     *     rank: 0
     *   },
     *  ...
     *  ]
     */
    getItemRanks(): {
        _id: number;
        rank: number;
    }[];
    getRanking(): Ranking;
    /**
     * Contains  selection, rank and score data.
     */
    getGroupedData(): {
        name: string;
        label: string;
        color: string;
        rows: Object[];
    }[];
    /**
     * returns the data for the given attribute
     * @param attributeId column property of the column description
     */
    getAttributeDataDisplayed(attributeId: string): any[];
    /**
     * returns the categories of the given attribute
     * @param attributeId column property of the column description
     */
    getAttributeCategoriesDisplayed(attributeId: string): Set<any>;
    /**
     * Returns the index of the selected items in the provider data array
     */
    getSelectionUnsorted(): number[];
    /**
     * Returns the '_id' of the selected items
     */
    getSelection(): number[];
    getScoreData(desc: IColumnDesc | any): any[];
    /**
     * Generate a Attribute description that represents the current selection
     */
    getSelectionDesc(): {
        categories: ICategory[];
        label: string;
        type: string;
        column: string;
    };
    /**
     * Generate an attribute description that represents the current grouping hierarchy
     */
    getGroupDesc(): {
        categories: {
            name: string;
            label: string;
            color: string;
            value: number;
        }[];
        label: string;
        type: string;
        column: string;
    };
    getRankDesc(): {
        label: string;
        type: string;
        column: string;
    };
}
