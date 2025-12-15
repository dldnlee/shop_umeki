/**
 * Server-side inventory deduction functions
 * These functions should be called after successful payment to update inventory
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { Product } from "@/models";
import type { CartItem } from "./cart";

/**
 * Deduct inventory for a cart after successful payment
 * This should be called on the server side (API route or server action)
 */
export async function deductInventoryForOrder(
  supabaseClient: SupabaseClient,
  cartItems: CartItem[],
  products: Product[]
): Promise<{
  success: boolean;
  error?: string;
  failedItems?: Array<{ productId: number; option?: string; reason: string }>;
}> {
  const failedItems: Array<{ productId: number; option?: string; reason: string }> = [];

  try {
    for (const item of cartItems) {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        failedItems.push({
          productId: item.productId,
          option: item.option,
          reason: "Product not found",
        });
        continue;
      }

      // Deduct inventory
      const result = await deductInventoryForItem(
        supabaseClient,
        item.productId,
        item.option,
        item.quantity,
        product
      );

      if (!result.success) {
        failedItems.push({
          productId: item.productId,
          option: item.option,
          reason: result.error || "Unknown error",
        });
      }
    }

    if (failedItems.length > 0) {
      return {
        success: false,
        error: `Failed to deduct inventory for ${failedItems.length} items`,
        failedItems,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deducting inventory:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Deduct inventory for a single item
 */
async function deductInventoryForItem(
  supabaseClient: SupabaseClient,
  productId: number,
  option: string | undefined,
  quantity: number,
  product: Product
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, fetch current inventory
    const { data: currentProduct, error: fetchError } = await supabaseClient
      .from("umeki_products")
      .select("inventory")
      .eq("id", productId)
      .single();

    if (fetchError || !currentProduct) {
      console.error("Error fetching product:", fetchError);
      return { success: false, error: fetchError?.message || "Product not found" };
    }

    const inventoryObj = currentProduct.inventory as Record<string, number>;

    if (!inventoryObj || typeof inventoryObj !== 'object') {
      return { success: false, error: "Invalid inventory data" };
    }

    // Determine the inventory key to use
    // If product has no options, use "default" key
    // If product has options, use the specific option
    let inventoryKey: string;

    if (!product.options || product.options.length === 0) {
      // Product without options - use "default" key
      inventoryKey = "default";
    } else {
      // Product with options - option must be provided
      if (!option) {
        return { success: false, error: "Option is required for products with options" };
      }
      inventoryKey = option;
    }

    // Check if the inventory key exists
    if (!(inventoryKey in inventoryObj)) {
      return { success: false, error: `Inventory key "${inventoryKey}" not found in inventory` };
    }

    // Calculate new value
    const currentQuantity = inventoryObj[inventoryKey];
    const newQuantity = Math.max(0, currentQuantity - quantity);

    // Update the inventory object
    const updatedInventory = {
      ...inventoryObj,
      [inventoryKey]: newQuantity,
    };

    const { error: updateError } = await supabaseClient
      .from("umeki_products")
      .update({
        inventory: updatedInventory,
      })
      .eq("id", productId);

    if (updateError) {
      console.error("Error updating inventory:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deductInventoryForItem:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify inventory availability before processing order
 * Call this before deducting to ensure all items are still in stock
 */
export async function verifyInventoryAvailability(
  supabaseClient: SupabaseClient,
  cartItems: CartItem[]
): Promise<{
  available: boolean;
  unavailableItems?: Array<{
    productId: number;
    option?: string;
    requested: number;
    available: number;
  }>;
}> {
  try {
    const productIds = [...new Set(cartItems.map((item) => item.productId))];

    const { data: products, error } = await supabaseClient
      .from("umeki_products")
      .select("*")
      .in("id", productIds);

    if (error || !products) {
      console.error("Error fetching products:", error);
      return { available: false };
    }

    const unavailableItems: Array<{
      productId: number;
      option?: string;
      requested: number;
      available: number;
    }> = [];

    for (const item of cartItems) {
      const product = products.find((p: any) => p.id === item.productId) as Product | undefined;

      if (!product) {
        unavailableItems.push({
          productId: item.productId,
          option: item.option,
          requested: item.quantity,
          available: 0,
        });
        continue;
      }

      // Check inventory availability
      if (typeof product.inventory === 'object') {
        const inventoryObj = product.inventory as Record<string, number>;

        // Determine the inventory key to use
        let inventoryKey: string;

        if (!product.options || product.options.length === 0) {
          // Product without options - use "default" key
          inventoryKey = "default";
        } else {
          // Product with options - option must be provided
          if (!item.option) {
            unavailableItems.push({
              productId: item.productId,
              option: item.option,
              requested: item.quantity,
              available: 0,
            });
            continue;
          }
          inventoryKey = item.option;
        }

        const availableQuantity = inventoryObj[inventoryKey] ?? 0;

        if (item.quantity > availableQuantity) {
          unavailableItems.push({
            productId: item.productId,
            option: item.option,
            requested: item.quantity,
            available: availableQuantity,
          });
        }
      } else {
        // Invalid inventory format
        unavailableItems.push({
          productId: item.productId,
          option: item.option,
          requested: item.quantity,
          available: 0,
        });
      }
    }

    return {
      available: unavailableItems.length === 0,
      unavailableItems: unavailableItems.length > 0 ? unavailableItems : undefined,
    };
  } catch (error) {
    console.error("Error verifying inventory:", error);
    return { available: false };
  }
}
