
 import {jStat} from 'jStat';
 import {getRandomInt} from '../util';
 import {Workers} from '../Measures'

 async function calc(setNumber: Array<any>, setCategory: Array<any>) {
  const categories = setCategory.filter((item, index, self) => self.indexOf(item) === index);

  // combine both sets
  let combinedSet = [];
  for(let i=0; i<setNumber.length; i++){
    combinedSet.push({
      category: setCategory[i],
      value: setNumber[i]
    });
  }

  let validCombinedSet = combinedSet.filter((item) => { return (item.value !== undefined) && (item.value !== null) && (!Number.isNaN(item.value)); });
  // sort the combined set
  validCombinedSet.sort((a,b) => { return b.value - a.value;});

  let amountItems = validCombinedSet.length;

  // console.log('combinedSet: ',combinedSet);
  // console.log('validCombinedSet: ',validCombinedSet);
  //define category sets
  let propertyCategories = [];
  for(let c=0; c<categories.length; c++)
  {
    const currCategory = categories[c];
    let numCategory = validCombinedSet.filter((item) => { return item.category === currCategory; }).length;
    propertyCategories.push({
      name: currCategory,
      amount: numCategory
    })
  }

  
  let enrichmentScoreCategories = [];

  for(let i=0; i<propertyCategories.length; i++)
  {
    const currCategory = propertyCategories[i].name;
    const amountCategory = propertyCategories[i].amount;
    calcEnrichmentScoreCategory(validCombinedSet, currCategory, amountCategory).then((result) => {
      enrichmentScoreCategories.push(result);
    });

  }

  await Promise.all(enrichmentScoreCategories); //rather await all at once: https://developers.google.com/web/fundamentals/primers/async-functions#careful_avoid_going_too_sequential


  for(let i=0; i<enrichmentScoreCategories.length; i++)
  {
    enrichmentScoreCategories[i].values = null;
  }

  // console.log('enrichmentScoreCategories: ',enrichmentScoreCategories);


  // let amountItems = validCombinedSet.length;
  
  // //define category sets
  // let propertyCategories = [];
  // for(let c=0; c<categories.length; c++)
  // {
  //   const currCategory = categories[c];
  //   let numCategory = validCombinedSet.filter((item) => { return item.category === currCategory; }).length;
  //   propertyCategories.push({
  //     name: currCategory,
  //     amount: numCategory
  //   })
  // }

  // let sumCategories = [];
  // // go through all items
  // for(let i=0; i<validCombinedSet.length; i++)
  // {
  //   //go through all categories
  //   for(let c=0; c<propertyCategories.length; c++)
  //   {
  //     const currCategory = propertyCategories[c].name;
  //     const amountCategory = propertyCategories[c].amount;
  //     const termPlus = Math.sqrt((amountItems-amountCategory)/amountCategory);
  //     const termMinus = Math.sqrt(amountCategory/(amountItems-amountCategory));
  //     let currValue;

  //     // for the first time in the category
  //     if(i==0){
  //       let temp = {category: currCategory,
  //                   currentValue: 0,
  //                   min: 0,
  //                   max: 0};
  //       if(validCombinedSet[i].category === currCategory)
  //       {
  //         currValue = termPlus;
  //       }else {
  //         currValue = 0 - termMinus;
  //       }
  //       temp.currentValue = currValue;
  //       temp.min = Math.min(temp.currentValue,temp.min);
  //       temp.max = Math.max(temp.currentValue,temp.max);
  //       sumCategories.push(temp);
        
  //     }else{
  //       let currentValue = sumCategories[c].currentValue;
  //       if(validCombinedSet[i].category === currCategory){
  //         currentValue = currentValue + termPlus;
  //       }else {
  //         currentValue = currentValue - termMinus;
  //       }
  //       sumCategories[c].currentValue = currentValue;
  //       sumCategories[c].min = Math.min(sumCategories[c].currentValue,sumCategories[c].min);
  //       sumCategories[c].max = Math.max(sumCategories[c].currentValue,sumCategories[c].max);
  //     }
  //   }
  // }
  
  // for(let i=0; i<sumCategories.length; i++)
  // {
  //   const newScore = Math.abs(sumCategories[i].max) > Math.abs(sumCategories[i].min) ? sumCategories[i].max : sumCategories[i].min;
  //   sumCategories[i]['enrichmentScore'] = newScore;
  // }

  // return sumCategories; // async function --> returns promise
  return enrichmentScoreCategories;
}


async function calcEnrichmentScoreCategory(setCombined: Array<any>, currCategory: string, amountCategory: number): Promise<number> {
  const esCategory: Promise<number> = new Promise((resolve, reject) => { 
    const myWorker: Worker = new (<any>require('worker-loader?name=EnrichmentScoreCategory.js!./EnrichmentScoreCategory'));
    Workers.register(myWorker);
    myWorker.onmessage = event => event.data === null ? reject() : resolve(event.data);
    myWorker.postMessage({setCombined: setCombined, currCategory: currCategory, amountCategory: amountCategory});
  });
  return esCategory;
}

const ctx: Worker = self as any;

ctx.onmessage = function (event) {
  try {
    const setNumber: Array<any> = event.data.setNumber;
    const setCategory: Array<any> = event.data.setCategory;
    const actualScores: Array<any> = event.data.actualScores

    const n = setCategory.length;
    // const actualScores = calc(setNumber, setCategory);
    const categories = setCategory.filter((item, index, self) => self.indexOf(item) === index);

    const permutations = 1000;
    // const rndScores = new Array(1000); // array with 1000 entries
    let rndScores = [];
    for (let idx=0; idx<permutations; idx++) {
      // permutate the category set
      // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle 
      for(let i=n-1; i>0; i--){
        let k = getRandomInt(0,i);
        let tmp = setCategory[i];
        setCategory[i] = setCategory[k]; 
        setCategory[k] = tmp;
      }
      let tmp = calc(setNumber, setCategory);
      rndScores.push(tmp);
      // calc(setNumber, setCategory).then((result) => {
      //   rndScores.push(result);
      // });
    }

    // await Promise.all(rndScores);
    
    let properties = []
    
    for(let i=0; i<categories.length; i++)
    {
      let currCategory = categories[i];
      let permScoresCategory = rndScores.map((arrItem) => {
        return arrItem.filter((catItem) => (catItem.category === currCategory)).map((item) => (item.enrichmentScore));
      })
      let actualScore = actualScores.filter((item) => (item.category === currCategory)).map((item) => (item.enrichmentScore))[0];
      let pvalue = permScoresCategory.filter((score) => score > actualScore).length/1000.0;
      let tmp = {
        category: currCategory,
        permScoresCategory: permScoresCategory,
        actualScore: actualScore,
        pvalue: pvalue
      };

      properties.push(tmp)
    }

    // console.log('Enrichment Score - Permutation: ', {actualScores,pValues});      
    const p = Math.max(...properties.map((item) => (item.pvalue)));
    // ctx.postMessage({properties: properties, rndScores: rndScores})
    ctx.postMessage(p)
  } catch(error) {
    console.error(`Cannot calculate Enrichment Score p-value.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
    return ctx.postMessage(Number.NaN);
  }

  self.close(); //Close worker as I only use it once
}