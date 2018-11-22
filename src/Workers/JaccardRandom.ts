import {binom} from '../util';


const ctx: Worker = self as any;

ctx.onmessage = (event) => {
  try {
    const setA = event.data.setA;
    const setB = event.data.setB;
    const allData = event.data.allData;

    const p = 0.34;

    ctx.postMessage(p);
  } catch(error) {
    console.error(`Cannot calculate Jaccard p-value.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
    return ctx.postMessage(Number.NaN);
  }
}