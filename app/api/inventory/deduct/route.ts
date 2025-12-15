import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { deductInventoryForOrder } from "@/lib/inventory-deduction";
import { CartItem } from "@/lib/cart";
import { Product } from "@/models";

/**
 * POST /api/inventory/deduct
 *
 * Deducts inventory for items in the cart after successful payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartItems } = body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid cart items",
        },
        { status: 400 }
      );
    }

    // Get all unique product IDs from cart
    const productIds = [...new Set(cartItems.map((item: CartItem) => item.productId))];

    // Fetch all products from database
    const { data: products, error: fetchError } = await supabase
      .from("umeki_products")
      .select("*")
      .in("id", productIds);

    if (fetchError || !products) {
      console.error("Error fetching products:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch products",
          message: fetchError?.message || "Unable to fetch product data",
        },
        { status: 500 }
      );
    }

    // Deduct inventory for all cart items
    const result = await deductInventoryForOrder(
      supabase,
      cartItems as CartItem[],
      products as Product[]
    );

    if (!result.success) {
      console.error("Inventory deduction failed:", result.error, result.failedItems);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          failedItems: result.failedItems,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Inventory deducted successfully",
    });
  } catch (error) {
    console.error("Unexpected error in inventory deduction:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error during inventory deduction",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}