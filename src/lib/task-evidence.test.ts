import assert from "node:assert/strict";
import test from "node:test";
import { mergedCoordinate, mergedEvidencePhotoUrls } from "./task-evidence.ts";

test("resubmitting without new photos keeps the stored evidence", () => {
  const existing = ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"];
  assert.deepEqual(mergedEvidencePhotoUrls([], existing), existing);
});

test("a new upload replaces the previous evidence set", () => {
  assert.deepEqual(
    mergedEvidencePhotoUrls(["https://cdn.example/new.jpg"], ["https://cdn.example/old.jpg"]),
    ["https://cdn.example/new.jpg"],
  );
});

test("the first completion with no photos stores an empty set", () => {
  assert.deepEqual(mergedEvidencePhotoUrls([], null), []);
});

test("a revision without a new GPS fix keeps the stored coordinates", () => {
  assert.equal(mergedCoordinate(null, -0.86), -0.86);
  assert.equal(mergedCoordinate("", 134.06), 134.06);
  assert.equal(mergedCoordinate("  ", 1), 1);
});

test("a new GPS fix replaces the stored coordinates", () => {
  assert.equal(mergedCoordinate("-0.861", -1), -0.861);
  assert.equal(mergedCoordinate(134.07, 0), 134.07);
});

test("a non-numeric coordinate does not clear the stored pin", () => {
  assert.equal(mergedCoordinate("north", 1.5), 1.5);
});
