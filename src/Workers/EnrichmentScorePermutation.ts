/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 * See: https://stackoverflow.com/a/1527820/2549748
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// function to calculate enrichment score for one attribute
function calc(setNumber: any[], setCategory: any[]) {
  const categories = setCategory.filter((item, index, self) => self.indexOf(item) === index);

  // combine both sets
  const combinedSet = [];
  for(let i=0; i<setNumber.length; i++) {
    combinedSet.push({
      category: setCategory[i],
      value: setNumber[i]
    });
  }

  const validCombinedSet = combinedSet.filter((item) => { return (item.value !== undefined) && (item.value !== null) && (!Number.isNaN(item.value)); });
  // sort the combined set
  validCombinedSet.sort((a,b) => { return b.value - a.value;});

  // define category sets
  const propertyCategories = [];
  for (const currCategory of categories) {
    const numCategory = validCombinedSet.filter((item) => { return item.category === currCategory; }).length;
    propertyCategories.push({
      name: currCategory,
      amount: numCategory
    });
  }


  const enrichmentScoreCategories = [];

  for (const propCat of propertyCategories) {
    enrichmentScoreCategories.push(calcEnrichmentScoreCategory(validCombinedSet, propCat.name, propCat.amount));
  }

  return enrichmentScoreCategories;
}

// function to calculate enrichment score for one category
function calcEnrichmentScoreCategory(setCombined: any[], currCategory: string, amountCategory: number): {
  category: string,
  enrichmentScore: number} {

  const propertiesCategory = {
    category: currCategory,
    values: [],
    enrichmentScore: 0};

  const amountItems = setCombined.length;
  const termPlus = Math.sqrt((amountItems-amountCategory)/amountCategory);
  const termMinus = Math.sqrt(amountCategory/(amountItems-amountCategory));
  let currValue = 0;

  // go through all items
  for (const set of setCombined) {
    if(set.category === currCategory) {
      currValue = currValue + termPlus;
    } else {
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
    const setNumber: any[] = event.data.setNumber;
    const setCategory: any[] = event.data.setCategory;
    const actualScores: any[] = event.data.actualScores;

    const n = setCategory.length;
    const categories = setCategory.filter((item, index, self) => self.indexOf(item) === index);

    // if only one category exist the enrichmentScore = 0 and the p-value can be set to 1 without the permutation
    const usePermutation = !(actualScores && actualScores.length === 1 && (actualScores[0].enrichmentScore === 0));

    const permutations = 1000;
    const rndScores = [];

    if(usePermutation) {
      // calculate enrichment scores for each category of all the permutations
      for (let idx = 0; idx < permutations; idx++) {
        // permutate the category set
        // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
        for(let i = n - 1; i > 0; i--) {
          const k = getRandomInt(0,i);
          const tmp = setCategory[i];
          setCategory[i] = setCategory[k];
          setCategory[k] = tmp;
        }
        rndScores.push(calc(setNumber, setCategory));
      }
    }

    const properties = [];

    // calculate the p-value for each category
    for (const currCategory of categories) {
      let pvalue = 1; // without permutation p-value = 1
      if(usePermutation) {
        // get all enrichment score of the current category for all permutations
        const permScoresCategory = rndScores.map((arrItem) => {
          return arrItem.filter((catItem) => (catItem.category === currCategory)).map((item) => (item.enrichmentScore));
        });
        // get actual enrichment score for current category
        const actualScore = actualScores.filter((item) => (item.category === currCategory)).map((item) => (item.enrichmentScore))[0];
        pvalue = permScoresCategory.filter((score) => Math.abs(score) > Math.abs(actualScore)).length/1000.0;
      }
      const tmp = {
        category: currCategory,
        // permScoresCategory: permScoresCategory,
        // actualScore: actualScore,
         pvalue
      };

      properties.push(tmp);
    }

    // console.log('Enrichment Score - Permutation: ', {actualScores,properties});
    // const p = Math.max(...properties.map((item) => (item.pvalue)));

    ctx.postMessage(properties);
  } catch(error) {
    console.error(`Cannot calculate Enrichment Score p-value.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
    ctx.postMessage({error: error.message}); // pass the error and check for it, rather than rethrowing and have it 'unhandled'; use message because the whole error object cannot be cloned
  }
};
