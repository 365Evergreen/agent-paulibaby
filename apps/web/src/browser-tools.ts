import type { JsonSchemaExecutableToolDescriptor } from "@cloudflare/codemode/browser";

/**
 * Browser-owned tools for Code Mode browser integration.
 *
 * These tools run in the browser — they read page state, access browser APIs,
 * or update app data. The model writes one JS function that orchestrates
 * several of them in a single code block. IframeSandboxExecutor runs that
 * code in a sandboxed iframe on the page.
 *
 * Each tool is a plain object with a JSON Schema for input and an `execute`
 * function that runs in the parent page (not the iframe).
 */

function requireApproval(name: string, args: Record<string, unknown> = {}) {
  if (!window.confirm(`Allow ${name} to access browser data?\n\n${JSON.stringify(args, null, 2)}`)) {
    throw new Error(`The user did not approve ${name}.`);
  }
}

export const browserTools: JsonSchemaExecutableToolDescriptor[] = [
  {
    name: "getTimezone",
    description: "Get the user's timezone from their browser",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    },
  },
  {
    name: "getClipboard",
    description: "Read text from the user's clipboard",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      requireApproval("getClipboard");
      return navigator.clipboard.readText();
    },
  },
  {
    name: "getLocation",
    description: "Get the user's approximate geolocation (lat/lng)",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      requireApproval("getLocation");
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          reject,
        );
      });
    },
  },
  {
    name: "setLocalStorage",
    description: "Store a key-value pair in localStorage",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string" },
        value: { type: "string" },
      },
      required: ["key", "value"],
    },
    execute: async ({ key, value }: Record<string, unknown>) => {
      if (typeof key !== "string" || typeof value !== "string") {
        throw new Error("setLocalStorage requires string key and value.");
      }
      requireApproval("setLocalStorage", { key, value });
      localStorage.setItem(key, value);
      return { stored: true };
    },
  },
  {
    name: "getLocalStorage",
    description: "Read a value from localStorage by key",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string" },
      },
      required: ["key"],
    },
    execute: async ({ key }: Record<string, unknown>) => {
      if (typeof key !== "string") {
        throw new Error("getLocalStorage requires a string key.");
      }
      requireApproval("getLocalStorage", { key });
      return localStorage.getItem(key);
    },
  },
];
