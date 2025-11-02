export type Product = {
  id: number;
  name: string;
  price: number;
  image_urls: string[]; // Array of image URLs
  options?: string[];
  inventory: number;
};