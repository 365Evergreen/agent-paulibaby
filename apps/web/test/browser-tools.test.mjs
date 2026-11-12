import assert from "node:assert/strict";
import { test } from "node:test";
import { createBrowserCodeTool } from "@cloudflare/codemode/browser";
import { browserTools } from "../src/browser-tools.ts";

function replaceGlobal(t, name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, value });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, name, original);
    else Reflect.deleteProperty(globalThis, name);
  });
}

test("browser Code Mode prompts before each protected operation and blocks rejection", async (t) => {
  const prompts = [];
  replaceGlobal(t, "window", {
    confirm: (message) => {
      prompts.push(message);
      return false;
    },
  });
  let functions;
  const tool = createBrowserCodeTool({
    tools: browserTools,
    executor: {
      async execute(_code, providers) {
        functions = providers[0].fns;
        return { result: null };
      },
    },
  });
  await tool.execute({ code: "async () => null" });

  for (const [name, args] of [
    ["getClipboard", {}],
    ["getLocation", {}],
    ["getLocalStorage", { key: "key" }],
    ["setLocalStorage", { key: "key", value: "value" }],
  ]) {
    await assert.rejects(functions[name](args), /did not approve/);
    assert.match(prompts.at(-1), new RegExp(name));
  }
  assert.match(prompts.at(-1), /"value": "value"/);
  assert.equal(prompts.length, 4);
});

test("approved browser operations execute and invalid storage arguments do not", async (t) => {
  const values = new Map();
  replaceGlobal(t, "window", { confirm: () => true });
  replaceGlobal(t, "navigator", {
    clipboard: { readText: async () => "clipboard" },
    geolocation: {
      getCurrentPosition: (resolve) =>
        resolve({ coords: { latitude: 1, longitude: 2 } }),
    },
  });
  replaceGlobal(t, "localStorage", {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  });
  const set = browserTools.find((tool) => tool.name === "setLocalStorage");
  const get = browserTools.find((tool) => tool.name === "getLocalStorage");
  const clipboard = browserTools.find((tool) => tool.name === "getClipboard");
  const location = browserTools.find((tool) => tool.name === "getLocation");

  await assert.rejects(set.execute({ key: "key", value: 42 }), /requires string/);
  assert.equal(values.size, 0);
  assert.equal(await clipboard.execute({}), "clipboard");
  assert.deepEqual(await location.execute({}), { lat: 1, lng: 2 });
  await set.execute({ key: "key", value: "value" });
  assert.equal(await get.execute({ key: "key" }), "value");
});
