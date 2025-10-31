import Link from "next/link";
import { formatKRW } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Product } from "@/mock_data";


export default async function Home() {
  // Fetch products from Supabase
  const { data: products, error } = await supabase
    .from('umeki_products')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
  }

  const productList = (products || []) as Product[];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-foreground">
      <main className="max-w-6xl mx-auto p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-black dark:text-white">
            유메키 팬미팅 굿즈
          </h1>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productList.map((p) => (
            <Link
              href={`/product/${p.id}`}
              key={p.id}
              className="rounded-lg border border-black/6 bg-white dark:bg-[#0b0b0b] shadow-sm overflow-hidden"
            >
              <div className="h-40 bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-zinc-400">
                <span className="select-none">Image</span>
              </div>
              <div className="p-4">
                <h3 className="text-base font-medium text-black dark:text-zinc-50">
                  {p.name}
                </h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-semibold text-black dark:text-white">
                    {formatKRW(p.price)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
