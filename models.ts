export type Product = {
  id: number;
  name: string;
  price: number;
  image_url: string;
  options?: string[];
  inventory: number;
};