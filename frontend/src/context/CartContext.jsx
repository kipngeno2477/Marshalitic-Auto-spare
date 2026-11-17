import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  // Initialize with the 3 items shown in the user's design reference
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('mashalitic_cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: 1,
        product_id: 1,
        name: 'Brake Pads',
        sku: 'BP-D2158-TY',
        selling_price: 6000,
        purchase_price: 3800,
        quantity: 1,
        available_qty: 45,
        image_url: 'https://images.unsplash.com/photo-1600790142055-619df03207e6?w=200'
      },
      {
        id: 2,
        product_id: 2,
        name: 'Oil Filter',
        sku: 'OF-90915-10003',
        selling_price: 1200,
        purchase_price: 750,
        quantity: 1,
        available_qty: 68,
        image_url: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=200'
      },
      {
        id: 3,
        product_id: 3,
        name: 'Engine Oil 5L',
        sku: 'VAL-SYN-5W30-5L',
        selling_price: 3500,
        purchase_price: 2400,
        quantity: 1,
        available_qty: 32,
        image_url: 'https://images.unsplash.com/photo-1635784063748-0d19ca7bdf40?w=200'
      }
    ];
  });

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [vatRate, setVatRate] = useState(16.00);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');

  useEffect(() => {
    localStorage.setItem('mashalitic_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, qty = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => (item.product_id || item.id) === product.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (product.quantity && newQty > product.quantity) {
          toast.error(`Cannot exceed available stock (${product.quantity} available)`);
          return prev;
        }
        toast.success(`Updated ${product.name} quantity to ${newQty}`);
        return prev.map((item) =>
          (item.product_id || item.id) === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        if (product.quantity && qty > product.quantity) {
          toast.error(`Out of stock or insufficient quantity (${product.quantity} available)`);
          return prev;
        }
        toast.success(`Added ${product.name} to order`);
        return [
          ...prev,
          {
            id: product.id,
            product_id: product.id,
            name: product.name,
            sku: product.sku,
            selling_price: product.selling_price,
            purchase_price: product.purchase_price,
            quantity: qty,
            available_qty: product.quantity,
            image_url: product.image_url
          }
        ];
      }
    });
  };

  const updateQty = (productId, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if ((item.product_id || item.id) === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (item.available_qty && nextQty > item.available_qty) {
              toast.error(`Only ${item.available_qty} units available in stock`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => (item.product_id || item.id) !== productId));
    toast.success('Item removed from order');
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscountAmount(0);
    setSelectedCustomer(null);
    toast.success('Order cleared');
  };

  // Calculations:
  // Subtotal = sum(price * qty)
  // VAT 16% = (Subtotal - Discount) * 0.16
  // Total = Subtotal + VAT
  const subtotal = cartItems.reduce((acc, item) => acc + item.selling_price * item.quantity, 0);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const vatAmount = Math.round(taxableAmount * (vatRate / 100));
  const totalAmount = taxableAmount + vatAmount;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        selectedCustomer,
        setSelectedCustomer,
        discountAmount,
        setDiscountAmount,
        vatRate,
        setVatRate,
        paymentMethod,
        setPaymentMethod,
        subtotal,
        vatAmount,
        totalAmount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
