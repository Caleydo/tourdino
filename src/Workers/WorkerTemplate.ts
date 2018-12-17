

const ctx: Worker = self as any;

ctx.onmessage = (event) => {
  try {
    const p = Math.random();
    ctx.postMessage(p);
  } catch(error) {
    console.error(`Cannot calculate p-value.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
    return ctx.postMessage(Number.NaN);
  }

  self.close();
};
