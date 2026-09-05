import type { Inputs, Run } from "./model";

export function runCalculation(
  inputs: Inputs,
  signal?: AbortSignal,
): Promise<Run> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Cancelled", "AbortError"));
      return;
    }
    const worker = new Worker(new URL("./solver.worker.ts", import.meta.url));
    const cleanup = () => {
      clearTimeout(timer);
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "Calculation exceeded 60 seconds. Reduce survey density or the number of events.",
        ),
      );
    }, 60000);
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event: MessageEvent<{ run?: Run; error?: string }>) => {
      cleanup();
      if (event.data.run) resolve(event.data.run);
      else
        reject(
          new Error(event.data.error || "Worker returned no calculation."),
        );
    };
    worker.onerror = () => {
      cleanup();
      reject(
        new Error(
          "The calculation worker could not run. Check the application files and reload.",
        ),
      );
    };
    worker.postMessage(inputs);
  });
}
