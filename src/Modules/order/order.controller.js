import { CartModel } from "../../DB/models/cart.model.js";
import { ProductModel } from "../../DB/models/product.model.js";
import { OrderModel } from "../../DB/models/order.model.js";
import { CounterModel } from "../../DB/models/counter.model.js";
import { NotificationModel } from "../../DB/models/notification.model.js";
import { UserModel } from "../../DB/models/user.model.js";
import { Governorates, shippingPrices } from "../../utils/governorates.js";

export const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, notes = "", paymentMethod = "cash" } = req.body;

    if (!shippingAddress || !Governorates.includes(shippingAddress.gov)) {
      return res.status(400).json({ message: "Valid shipping address is required" });
    }

    const shipping = shippingPrices[shippingAddress.gov] || 0;

    const cart = await CartModel.findOne({ user: userId }).populate("items.product");
    if (!cart || !cart.items.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const counter = await CounterModel.findOneAndUpdate(
      { name: "orderNumber" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const orderNumber = "#" + counter.value.toString().padStart(6, "0");

    const orderItems = [];
    let totalPrice = 0;
    let totalDiscountAllItems = 0;

    for (const item of cart.items) {
      const product = item.product;

      if (!product || product.quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient quantity for: ${product?.title || "unknown product"}` });
      }

      const quantity = item.quantity;
      const originalPrice = product.originalPrice || product.price;
      let discountValuePerItem = 0;
      let priceAfterDiscount = originalPrice;

      if (product.discount?.type === "percentage") {
        discountValuePerItem = (originalPrice * product.discount.amount) / 100;
        priceAfterDiscount = originalPrice - discountValuePerItem;
      } else if (product.discount?.type === "fixed") {
        discountValuePerItem = product.discount.amount;
        priceAfterDiscount = originalPrice - discountValuePerItem;
      }

      if (priceAfterDiscount < 0) priceAfterDiscount = 0;

      const totalDiscount = discountValuePerItem * quantity;
      const totalForThisItem = priceAfterDiscount * quantity;

      totalPrice += totalForThisItem;
      totalDiscountAllItems += totalDiscount;

      orderItems.push({
        product: product._id,
        quantity,
        snapshot: {
          title: product.title,
          image: product.images?.[0]?.url || "",
          originalPrice,
          priceAfterDiscount,
          discount: product.discount || null,
          discountValuePerItem,
          totalDiscount,
          totalForThisItem,
        },
      });

      product.quantity -= quantity;
      await product.save();
    }

    const finalTotal = totalPrice + shipping;

    const order = await OrderModel.create({
      user: userId,
      orderNumber,
      items: orderItems,
      totalPrice,
      discount: totalDiscountAllItems,
      shipping,
      finalTotal,
      paymentMethod,
      shippingAddress,
      notes,
    });

    const admins = await UserModel.find({ role: "admin" });
    const notifications = admins.map((admin) => ({
      recipient: admin._id,
      title: "🚚 New order",
      message: `A new order has been created ${order.orderNumber}`,
      order: order._id,
    }));

    await NotificationModel.insertMany(notifications);

    // تنظيف الكارت
    await CartModel.findOneAndUpdate({ user: userId }, { items: [] });

    res.status(201).json({ message: "Order created", order });

  } catch (err) {
    next(err);
  }
};
