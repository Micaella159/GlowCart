import { useEffect, useMemo, useState } from 'react'
import { getProductId } from '../api/products.js'
import { CartContext } from './cart.js'

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem('glowcart-cart') || '[]')
    if (!Array.isArray(saved)) return []
    return saved.map(item => item.product
      ? item
      : { product: item, quantity: Math.max(1, Number(item.quantity) || 1) })
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart)

  useEffect(() => {
    localStorage.setItem('glowcart-cart', JSON.stringify(items))
  }, [items])

  const value = useMemo(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    add(product) {
      const id = getProductId(product)
      setItems(current => {
        const found = current.some(item => getProductId(item.product) === id)
        return found
          ? current.map(item => getProductId(item.product) === id
            ? { ...item, quantity: item.quantity + 1 }
            : item)
          : [...current, { product, quantity: 1 }]
      })
    },
    update(productId, quantity) {
      setItems(current => current
        .map(item => getProductId(item.product) === productId ? { ...item, quantity } : item)
        .filter(item => item.quantity > 0))
    },
    remove(productId) {
      setItems(current => current.filter(item => getProductId(item.product) !== productId))
    },
    clear() {
      setItems([])
    },
  }), [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
