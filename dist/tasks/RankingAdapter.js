import { BaseUtils } from '../base/BaseUtils';
export class RankingAdapter {
    constructor(provider, rankingIndex = 0) {
        this.provider = provider;
        this.rankingIndex = rankingIndex;
        this.oldOrder = [];
        this.oldSelection = [];
        this.oldAttributes = [];
    }
    getRowsWithCategory(attrCategory) {
        const indices = [];
        const attrData = this.getAttributeDataDisplayed(attrCategory.attribute.column);
        for (const [rowIndex, rowData] of attrData.entries()) {
            if (rowData === attrCategory.name) {
                indices.push(rowIndex);
            }
        }
        return indices;
    }
    getProvider() {
        return this.provider;
    }
    /**
     * Identify scores through their `lazyLoaded` attribute.
     */
    getScoreColumns() {
        return this.getDisplayedAttributes().filter((attr) => BaseUtils.isScoreColumn(attr.desc));
    }
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
    getItemsDisplayed(sort = true) {
        const allItems = this.getItems();
        // get currently displayed data
        return this.getItemOrder().map((rowId) => allItems[rowId]);
    }
    getItems() {
        // if the attributes are the same, we can reuse the data array
        // if the selection
        const displayedAttributes = this.getDisplayedAttributes();
        const selectionUnsorted = this.getSelectionUnsorted();
        const itemOrder = this.getItemOrder();
        // TODO events may be better?
        const sameAttr = this.oldAttributes.length === displayedAttributes.length && this.oldAttributes.filter((attr) => /*note the negation*/ !displayedAttributes.some((attr2) => attr2.desc.label === attr.desc.label)).length === 0;
        const sameSel = this.oldSelection.length === selectionUnsorted.length && this.oldSelection.every((val, i) => selectionUnsorted[i] === val);
        const sameOrder = this.oldOrder.length === itemOrder.length && this.oldOrder.every((val, i) => itemOrder[i] === val);
        if (sameAttr && sameSel && sameOrder) {
            // NOOP
            // attributes have to be the same (added / remvoed columns)
            // selection has to be the same                                                 TODO just updated selection data
            // item order has to be the same (i.e. the same  items order in the same way)   TODO just update the rank, the filtering is done in getItemsDisplayed
            // console.log('reuse the data array')
        }
        else {
            // refresh the data array
            this.data = null;
            this.oldAttributes = this.getDisplayedAttributes();
            const databaseData = [];
            const scoreCols = this.getScoreColumns();
            const scoresData = [].concat(...scoreCols.map((col) => this.getScoreData(col.desc)));
            this.oldOrder = this.getItemOrder(); // [3, 5, 6, 7] -> [[0,3], [1,5], ...]
            const orderMap = new Map(); // index, old-order
            this.oldOrder.forEach((order, i) => orderMap.set(order, i));
            const groups = this.getRanking().getGroups();
            const groupIndexArray = groups.map((g) => {
                const groupMap = new Map();
                g.order.forEach((order, i) => { groupMap.set(order, i); });
                return groupMap;
            });
            this.oldSelection = this.getSelectionUnsorted();
            this.provider.data.forEach((item, i) => {
                const index = orderMap.get(i);
                item[RankingAdapter.RANK_COLUMN_ID] = index >= 0 ? index : Number.NaN; // NaN if not found
                // include wether the row is selected
                item[RankingAdapter.SELECTION_COLUMN_ID] = this.oldSelection.includes(i) ? 'Selected' : 'Unselected';
                const groupIndex = groupIndexArray.findIndex((map) => map.has(i));
                const groupName = groupIndex === -1 ? 'Unknown' : groups[groupIndex].name;
                item[RankingAdapter.GROUP_COLUMN_ID] = groupName; // index of group = category name, find index by looking up i. -1 if not found
                databaseData.push(item);
            });
            const allData = [...databaseData, ...scoresData];
            this.data = [...allData
                    .reduce((map, curr) => {
                    if (!map.has(curr.id)) {
                        map.set(curr.id, {}); // include id in map if not already part of it, initialize with empty object
                    }
                    const item = map.get(curr.id); // get stored data for this id
                    Object.entries(curr).forEach(([k, v]) => item[k] = v); // add the content of the current array item to the data already stored in the map's entry (overwrites if there are the same properties in databaseData and scoreColumn)
                    return map;
                }, new Map()).values()]; // give map as input and return it's value
        }
        return this.data;
    }
    /**
     * Returns an array of indices for the providers data array
     */
    getItemOrder() {
        // order is always defined for groups (rows (data) only if there is a grouping)
        return [].concat(...this.getRanking().getGroups().map((grp) => Array.from(grp.order))); // Map groups to order arrays and concat those
    }
    getDisplayedIds() {
        const items = this.provider.data;
        return this.getItemOrder().map((i) => items[i].id);
    }
    getDisplayedAttributes() {
        return this.getRanking().children;
    }
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
    getItemRanks() {
        let i = 0;
        return this.getItemOrder().map((id) => ({ _id: id, rank: i++ }));
    }
    getRanking() {
        return this.provider.getRankings()[this.rankingIndex];
    }
    // public getRanking(col1,col2,filter): Ranking {
    //   const col = <CategoricalColumn>this.provider.getRankings()[this.rankingIndex].children.find((col) => (<IServerColumn>col.desc).column === 'organ')
    //   const col2 = <CategoricalColumn>this.provider.getRankings()[this.rankingIndex].children[6]
    //   col.setFilter({filter: null, filterMissing: true})
    //   col2.setFilter({filter: null, filterMissing: true})
    //   return this.provider.getRankings()[this.rankingIndex];
    // }
    /**
     * Contains  selection, rank and score data.
     */
    getGroupedData() {
        // console.time('get data (getGroupedData) time')
        const data = this.getItems();
        // console.timeEnd('get data (getGroupedData) time')
        return this.getRanking().getGroups().map((grp) => {
            return {
                name: grp.name,
                label: grp.name,
                color: grp.color,
                rows: Array.from(grp.order).map((index) => data[index]).filter((item) => item !== undefined)
            };
        });
    }
    /**
     * returns the data for the given attribute
     * @param attributeId column property of the column description
     */
    getAttributeDataDisplayed(attributeId) {
        const data = this.getItemsDisplayed();
        return data.map((row) => row[attributeId]);
    }
    /**
     * returns the categories of the given attribute
     * @param attributeId column property of the column description
     */
    getAttributeCategoriesDisplayed(attributeId) {
        return new Set(this.getAttributeDataDisplayed(attributeId));
    }
    /**
     * Returns the index of the selected items in the provider data array
     */
    getSelectionUnsorted() {
        return this.provider.getSelection();
    }
    /**
     * Returns the '_id' of the selected items
     */
    getSelection() {
        // we have the indices for the unsorted data array by this.getSelectionUnsorted() {
        // and we have an array of indices to sort the data array by this.getItemOrder();
        // --> the position of the indices from the selection in the order array is the new index
        const orderedIndices = this.getItemOrder();
        const unorderedSelectionINdices = this.getSelectionUnsorted();
        const orderedSelectionIndices = unorderedSelectionINdices.map((unorderedIndex) => orderedIndices.findIndex((orderedIndex) => orderedIndex === unorderedIndex));
        const sortedOreredSelectionIndices = orderedSelectionIndices.sort((a, b) => a - b);
        return sortedOreredSelectionIndices;
    }
    getScoreData(desc) {
        const accessor = desc.accessor;
        const ids = this.getDisplayedIds();
        const data = [];
        if (desc.column && BaseUtils.isScoreColumn(desc)) {
            for (const id of ids) {
                const dataEntry = { id };
                dataEntry[desc.column] = accessor({ v: { id }, i: null }); // i is not used by the accessor function
                data.push(dataEntry);
            }
        }
        return data;
    }
    /**
     * Generate a Attribute description that represents the current selection
     */
    getSelectionDesc() {
        const selCategories = [];
        const numberOfRows = this.getItemOrder().length; // get length of groups and sum them up
        if (this.getSelectionUnsorted().length > 0) {
            selCategories.push({ name: 'Selected', label: 'Selected', value: 0, color: '#1f77b4', });
        } // else: none selected
        if (this.getSelectionUnsorted().length < numberOfRows) {
            selCategories.push({ name: 'Unselected', label: 'Unselected', value: 1, color: '#ff7f0e', });
        } // else: all selected
        return {
            categories: selCategories,
            label: 'Selection',
            type: 'categorical',
            column: RankingAdapter.SELECTION_COLUMN_ID
        };
    }
    /**
     * Generate an attribute description that represents the current grouping hierarchy
     */
    getGroupDesc() {
        return {
            categories: this.getRanking().getGroups().map((group, index) => ({
                name: group.name,
                label: group.name,
                color: group.color,
                value: index
            })),
            label: 'Groups',
            type: 'categorical',
            column: RankingAdapter.GROUP_COLUMN_ID
        };
    }
    getRankDesc() {
        return {
            label: 'Rank',
            type: 'number',
            column: RankingAdapter.RANK_COLUMN_ID
        };
    }
}
RankingAdapter.RANK_COLUMN_ID = 'rank';
RankingAdapter.SELECTION_COLUMN_ID = 'selection';
RankingAdapter.GROUP_COLUMN_ID = 'group_hierarchy';
//# sourceMappingURL=RankingAdapter.js.map