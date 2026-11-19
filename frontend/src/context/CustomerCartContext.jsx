import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const CustomerCartContext = createContext(null);

export const CustomerCartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('mashalitic_customer_cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [activeVehicle, setActiveVehicle] = useState(() => {
    const saved = localStorage.getItem('mashalitic_selected_vehicle');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null; // e.g. { make: 'Toyota', model: 'Premio', year: '2012' }
  });

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('mashalitic_customer_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (activeVehicle) {
      localStorage.setItem('mashalitic_selected_vehicle', JSON.stringify(activeVehicle));
    } else {
      localStorage.removeItem('mashalitic_selected_vehicle');
    }
  }, [activeVehicle]);

  const addToCart = (product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        const nextQty = existing.quantity + quantity;
        if (product.quantity && nextQty > product.quantity) {
          toast.error(`Only ${product.quantity} units currently available in stock.`);
          return prev;
        }
        toast.success(`Updated ${product.name} quantity to ${nextQty} in your cart`);
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, quantity: nextQty } : item
        );
      } else {
        if (product.quantity && quantity > product.quantity) {
          toast.error(`Only ${product.quantity} units available in stock.`);
          return prev;
        }
        toast.success(`Added ${product.name} to cart`);
        return [
          ...prev,
          {
            product_id: product.id,
            name: product.name,
            sku: product.sku,
            selling_price: product.selling_price,
            quantity,
            available_qty: product.quantity,
            image_url: product.image_url,
            category_name: product.category_name,
            brand_name: product.brand_name
          }
        ];
      }
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (item.available_qty && nextQty > item.available_qty) {
              toast.error(`Only ${item.available_qty} units available.`);
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
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
    toast.success('Item removed from cart');
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.selling_price * item.quantity, 0);
  const vatRate = 16.0;
  const vatAmount = Math.round((subtotal * vatRate) / (100 + vatRate));

  return (
    <CustomerCartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItemsCount,
        subtotal,
        vatAmount,
        activeVehicle,
        setActiveVehicle,
        isCartDrawerOpen,
        setIsCartDrawerOpen
      }}
    >
      {children}
    </CustomerCartContext.Provider>
  );
};

export const useCustomerCart = () => useContext(CustomerCartContext);
