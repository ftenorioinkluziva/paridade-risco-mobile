import assert from "node:assert/strict";
import test from "node:test";
import { nestedResource, resourceDate, resourceNumber, resourceString } from "./repository";

test("Pluggy resource helpers normalize common provider values", () => {
  const resource = {
    amount: 12.5,
    date: "2026-08-04T12:00:00.000Z",
    empty: "",
    nested: { id: "nested-1" },
  };

  assert.equal(resourceString(resource, "empty", "amount"), "12.5");
  assert.equal(resourceNumber(resource, "amount"), "12.5");
  assert.equal(resourceDate(resource, "date")?.toISOString(), "2026-08-04T12:00:00.000Z");
  assert.deepEqual(nestedResource(resource, "nested"), { id: "nested-1" });
});

test("Pluggy resource helpers reject invalid numeric and date values", () => {
  const resource = { amount: "not-a-number", date: "not-a-date" };
  assert.equal(resourceNumber(resource, "amount"), null);
  assert.equal(resourceDate(resource, "date"), null);
});
