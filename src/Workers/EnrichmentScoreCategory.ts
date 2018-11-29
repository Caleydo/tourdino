const ctx: Worker = self as any;

ctx.onmessage = (event) => {
  try {
    const setCombined: Array<any> = event.data.setCombined;
    const currCategory: string = event.data.currCategory;
    const amountCategory: number = event.data.amountCategory;

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

    ctx.postMessage(propertiesCategory)
  } catch(error) {
    console.error(`Cannot calculate Enrichment Score for Category.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
    return ctx.postMessage(null);
  }

  self.close(); //Close worker as I only use it once
}