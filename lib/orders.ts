import { supabase } from "./supabase";
import { CartItem } from "./cart";
import { deductInventoryForOrder, verifyInventoryAvailability } from "./inventory-deduction";
import { Product } from "@/models";

export type Order = {
  id?: string; // UUID
  easy_pay_id?: string | null;
  name: string;
  email: string;
  phone_num?: string | null;
  address?: string | null;
  order_status?: string;
  delivery_method: string;
  payment_method?: string;
  total_amount: number;
  created_at?: string;
  updated_at?: string;
};

export type OrderItem = {
  id?: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_option?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

/**
 * Create a new order and associated order items
 * @param orderData - Order information
 * @param cartItems - Items in the cart
 * @returns The created order with items, or null if failed
 */
export async function createOrder(
  orderData: Omit<Order, "id" | "created_at" | "updated_at" | "order_status">,
  cartItems: CartItem[]
) {
  try {
    // First, verify inventory availability
    const inventoryCheck = await verifyInventoryAvailability(supabase, cartItems);

    if (!inventoryCheck.available) {
      const unavailableItems = inventoryCheck.unavailableItems || [];
      const itemsList = unavailableItems
        .map(item => `Product ${item.productId}${item.option ? ` (${item.option})` : ''}: requested ${item.requested}, available ${item.available}`)
        .join('; ');

      return {
        success: false,
        error: {
          message: `Insufficient inventory: ${itemsList}`,
          unavailableItems
        }
      };
    }

    // Determine order status based on payment method
    // PayPal orders start as 'waiting' until payment is confirmed
    // Card orders are 'paid' immediately after Easy Pay confirmation
    const orderStatus = orderData.payment_method === "paypal" ? "waiting" : "paid";

    // Insert the order
    const { data: order, error: orderError } = await supabase
      .from("umeki_orders")
      .insert([
        {
          easy_pay_id: orderData.easy_pay_id || null,
          name: orderData.name,
          email: orderData.email,
          phone_num: orderData.phone_num,
          address: orderData.address,
          delivery_method: orderData.delivery_method,
          payment_method: orderData.payment_method || null,
          total_amount: orderData.total_amount,
          order_status: orderStatus,
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return { success: false, error: orderError };
    }

    if (!order) {
      return { success: false, error: new Error("Order creation failed") };
    }

    // Prepare order items
    const orderItems = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      option: item.option || null,
      total_price: item.price
    }));

    // Insert order items
    const { data: items, error: itemsError } = await supabase
      .from("umeki_order_items")
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // If order items fail, you might want to delete the order or handle this appropriately
      return { success: false, error: itemsError };
    }

    // Fetch product details for inventory deduction
    const productIds = [...new Set(cartItems.map(item => item.productId))];
    const { data: products, error: productsError } = await supabase
      .from("umeki_products")
      .select("*")
      .in("id", productIds);

    if (productsError || !products) {
      console.error("Error fetching products for inventory deduction:", productsError);
      // Order was created but inventory wasn't deducted - log this critical error
      console.error("CRITICAL: Order created but inventory not deducted for order:", order.id);
      return {
        success: true,
        data: {
          order,
          items,
        },
        warning: "Inventory was not deducted - manual intervention required"
      };
    }

    // Deduct inventory
    const deductionResult = await deductInventoryForOrder(
      supabase,
      cartItems,
      products as Product[]
    );

    if (!deductionResult.success) {
      console.error("Error deducting inventory:", deductionResult.error);
      console.error("Failed items:", deductionResult.failedItems);
      // Order was created but inventory wasn't fully deducted - log this critical error
      console.error("CRITICAL: Order created but inventory deduction failed for order:", order.id);
      return {
        success: true,
        data: {
          order,
          items,
        },
        warning: `Inventory deduction partially failed: ${deductionResult.error}`
      };
    }

    return {
      success: true,
      data: {
        order,
        items,
      },
    };
  } catch (error) {
    console.error("Unexpected error creating order:", error);
    return { success: false, error };
  }
}

/**
 * Get order by ID with its items
 */
export async function getOrderById(orderId: string) {
  try {
    const { data: order, error: orderError } = await supabase
      .from("umeki_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError) {
      return { success: false, error: orderError };
    }

    const { data: items, error: itemsError } = await supabase
      .from("umeki_order_items")
      .select(`
        *,
        umeki_products (
          name
        )
      `)
      .eq("order_id", orderId);

    if (itemsError) {
      return { success: false, error: itemsError };
    }

    // Map items to include product name from joined table
    const mappedItems = items?.map(item => ({
      ...item,
      product_name: item.umeki_products?.name || `상품 #${item.product_id}`,
    })) || [];

    return {
      success: true,
      data: {
        order,
        items: mappedItems,
      },
    };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Get all orders filtered by status
 * @param options - Filter options
 * @param options.status - Order status to filter by (optional)
 * @param options.orderId - Filter by order ID (optional)
 * @param options.name - Filter by customer name (optional)
 * @param options.email - Filter by customer email (optional)
 * @param options.phone - Filter by phone number (optional)
 * @param options.deliveryMethod - Filter by delivery method (optional)
 * @param options.sortOrder - Sort order by created_at: 'asc' or 'desc' (optional, default: 'desc')
 * @returns List of orders with their items
 */
export async function getAllOrders(options?: {
  status?: string;
  orderId?: string;
  name?: string;
  email?: string;
  phone?: string;
  deliveryMethod?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  try {
    const {
      status,
      orderId,
      name,
      email,
      phone,
      deliveryMethod,
      sortOrder = 'desc'
    } = options || {};

    let query = supabase
      .from("umeki_orders")
      .select("*");

    if (status) {
      query = query.eq("order_status", status);
    }

    if (deliveryMethod) {
      query = query.eq("delivery_method", deliveryMethod);
    }

    // Apply individual search filters using AND conditions
    if (orderId && orderId.trim()) {
      const orderIdTerm = orderId.trim();
      const looksLikeUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdTerm);

      if (looksLikeUUID) {
        // Exact match for UUID
        query = query.eq("id", orderIdTerm);
      } else {
        // Pattern matching for partial searches
        query = query.ilike("id", `%${orderIdTerm}%`);
      }
    }

    if (name && name.trim()) {
      query = query.ilike("name", `%${name.trim()}%`);
    }

    if (email && email.trim()) {
      query = query.ilike("email", `%${email.trim()}%`);
    }

    if (phone && phone.trim()) {
      query = query.ilike("phone_num", `%${phone.trim()}%`);
    }

    // Apply sorting
    query = query.order("created_at", { ascending: sortOrder === 'asc' });

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      return { success: false, error: ordersError };
    }

    // Get items for all orders with product information
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const { data: items } = await supabase
          .from("umeki_order_items")
          .select(`
            *,
            umeki_products (
              name
            )
          `)
          .eq("order_id", order.id);

        // Map items to include product name from joined table
        const mappedItems = items?.map(item => ({
          ...item,
          product_name: item.umeki_products?.name || `상품 #${item.product_id}`,
        })) || [];

        return {
          ...order,
          items: mappedItems,
        };
      })
    );

    return {
      success: true,
      data: ordersWithItems,
    };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Update order status
 * @param orderId - Order ID
 * @param status - New status
 * @returns Updated order
 */
export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const { data, error } = await supabase
      .from("umeki_orders")
      .update({ order_status: status, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Get sales analytics data
 * @returns Sales analytics including product sales and total amounts by status
 */
export async function getSalesAnalytics() {
  try {
    // Get all orders with 'paid' or 'complete' status and their items
    const { data: paidOrders, error: paidOrdersError } = await supabase
      .from("umeki_orders")
      .select(`
        id,
        total_amount,
        order_status,
        created_at,
        delivery_method
      `)
      .in("order_status", ["paid", "complete"]);

    if (paidOrdersError) {
      return { success: false, error: paidOrdersError };
    }

    // Get all orders with 'waiting' status for total calculation
    const { data: waitingOrders, error: waitingOrdersError } = await supabase
      .from("umeki_orders")
      .select("total_amount, delivery_method")
      .eq("order_status", "waiting");

    if (waitingOrdersError) {
      return { success: false, error: waitingOrdersError };
    }

    // Get all order items for paid orders with product information
    const { data: orderItems, error: itemsError } = await supabase
      .from("umeki_order_items")
      .select(`
        product_id,
        quantity,
        option,
        total_price,
        order_id,
        umeki_products (
          name
        )
      `)
      .in("order_id", paidOrders?.map(o => o.id) || []);

    if (itemsError) {
      return { success: false, error: itemsError };
    }

    // Calculate total amounts
    const totalPaidAmount = paidOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    const totalWaitingAmount = waitingOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    // Calculate delivery method breakdown for paid orders
    const paidDeliveryBreakdown = new Map<string, { count: number; amount: number }>();
    paidOrders?.forEach(order => {
      const method = order.delivery_method || 'unknown';
      if (!paidDeliveryBreakdown.has(method)) {
        paidDeliveryBreakdown.set(method, { count: 0, amount: 0 });
      }
      const data = paidDeliveryBreakdown.get(method)!;
      data.count += 1;
      data.amount += order.total_amount || 0;
    });

    // Calculate delivery method breakdown for waiting orders
    const waitingDeliveryBreakdown = new Map<string, { count: number; amount: number }>();
    waitingOrders?.forEach(order => {
      const method = order.delivery_method || 'unknown';
      if (!waitingDeliveryBreakdown.has(method)) {
        waitingDeliveryBreakdown.set(method, { count: 0, amount: 0 });
      }
      const data = waitingDeliveryBreakdown.get(method)!;
      data.count += 1;
      data.amount += order.total_amount || 0;
    });

    // Aggregate product sales data with delivery method tracking
    const productSalesMap = new Map<string, {
      productId: number;
      productName: string;
      totalQuantity: number;
      totalRevenue: number;
      deliveryMethods: Map<string, {
        quantity: number;
        revenue: number;
      }>;
      options: Map<string, {
        quantity: number;
        revenue: number;
        deliveryMethods: Map<string, {
          quantity: number;
          revenue: number;
        }>;
      }>;
    }>();

    orderItems?.forEach(item => {
      const productId = item.product_id;
      const productInfo = item.umeki_products as any;
      const productName = productInfo?.name || `Product #${productId}`;
      const option = item.option || 'No Option';
      const quantity = item.quantity;
      const revenue = item.total_price;

      // Find the order for this item to get delivery method
      const order = paidOrders?.find(o => o.id === item.order_id);
      const deliveryMethod = order?.delivery_method || 'unknown';

      const key = `${productId}`;

      if (!productSalesMap.has(key)) {
        productSalesMap.set(key, {
          productId,
          productName,
          totalQuantity: 0,
          totalRevenue: 0,
          deliveryMethods: new Map(),
          options: new Map(),
        });
      }

      const productData = productSalesMap.get(key)!;
      productData.totalQuantity += quantity;
      productData.totalRevenue += revenue;

      // Track delivery method for product
      if (!productData.deliveryMethods.has(deliveryMethod)) {
        productData.deliveryMethods.set(deliveryMethod, { quantity: 0, revenue: 0 });
      }
      const productDeliveryData = productData.deliveryMethods.get(deliveryMethod)!;
      productDeliveryData.quantity += quantity;
      productDeliveryData.revenue += revenue;

      // Track options
      if (!productData.options.has(option)) {
        productData.options.set(option, {
          quantity: 0,
          revenue: 0,
          deliveryMethods: new Map(),
        });
      }

      const optionData = productData.options.get(option)!;
      optionData.quantity += quantity;
      optionData.revenue += revenue;

      // Track delivery method for option
      if (!optionData.deliveryMethods.has(deliveryMethod)) {
        optionData.deliveryMethods.set(deliveryMethod, { quantity: 0, revenue: 0 });
      }
      const optionDeliveryData = optionData.deliveryMethods.get(deliveryMethod)!;
      optionDeliveryData.quantity += quantity;
      optionDeliveryData.revenue += revenue;
    });

    // Convert Map to array format
    const productSales = Array.from(productSalesMap.values()).map(product => ({
      productId: product.productId,
      productName: product.productName,
      totalQuantity: product.totalQuantity,
      totalRevenue: product.totalRevenue,
      deliveryMethods: Array.from(product.deliveryMethods.entries()).map(([method, data]) => ({
        method,
        quantity: data.quantity,
        revenue: data.revenue,
      })),
      options: Array.from(product.options.entries()).map(([option, data]) => ({
        option,
        quantity: data.quantity,
        revenue: data.revenue,
        deliveryMethods: Array.from(data.deliveryMethods.entries()).map(([method, dmData]) => ({
          method,
          quantity: dmData.quantity,
          revenue: dmData.revenue,
        })),
      })),
    }));

    // Sort by total quantity sold (descending)
    productSales.sort((a, b) => b.totalQuantity - a.totalQuantity);

    // Convert delivery method Maps to arrays
    const paidDeliveryMethods = Array.from(paidDeliveryBreakdown.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount,
    }));

    const waitingDeliveryMethods = Array.from(waitingDeliveryBreakdown.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount,
    }));

    return {
      success: true,
      data: {
        totalPaidAmount,
        totalWaitingAmount,
        productSales,
        totalPaidOrders: paidOrders?.length || 0,
        totalWaitingOrders: waitingOrders?.length || 0,
        paidDeliveryMethods,
        waitingDeliveryMethods,
      },
    };
  } catch (error) {
    console.error("Error fetching sales analytics:", error);
    return { success: false, error };
  }
}
