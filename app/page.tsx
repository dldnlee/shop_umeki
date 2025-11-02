import { supabase } from "@/lib/supabase";
import { Product } from "@/models";
import MainPageTabs from "@/components/MainPageTabs";


export default async function Home() {
  // Fetch products from Supabase
  const { data: products, error } = await supabase
    .from('umeki_products')
    .select('*')

  if (error) {
    console.error('Error fetching products:', error);
  }

  const productList = (products || []) as Product[];

  return (
    <div className="min-h-screen bg-[#8DCFDD] font-sans text-foreground">
      <main className="max-w-6xl mx-auto p-3 sm:p-6 md:p-8">
        <MainPageTabs products={productList} />
      </main>
    </div>
  );
}
