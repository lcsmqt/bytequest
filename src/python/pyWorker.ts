/// <reference lib="webworker" />
import { PYODIDE_CDN_BASE, PYODIDE_ENTRY } from "./pyodideVersion";

// Loaded lazily from the CDN so idle players never pay the ~10MB Pyodide download.
// See ARCHITECTURE.md#python-execution for why this runs in a dedicated Worker.
// Minimal shape we rely on — kept local so the CDN build isn't also required as a devDependency just for types.
interface PyodideInterface {
  setStdout(opts: { batched: (text: string) => void }): void;
  setStderr(opts: { batched: (text: string) => void }): void;
  runPythonAsync(code: string): Promise<unknown>;
}
type LoadPyodideFn = (opts: { indexURL: string }) => Promise<PyodideInterface>;

let pyodideReady: Promise<PyodideInterface> | null = null;

async function getPyodide(): Promise<PyodideInterface> {
  pyodideReady ??= (async () => {
    const mod = (await import(/* @vite-ignore */ PYODIDE_ENTRY)) as { loadPyodide: LoadPyodideFn };
    return mod.loadPyodide({ indexURL: PYODIDE_CDN_BASE });
  })();
  return pyodideReady;
}

export interface RunRequest {
  id: number;
  code: string;
}

export interface RunResponse {
  id: number;
  stdout: string;
  stderr: string;
  ok: boolean;
  ready?: boolean;
}

self.onmessage = async (event: MessageEvent<RunRequest | { id: number; type: "init" }>) => {
  const msg = event.data;
  let stdout = "";
  let stderr = "";

  try {
    const pyodide = await getPyodide();
    if ("type" in msg && msg.type === "init") {
      postMessage({ id: msg.id, ready: true, stdout: "", stderr: "", ok: true } satisfies RunResponse);
      return;
    }
    pyodide.setStdout({ batched: (text: string) => (stdout += text + "\n") });
    pyodide.setStderr({ batched: (text: string) => (stderr += text + "\n") });
    await pyodide.runPythonAsync((msg as RunRequest).code);
    postMessage({ id: msg.id, stdout, stderr, ok: true } satisfies RunResponse);
  } catch (err) {
    stderr += err instanceof Error ? err.message : String(err);
    postMessage({ id: msg.id, stdout, stderr, ok: false } satisfies RunResponse);
  }
};
