import { calculate } from "./hydraulics";
import type { Inputs } from "./model";

self.onmessage = (event: MessageEvent<Inputs>) => {
  try {
    self.postMessage({ run: calculate(event.data) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Calculation failed.",
    });
  }
};
