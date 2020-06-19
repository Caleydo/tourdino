import {BaseUtils} from '../base/BaseUtils';
import { WorkerUtils } from './WorkerUtils';

const ctx: Worker = self as any;

ctx.onmessage = (event) => {
  try {
    const setA: any[] = event.data.setA;
    const setB: any[] = event.data.setB;
    const allData: any[] = event.data.allData;

    const actualScore = WorkerUtils.calcJaccard(setA, setB);

    if (actualScore === 1) {
      ctx.postMessage({score: actualScore, p: 0.0}); // Jaccard score is maximum, the other random sets can't get a higher score
    } else if (actualScore === 0) {
      ctx.postMessage({score: actualScore, p: 1.0}); // Jaccard score is minimum, the other random sets can't get a lower score
    } else if (allData) { // check if allData is defined
      // The score is neither maximum nor minimum, so we compare it to random scores:
      const rndScores = new Array(1000); // array with 1000 entries
      const drawSize = setA.length;

      for (const scoreIndex of rndScores.keys()) {
        const rndIndices = BaseUtils.getRandomUniqueIntegers(drawSize, allData.length-1);
        const rndSet = rndIndices.map((index) => allData[index]); // get elments with the random indices
        rndScores[scoreIndex] = WorkerUtils.calcJaccard(rndSet, setB);
      }

      const p = rndScores.filter((rndScore) => rndScore > actualScore).length/1000.0; //  filter the array so only higher jaccard scores remain, then divide by number of computations. .0 to force floating point division
      ctx.postMessage({score: actualScore, p});
    } else {
      ctx.postMessage({score: actualScore, p: -1});
    }
  } catch(error) {
    console.error(`Cannot calculate Jaccard p-value.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
    ctx.postMessage({error: error.message}); // pass the error and check for it, rather than rethrowing and have it 'unhandled'; use message because the whole error object cannot be cloned
  }
};
