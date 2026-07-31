import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");

test("firestore rules deny client access by default", () => {
  const rules = readFileSync(join(root, "firestore.rules"), "utf8");
  assert.match(rules, /allow read, write: if false/);
});

test("storage rules deny client access by default", () => {
  const rules = readFileSync(join(root, "storage.rules"), "utf8");
  assert.match(rules, /allow read, write: if false/);
});

test("firebase project remains fikra-e47d9", () => {
  const rc = JSON.parse(readFileSync(join(root, ".firebaserc"), "utf8"));
  assert.equal(rc.projects.default, "fikra-e47d9");
});

test("openai hosting.json project id preserved", () => {
  const hosting = JSON.parse(readFileSync(join(root, ".openai", "hosting.json"), "utf8"));
  assert.equal(hosting.project_id, "appgprj_6a580696e6548191b629252b7ec1d2bf");
});

test("composite indexes include postLocales published query", () => {
  const indexes = JSON.parse(readFileSync(join(root, "firestore.indexes.json"), "utf8"));
  const found = indexes.indexes.some(
    (idx) =>
      idx.collectionGroup === "postLocales" &&
      idx.fields.some((f) => f.fieldPath === "publishedAt"),
  );
  assert.equal(found, true);
});
