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
  return (
    <TabProvider>
      <CartModalProvider>
        <Header />
        <Sidebar />
        {children}
        <BottomTabs />
      </CartModalProvider>
    </TabProvider>
  );
}
