import type { WorkerJavaScriptBackend } from "@cloudflare/computer/backends/worker-javascript";

type WorkspaceLoader = ConstructorParameters<typeof WorkerJavaScriptBackend>[0]["loader"];

export function workspaceLoader(loader: WorkerLoader): WorkspaceLoader {
  return {
    load: (code) => {
      const worker = loader.load(code);
      return {
        getEntrypoint: (name, options): unknown =>
          worker.getEntrypoint(name, options),
      };
    },
  };
}
