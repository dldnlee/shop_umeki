// Simple inventory mapping: option name -> quantity
export type Inventory = {
  [optionName: string]: number;
};

export type Product = {
  id: number;
  name: string;
  price: number;
  image_urls: string[]; // Array of image URLs
  options?: string[];
  inventory: number | Inventory; // Can be a simple number or a JSON object mapping options to quantities
  display_order: number;
  eng_name?: string;
  malltail_item_code?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};