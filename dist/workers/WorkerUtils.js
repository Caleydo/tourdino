import { BaseUtils } from '../base/BaseUtils';
export class WorkerUtils {
    static calcJaccard(setA, setB) {
        const { intersection: intersect, arr1: filteredsetA, arr2: filteredsetB } = BaseUtils.intersection(setA, setB);
        const score = intersect.length / (intersect.length + filteredsetA.length + filteredsetB.length);
        return score || 0;
    }
    static calcAdjRand(arr1, arr2) {
        // deduce catgeories from strings, e.g.: ['Cat1', 'Cat3', 'Cat2', 'Cat2', 'Cat1', 'Cat3']
        const A = [...new Set(arr1)]; // The set removes duplicates, and the conversion to array gives the content an order
        const B = [...new Set(arr2)];
        if (A.length === 1 && B.length === 1) {
            // inline with sklearn
            // see https://github.com/scikit-learn/scikit-learn/blob/7b136e9/sklearn/metrics/cluster/supervised.py#L138
            return 1;
        }
        // and build a contingency table:
        //        A.1   A.2   A.3
        //  B.1   n11   n12   n13
        //  B.2   n21   n22   n23
        //  B.3   n31   n32   n33
        const table = new Array(B.length).fill([]); // rows
        table.forEach((row, i) => table[i] = new Array(A.length).fill(0)); // columns
        for (const i of arr1.keys()) { // iterate over indices
            const ai = A.indexOf(arr1[i]);
            const bi = B.indexOf(arr2[i]);
            table[bi][ai] += 1; // count the co-occurences
        }
        // https://web.archive.org/web/20171205003116/https://davetang.org/muse/2017/09/21/adjusted-rand-index/
        const rowsSums = table.map((row) => row.reduce((sum, curr) => sum += curr)); // reduce each row to the sum
        const colSums = A.map((cat, i) => table.reduce((sum, curr) => sum += curr[i], 0)); // reduce each all rows to the sum of column i
        // const cellBinomSum = table.reduce((rowsum, row) => rowsum + row.reduce((colsum, col) => colsum += binom2(col), 0), 0);
        const cellBinomSum = table.reduce((sum, row) => sum + row.reduce((colsum, col) => colsum += BaseUtils.binom2(col), 0), 0); // set accumulator to zero!
        // use 0 as initial value, otherwise reduce takes the first element as initial value and the binom coefficient is nt calculated for it!
        const rowBinomSum = rowsSums.reduce((sum, curr) => sum += BaseUtils.binom2(curr), 0);
        const colBinomSum = colSums.reduce((sum, curr) => sum += BaseUtils.binom2(curr), 0);
        const index = cellBinomSum;
        const expectedIndex = (rowBinomSum * colBinomSum) / BaseUtils.binom2(arr1.length);
        const maxIndex = 0.5 * (rowBinomSum + colBinomSum);
        if (0 === (maxIndex - expectedIndex)) {
            // division by zero --> adj_index = 0;
            return 0;
        }
        return (index - expectedIndex) / (maxIndex - expectedIndex);
    }
}
//# sourceMappingURL=WorkerUtils.js.map