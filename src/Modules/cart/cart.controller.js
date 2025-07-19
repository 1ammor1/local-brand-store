import { CartModel } from "../../DB/models/cart.model.js";
import { ProductModel } from "../../DB/models/product.model.js";

// 🟢 Helper function to calculate subTotal
function formatCartWithSubTotal(cartDoc) {
  if (!cartDoc || !cartDoc.items) return cartDoc;

  let subTotal = 0;

  const itemsWithTotals = cartDoc.items.map(item => {
    const product = item.product;
    const price = product.price || 0;
    const quantity = item.quantity || 0;

    const itemTotal = price * quantity;
    subTotal += itemTotal;

    return {
      ...item.toObject(),
      itemTotalPrice: itemTotal
    };
  });

  return {
    _id: cartDoc._id,
    user: cartDoc.user,
    items: itemsWithTotals,
    subTotal: parseFloat(subTotal.toFixed(2)),
    createdAt: cartDoc.createdAt,
    updatedAt: cartDoc.updatedAt
  };
}

// 🟡 addToCart
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, color, size } = req.body;
    const userId = req.user.id;

    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (!product.colors.includes(color)) {
      return res.status(400).json({ message: `Color "${color}" is not available for this product` });
    }

    if (!product.size.includes(size)) {
      return res.status(400).json({ message: `Size "${size}" is not available for this product` });
    }

    if (quantity > product.quantity) {
      return res.status(400).json({
        message: `Only ${product.quantity} piece(s) available in stock`
      });
    }

    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      if (quantity > 8) {
        return res.status(400).json({ message: "You can't add more than 8 pieces of this product to the cart" });
      }

      cart = await CartModel.create({
        user: userId,
        items: [{ product: productId, quantity, color, size }],
      });
    } else {
      const existingItem = cart.items.find(
        item =>
          item.product.toString() === productId &&
          item.color === color &&
          item.size === size
      );

      const totalQty = (existingItem?.quantity || 0) + quantity;

      if (totalQty > 8) {
        return res.status(400).json({
          message: "You can't add more than 8 pieces of this product to the cart"
        });
      }

      if (totalQty > product.quantity) {
        const remainingStock = product.quantity - (existingItem?.quantity || 0);
        return res.status(400).json({
          message: remainingStock > 0
            ? `Only ${remainingStock} more piece(s) available for this product`
            : `This product is out of stock or you already added the maximum available quantity`
        });
      }

      if (existingItem) {
        existingItem.quantity = totalQty;
      } else {
        cart.items.push({ product: productId, quantity, color, size });
      }

      await cart.save();
    }

    await cart.populate({
      path: "items.product",
      select: "title price originalPrice discount quantity images"
    });

    return res.status(200).json({
      message: "Added to cart",
      cart: formatCartWithSubTotal(cart)
    });
  } catch (err) {
    next(err);
  }
};


// 🟡 getCart
export const getCart = async (req, res, next) => {
  try {
    const cart = await CartModel.findOne({ user: req.user.id }).populate({
      path: "items.product",
      select: "title price originalPrice discount images imageUrl quantity"
    });

    if (!cart) {
      return res.status(200).json({ cart: [], message: "Cart is empty" });
    }

    res.status(200).json({
      cart: formatCartWithSubTotal(cart)
    });

  } catch (err) {
    next(err);
  }
};

// 🟡 removeFromCart
export const removeFromCart = async (req, res, next) => {
  try {
    const { productId, color, size } = req.params;

    if (!color || !size) {
      return res.status(400).json({ message: "Color and size are required in params" });
    }

    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const cart = await CartModel.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      item =>
        item.product.toString() !== productId ||
        item.color !== color ||
        item.size !== size
    );

    await cart.save();

    await cart.populate({
      path: "items.product",
      select: "title price originalPrice discount quantity images"
    });

    res.status(200).json({
      message: "Item removed",
      cart: formatCartWithSubTotal(cart)
    });
  } catch (err) {
    next(err);
  }
};

// 🟡 updateItemQuantity
export const updateItemQuantity = async (req, res, next) => {
  try {
    const { productId, color, size } = req.params;
    const { quantity } = req.body;

    if (!color || !size) {
      return res.status(400).json({ message: "Color and size are required in params" });
    }

    const cart = await CartModel.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      item =>
        item.product.toString() === productId &&
        item.color === color &&
        item.size === size
    );

    if (itemIndex === -1) return res.status(404).json({ message: "Item not found in cart" });

    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (quantity > product.quantity) {
      return res.status(400).json({ message: `Only ${product.quantity} available in stock` });
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);

      if (cart.items.length === 0) {
        await CartModel.findByIdAndDelete(cart._id);
        return res.status(200).json({ message: "Cart is now empty and has been removed" });
      }
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();

    await cart.populate({
      path: "items.product",
      select: "title price originalPrice discount quantity images"
    });

    res.status(200).json({
      message: quantity === 0 ? "Item removed from cart" : "Quantity updated",
      cart: formatCartWithSubTotal(cart)
    });
  } catch (err) {
    next(err);
  }
};

// 🟡 clearCart (مافيش subTotal هنا)
export const clearCart = async (req, res, next) => {
  try {
    const deletedCart = await CartModel.findOneAndDelete({ user: req.user.id });

    if (!deletedCart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.status(200).json({ message: "Cart deleted successfully" });
  } catch (err) {
    next(err);
  }
};
