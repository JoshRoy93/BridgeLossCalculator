import type { Inputs, Run } from "./model";

export function runCalculation(inputs: Inputs): Promise<Run> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./solver.worker.ts", import.meta.url));
    const timer = setTimeout(() => {
      worker.terminate();
      reject(
        new Error(
          "Calculation exceeded 60 seconds. Reduce survey density or the number of events.",
        ),
      );
    }, 60000);
    worker.onmessage = (event: MessageEvent<{ run?: Run; error?: string }>) => {
      clearTimeout(timer);
      worker.terminate();
      if (event.data.run) resolve(event.data.run);
      else
        reject(
          new Error(event.data.error || "Worker returned no calculation."),
        );
    };
    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      reject(
        new Error(
          "The calculation worker could not run. Check the application files and reload.",
        ),
      );
    };
    worker.postMessage(inputs);
  });
}
