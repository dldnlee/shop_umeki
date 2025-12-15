import { Product } from "@/models";

/**
 * Get available inventory for a specific product option
 */
export function getAvailableInventory(
  product: Product,
  option?: string
): number {
  // If inventory is a number (simple product without options)
  if (typeof product.inventory === 'number') {
    return product.inventory;
  }

  // If inventory is an object (product with options)
  if (typeof product.inventory === 'object') {
    // If option is not specified, check if this is a simple product with "default" key
    if (!option) {
      // For simple products stored as {"default": quantity}
      if ('default' in product.inventory) {
        return product.inventory['default'] ?? 0;
      }
      // For products with actual options, return 0
      return 0;
    }

    // Return inventory for the specific option, or 0 if not found
    return product.inventory[option] ?? 0;
  }

  return 0;
}

/**
 * Check if a quantity is available for a specific product option
 */
export function isInventoryAvailable(
  product: Product,
  quantity: number,
  option?: string
): boolean {
  const available = getAvailableInventory(product, option);
  return quantity <= available;
}

/**
 * Get the maximum quantity that can be added to cart
 */
export function getMaxQuantity(
  product: Product,
  option?: string
): number {
  return getAvailableInventory(product, option);
}

/**
 * Check if a product option is out of stock
 */
export function isOutOfStock(
  product: Product,
  option?: string
): boolean {
  return getAvailableInventory(product, option) === 0;
}

/**
 * Validate cart item against current inventory
 */
export function validateCartItemInventory(
  product: Product,
  quantity: number,
  option?: string
): {
  isValid: boolean;
  availableQuantity: number;
  message?: string;
} {
  const availableQuantity = getAvailableInventory(product, option);

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
 * Get all options with their inventory quantities
 */
export function getInventoryByOptions(
  product: Product
): { option: string; quantity: number }[] {
  if (typeof product.inventory === 'object') {
    return Object.entries(product.inventory).map(([option, quantity]) => ({
      option,
      quantity,
    }));
  }

  // Simple product - return single entry
  return [{ option: 'default', quantity: product.inventory as number }];
}