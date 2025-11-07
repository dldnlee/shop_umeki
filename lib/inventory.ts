import { Product, InventoryByOption } from "@/models";
import type { DeliveryMethod as CartDeliveryMethod } from "./cart";

export type InventoryDeliveryMethod = "onsite" | "delivery";

/**
 * Map cart delivery method to inventory delivery method
 * 팬미팅현장수령 = onsite (deducts from both onsite and delivery/total)
 * 국내배송 = delivery (deducts only from delivery)
 * 해외배송 = delivery (deducts only from delivery)
 */
export function mapDeliveryMethod(
  cartDeliveryMethod?: CartDeliveryMethod
): InventoryDeliveryMethod | undefined {
  if (!cartDeliveryMethod) return undefined;

  switch (cartDeliveryMethod) {
    case "팬미팅현장수령":
      return "onsite";
    case "국내배송":
    case "해외배송":
      return "delivery";
    default:
      return undefined;
  }
}

/**
 * Get available inventory for a specific product option and delivery method
 */
export function getAvailableInventory(
  product: Product,
  option?: string,
  deliveryMethod?: InventoryDeliveryMethod
): number {
  // If product has no options (simple product)
  if (!product.options || product.options.length === 0) {
    return product.inventory;
  }

  // If product has options but no inventory_by_option data, fall back to general inventory
  if (!product.inventory_by_option) {
    return product.inventory;
  }

  // If option is not specified, return 0 (must specify option for products with options)
  if (!option) {
    return 0;
  }

  // Get inventory for the specific option
  const optionInventory = product.inventory_by_option[option];

  if (!optionInventory) {
    return 0;
  }

  // If delivery method is specified, return that specific inventory
  if (deliveryMethod) {
    const inventory = deliveryMethod === "onsite"
      ? optionInventory.onsite
      : optionInventory.delivery;
    return inventory ?? 0;
  }

  // If no delivery method specified, return the sum of onsite and delivery
  const onsite = optionInventory.onsite ?? 0;
  const delivery = optionInventory.delivery ?? 0;
  return onsite + delivery;
}

/**
 * Check if a quantity is available for a specific product option and delivery method
 */
export function isInventoryAvailable(
  product: Product,
  quantity: number,
  option?: string,
  deliveryMethod?: InventoryDeliveryMethod
): boolean {
  const available = getAvailableInventory(product, option, deliveryMethod);
  return quantity <= available;
}

/**
 * Get the maximum quantity that can be added to cart
 */
export function getMaxQuantity(
  product: Product,
  option?: string,
  deliveryMethod?: InventoryDeliveryMethod
): number {
  return getAvailableInventory(product, option, deliveryMethod);
}

/**
 * Check if a product option is out of stock
 */
export function isOutOfStock(
  product: Product,
  option?: string,
  deliveryMethod?: InventoryDeliveryMethod
): boolean {
  return getAvailableInventory(product, option, deliveryMethod) === 0;
}

/**
 * Validate cart item against current inventory
 */
export function validateCartItemInventory(
  product: Product,
  quantity: number,
  option?: string,
  deliveryMethod?: InventoryDeliveryMethod
): {
  isValid: boolean;
  availableQuantity: number;
  message?: string;
} {
  const availableQuantity = getAvailableInventory(product, option, deliveryMethod);

  if (quantity <= 0) {
    return {
      isValid: false,
      availableQuantity,
      message: "Quantity must be greater than 0",
    };
  }

  if (quantity > availableQuantity) {
    return {
      isValid: false,
      availableQuantity,
      message: `Only ${availableQuantity} item(s) available`,
    };
  }

  return {
    isValid: true,
    availableQuantity,
  };
}

/**
 * Get inventory breakdown for a product option
 */
export function getInventoryBreakdown(
  product: Product,
  option?: string
): {
  total: number;
  onsite: number;
  delivery: number;
} {
  if (!product.options || product.options.length === 0) {
    return {
      total: product.inventory,
      onsite: product.inventory,
      delivery: product.inventory,
    };
  }

  if (!product.inventory_by_option || !option) {
    return {
      total: 0,
      onsite: 0,
      delivery: 0,
    };
  }

  const optionInventory = product.inventory_by_option[option];

  if (!optionInventory) {
    return {
      total: 0,
      onsite: 0,
      delivery: 0,
    };
  }

  const onsite = optionInventory.onsite ?? 0;
  const delivery = optionInventory.delivery ?? 0;

  return {
    total: onsite + delivery,
    onsite,
    delivery,
  };
}

/**
 * Calculate inventory deduction based on delivery method
 *
 * Deduction Logic:
 * - 팬미팅현장수령 (onsite): Deducts from "onsite" count
 * - 국내배송 (delivery): Deducts from "delivery" count
 * - 해외배송 (delivery): Deducts from "delivery" count
 *
 * @returns Object containing the fields to deduct from inventory_by_option
 */
export function calculateInventoryDeduction(
  product: Product,
  quantity: number,
  option?: string,
  cartDeliveryMethod?: CartDeliveryMethod
): {
  option: string | null;
  onsiteDeduction: number;
  deliveryDeduction: number;
} {
  // For simple products without options, return null option
  if (!product.options || product.options.length === 0) {
    return {
      option: null,
      onsiteDeduction: 0,
      deliveryDeduction: 0,
    };
  }

  if (!option) {
    throw new Error("Option is required for products with options");
  }

  // Map cart delivery method to inventory delivery method
  const inventoryMethod = mapDeliveryMethod(cartDeliveryMethod);

  // If no delivery method specified, don't deduct (shouldn't happen in production)
  if (!inventoryMethod) {
    return {
      option,
      onsiteDeduction: 0,
      deliveryDeduction: 0,
    };
  }

  // Calculate deduction based on delivery method
  if (inventoryMethod === "onsite") {
    // 팬미팅현장수령: Deduct from onsite
    return {
      option,
      onsiteDeduction: quantity,
      deliveryDeduction: 0,
    };
  } else {
    // 국내배송 or 해외배송: Deduct from delivery
    return {
      option,
      onsiteDeduction: 0,
      deliveryDeduction: quantity,
    };
  }
}

/**
 * Generate SQL update statement for inventory deduction
 * This should be called on the server side after successful payment
 */
export function generateInventoryUpdateSQL(
  productId: number,
  option: string | null,
  onsiteDeduction: number,
  deliveryDeduction: number
): string {
  if (!option) {
    // Simple product without options - deduct from main inventory
    return `
      UPDATE umeki_products
      SET inventory = inventory - ${onsiteDeduction + deliveryDeduction}
      WHERE id = ${productId}
    `.trim();
  }

  // Product with options - update inventory_by_option JSONB
  const updates: string[] = [];

  if (onsiteDeduction > 0) {
    updates.push(`
      inventory_by_option = jsonb_set(
        inventory_by_option,
        '{${option},onsite}',
        to_jsonb(COALESCE((inventory_by_option->'${option}'->>'onsite')::int, 0) - ${onsiteDeduction})
      )
    `.trim());
  }

  if (deliveryDeduction > 0) {
    updates.push(`
      inventory_by_option = jsonb_set(
        ${onsiteDeduction > 0 ? 'inventory_by_option' : 'inventory_by_option'},
        '{${option},delivery}',
        to_jsonb(COALESCE((inventory_by_option->'${option}'->>'delivery')::int, 0) - ${deliveryDeduction})
      )
    `.trim());
  }

  return `
    UPDATE umeki_products
    SET ${updates.join(', ')}
    WHERE id = ${productId}
  `.trim();
}
