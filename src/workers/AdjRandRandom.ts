import {BaseUtils} from '../base/BaseUtils';
import { WorkerUtils } from './WorkerUtils';

const ctx: Worker = self as any;

ctx.onmessage = (event) => {
  const rndScoreCount =  1000.0;

  try {
    const setA: any[] = event.data.setA;
    const setB: any[] = event.data.setB;

    const actualScore = WorkerUtils.calcAdjRand(setA, setB);

    if (actualScore === 0) {
      ctx.postMessage({score: actualScore, p: 1}); // adjusted rand = 0 --> p = 1

    } else {
      const rndScores = new Array<number>(rndScoreCount); // array with 1000 entries

      for (const scoreIndex of rndScores.keys()) {
        if (scoreIndex % 2 === 0) { // alternate array shuffling (shuffling one array is enough)
          BaseUtils.shuffle(setA); // the array is shuffled in place!
        } else {
          BaseUtils.shuffle(setB);
        }
        rndScores[scoreIndex] = WorkerUtils.calcAdjRand(setA, setB);
      }

      const p = rndScores.filter((rndScore) => rndScore > actualScore).length/rndScoreCount; //  filter the array so only higher scores remain, then divide by number of computations. .0 to force floating point division
      ctx.postMessage({score: actualScore, p});
    }
  } catch(error) {
    console.error(`Cannot calculate p-value.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
    ctx.postMessage({error: error.message}); // pass the error and check for it, rather than rethrowing and have it 'unhandled'; use message because the whole error object cannot be cloned
  }
};
