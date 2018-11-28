
 import {jStat} from 'jStat';
 import {getRandomInt} from '../util';

 function calc(setNumber: Array<any>, setCategory: Array<any>) {
  const categories = setCategory.filter((item, index, self) => self.indexOf(item) === index);

  // combine both sets
  let combinedSet = [];
  for(let i=0; i<setNumber.length; i++){
    combinedSet.push({
      category: setCategory[i],
      value: setNumber[i]
    });
  }

  // sort the combined set
  combinedSet.sort((a,b) => { return b.value - a.value;});
  let amountItems = combinedSet.length;

  //define category sets
  let categoriesDef = [];
  for(let c=0; c<categories.length; c++)
  {
    const currCategory = categories[c];
    let numCategory = combinedSet.filter((item) => { return item.category === currCategory; }).length;
    categoriesDef.push({
      name: currCategory,
      amount: numCategory
    })
  }

  let sumCategories = [];
  // go through all items
  for(let i=0; i<combinedSet.length; i++)
  {
    //go through all categories
    for(let c=0; c<categoriesDef.length; c++)
    {
      const currCategory = categoriesDef[c].name;
      const amountCategory = categoriesDef[c].amount;
      const termPlus = Math.sqrt((amountItems-amountCategory)/amountCategory);
      const termMinus = Math.sqrt(amountCategory/(amountItems-amountCategory));
      let currValue;

      // for the first time in the category
      if(i==0){
        let temp = {category: currCategory,
                    currentValue: 0,
                    min: 0,
                    max: 0};
        if(combinedSet[i].category === currCategory)
        {
          currValue = termPlus;
        }else {
          currValue = 0 - termMinus;
        }
        temp.currentValue = currValue;
        temp.min = Math.min(temp.currentValue,temp.min);
        temp.max = Math.max(temp.currentValue,temp.max);
        sumCategories.push(temp);
        
      }else{
        let currentValue = sumCategories[c].currentValue;
        if(combinedSet[i].category === currCategory){
          currentValue = currentValue + termPlus;
        }else {
          currentValue = currentValue - termMinus;
        }
        sumCategories[c].currentValue = currentValue;
        sumCategories[c].min = Math.min(sumCategories[c].currentValue,sumCategories[c].min);
        sumCategories[c].max = Math.max(sumCategories[c].currentValue,sumCategories[c].max);
      }
    }
  }
  
  for(let i=0; i<sumCategories.length; i++)
  {
    const newScore = Math.abs(sumCategories[i].max) > Math.abs(sumCategories[i].min) ? sumCategories[i].max : sumCategories[i].min;
    sumCategories[i]['enrichmentScore'] = newScore;
  }

  return sumCategories; // async function --> returns promise
}

const ctx: Worker = self as any;

ctx.onmessage = (event) => {
  try {
    const setNumber: Array<any> = event.data.setNumber;
    const setCategory: Array<any> = event.data.setCategory;

    // const now = new Date();
    // const id = `${now.getMinutes()}${now.getSeconds()}${now.getMilliseconds()}`;
    // console.groupCollapsed('perm-'+id);
    const n = setCategory.length;
    const actualScores = calc(setNumber, setCategory);
    const categories = setCategory.filter((item, index, self) => self.indexOf(item) === index);

    const rndScores = new Array(1000); // array with 1000 entries
  
    for (let idx=0; idx<rndScores.length; idx++) {
      // permutate the category set
      // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle 
      // console.groupCollapsed('random-'+idx);
      // console.time('permutation-'+idx+':'+id);
      for(let i=n-1; i>0; i--){
        let k = getRandomInt(0,i);
        let tmp = setCategory[i];
        setCategory[i] = setCategory[k]; 
        setCategory[k] = tmp;
      }
      // console.timeEnd('permutation-'+idx+':'+id);
      // console.time('perm-calc-'+idx+':'+id);
      rndScores[idx] = calc(setNumber, setCategory);
      // console.timeEnd('perm-calc-'+idx+':'+id);
      // console.groupEnd();  
    }
    
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
    // console.groupEnd();  
    // ctx.postMessage({properties: properties, rndScores: rndScores})
    ctx.postMessage(p)
  } catch(error) {
    console.error(`Cannot calculate Enrichment Score p-value.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
    return ctx.postMessage(Number.NaN);
  }

  self.close(); //Close worker as I only use it once
}