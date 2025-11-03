import { supabase } from "./supabase";
import { CartItem } from "./cart";

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
      .select("*")
      .eq("order_id", orderId);

    if (itemsError) {
      return { success: false, error: itemsError };
    }

    return {
      success: true,
      data: {
        order,
        items,
      },
    };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Get all orders filtered by status
 * @param status - Order status to filter by (optional)
 * @param searchQuery - Search by order ID, name, email, or phone number (optional)
 * @param sortOrder - Sort order by created_at: 'asc' or 'desc' (optional, default: 'desc')
 * @returns List of orders with their items
 */
export async function getAllOrders(
  status?: string,
  searchQuery?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  try {
    let query = supabase
      .from("umeki_orders")
      .select("*");

    if (status) {
      query = query.eq("order_status", status);
    }

    // Apply search filters using OR conditions
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = searchQuery.trim();
      query = query.or(
        `id.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone_num.ilike.%${searchTerm}%`
      );
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
