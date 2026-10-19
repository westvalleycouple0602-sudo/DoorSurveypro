import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { sameOriginOperatorMutations } from "../middleware/operator-origin";

function check(method: string, headers: Record<string, string>) {
  const req = {
    method, protocol: "https",
    headers: { host: "app.example.com", ...headers },
    get(name: string) { return this.headers[name.toLowerCase() as keyof typeof this.headers]; },
    session: { isSuperAdmin: true },
  };
  let invoked = false;
  let status = 200;
  const res = { status(code: number) { status = code; return this; }, json() { return this; } };
  sameOriginOperatorMutations(req as unknown as Request, res as unknown as Response, () => { invoked = true; });
  return { invoked, status };
}

test("authenticated operator mutations reject untrusted sibling, cross-site and opaque origins", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    for (const origin of ["https://untrusted.example.com", "https://evil.invalid", "null"]) {
      assert.deepEqual(check(method, { origin }), { invoked: false, status: 403 });
    }
    for (const site of ["same-site", "cross-site"]) {
      assert.deepEqual(check(method, { "sec-fetch-site": site }), { invoked: false, status: 403 });
    }
    assert.deepEqual(check(method, { referer: "https://untrusted.example.com/" }), { invoked: false, status: 403 });
  }
});

test("same-origin operator requests pass to session and CSRF validation, including behind proxy", () => {
  assert.deepEqual(check("POST", { origin: "https://app.example.com" }), { invoked: true, status: 200 });
  assert.deepEqual(check("POST", {
    "x-forwarded-host": "custom.example.net", origin: "https://custom.example.net",
  }), { invoked: true, status: 200 });
  assert.deepEqual(check("POST", { referer: "https://app.example.com/super-admin" }), { invoked: true, status: 200 });
  assert.deepEqual(check("POST", {}), { invoked: true, status: 200 }); // CSRF required downstream
  assert.deepEqual(check("GET", { origin: "https://untrusted.example.com" }), { invoked: true, status: 200 }); // no credentialed CORS
});
