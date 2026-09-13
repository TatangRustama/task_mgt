export type AtasanTaskNotice = {
  id: string;
  title: string;
  createdAt: string;
  createdByName: string;
};

export type NoticeItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  at: string;
};

export type NoticeSection = {
  id: string;
  title: string;
  count: number;
  href: string;
  items: NoticeItem[];
};

export type UserNotifications = {
  count: number;
  sections: NoticeSection[];
};

export const EMPTY_NOTIFICATIONS: UserNotifications = {
  count: 0,
  sections: [],
};
