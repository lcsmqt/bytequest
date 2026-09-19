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

  /** Kicks off the Pyodide download/init; resolves true once the interpreter is ready (false = load failed). */
  async warmUp(onProgress?: (text: string) => void): Promise<boolean> {
    if (this.warm) return true;
    onProgress?.("Carregando o interpretador Python...");
    const worker = this.worker ?? this.spawnWorker();
    const ok = await new Promise<boolean>((resolve) => {
      const id = this.nextId++;
      const handler = (event: MessageEvent<RunResponse>) => {
        if (event.data.id !== id) return;
        worker.removeEventListener("message", handler);
        resolve(event.data.ok);
      };
      worker.addEventListener("message", handler);
      worker.postMessage({ id, type: "init" });
    });
    this.warm = ok;
    return ok;
  }

  async run(code: string, timeoutMs = PYTHON_EXEC_TIMEOUT_MS): Promise<PythonRunResult> {
    // The watchdog must only time the player's code, never the Pyodide download: on a cold start the first
    // Run used to be reported as an infinite loop while the interpreter was still loading.
    if (!(await this.warmUp())) {
      return { stdout: "", stderr: "Não foi possível carregar o interpretador Python. Verifique sua conexão e tente de novo.", ok: false, timedOut: false };
    }
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
