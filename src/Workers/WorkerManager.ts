


export class WorkerManager {
  private static workers = new Array<Worker>();

  public static register(worker: Worker) {
    console.log('register worker #'+ (1 + WorkerManager.workers.length), worker);
    WorkerManager.workers.push(worker);
  }

  public static deregister(worker: Worker) {
    console.log('de-register worker', worker);
    console.log('is in array?', WorkerManager.workers.includes(worker));
  }

  public static terminateAll() {
    for (const worker of WorkerManager.workers) {
      worker.terminate();
    }

    WorkerManager.workers = new Array<Worker>();
  }
}