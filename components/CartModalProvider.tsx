"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import CartModal from './CartModal';

interface CartModalContextType {
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartModalContext = createContext<CartModalContextType | undefined>(undefined);

export function CartModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  return (
    <CartModalContext.Provider value={{ isOpen, openCart, closeCart }}>
      {children}
      <CartModal isOpen={isOpen} onClose={closeCart} />
    </CartModalContext.Provider>
  );
}

export function useCartModal() {
  const context = useContext(CartModalContext);
  if (context === undefined) {
    throw new Error('useCartModal must be used within a CartModalProvider');
  }
  return context;
}
