export type CartItem = {
  productId: number;
  productName: string;
  price: number;
  option?: string;
  quantity: number;
  slug?: string;
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
