import { CartModel } from "../../DB/models/cart.model.js";
import { ProductModel } from "../../DB/models/product.model.js";

// ✅ Helper function to calculate subTotal
function formatCartWithSubTotal(cartDoc) {
  if (!cartDoc || !cartDoc.items) return cartDoc;

  let subTotal = 0;

  const itemsWithTotals = cartDoc.items.map(item => {
    const product = item.product;

    // 🛑 المنتج مش موجود (محذوف أو مش متاح)
    if (!product) {
      return {
        ...item.toObject(),
        itemTotalPrice: 0,
        warning: "Product no longer exists"
      };
    }

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


// ✅ Add to cart
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, color, size } = req.body;
    const userId = req.user.id;

    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find(v => v.color === color && v.size === size);
    if (!variant) {
      return res.status(400).json({ message: "Selected color/size is not available" });
    }

    if (quantity > variant.quantity) {
      return res.status(400).json({
        message: `Only ${variant.quantity} pieces available for ${color} / ${size}`
      });
    }

    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      if (quantity > 8) {
        return res.status(400).json({ message: "You can't add more than 8 pieces" });
      }

      cart = await CartModel.create({
        user: userId,
        items: [{ product: productId, quantity, color, size }]
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

      if (totalQty > variant.quantity) {
        return res.status(400).json({
          message: `Only ${variant.quantity - (existingItem?.quantity || 0)} more available`
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
      select: "title price originalPrice discount variants images"
    });

    return res.status(200).json({
      message: "Added to cart",
      cart: formatCartWithSubTotal(cart)
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Get cart
export const getCart = async (req, res, next) => {
  try {
    const cart = await CartModel.findOne({ user: req.user.id }).populate({
      path: "items.product",
      select: "title price originalPrice discount images imageUrl"
    });

    if (!cart || !cart.items.length) {
      return res.status(200).json({
        cartDetails: {
          items: [],
          subTotal: 0
        },
        message: "Cart is empty"
      });
    }

    let subTotal = 0;

    const formattedItems = cart.items.map(item => {
      const price = item.product?.price ?? 0;
      const quantity = item.quantity ?? 0;
      const itemTotal = price * quantity;

      subTotal += itemTotal;

      return {
        product: item.product,
        quantity: item.quantity,
        color: item.color,
        size: item.size
      };
    });

    return res.status(200).json({
      cartDetails: {
        items: formattedItems,
        subTotal: parseFloat(subTotal.toFixed(2))
      }
    });

  } catch (err) {
    next(err);
  }
};



// ✅ Remove from cart
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

    const itemExists = cart.items.some(
      item =>
        item.product.toString() === productId &&
        item.color === color &&
        item.size === size
    );

    if (!itemExists) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    cart.items = cart.items.filter(
      item =>
        item.product.toString() !== productId ||
        item.color !== color ||
        item.size !== size
    );

    await cart.save();

    await cart.populate({
      path: "items.product",
      select: "title price originalPrice discount variants images"
    });

    res.status(200).json({
      message: "Item removed",
      cart: formatCartWithSubTotal(cart)
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Update item quantity
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

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find(v => v.color === color && v.size === size);
    if (!variant) {
      return res.status(400).json({ message: "Selected color/size not available" });
    }

    if (quantity > variant.quantity) {
      return res.status(400).json({
        message: `Only ${variant.quantity} available for ${color}/${size}`
      });
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
      select: "title price originalPrice discount variants images"
    });

    res.status(200).json({
      message: quantity === 0 ? "Item removed from cart" : "Quantity updated",
      cart: formatCartWithSubTotal(cart)
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Clear cart
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
