/**
 * Allows the concurrent executions of 'window.navigator.hardwareConcurrency' workers.
 */
export declare class WorkerManager {
    private static workers;
    static readonly MAX_WORKERS: number;
    /**
     * Returns a worker when an execution slot is free.
     * @param tWorker
     */
    static getSlot(tWorker: ATouringWorker): Promise<Worker>;
    /**
     * Removes the given worker from the map and creates a new worker that can be executed.
     * @param tWorker
     */
    static deregister(tWorker: ATouringWorker): void;
    /**
     * Terminate all running workers and reject promises for scheduled ones
     */
    static terminateAll(): void;
}
/**
 * A Wrapper for the JavaScript Workers.
 */
export declare abstract class ATouringWorker {
    abstract getWorkerInstance(): Worker;
    abstract getWorkers(): Worker[];
    getWorker(): Worker;
    terminate(): void;
    calculate(data: any): Promise<any>;
}
/**
 * A wrapper for the Jaccard Randomization worker.
 */
export declare class JaccardRandomizationWorker extends ATouringWorker {
    static workers: Worker[];
    getWorkers(): Worker[];
    getWorkerInstance(): Worker;
}
/**
 * A wrapper for the Adjusted Rand Randomization worker.
 */
export declare class AdjustedRandRandomizationWorker extends ATouringWorker {
    static workers: Worker[];
    getWorkers(): Worker[];
    getWorkerInstance(): Worker;
}
/**
 * A wrapper for the Jaccard Randomization worker.
 */
export declare class EnrichmentRandomizationWorker extends ATouringWorker {
    static workers: Worker[];
    getWorkers(): Worker[];
    getWorkerInstance(): Worker;
}
