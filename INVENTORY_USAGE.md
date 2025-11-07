# Inventory Check System Documentation

This document explains how to use the inventory check system for products with options, including delivery method-based inventory deduction.

## Database Schema

The `umeki_products` table includes:
- `inventory`: General inventory count (used for products without options)
- `inventory_by_option`: JSONB field containing option-specific inventory with delivery methods

### inventory_by_option Structure

```json
{
  "Love it": {
    "onsite": 100,
    "delivery": 200
  },
  "Miss Me": {
    "onsite": 100,
    "delivery": 200
  }
}
```

## Type Definitions

### Product Type
```typescript
type InventoryByOption = {
  [option: string]: {
    onsite?: number;
    delivery?: number;
  };
};

type Product = {
  id: number;
  name: string;
  price: number;
  image_urls: string[];
  options?: string[];
  inventory: number;
  inventory_by_option?: InventoryByOption;
};
```

## Inventory Utility Functions

Located in `lib/inventory.ts`:

### getAvailableInventory
Get available inventory for a specific product option and delivery method.

```typescript
import { getAvailableInventory } from "@/lib/inventory";

// For simple products (no options)
const available = getAvailableInventory(product);

// For products with options
const available = getAvailableInventory(product, "Love it");

// For specific delivery method
const available = getAvailableInventory(product, "Love it", "onsite");
```

### isInventoryAvailable
Check if a quantity is available.

```typescript
import { isInventoryAvailable } from "@/lib/inventory";

const canAdd = isInventoryAvailable(product, 5, "Love it", "delivery");
```

### getMaxQuantity
Get maximum quantity that can be added to cart.

```typescript
import { getMaxQuantity } from "@/lib/inventory";

const max = getMaxQuantity(product, "Love it");
```

### isOutOfStock
Check if an option is out of stock.

```typescript
import { isOutOfStock } from "@/lib/inventory";

const outOfStock = isOutOfStock(product, "Love it");
```

### validateCartItemInventory
Validate a cart item against current inventory.

```typescript
import { validateCartItemInventory } from "@/lib/inventory";

const validation = validateCartItemInventory(product, quantity, option);
if (!validation.isValid) {
  console.log(validation.message); // "Only 5 item(s) available"
  console.log(validation.availableQuantity); // 5
}
```

### getInventoryBreakdown
Get detailed inventory breakdown.

```typescript
import { getInventoryBreakdown } from "@/lib/inventory";

const breakdown = getInventoryBreakdown(product, "Love it");
console.log(breakdown);
// { total: 300, onsite: 100, delivery: 200 }
```

## Cart Functions with Inventory Validation

Located in `lib/cart.ts`:

### validateCartInventory
Validate all items in cart against current inventory.

```typescript
import { validateCartInventory } from "@/lib/cart";

const products = await fetchProducts();
const issues = validateCartInventory(products);

if (issues.length > 0) {
  issues.forEach(issue => {
    console.log(`${issue.message} for product ${issue.productId}`);
  });
}
```

### validateCartItem
Validate a single cart item.

```typescript
import { validateCartItem } from "@/lib/cart";

const result = validateCartItem(product, productId, quantity, option);
if (!result.isValid) {
  alert(result.message);
}
```

### fixCartInventory
Automatically fix cart by adjusting quantities or removing out-of-stock items.

```typescript
import { fixCartInventory } from "@/lib/cart";

const products = await fetchProducts();
const adjustedItems = fixCartInventory(products);

if (adjustedItems.length > 0) {
  alert(`Cart updated: ${adjustedItems.length} items adjusted`);
}
```

## UI Implementation Example

### CartModal with Inventory Checks

The `CartModal` component demonstrates how to:

1. **Display available inventory**:
```tsx
const maxQty = getMaxQuantity(product, option);
<span>({maxQty})</span>
```

2. **Show out-of-stock status**:
```tsx
const outOfStock = isOutOfStock(product, option);
{outOfStock && <span>OUT OF STOCK</span>}
```

3. **Disable buttons at limits**:
```tsx
<button
  disabled={quantity >= maxQty}
  onClick={() => handleOptionChange(product.id, option, quantity + 1)}
>
  +
</button>
```

4. **Validate before adding to cart**:
```tsx
const validation = validateCartItemInventory(product, quantity, option);
if (!validation.isValid) {
  alert(validation.message);
  return;
}
```

## Example Usage Scenarios

### Scenario 1: Simple Product (No Options)

```typescript
// Product data
const product = {
  id: 1,
  name: "Simple Mug",
  price: 15000,
  inventory: 50,
  image_urls: ["mug.jpg"],
};

// Check inventory
const available = getAvailableInventory(product); // 50
const canAdd = isInventoryAvailable(product, 10); // true
```

### Scenario 2: Product with Options

```typescript
// Product data
const product = {
  id: 2,
  name: "Custom Shirt",
  price: 25000,
  inventory: 0, // Not used when inventory_by_option is present
  options: ["Small", "Medium", "Large"],
  inventory_by_option: {
    "Small": { onsite: 10, delivery: 20 },
    "Medium": { onsite: 15, delivery: 25 },
    "Large": { onsite: 5, delivery: 10 }
  },
  image_urls: ["shirt.jpg"],
};

// Check specific option inventory
const mediumAvailable = getAvailableInventory(product, "Medium"); // 40 (15+25)
const mediumOnsite = getAvailableInventory(product, "Medium", "onsite"); // 15
const largeOutOfStock = isOutOfStock(product, "Large"); // false (has 15 total)

// Validate before adding to cart
const validation = validateCartItemInventory(product, 50, "Medium");
// validation.isValid = false
// validation.availableQuantity = 40
// validation.message = "Only 40 item(s) available"
```

### Scenario 3: Checkout Validation

```typescript
// Before proceeding to checkout
const products = await fetchProducts();
const issues = validateCartInventory(products);

if (issues.length > 0) {
  // Some items have inventory issues
  const adjustedItems = fixCartInventory(products);

  // Notify user
  alert(`Cart updated: ${adjustedItems.length} items were adjusted due to inventory changes`);
}
```

## Best Practices

1. **Always validate before checkout**: Use `validateCartInventory()` on the payment page
2. **Show available quantity**: Display available inventory to users
3. **Disable controls at limits**: Disable increment buttons when max quantity is reached
4. **Handle out-of-stock gracefully**: Show clear messaging for out-of-stock items
5. **Auto-fix on page load**: Consider running `fixCartInventory()` when loading cart/payment pages
6. **Real-time updates**: Fetch fresh product data before critical operations

## Database Constraint

The database includes a constraint to validate the `inventory_by_option` structure:

```sql
constraint check_inventory_by_option_structure check (
  is_valid_inventory_by_option (inventory_by_option)
)
```

This ensures the JSONB field maintains the correct structure with option names mapping to objects containing optional `onsite` and `delivery` numbers.

## Delivery Method Integration

### Delivery Method Mapping

The system supports three delivery methods that map to inventory deductions:

| Cart Delivery Method | Inventory Field | Deduction Logic |
|---------------------|-----------------|-----------------|
| 팬미팅현장수령 (Onsite Pickup) | `onsite` | Deducts from `onsite` count only |
| 국내배송 (Domestic Delivery) | `delivery` | Deducts from `delivery` count only |
| 해외배송 (International Delivery) | `delivery` | Deducts from `delivery` count only |

### How It Works

1. **User selects delivery method** on the payment page
2. **Cart items are tagged** with the selected delivery method
3. **Inventory validation** checks availability based on the delivery method
4. **After successful payment**, inventory is deducted from the appropriate field

### Implementation Example

```typescript
import { updateCartDeliveryMethod } from "@/lib/cart";
import { calculateInventoryDeduction } from "@/lib/inventory";

// When user changes delivery method
const handleDeliveryMethodChange = (method: DeliveryMethod) => {
  setDeliveryMethod(method);
  // Update all cart items with new delivery method
  updateCartDeliveryMethod(method);
};

// Calculate what will be deducted
const deduction = calculateInventoryDeduction(
  product,
  quantity,
  "Love it", // option
  "팬미팅현장수령" // delivery method
);

console.log(deduction);
// {
//   option: "Love it",
//   onsiteDeduction: 2,
//   deliveryDeduction: 0
// }
```

## Server-Side Inventory Deduction

After successful payment, use the server-side functions to deduct inventory:

### Verify Inventory Before Payment

```typescript
import { verifyInventoryAvailability } from "@/lib/inventory-deduction";
import { supabase } from "@/lib/supabase";

// Before processing payment
const verification = await verifyInventoryAvailability(supabase, cartItems);

if (!verification.available) {
  console.log("Out of stock items:", verification.unavailableItems);
  // Handle out of stock scenario
  return;
}
```

### Deduct Inventory After Payment

```typescript
import { deductInventoryForOrder } from "@/lib/inventory-deduction";
import { supabase } from "@/lib/supabase";

// After successful payment
const result = await deductInventoryForOrder(supabase, cartItems, products);

if (!result.success) {
  console.error("Failed to deduct inventory:", result.error);
  console.log("Failed items:", result.failedItems);
  // Handle inventory deduction failure
}
```

### Complete Payment Flow Example

```typescript
// In your API route or server action
export async function processPayment(cartItems: CartItem[]) {
  // 1. Fetch current product data
  const { data: products } = await supabase
    .from('umeki_products')
    .select('*')
    .in('id', cartItems.map(item => item.productId));

  // 2. Verify inventory availability
  const verification = await verifyInventoryAvailability(supabase, cartItems);

  if (!verification.available) {
    return {
      success: false,
      error: "Some items are out of stock",
      unavailableItems: verification.unavailableItems
    };
  }

  // 3. Process payment with payment gateway
  const paymentResult = await processPaymentGateway(...);

  if (!paymentResult.success) {
    return { success: false, error: "Payment failed" };
  }

  // 4. Deduct inventory after successful payment
  const deductionResult = await deductInventoryForOrder(
    supabase,
    cartItems,
    products
  );

  if (!deductionResult.success) {
    // Log error but payment already succeeded
    console.error("Failed to deduct inventory:", deductionResult);
    // You may want to implement compensation logic here
  }

  // 5. Create order record
  // ... create order in database

  return { success: true };
}
```

## Inventory Deduction Examples

### Example 1: Onsite Pickup (팬미팅현장수령)

```typescript
// Product inventory before:
{
  "Love it": {
    "onsite": 100,
    "delivery": 200
  }
}

// Customer orders 3 items with "팬미팅현장수령"
const cartItem = {
  productId: 1,
  quantity: 3,
  option: "Love it",
  deliveryMethod: "팬미팅현장수령"
};

// After deduction:
{
  "Love it": {
    "onsite": 97,    // Deducted 3 from onsite
    "delivery": 200  // No change
  }
}
```

### Example 2: Domestic Delivery (국내배송)

```typescript
// Product inventory before:
{
  "Miss Me": {
    "onsite": 50,
    "delivery": 150
  }
}

// Customer orders 5 items with "국내배송"
const cartItem = {
  productId: 2,
  quantity: 5,
  option: "Miss Me",
  deliveryMethod: "국내배송"
};

// After deduction:
{
  "Miss Me": {
    "onsite": 50,    // No change
    "delivery": 145  // Deducted 5 from delivery
  }
}
```

### Example 3: International Delivery (해외배송)

```typescript
// Same as domestic delivery - deducts from "delivery" field
const cartItem = {
  productId: 3,
  quantity: 2,
  option: "Special Edition",
  deliveryMethod: "해외배송"
};

// Deducts 2 from the "delivery" inventory count
```

## API Integration Points

### When Adding to Cart (CartModal)

The CartModal doesn't need delivery method at this stage - items are added without a delivery method, which is set later on the payment page.

### On Payment Page Load

```typescript
useEffect(() => {
  const currentCart = getCart();

  // Initialize delivery method for cart items if not set
  if (currentCart.length > 0 && !currentCart[0].deliveryMethod) {
    updateCartDeliveryMethod(deliveryMethod); // Default: "팬미팅현장수령"
  }
}, []);
```

### When User Changes Delivery Method

```typescript
const handleDeliveryMethodChange = (method: DeliveryMethod) => {
  setDeliveryMethod(method);
  updateCartDeliveryMethod(method); // Updates all cart items
};
```

### During Checkout

```typescript
// Before payment
const cart = getCart();
// All items now have deliveryMethod set

// Pass to payment API
await processPayment({
  cartItems: cart, // Items include deliveryMethod
  // ... other payment data
});
```

## Important Notes

1. **Delivery method must be set** before processing payment - the payment page automatically handles this
2. **Inventory validation** should check the correct inventory field based on delivery method
3. **Always verify inventory** before processing payment on the server side
4. **Deduction is atomic** per product - if one fails, handle appropriately
5. **Cart items are updated** when delivery method changes on the payment page
6. **No delivery method in CartModal** - it's set on the payment page where user selects shipping

## Testing Checklist

- [ ] Add items to cart from CartModal
- [ ] Navigate to payment page
- [ ] Verify default delivery method is set (팬미팅현장수령)
- [ ] Change delivery method and verify cart items are updated
- [ ] Complete payment and verify correct inventory field is deducted
- [ ] Test out of stock scenarios for both onsite and delivery
- [ ] Verify inventory validation prevents over-purchasing
- [ ] Test with products that have no options (simple products)
