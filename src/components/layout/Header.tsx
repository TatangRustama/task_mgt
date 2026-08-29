import { ReactNode } from "react";
import { BackButton } from "@/components/layout/BackButton";
import { HeaderNotifications } from "@/components/layout/HeaderUserActions";
import { HeaderProfile } from "@/components/layout/HeaderProfile";
import type { AtasanTaskNotice } from "@/lib/notification-types";

export function Header({
  action,
  userName,
  identity,
  noticeCount,
  notices,
}: {
  action?: ReactNode;
  userName: string;
  identity: string;
  noticeCount: number;
  notices: AtasanTaskNotice[];
}) {
  return (
    <header className="fixed top-0 left-0 z-50 h-16 w-full bg-secondary-navy shadow-md">
      <div className="relative mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-5 md:px-8">
        <div className="flex shrink-0 items-center">
          <BackButton />
          <HeaderNotifications initialCount={noticeCount} initialItems={notices} />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {action}
          <HeaderProfile name={userName} identity={identity} />
        </div>
      </div>
    </header>
  );
}
