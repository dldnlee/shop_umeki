import Link from "next/link";
import Image from "next/image";
import { formatKRW } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Product } from "@/models";


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
      <main className="max-w-6xl mx-auto p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-black text-center dark:text-white">
            유메키 팬미팅 굿즈
          </h1>
        </header>

        <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productList.map((p) => (
            <Link
              href={`/product/${p.id}`}
              key={p.id}
              className="rounded-lg bg-white shadow-md hover:scale-103 transition-all overflow-hidden hover:shadow-lg"
            >
              <div className="relative aspect-square bg-[#9CE5F4]">
                {p.image_urls && p.image_urls.length > 0 ? (
                  <Image
                    src={p.image_urls[0]}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400">
                    <span className="select-none">No Image</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-base font-medium text-black">
                  {p.name}
                </h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-semibold text-black">
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
