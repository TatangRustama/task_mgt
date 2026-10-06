export type UserTaskLinks = {
  createdTasks: number;
  assignedTasks: number;
  reviews: number;
  ratings: number;
  authoredReports: number;
};

export const ACCOUNT_LINKED_TO_TASKS_ERROR =
  "Akun tidak dapat dihapus karena masih terhubung dengan data tugas";

export class AccountDeletionBlockedError extends Error {
  constructor() {
    super(ACCOUNT_LINKED_TO_TASKS_ERROR);
    this.name = "AccountDeletionBlockedError";
  }
}

export function userDeletionBlocked(links: UserTaskLinks) {
  return (
    links.createdTasks > 0 ||
    links.assignedTasks > 0 ||
    links.reviews > 0 ||
    links.ratings > 0 ||
    links.authoredReports > 0
  );
}
