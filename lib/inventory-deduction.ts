/**
 * Server-side inventory deduction functions
 * These functions should be called after successful payment to update inventory
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { Product } from "@/models";
import { calculateInventoryDeduction } from "./inventory";
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

      // Calculate deduction based on delivery method
      const deduction = calculateInventoryDeduction(
        product,
        item.quantity,
        item.option,
        item.deliveryMethod
      );

      // Deduct inventory
      const result = await deductInventoryForItem(
        supabaseClient,
        item.productId,
        deduction.option,
        deduction.onsiteDeduction,
        deduction.deliveryDeduction
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
  option: string | null,
  onsiteDeduction: number,
  deliveryDeduction: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!option) {
      // Simple product without options - deduct from main inventory
      const totalDeduction = onsiteDeduction + deliveryDeduction;

      // First fetch the current inventory
      const { data: currentProduct, error: fetchError } = await supabaseClient
        .from("umeki_products")
        .select("inventory")
        .eq("id", productId)
        .single();

      if (fetchError || !currentProduct) {
        console.error("Error fetching product inventory:", fetchError);
        return { success: false, error: fetchError?.message || "Product not found" };
      }

      const newInventory = Math.max(0, currentProduct.inventory - totalDeduction);

      const { error } = await supabaseClient
        .from("umeki_products")
        .update({
          inventory: newInventory,
        })
        .eq("id", productId);

      if (error) {
        console.error("Error deducting simple product inventory:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    }

    // Product with options - update inventory_by_option JSONB
    // First, fetch current inventory
    const { data: product, error: fetchError } = await supabaseClient
      .from("umeki_products")
      .select("inventory_by_option")
      .eq("id", productId)
      .single();

    if (fetchError || !product) {
      console.error("Error fetching product:", fetchError);
      return { success: false, error: fetchError?.message || "Product not found" };
    }

    const inventoryByOption = product.inventory_by_option as Record<
      string,
      { onsite?: number; delivery?: number }
    >;

    if (!inventoryByOption || !inventoryByOption[option]) {
      return { success: false, error: `Option "${option}" not found in inventory` };
    }

    // Calculate new values
    const currentOnsite = inventoryByOption[option].onsite ?? 0;
    const currentDelivery = inventoryByOption[option].delivery ?? 0;

    const newOnsite = Math.max(0, currentOnsite - onsiteDeduction);
    const newDelivery = Math.max(0, currentDelivery - deliveryDeduction);

    // Update the inventory_by_option
    const updatedInventory = {
      ...inventoryByOption,
      [option]: {
        onsite: newOnsite,
        delivery: newDelivery,
      },
    };

    const { error: updateError } = await supabaseClient
      .from("umeki_products")
      .update({
        inventory_by_option: updatedInventory,
      })
      .eq("id", productId);

    if (updateError) {
      console.error("Error updating inventory_by_option:", updateError);
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

      // Calculate deduction to determine which inventory to check
      const deduction = calculateInventoryDeduction(
        product,
        item.quantity,
        item.option,
        item.deliveryMethod
      );

      // Check if sufficient inventory is available
      if (product.options && product.options.length > 0 && deduction.option) {
        const inventoryByOption = product.inventory_by_option as Record<
          string,
          { onsite?: number; delivery?: number }
        > | null;

        if (!inventoryByOption || !inventoryByOption[deduction.option]) {
          unavailableItems.push({
            productId: item.productId,
            option: item.option,
            requested: item.quantity,
            available: 0,
          });
          continue;
        }

        const optionInventory = inventoryByOption[deduction.option];
        const availableOnsite = optionInventory.onsite ?? 0;
        const availableDelivery = optionInventory.delivery ?? 0;

        // Check based on deduction type
        if (deduction.onsiteDeduction > 0 && deduction.onsiteDeduction > availableOnsite) {
          unavailableItems.push({
            productId: item.productId,
            option: item.option,
            requested: item.quantity,
            available: availableOnsite,
          });
        } else if (
          deduction.deliveryDeduction > 0 &&
          deduction.deliveryDeduction > availableDelivery
        ) {
          unavailableItems.push({
            productId: item.productId,
            option: item.option,
            requested: item.quantity,
            available: availableDelivery,
          });
        }
      } else {
        // Simple product
        if (item.quantity > product.inventory) {
          unavailableItems.push({
            productId: item.productId,
            option: item.option,
            requested: item.quantity,
            available: product.inventory,
          });
        }
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
