/**
 * To store the promise together with its resolve/reject functions, so that we can call them somewhere else
 */
interface IWorkerPromise {
  promise: Promise<Worker>;
  resolve: (value?: Worker) => void;
  reject: (value?: Worker) => void;
}


/**
 * Allows the concurrent executions of 'window.navigator.hardwareConcurrency' workers.
 */
export class WorkerManager {
  private static workers = new Map<ATouringWorker, IWorkerPromise>();
  public static readonly MAX_WORKERS = window.navigator.hardwareConcurrency; // https://developer.mozilla.org/en-US/docs/Web/API/NavigatorConcurrentHardware/hardwareConcurrency

  /**
   * Returns a worker when an execution slot is free.
   * @param tWorker
   */
  public static getSlot(tWorker: ATouringWorker): Promise<Worker> {
    let resolveF: (value?: Worker) => void, rejectF : (value?: Worker) => void;
    const promise = new Promise<Worker>((resolve, reject) => {
      // we need the resolve/reject function to resolve the promise once another worker has finished
      resolveF = resolve;
      rejectF = reject;
    });

    const workerPromise = {promise, resolve: resolveF, reject: rejectF};
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
  public static deregister(tWorker: ATouringWorker) {
    WorkerManager.workers.delete(tWorker);
    const entry = WorkerManager.workers.entries().next().value;
    if (entry) {
      entry[1].resolve(entry[0].getWorker()); // resolve the next workerpromise
    } else { // else: map is empty / no more workers
      this.terminateAll(); //get rid of workers
    }
  }

  /**
   * Terminate all running workers and reject promises for scheduled ones
   */
  public static terminateAll() {
    for (const [tWorker, workerPromise] of WorkerManager.workers) {
      // abort promise, as we can't tell wether it was already resolved
      workerPromise.reject(); // abort waiting for slot
      //abort all workers of that worker type
      tWorker.terminate();
    }

    WorkerManager.workers = new Map<ATouringWorker, IWorkerPromise>(); // create a new, empty map
  }
}

/**
 * A Wrapper for the JavaScript Workers.
 */
export abstract class ATouringWorker {
  public abstract getWorkerInstance(): Worker;
  public abstract getWorkers(): Worker[];

  public getWorker(): Worker {
    const workers = this.getWorkers();

    if (workers.length < WorkerManager.MAX_WORKERS) {
      workers.unshift(this.getWorkerInstance()); //add new worker to the beginning of the list
    }

    const worker = workers.shift(); //remove first element of array...
    workers.push(worker); // ... append it to the end ...
    return worker; // ... and use it for some task
  }

  public terminate() {
    while (this.getWorkers().length > 0) {
      this.getWorkers().pop().terminate(); // abort calculation
    }
  }

  public async calculate(data: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const actualWorker = await WorkerManager.getSlot(this);
        actualWorker.onmessage = (event) => {
          if (event.data.error) {
            reject(event.data.error); // explicitly set by me with try/catch inside worker
          } else {
            resolve(event.data);
          }
          WorkerManager.deregister(this); // let worker remove himself from map (to start new workers)
        };
        actualWorker.onerror = (errEvent) => { // Handle runtime errors of worker
          console.error(`Runtime Error in ${errEvent.filename}@${errEvent.lineno}:\t${errEvent.message}.`);
          reject('runtime error');
        };

        actualWorker.postMessage(data);
      } catch(error) { // if the the promise we await is rejected
        reject('Aborted'); // we get no slot ;(
      }
    });
  }
}

/// NOTE: We need a Class for every type of worker, as webpack doesn't inlcude the compiled worker files if the worker-loader path is not specified fully (i.e. you can set the filename with variables)

/**
 * A wrapper for the Jaccard Randomization worker.
 */
export class JaccardRandomizationWorker extends ATouringWorker {
  static workers: Worker[] = [];
  public getWorkers() {
    return JaccardRandomizationWorker.workers;
  }

  public getWorkerInstance(): Worker {
    return new (<any>require('worker-loader?name=JaccardRandom.js!./JaccardRandom'))();
  }
}

/**
 * A wrapper for the Adjusted Rand Randomization worker.
 */
export class AdjustedRandRandomizationWorker extends ATouringWorker {
  static workers: Worker[] = [];
  public getWorkers() {
    return AdjustedRandRandomizationWorker.workers;
  }

  public getWorkerInstance(): Worker {
      return new (<any>require('worker-loader?name=AdjRandRandom.js!./AdjRandRandom'))();
  }
}

/**
 * A wrapper for the Jaccard Randomization worker.
 */
export class EnrichmentRandomizationWorker extends ATouringWorker {
  static workers: Worker[] = [];
  public getWorkers() {
    return EnrichmentRandomizationWorker.workers;
  }

  public getWorkerInstance(): Worker {
      return new (<any>require('worker-loader?name=EnrichmentScorePermutation.js!./EnrichmentScorePermutation'))();
  }
}
