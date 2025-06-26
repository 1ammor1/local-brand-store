// utils/order.helpers.js
import { CartModel } from "../../src/DB/models/cart.model.js";
import { CouponModel } from "../../src/DB/models/coupon.model.js";

export const prepareOrderCalculation = async (userId, couponCode, { applyCoupon = false } = {}) => {
  const cart = await CartModel.findOne({ user: userId }).populate("items.product");

  if (!cart || !cart.items || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  let totalPrice = 0;
  const orderItems = [];

  for (const item of cart.items) {
    const product = item.product;

    if (!product) throw new Error("Product not found");

    if (product.quantity < item.quantity) {
      throw new Error(`Insufficient quantity for: ${product.title}`);
    }

    totalPrice += product.price * item.quantity;

    orderItems.push({
      product: product._id,
      quantity: item.quantity,
      snapshot: {
        title: product.title,
        price: product.price,
        image: product.images?.[0] || "",
      },
    });
  }

  let discount = 0;
  if (couponCode) {
    const coupon = await CouponModel.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
    });

    if (!coupon || coupon.expiryDate < new Date() || coupon.usedCount >= coupon.usageLimit) {
      throw new Error("Invalid or expired coupon");
    }

    discount =
      coupon.discountType === "percentage"
        ? totalPrice * (coupon.discountValue / 100)
        : coupon.discountValue;

    discount = Math.min(discount, totalPrice);

    if (applyCoupon) {
      await CouponModel.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
    }
  }

  return {
    cart,
    orderItems,
    totalPrice,
    discount,
    finalTotal: totalPrice - discount,
  };
};
