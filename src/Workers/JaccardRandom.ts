import {intersection, getRandomUniqueIntegers} from '../util';

function calc(setA: Array<any>, setB: Array<any>) {
  const {intersection: intersect, arr1: filteredsetA, arr2: filteredsetB} = intersection(setA, setB);
  const score = intersect.length / (intersect.length + filteredsetA.length + filteredsetB.length);
  return score || 0;
}


const ctx: Worker = self as any;

ctx.onmessage = (event) => {
  try {
    const setA: Array<any> = event.data.setA;
    const setB: Array<any> = event.data.setB;
    const allData: Array<any> = event.data.allData;

    const actualScore = calc(setA, setB);

    if (actualScore === 1) 
    {
      ctx.postMessage(0.0); // Jaccard score is maximum, the other random sets can't get a higher score
    } else if (actualScore === 0) {
      ctx.postMessage(1.0); // Jaccard score is minimum, the other random sets can't get a lower score
    } else {
      // The score is neither maximum nor minimum, so we compare it to random scores:
      const rndScores = new Array(1000); // array with 1000 entries
      const drawSize = setA.length;
  
      for (let scoreIndex of rndScores.keys()) {
        const rndIndices = getRandomUniqueIntegers(drawSize, allData.length-1);
        const rndSet = rndIndices.map((index) => allData[index]); //get elments with the random indices
        rndScores[scoreIndex] = calc(rndSet, setB);
      }
  
      const p = rndScores.filter((rndScore) => rndScore > actualScore).length/1000.0; //  filter the array so only higher jaccard scores remain, then divide by number of computations. .0 to force floating point division
      ctx.postMessage(p);
    }
  } catch(error) {
    console.error(`Cannot calculate Jaccard p-value.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
    return ctx.postMessage(Number.NaN);
  }

  self.close(); //Close worker as I only use it once
}