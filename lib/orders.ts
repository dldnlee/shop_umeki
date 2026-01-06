import { supabase } from "./supabase";
import { CartItem } from "./cart";
import { generateUUID } from "./utils";
import type { PostgrestError } from "@supabase/supabase-js";

export type Order = {
  id?: string; // UUID
  easy_pay_id?: string | null;
  name: string;
  email: string;
  phone_num?: string | null;
  address?: string | null; // Legacy field, kept for backward compatibility
  country_code?: string | null;
  postal_code?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  order_status?: string;
  delivery_method: string;
  payment_method?: string;
  total_amount: number;
  created_at?: string;
  updated_at?: string;
  toss_payment_id?: string;
  state?: string | null;
  city?: string | null;
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

type SalesAnalyticsOrderItem = {
  product_id: number;
  quantity: number;
  option: string | null;
  total_price: number;
  order_id: string;
  umeki_products: { name?: string } | { name?: string }[] | null;
};

type SalesAnalyticsOrderRecord = {
  id: string;
  total_amount: number;
  order_status: string;
  created_at: string;
  delivery_method: string;
} & Record<string, unknown>;

/**
 * Create a new order and associated order items
 * @param orderData - Order information
 * @param cartItems - Items in the cart
 * @returns The created order with items, or null if failed
 */
export async function createOrder(
  orderData: Omit<Order, "created_at" | "updated_at" | "order_status">,
  cartItems: CartItem[]
) {
  try {
    // Insert the order
    const { data: order, error: orderError } = await supabase
      .from("umeki_orders")
      .insert([
        {
          id: orderData.id || generateUUID(),
          easy_pay_id: orderData.easy_pay_id || null,
          name: orderData.name,
          email: orderData.email,
          phone_num: orderData.phone_num,
          address: orderData.address,
          country_code: orderData.country_code || null,
          postal_code: orderData.postal_code || null,
          address_line_1: orderData.address_line_1 || null,
          address_line_2: orderData.address_line_2 || null,
          delivery_method: orderData.delivery_method,
          payment_method: orderData.payment_method || null,
          total_amount: orderData.total_amount,
          order_status: "paid",
          toss_payment_id: orderData.toss_payment_id,
          state: orderData.state || null,
          city: orderData.city || null
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
export async function getOrderById(orderId: string, type: string = "original") {
  try {
    const { data: order, error: orderError } = await supabase
      .from(`${type === 'original' ? "umeki_orders" : "umeki_orders_hypetown"}`)
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError) {
      return { success: false, error: orderError };
    }

    const { data: items, error: itemsError } = await supabase
      .from(`${type === 'original' ? "umeki_order_items" : "umeki_order_items_hypetown"}`)
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
 * Update order customs code
 * @param orderId - Order ID
 * @param customsCode - Customs clearance code
 * @returns Updated order
 */
export async function updateOrderCustomsCode(orderId: string, customsCode: string) {
  try {
    const { data, error } = await supabase
      .from("umeki_orders")
      .update({ customs_code: customsCode, updated_at: new Date().toISOString() })
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
 * @param startDate - Optional start date for filtering (ISO string)
 * @param endDate - Optional end date for filtering (ISO string)
 * @returns Sales analytics including product sales and total amounts by status
 */
export async function getSalesAnalytics(startDate?: string, endDate?: string) {
  try {
    const tableSources = [
      { orders: "umeki_orders", items: "umeki_order_items" },
      { orders: "umeki_orders_hypetown", items: "umeki_order_items_hypetown" },
    ];

    const allPaidOrders: Array<{
      id: string;
      total_amount: number;
      order_status: string;
      created_at: string;
      delivery_method: string;
    }> = [];
    const allOrderItems: SalesAnalyticsOrderItem[] = [];

    const isTableMissingError = (error: PostgrestError | null | undefined) =>
      error?.code === "42P01" ||
      (typeof error?.message === "string" &&
        error.message.toLowerCase().includes("relation") &&
        error.message.toLowerCase().includes("does not exist"));

    for (const source of tableSources) {
      let query = supabase
        .from(source.orders)
        .select(`
          id,
          total_amount,
          order_status,
          created_at,
          delivery_method,
          ${source.items} (
            product_id,
            quantity,
            option,
            total_price,
            order_id,
            umeki_products (
              name
            )
          )
        `)
        .neq("order_status", "waiting");

      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      const { data: paidOrders, error: paidOrdersError } = await query;

      if (paidOrdersError) {
        if (isTableMissingError(paidOrdersError)) {
          console.warn(`Skipping ${source.orders} - table missing:`, paidOrdersError.message);
          continue;
        }

        return { success: false, error: paidOrdersError };
      }

      const relationKey = source.items;
      const paidOrdersList = paidOrders as unknown as
        | SalesAnalyticsOrderRecord[]
        | null
        | undefined;
      const extractedItems =
        paidOrdersList?.flatMap(order => {
          const relationItems = order[relationKey];
          if (!Array.isArray(relationItems)) {
            return [];
          }
          return relationItems as SalesAnalyticsOrderItem[];
        }) || [];
      allOrderItems.push(...extractedItems);

      const validOrders =
        (paidOrdersList ?? []).filter(
          (
            order
          ): order is SalesAnalyticsOrderRecord =>
            typeof order?.id === "string" &&
            typeof order?.total_amount === "number" &&
            typeof order?.order_status === "string" &&
            typeof order?.created_at === "string" &&
            typeof order?.delivery_method === "string"
        );
      allPaidOrders.push(
        ...validOrders.map(order => ({
          id: order.id,
          total_amount: order.total_amount,
          order_status: order.order_status,
          created_at: order.created_at,
          delivery_method: order.delivery_method,
        }))
      );
    }

    const totalPaidAmount =
      allPaidOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    const paidDeliveryBreakdown = new Map<string, { count: number; amount: number }>();
    allPaidOrders.forEach(order => {
      const method = order.delivery_method || "unknown";
      if (!paidDeliveryBreakdown.has(method)) {
        paidDeliveryBreakdown.set(method, { count: 0, amount: 0 });
      }
      const data = paidDeliveryBreakdown.get(method)!;
      data.count += 1;
      data.amount += order.total_amount || 0;
    });

    const orderLookup = new Map(allPaidOrders.map(order => [order.id, order]));

    const productSalesMap = new Map<
      string,
      {
        productId: number;
        productName: string;
        totalQuantity: number;
        totalRevenue: number;
        deliveryMethods: Map<string, { quantity: number; revenue: number }>;
        options: Map<
          string,
          {
            quantity: number;
            revenue: number;
            deliveryMethods: Map<string, { quantity: number; revenue: number }>;
          }
        >;
      }
    >();

    allOrderItems.forEach(item => {
      const productId = item.product_id;
      const rawProductInfo = item.umeki_products;
      const productInfo = Array.isArray(rawProductInfo)
        ? rawProductInfo[0]
        : rawProductInfo;
      const productName = productInfo?.name || `Product #${productId}`;
      const option = item.option || "No Option";
      const quantity = item.quantity || 0;
      const revenue = item.total_price || 0;

      const order = orderLookup.get(item.order_id);
      const deliveryMethod = order?.delivery_method || "unknown";

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

      if (!productData.deliveryMethods.has(deliveryMethod)) {
        productData.deliveryMethods.set(deliveryMethod, { quantity: 0, revenue: 0 });
      }
      const productDeliveryData = productData.deliveryMethods.get(deliveryMethod)!;
      productDeliveryData.quantity += quantity;
      productDeliveryData.revenue += revenue;

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

      if (!optionData.deliveryMethods.has(deliveryMethod)) {
        optionData.deliveryMethods.set(deliveryMethod, { quantity: 0, revenue: 0 });
      }
      const optionDeliveryData = optionData.deliveryMethods.get(deliveryMethod)!;
      optionDeliveryData.quantity += quantity;
      optionDeliveryData.revenue += revenue;
    });

    const productSales = Array.from(productSalesMap.values())
      .map(product => ({
        productId: product.productId,
        productName: product.productName,
        totalQuantity: product.totalQuantity,
        totalRevenue: product.totalRevenue,
        deliveryMethods: Array.from(product.deliveryMethods.entries()).map(
          ([method, data]) => ({
            method,
            quantity: data.quantity,
            revenue: data.revenue,
          })
        ),
        options: Array.from(product.options.entries()).map(([option, data]) => ({
          option,
          quantity: data.quantity,
          revenue: data.revenue,
          deliveryMethods: Array.from(data.deliveryMethods.entries()).map(
            ([method, dmData]) => ({
              method,
              quantity: dmData.quantity,
              revenue: dmData.revenue,
            })
          ),
        })),
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    const paidDeliveryMethods = Array.from(paidDeliveryBreakdown.entries()).map(
      ([method, data]) => ({
        method,
        count: data.count,
        amount: data.amount,
      })
    );

    return {
      success: true,
      data: {
        totalPaidAmount,
        productSales,
        totalPaidOrders: allPaidOrders.length,
        paidDeliveryMethods,
      },
    };
  } catch (error) {
    console.error("Error fetching sales analytics:", error);
    return { success: false, error };
  }
}
