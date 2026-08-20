import assert from "node:assert/strict";
import test from "node:test";

import { isPublicPage } from "./proxy";

test("classifies only explicit authentication and offline pages as public", () => {
  assert.equal(isPublicPage("/"), true);
  assert.equal(isPublicPage("/login"), true);
  assert.equal(isPublicPage("/reset-password/confirm"), true);
  assert.equal(isPublicPage("/perfil"), false);
  assert.equal(isPublicPage("/pluggy"), false);
});
