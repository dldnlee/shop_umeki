import { supabase } from "@/lib/supabase";
import { Product } from "@/models";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductClient from "./ProductClient";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch product from Supabase
  const { data: product, error } = await supabase
    .from('umeki_products')
    .select('*')
    .eq('id', slug)
    .single();

  if (error || !product) {
    notFound();
  }

  const typedProduct = product as Product;

  return (
    <div className="min-h-screen bg-[#8DCFDD] font-sans text-foreground">
      <main className="max-w-4xl mx-auto p-8">
        <Link href="..">
          {'<'} Back
        </Link>
        <ProductClient product={typedProduct} slug={slug} />
      </main>
    </div>
  );
}
