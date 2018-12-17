import {getRandomInt} from '../util';

// function to calculate enrichment score for one attribute
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

  let validCombinedSet = combinedSet.filter((item) => { return (item.value !== undefined) && (item.value !== null) && (!Number.isNaN(item.value)); });
  // sort the combined set
  validCombinedSet.sort((a,b) => { return b.value - a.value;});

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

    enrichmentScoreCategories.push(calcEnrichmentScoreCategory(validCombinedSet, currCategory, amountCategory));
  }

  return enrichmentScoreCategories;
}

// function to calculate enrichment score for one category
function calcEnrichmentScoreCategory(setCombined: Array<any>, currCategory: string, amountCategory: number): {
  category: string,
  enrichmentScore: number} {

  let propertiesCategory = {
    category: currCategory,
    values: [],
    enrichmentScore: 0};

  const amountItems = setCombined.length;
  const termPlus = Math.sqrt((amountItems-amountCategory)/amountCategory);
  const termMinus = Math.sqrt(amountCategory/(amountItems-amountCategory));
  let currValue = 0;

  // go through all items
  for(let i=0; i<setCombined.length; i++)
  {
    if(setCombined[i].category === currCategory)
    {
      currValue = currValue + termPlus;
    }else {
      currValue = currValue - termMinus;
    }

    propertiesCategory.values.push(currValue);
  }


  const min = Math.min(...propertiesCategory.values);
  const max = Math.max(...propertiesCategory.values);

  const score = Math.abs(max) > Math.abs(min) ? max : min;
  propertiesCategory.enrichmentScore = score;
  delete propertiesCategory.values;

  return propertiesCategory;
}



const ctx: Worker = self as any;

ctx.onmessage = function (event) {
  try {
    const setNumber: Array<any> = event.data.setNumber;
    const setCategory: Array<any> = event.data.setCategory;
    const actualScores: Array<any> = event.data.actualScores

    const n = setCategory.length;
    const categories = setCategory.filter((item, index, self) => self.indexOf(item) === index);

    // calculate enrichment scores for each category of all the permutations
    const permutations = 1000;
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
      rndScores.push(calc(setNumber, setCategory));

    }

    let properties = []

    // calculate the p-value for each category
    for(let i=0; i<categories.length; i++)
    {
      // current category
      let currCategory = categories[i];
      // get all enrichment score of the current category for all permutations
      let permScoresCategory = rndScores.map((arrItem) => {
        return arrItem.filter((catItem) => (catItem.category === currCategory)).map((item) => (item.enrichmentScore));
      })
      // get actual enrichment score for current category
      let actualScore = actualScores.filter((item) => (item.category === currCategory)).map((item) => (item.enrichmentScore))[0];
      let pvalue = permScoresCategory.filter((score) => Math.abs(score) > Math.abs(actualScore)).length/1000.0;
      let tmp = {
        category: currCategory,
        // permScoresCategory: permScoresCategory,
        // actualScore: actualScore,
        pvalue: pvalue
      };

      properties.push(tmp)
    }

    // console.log('Enrichment Score - Permutation: ', {actualScores,properties});
    // const p = Math.max(...properties.map((item) => (item.pvalue)));

    ctx.postMessage(properties)
  } catch(error) {
    console.error(`Cannot calculate Enrichment Score p-value.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
    return ctx.postMessage(Number.NaN);
  }

  self.close(); //Close worker as I only use it once
}