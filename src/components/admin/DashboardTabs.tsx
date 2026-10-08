"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DashboardTabs({
  recap,
  perangkat,
}: {
  recap: ReactNode;
  perangkat: ReactNode;
}) {
  return (
    <Tabs defaultValue="recap">
      <TabsList>
        <TabsTrigger value="recap" className="px-1 text-xs sm:text-sm">
          Recap
        </TabsTrigger>
        <TabsTrigger value="perangkat" className="px-1 text-xs sm:text-sm">
          Perangkat Daerah
        </TabsTrigger>
      </TabsList>
      <TabsContent value="recap">{recap}</TabsContent>
      <TabsContent value="perangkat">{perangkat}</TabsContent>
    </Tabs>
  );
}
