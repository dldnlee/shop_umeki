type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
  options?: string[];
  inventory: number;
};


// Mock product data
export const mockProducts: Product[] = [
  {
    id: 1,
    name: "티셔츠",
    price: 35000,
    description: "A beautiful tote bag featuring delicate sakura blossom prints. Perfect for daily use with durable canvas material and spacious interior.",
    image: "/placeholder-product.jpg",
    options: ["S", "M", "L"],
    inventory: 100
  },
  {
    id: 2,
    name: "후드티",
    price: 65000,
    description: "Handcrafted ceramic mug with a minimalist design. Holds 12oz of your favorite beverage.",
    image: "/placeholder-product.jpg",
    options: ["M", "L"],
    inventory: 100
  },
  {
    id: 3,
    name: "아크릴 키링",
    price: 12000,
    description: "Handcrafted ceramic mug with a minimalist design. Holds 12oz of your favorite beverage.",
    image: "/placeholder-product.jpg",
    options: ["Love it", "Miss Me"],
    inventory: 100
  },
  {
    id: 4,
    name: "아크릴 스탠드",
    price: 20000,
    description: "Handcrafted ceramic mug with a minimalist design. Holds 12oz of your favorite beverage.",
    image: "/placeholder-product.jpg",
    options: [],
    inventory: 100
  },
  {
    id: 5,
    name: "포토카드",
    price: 20000,
    description: "Handcrafted ceramic mug with a minimalist design. Holds 12oz of your favorite beverage.",
    image: "/placeholder-product.jpg",
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