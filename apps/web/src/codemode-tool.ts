import {
  IframeSandboxExecutor,
  createBrowserCodeTool,
} from "@cloudflare/codemode/browser";
import { browserTools } from "./browser-tools";

/**
 * Browser-side Code Mode tool.
 *
 * The browser creates this descriptor and registers it as a dynamic client
 * tool via useAgentChat(). The Agent receives the tool schema, but the tool
 * implementation (and the generated code execution) stays in the browser.
 *
 * IframeSandboxExecutor runs the model's generated code in a hidden iframe
 * with sandbox="allow-scripts". Tool calls return to the parent page, which
 * runs the matching browser-owned execute function.
 *
 * The model sees typed methods: getTimezone(), getClipboard(), getLocation(),
 * setLocalStorage(), getLocalStorage().
 */
export const codemodeTool = createBrowserCodeTool({
  tools: browserTools,
  executor: new IframeSandboxExecutor(),
});
