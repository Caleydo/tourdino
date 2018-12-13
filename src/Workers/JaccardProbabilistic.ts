import {Big} from 'big.js'; // to calc binomial coefficient
import {binom, getModulo} from '../util';


const ctx: Worker = self as any;

ctx.onmessage = (event) => {
  try {
    const intersection = event.data.intersection;
    const union = event.data.union;

    const two = new Big(2);
    const three = new Big(3);

    // given the curve of the p value, there might be some sophisticated p guessing based on union & intersection size:
    // https://www.wolframalpha.com/input/?i=sum+(57+binom+x)(2%5E(57-x))%2F3%5E57,+x%3D0+to+50

    let sum = new Big(0);
    for (let i = 0; i<= intersection; i++) {
      const step = binom(union, i).times(two.pow((union-i)));
      sum = sum.add(step);

      if(i/intersection > 0.4 && i % getModulo(intersection, 10) === 0) {
        // Check to exit early
        if (sum.div(three.pow(union)).toFixed(2) === '1.00') {
          console.log('exit early')
          break; // exit early, more precision is not needed
        }
      }
    }

    const p = sum.div(three.pow(union)).toString();
    const pNum = 1 - Number(p);// convert back to Javascript Number (should be in the range of [0,1])
    console.log(`p = 1 - ${p} = ${pNum}`)

    ctx.postMessage(pNum);
  } catch(error) {
    console.error(`Cannot calculate Jaccard p-value.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
    return ctx.postMessage(Number.NaN);
  }
}