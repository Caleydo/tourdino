import {binom2, shuffle} from '../util';

const ctx: Worker = self as any;

function calcAdjRand(arr1: Array<any>, arr2: Array<any>) : number {
    // deduce catgeories from strings, e.g.: ['Cat1', 'Cat3', 'Cat2', 'Cat2', 'Cat1', 'Cat3']
    const A = [...new Set(arr1)]; // The set removes duplicates, and the conversion to array gives the content an order
    const B = [...new Set(arr2)];

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

    //const cellBinomSum = table.reduce((rowsum, row) => rowsum + row.reduce((colsum, col) => colsum += binom2(col), 0), 0);
    const cellBinomSum = table.reduce((sum, row) => sum + row.reduce((colsum, col) => colsum += binom2(col), 0), 0); // set accumulator to zero!

    //use 0 as initial value, otherwise reduce takes the first element as initial value and the binom coefficient is nt calculated for it!
    const rowBinomSum = rowsSums.reduce((sum, curr) => sum += binom2(curr), 0);
    const colBinomSum = colSums.reduce((sum, curr) => sum += binom2(curr), 0);

    const index = cellBinomSum;
    const expectedIndex = (rowBinomSum * colBinomSum) / binom2(arr1.length);
    const maxIndex = 0.5 * (rowBinomSum + colBinomSum);

    // await sleep(5000); //test asynchronous behaviour
    // calc

    if (0 === (maxIndex - expectedIndex)) {
      // division by zero --> adj_index = NaN
      return 1;
    }

    return (index - expectedIndex) / (maxIndex - expectedIndex);
}

ctx.onmessage = (event) => {
  try {
<<<<<<< HEAD
    let setA: Array<any> = event.data.setA;
    let setB: Array<any> = event.data.setB;
=======
    const setA: Array<any> = event.data.setA;
    const setB: Array<any> = event.data.setB;
>>>>>>> keckelt/6/pool

    const actualScore = calcAdjRand(setA, setB);
    const rndScores = new Array<number>(1000); // array with 1000 entries

    for (const scoreIndex of rndScores.keys()) {
      shuffle(setA); // the array is shuffled in place!
      shuffle(setB);
      rndScores[scoreIndex] = calcAdjRand(setA, setB);
    }

    const p = rndScores.filter((rndScore) => rndScore > actualScore).length/1000.0; //  filter the array so only higher scores remain, then divide by number of computations. .0 to force floating point division
    ctx.postMessage(p);
  } catch(error) {
    console.error(`Cannot calculate p-value.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
    return ctx.postMessage(Number.NaN);
  }

  self.close();
};
