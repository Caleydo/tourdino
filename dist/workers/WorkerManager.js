// Worker Info:
// https://www.html5rocks.com/en/tutorials/workers/basics/#toc-errors
// https://www.loxodrome.io/post/web-worker-performance/
/**
 * Allows the concurrent executions of 'window.navigator.hardwareConcurrency' workers.
 */
export class WorkerManager {
    /**
     * Returns a worker when an execution slot is free.
     * @param tWorker
     */
    static getSlot(tWorker) {
        let resolveF, rejectF;
        const promise = new Promise((resolve, reject) => {
            // we need the resolve/reject function to resolve the promise once another worker has finished
            resolveF = resolve;
            rejectF = reject;
        });
        const workerPromise = { promise, resolve: resolveF, reject: rejectF };
        WorkerManager.workers.set(tWorker, workerPromise);
        if (this.workers.size <= this.MAX_WORKERS) {
            resolveF(tWorker.getWorker()); // resolve the first n workers immediately, they will resolve the next promises
        }
        return promise;
    }
    /**
     * Removes the given worker from the map and creates a new worker that can be executed.
     * @param tWorker
     */
    static deregister(tWorker) {
        WorkerManager.workers.delete(tWorker);
        const entry = WorkerManager.workers.entries().next().value;
        if (entry) {
            entry[1].resolve(entry[0].getWorker()); // resolve the next workerpromise
        }
        else { // else: map is empty / no more workers
            this.terminateAll(); // get rid of workers
        }
    }
    /**
     * Terminate all running workers and reject promises for scheduled ones
     */
    static terminateAll() {
        for (const [tWorker, workerPromise] of WorkerManager.workers) {
            // abort promise, as we can't tell wether it was already resolved
            workerPromise.reject(); // abort waiting for slot
            // abort all workers of that worker type
            tWorker.terminate();
        }
        WorkerManager.workers = new Map(); // create a new, empty map
    }
}
WorkerManager.workers = new Map();
WorkerManager.MAX_WORKERS = window.navigator.hardwareConcurrency; // https://developer.mozilla.org/en-US/docs/Web/API/NavigatorConcurrentHardware/hardwareConcurrency
/**
 * A Wrapper for the JavaScript Workers.
 */
export class ATouringWorker {
    getWorker() {
        const workers = this.getWorkers();
        if (workers.length < WorkerManager.MAX_WORKERS) {
            workers.unshift(this.getWorkerInstance()); // add new worker to the beginning of the list
        }
        const worker = workers.shift(); // remove first element of array...
        workers.push(worker); // ... append it to the end ...
        return worker; // ... and use it for some task
    }
    terminate() {
        while (this.getWorkers().length > 0) {
            this.getWorkers().pop().terminate(); // abort calculation
        }
    }
    async calculate(data) {
        return new Promise(async (resolve, reject) => {
            try {
                const actualWorker = await WorkerManager.getSlot(this);
                actualWorker.onmessage = (event) => {
                    if (event.data.error) {
                        reject(event.data.error); // explicitly set by me with try/catch inside worker
                    }
                    else {
                        resolve(event.data);
                    }
                    WorkerManager.deregister(this); // let worker remove himself from map (to start new workers)
                };
                actualWorker.onerror = (errEvent) => {
                    console.error(`Runtime Error in ${errEvent.filename}@${errEvent.lineno}:\t${errEvent.message}.`);
                    reject('runtime error');
                };
                actualWorker.postMessage(data);
            }
            catch (error) { // if the the promise we await is rejected
                reject('Aborted'); // we get no slot ;(
            }
        });
    }
}
// / NOTE: We need a Class for every type of worker, as webpack doesn't inlcude the compiled worker files if the worker-loader path is not specified fully (i.e. you can set the filename with variables)
/**
 * A wrapper for the Jaccard Randomization worker.
 */
export class JaccardRandomizationWorker extends ATouringWorker {
    getWorkers() {
        return JaccardRandomizationWorker.workers;
    }
    getWorkerInstance() {
        return new (require('worker-loader?name=JaccardRandom.js!./JaccardRandom'))();
    }
}
JaccardRandomizationWorker.workers = [];
/**
 * A wrapper for the Adjusted Rand Randomization worker.
 */
export class AdjustedRandRandomizationWorker extends ATouringWorker {
    getWorkers() {
        return AdjustedRandRandomizationWorker.workers;
    }
    getWorkerInstance() {
        return new (require('worker-loader?name=AdjRandRandom.js!./AdjRandRandom'))();
    }
}
AdjustedRandRandomizationWorker.workers = [];
/**
 * A wrapper for the Jaccard Randomization worker.
 */
export class EnrichmentRandomizationWorker extends ATouringWorker {
    getWorkers() {
        return EnrichmentRandomizationWorker.workers;
    }
    getWorkerInstance() {
        return new (require('worker-loader?name=EnrichmentScorePermutation.js!./EnrichmentScorePermutation'))();
    }
}
EnrichmentRandomizationWorker.workers = [];
//# sourceMappingURL=WorkerManager.js.map