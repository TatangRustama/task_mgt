import assert from "node:assert/strict";
import test from "node:test";
import { userDeletionBlocked, type UserTaskLinks } from "./user-deletion";

const clear: UserTaskLinks = {
  createdTasks: 0,
  assignedTasks: 0,
  reviews: 0,
  ratings: 0,
  authoredReports: 0,
};

test("an account with no task history can be deleted", () => {
  assert.equal(userDeletionBlocked(clear), false);
});

test("assigned work blocks deletion so the assignee is not stripped", () => {
  assert.equal(userDeletionBlocked({ ...clear, assignedTasks: 1 }), true);
});

test("an authored monthly validation report blocks deletion", () => {
  assert.equal(userDeletionBlocked({ ...clear, authoredReports: 1 }), true);
});

test("created tasks, reviews, and ratings still block deletion", () => {
  assert.equal(userDeletionBlocked({ ...clear, createdTasks: 1 }), true);
  assert.equal(userDeletionBlocked({ ...clear, reviews: 1 }), true);
  assert.equal(userDeletionBlocked({ ...clear, ratings: 1 }), true);
});
