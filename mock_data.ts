export type Product = {
  id: number;
  name: string;
  price: number;
  image_url: string;
  options?: string[];
  inventory: number;
};


// Mock product data
export const mockProducts: Product[] = [
  {
    id: 1,
    name: "티셔츠",
    price: 35000,
    image_url: "/placeholder-product.jpg",
    options: ["S", "M", "L"],
    inventory: 100
  },
  {
    id: 2,
    name: "후드티",
    price: 65000,
    image_url: "/placeholder-product.jpg",
    options: ["M", "L"],
    inventory: 100
  },
  {
    id: 3,
    name: "아크릴 키링",
    price: 12000,
    image_url: "/placeholder-product.jpg",
    options: ["Love it", "Miss Me"],
    inventory: 100
  },
  {
    id: 4,
    name: "아크릴 스탠드",
    price: 20000,
    image_url: "/placeholder-product.jpg",
    options: [],
    inventory: 100
  },
  {
    id: 5,
    name: "포토카드",
    price: 20000,
    image_url: "/placeholder-product.jpg",
    options: ["White", "Black", "Grey"],
    inventory: 100
  },
];

// 티셔츠 (S/M/L) 35,000
// 후드티 (M/L) 65,000
// 아크릴 키링(Love it/Miss me)
// 12,000
// 아크릴 스탠드 20,000
// 포토카드(6종) 5,000