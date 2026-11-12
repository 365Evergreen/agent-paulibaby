import assert from "node:assert/strict";
import { test } from "node:test";
import {
  apiRequestUrl,
  isAllowedOpenApiRequest,
} from "../src/allowlist.ts";

const paths = ["/items", "/items/{id}"];

test("allows only GET requests matching declared OpenAPI paths", () => {
  assert.equal(isAllowedOpenApiRequest("GET", "/items", paths), true);
  assert.equal(isAllowedOpenApiRequest("GET", "/items/123", paths), true);
  assert.equal(isAllowedOpenApiRequest("POST", "/items", paths), false);
  assert.equal(isAllowedOpenApiRequest("GET", "/admin", paths), false);
});

test("rejects traversal and protocol-relative paths", () => {
  assert.equal(isAllowedOpenApiRequest("GET", "/items/../admin", paths), false);
  assert.equal(isAllowedOpenApiRequest("GET", "//evil.example/items", paths), false);
  assert.equal(isAllowedOpenApiRequest("GET", "/items\\admin", paths), false);
});

test("requires an HTTPS API origin and keeps requests on that origin", () => {
  assert.equal(
    apiRequestUrl("https://api.example.com", "/items/123").origin,
    "https://api.example.com",
  );
  assert.throws(() => apiRequestUrl("http://api.example.com", "/items"));
  assert.throws(() => apiRequestUrl("https://api.example.com", "//evil.example"));
});
