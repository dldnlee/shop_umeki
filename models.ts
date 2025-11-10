export type InventoryByOption = {
  [option: string]: {
    onsite?: number;
    delivery?: number;
  };
};

export type Product = {
  id: number;
  name: string;
  price: number;
  image_urls: string[]; // Array of image URLs
  options?: string[];
  inventory: number;
  inventory_by_option?: InventoryByOption;
  display_order: number;
};