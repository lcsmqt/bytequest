import { PYTHON_EXEC_TIMEOUT_MS } from "@/config";
import type { RunRequest, RunResponse } from "./pyWorker";

export interface PythonRunResult {
  stdout: string;
  stderr: string;
  ok: boolean;
  timedOut: boolean;
}

// ponytail: killing the worker is the whole watchdog strategy — no SharedArrayBuffer
// interrupt buffer (that needs COOP/COEP headers, out of reach on plain static hosting).
// Upgrade path: cross-origin-isolated hosting + pyodide.setInterruptBuffer for a graceful stop.
export class PyodideRunner {
  private worker: Worker | null = null;
  private nextId = 1;
  private warm = false;

  private spawnWorker(): Worker {
    const worker = new Worker(new URL("./pyWorker.ts", import.meta.url), { type: "module" });
    this.worker = worker;
    return worker;
  }

  /** Kicks off the Pyodide download/init without blocking the caller. */
  async warmUp(onProgress?: (text: string) => void): Promise<void> {
    if (this.warm) return;
    onProgress?.("Carregando o interpretador Python...");
    const worker = this.worker ?? this.spawnWorker();
    await new Promise<void>((resolve) => {
      const id = this.nextId++;
      const handler = (event: MessageEvent<RunResponse>) => {
        if (event.data.id !== id) return;
        worker.removeEventListener("message", handler);
        resolve();
      };
      worker.addEventListener("message", handler);
      worker.postMessage({ id, type: "init" });
    });
    this.warm = true;
  }

  async run(code: string, timeoutMs = PYTHON_EXEC_TIMEOUT_MS): Promise<PythonRunResult> {
    const worker = this.worker ?? this.spawnWorker();
    const id = this.nextId++;
    const request: RunRequest = { id, code };

    return new Promise<PythonRunResult>((resolve) => {
      const timer = setTimeout(() => {
        worker.terminate();
        this.worker = null;
        this.warm = false;
        resolve({
          stdout: "",
          stderr: "Execução interrompida: tempo limite excedido (possível loop infinito).",
          ok: false,
          timedOut: true,
        });
      }, timeoutMs);

      const handler = (event: MessageEvent<RunResponse>) => {
        if (event.data.id !== id) return;
        clearTimeout(timer);
        worker.removeEventListener("message", handler);
        resolve({ stdout: event.data.stdout, stderr: event.data.stderr, ok: event.data.ok, timedOut: false });
      };
      worker.addEventListener("message", handler);
      worker.postMessage(request);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.warm = false;
  }
}
