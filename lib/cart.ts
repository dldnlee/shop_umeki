import { Product } from "@/models";
import { validateCartItemInventory } from "./inventory";

export type DeliveryMethod = "국내배송" | "해외배송" | "팬미팅현장수령";

export type CartItem = {
  productId: number;
  productName: string;
  price: number;
  option?: string;
  quantity: number;
  slug?: string;
  deliveryMethod?: DeliveryMethod; // Track delivery method per item
};

export type InventoryValidationResult = {
  isValid: boolean;
  productId: number;
  option?: string;
  requestedQuantity: number;
  availableQuantity: number;
  message?: string;
};

const CART_STORAGE_KEY = "umeki_cart";

/**
 * Get all items from the cart
 */
export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const cartData = localStorage.getItem(CART_STORAGE_KEY);
    return cartData ? JSON.parse(cartData) : [];
  } catch (error) {
    console.error("Error reading cart from localStorage:", error);
    return [];
  }
}

/**
 * Add an item to the cart or update quantity if it already exists
 */
export function addToCart(item: CartItem): void {
  if (typeof window === "undefined") return;

  try {
    const cart = getCart();

    // Check if item already exists (same product and option)
    const existingItemIndex = cart.findIndex(
      (cartItem) =>
        cartItem.productId === item.productId &&
        cartItem.option === item.option
    );

    if (existingItemIndex > -1) {
      // Update quantity of existing item
      cart[existingItemIndex].quantity += item.quantity;
    } else {
      // Add new item to cart
      cart.push(item);
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));

    // Dispatch custom event so other components can react to cart changes
    window.dispatchEvent(new CustomEvent("cartUpdated", { detail: cart }));
  } catch (error) {
    console.error("Error adding item to cart:", error);
  }
}

/**
 * Remove an item from the cart
 */
export function removeFromCart(productId: number, option?: string): void {
  if (typeof window === "undefined") return;

  try {
    const cart = getCart();
    const updatedCart = cart.filter(
      (item) => !(item.productId === productId && item.option === option)
    );

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
    window.dispatchEvent(new CustomEvent("cartUpdated", { detail: updatedCart }));
  } catch (error) {
    console.error("Error removing item from cart:", error);
  }
}

/**
 * Update the quantity of a cart item
 */
export function updateCartItemQuantity(
  productId: number,
  quantity: number,
  option?: string
): void {
  if (typeof window === "undefined") return;

  try {
    const cart = getCart();
    const itemIndex = cart.findIndex(
      (item) => item.productId === productId && item.option === option
    );

    if (itemIndex > -1) {
      if (quantity <= 0) {
        removeFromCart(productId, option);
      } else {
        cart[itemIndex].quantity = quantity;
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent("cartUpdated", { detail: cart }));
      }
    }
  } catch (error) {
    console.error("Error updating cart item quantity:", error);
  }
}

/**
 * Clear all items from the cart
 */
export function clearCart(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(CART_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("cartUpdated", { detail: [] }));
  } catch (error) {
    console.error("Error clearing cart:", error);
  }
}

/**
 * Get the total number of items in the cart
 */
export function getCartItemCount(): number {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
}

/**
 * Get the total price of all items in the cart
 */
export function getCartTotal(): number {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

/**
 * Validate all cart items against current product inventory
 * Returns array of validation results for items that have issues
 */
export function validateCartInventory(
  products: Product[]
): InventoryValidationResult[] {
  const cart = getCart();
  const issues: InventoryValidationResult[] = [];

  cart.forEach((item) => {
    const product = products.find((p) => p.id === item.productId);

    if (!product) {
      issues.push({
        isValid: false,
        productId: item.productId,
        option: item.option,
        requestedQuantity: item.quantity,
        availableQuantity: 0,
        message: "Product not found",
      });
      return;
    }

    const validation = validateCartItemInventory(
      product,
      item.quantity,
      item.option
    );

    if (!validation.isValid) {
      issues.push({
        isValid: false,
        productId: item.productId,
        option: item.option,
        requestedQuantity: item.quantity,
        availableQuantity: validation.availableQuantity,
        message: validation.message,
      });
    }
  });

  return issues;
}

/**
 * Validate a single cart item against product inventory
 * Returns validation result
 */
export function validateCartItem(
  product: Product,
  productId: number,
  quantity: number,
  option?: string
): InventoryValidationResult {
  const validation = validateCartItemInventory(product, quantity, option);

  return {
    isValid: validation.isValid,
    productId,
    option,
    requestedQuantity: quantity,
    availableQuantity: validation.availableQuantity,
    message: validation.message,
  };
}

/**
 * Fix cart by adjusting quantities to match available inventory
 * Returns array of items that were adjusted
 */
export function fixCartInventory(
  products: Product[]
): InventoryValidationResult[] {
  const cart = getCart();
  const adjustedItems: InventoryValidationResult[] = [];
  let cartModified = false;

  const updatedCart = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        // Remove items for products that no longer exist
        adjustedItems.push({
          isValid: false,
          productId: item.productId,
          option: item.option,
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          message: "Product removed (not found)",
        });
        cartModified = true;
        return null;
      }

      const validation = validateCartItemInventory(
        product,
        item.quantity,
        item.option
      );

      if (!validation.isValid) {
        if (validation.availableQuantity === 0) {
          // Remove out of stock items
          adjustedItems.push({
            isValid: false,
            productId: item.productId,
            option: item.option,
            requestedQuantity: item.quantity,
            availableQuantity: 0,
            message: "Item removed (out of stock)",
          });
          cartModified = true;
          return null;
        } else {
          // Adjust quantity to available amount
          adjustedItems.push({
            isValid: false,
            productId: item.productId,
            option: item.option,
            requestedQuantity: item.quantity,
            availableQuantity: validation.availableQuantity,
            message: `Quantity adjusted to ${validation.availableQuantity}`,
          });
          cartModified = true;
          return {
            ...item,
            quantity: validation.availableQuantity,
          };
        }
      }

      return item;
    })
    .filter((item): item is CartItem => item !== null);

  if (cartModified) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
    window.dispatchEvent(
      new CustomEvent("cartUpdated", { detail: updatedCart })
    );
  }

  return adjustedItems;
}

/**
 * Update delivery method for all items in cart
 */
export function updateCartDeliveryMethod(deliveryMethod: DeliveryMethod): void {
  if (typeof window === "undefined") return;

  try {
    const cart = getCart();
    const updatedCart = cart.map((item) => ({
      ...item,
      deliveryMethod,
    }));

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
    window.dispatchEvent(
      new CustomEvent("cartUpdated", { detail: updatedCart })
    );
  } catch (error) {
    console.error("Error updating cart delivery method:", error);
  }
}
