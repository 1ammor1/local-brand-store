import { CartModel } from "../../DB/models/cart.model.js";
import { ProductModel } from "../../DB/models/product.model.js";

export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, color, size } = req.body;
    const userId = req.user.id;

    const product = await ProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!product.colors.includes(color)) {
      return res.status(400).json({ message: `Color "${color}" is not available for this product` });
    }

    if (!product.size.includes(size)) {
      return res.status(400).json({ message: `Size "${size}" is not available for this product` });
    }

    if (quantity > product.quantity) {
      return res.status(400).json({ message: "Insufficient quantity in stock" });
    }

    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      if (quantity > 8) {
        return res.status(400).json({
          message: "You can't add more than 8 pieces of this product to the cart",
        });
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

      if (existingItem) {
        const totalQty = existingItem.quantity + quantity;

        if (totalQty > 8) {
          return res.status(400).json({
            message: "You can't add more than 8 pieces of this product to the cart",
          });
        }

        if (totalQty > product.quantity) {
          return res.status(400).json({
            message: `Only ${product.quantity - existingItem.quantity} more available in stock`,
          });
        }

        existingItem.quantity = totalQty;
      } else {
        if (quantity > 8) {
          return res.status(400).json({
            message: "You can't add more than 8 pieces of this product to the cart",
          });
        }

        cart.items.push({ product: productId, quantity, color, size });
      }

      await cart.save();
    }
    
    /*await cart.populate({
      path: "items.product",
      select: "title price imageUrl originalPrice discount quantity"
    });

    return res.status(200).json({ message: "Added to cart", cart });*/

    await cart.populate({
  path: "items.product",
  select: "title price originalPrice discount quantity images"
});

return res.status(200).json({
  message: "Added to cart",
  cart: cart.toObject({ virtuals: true })  // <<< مهم جدًا
});


  } catch (err) {
    next(err);
  }
};



export const getCart = async (req, res, next) => {
  try {
    const cart = await CartModel.findOne({ user: req.user.id }).populate({
      path: "items.product",
      select: "title price originalPrice discount images imageUrl quantity"
    });

    if (!cart) {
      return res.status(200).json({ cart: [], message: "Cart is empty" });
    }

    let totalCartPrice = 0;
    const itemsWithTotals = cart.items.map(item => {
      const product = item.product;
      const itemTotal = product.price * item.quantity;
      totalCartPrice += itemTotal;

      return {
        ...item.toObject(), 
        itemTotalPrice: itemTotal
      };
    });

    res.status(200).json({
      cart: {
        _id: cart._id,
        user: cart.user,
        items: itemsWithTotals,
        totalCartPrice: totalCartPrice,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });

  } catch (err) {
    next(err);
  }
};


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
      cart: cart.toObject({ virtuals: true })
    });
  } catch (err) {
    next(err);
  }
};



export const updateItemQuantity = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const cart = await CartModel.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(item => item.product.toString() === productId);
    if (!item) return res.status(404).json({ message: "Item not found in cart" });

    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (quantity > product.quantity) {
      return res.status(400).json({ message: `Only ${product.quantity} available in stock` });
    }

    item.quantity = quantity;
    await cart.save();

    res.status(200).json({ message: "Quantity updated", cart });
  } catch (err) {
    next(err);
  }
};


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
