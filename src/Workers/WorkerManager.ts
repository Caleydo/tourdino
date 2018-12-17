
/**
 * To store the promise together with its resolve/reject functions, so that we can call them somewhere else
 */
interface IWorkerPromise {
  promise: Promise<Worker>;
  resolve: (value?: Worker | PromiseLike<Worker>) => void;
  reject: (value?: Worker | PromiseLike<Worker>) => void;
}


/**
 * Allows the concurrent executions of 'window.navigator.hardwareConcurrency' workers.
 */
export class WorkerManager {
  private static workers = new Map<ATouringWorker, IWorkerPromise>();
  private static readonly logicalProcessors = window.navigator.hardwareConcurrency; // https://developer.mozilla.org/en-US/docs/Web/API/NavigatorConcurrentHardware/hardwareConcurrency

  /**
   * Returns a worker when an execution slot is free.
   * @param tWorker
   */
  public static getSlot(tWorker: ATouringWorker): Promise<Worker> {
    let resolveF, rejectF;
    const promise = new Promise<Worker>((resolve, reject) => {
      // we need the resolve/reject function to resolve the promise once another worker has finished
      resolveF = resolve;
      rejectF = reject;
    });

    const workerPromise = {promise, resolve: resolveF, reject: rejectF};
    WorkerManager.workers.set(tWorker, workerPromise);

    if (this.workers.size <= this.logicalProcessors) {
      resolveF(tWorker.getWorker()); // resolve the first 4/8/16 workers immediately, they will resolve the next promises
    }

    return promise;
  }

  /**
   * Removes the given worker from the map and creates a new worker that can be executed.
   * @param tWorker
   */
  public static deregister(tWorker: ATouringWorker) {
    WorkerManager.workers.delete(tWorker);
    const entry = WorkerManager.workers.entries().next().value;
    if (entry) {
      const [nextTWorker, nextWorkerPromise] = entry; // can't deconstruct if undefined, so do it here
      nextWorkerPromise.resolve(nextTWorker.getWorker()); // resolve the next workerpromise
    } // else: map is empty / no more workers
  }

  /**
   * Terminate all running workers and reject promises for scheduled ones
   */
  public static terminateAll() {
    for (const [tWorker, workerPromise] of WorkerManager.workers) {
      // abort worker and promise, as we can't tell wether it was already resolved
      workerPromise.reject(); // abort waiting for slot
      tWorker.getWorker().terminate(); // abort calculation
    }

    WorkerManager.workers = new Map<ATouringWorker, IWorkerPromise>(); // create a new, empty map
  }
}

/**
 * A Wrapper for the JavaScript Workers.
 */
export abstract class ATouringWorker {
  worker: Worker;
  public abstract getWorker(): Worker;

  public async calculate(data: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const actualWorker = await WorkerManager.getSlot(this);
        actualWorker.onmessage = (event) => {
          if (event.data.error) {
            reject(event.data.error);
          } else {
            Number.isNaN(event.data) ? reject(event.data) : resolve(event.data);
          }
          WorkerManager.deregister(this); // let worker remove himself from map (to start new workers)
        };
        actualWorker.postMessage(data);
      } catch(error) {
        // we get no slot ;(
          reject('Aborted');
      }
    });
  }
}

/// NOTE: We need a Class for every type of worker, as webpack doesn't inlcude the compiled worker files if the worker-loader path is not specified fully (i.e. you can set the filename with variables)

/**
 * A wrapper for the Jaccard Randomization worker.
 */
export class JaccardRandomizationWorker extends ATouringWorker {
  public getWorker(): Worker {
    if (!this.worker) {
      this.worker = new (<any>require('worker-loader?name=JaccardRandom.js!./JaccardRandom'))();
    }

    return this.worker;
  }
}

/**
 * A wrapper for the Adjusted Rand Randomization worker.
 */
export class AdjustedRandRandomizationWorker extends ATouringWorker {
  public getWorker(): Worker {
    if (!this.worker) {
      this.worker = new (<any>require('worker-loader?name=AdjRandRandom.js!./AdjRandRandom'))();
    }

    return this.worker;
  }
}

/**
 * A wrapper for the Jaccard Randomization worker.
 */
export class EnrichmentRandomizationWorker extends ATouringWorker {
  public getWorker(): Worker {
    if (!this.worker) {
      this.worker = new (<any>require('worker-loader?name=EnrichmentScorePermutation.js!./EnrichmentScorePermutation'))();
    }

    return this.worker;
  }
}
