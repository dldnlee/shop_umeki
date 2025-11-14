"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomTabs from "@/components/BottomTabs";
import { CartModalProvider } from "@/components/CartModalProvider";
import { TabProvider } from "@/components/TabProvider";

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <TabProvider>
      <CartModalProvider>
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        {children}
        <BottomTabs />
      </CartModalProvider>
    </TabProvider>
  );
}
