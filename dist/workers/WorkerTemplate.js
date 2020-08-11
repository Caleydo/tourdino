// @ts-ignore: `TS2451: Cannot redeclare block-scoped variable 'ctx'.`
const ctx = self;
ctx.onmessage = (event) => {
    try {
        const p = Math.random();
        ctx.postMessage(p);
    }
    catch (error) {
        console.error(`Cannot calculate p-value.\tError Type: ${error.name}\tMessage: ${error.message}\nStackTrace: ${error.stack}`);
        return ctx.postMessage(Number.NaN);
    }
};
//# sourceMappingURL=WorkerTemplate.js.map