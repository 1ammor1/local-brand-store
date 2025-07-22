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
    const {
      fullName,
      phone,
      anotherPhone,
      addressLine,
      city,
      gov,
      country,
      notes,
      paymentMethod = "cash"
    } = req.body;

    // Validate governorate
    if (!gov || !Governorates.includes(gov)) {
      return res.status(400).json({ message: "Valid shipping address is required" });
    }

    const shipping = shippingPrices[gov] || 0;

    // Construct shippingAddress dynamically
    const shippingAddress = {
      fullName,
      phone,
      addressLine,
      city,
      gov,
      country,
      ...(anotherPhone ? { anotherPhone } : {})
    };

    // Get cart
    const cart = await CartModel.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Generate order number
    const counter = await CounterModel.findOneAndUpdate(
      { name: "orderNumber" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const orderNumber = "#" + counter.value.toString().padStart(6, "0");

    const orderItems = [];
    let subTotal = 0;
    let totalDiscountAllItems = 0;

    for (const item of cart.items) {
      const product = item.product;
      const { color, size, quantity } = item;

      if (!product) continue;

      const variantIndex = product.variants.findIndex(v => v.color === color && v.size === size);
      if (variantIndex === -1) {
        return res.status(400).json({ message: `Variant not found for product: ${product.title}` });
      }

      const variant = product.variants[variantIndex];

      if (variant.quantity < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.title} (${color}, ${size})`
        });
      }

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

      discountValuePerItem = parseFloat(discountValuePerItem.toFixed(2));
      priceAfterDiscount = parseFloat(priceAfterDiscount.toFixed(2));
      const totalDiscount = parseFloat((discountValuePerItem * quantity).toFixed(2));
      const totalForThisItem = parseFloat((priceAfterDiscount * quantity).toFixed(2));
      const totalOriginalPrice = parseFloat((originalPrice * quantity).toFixed(2));

      subTotal += totalOriginalPrice;
      totalDiscountAllItems += totalDiscount;

      orderItems.push({
        product: product._id,
        quantity,
        color,
        size,
        snapshot: {
          title: product.title,
          image: product.images?.[0]?.url || "",
          originalPrice,
          priceAfterDiscount,
          discount: product.discount || null,
          discountValuePerItem,
          totalDiscount,
          totalForThisItem,
          totalOriginalPrice,
          color,
          size
        },
      });

      product.variants[variantIndex].quantity -= quantity;
      await product.save();
    }

    subTotal = parseFloat(subTotal.toFixed(2));
    totalDiscountAllItems = parseFloat(totalDiscountAllItems.toFixed(2));
    const Total = parseFloat((subTotal - totalDiscountAllItems + shipping).toFixed(2));

    // Construct orderData dynamically
    const orderData = {
      user: userId,
      orderNumber,
      items: orderItems,
      subTotal,
      discount: totalDiscountAllItems,
      shipping,
      Total,
      paymentMethod,
      shippingAddress,
      ...(notes ? { notes } : {})
    };

    const order = await OrderModel.create(orderData);

    const admins = await UserModel.find({ role: "admin" });
    const notifications = [
      ...admins.map((admin) => ({
        recipient: admin._id,
        title: "🚚 New order",
        message: `A new order has been created ${order.orderNumber}`,
        order: order._id,
      })),
      {
        recipient: userId,
        title: "🧾 Order received",
        message: `Your order ${order.orderNumber} has been placed and is pending.`,
        order: order._id,
      }
    ];

    await NotificationModel.insertMany(notifications);
    await CartModel.deleteOne({ user: userId });

    res.status(201).json({ message: "Order created", order });
  } catch (err) {
    next(err);
  }
};



export const getSingleOrder = async (req, res, next) => {
  try {
    const id = req.params.id;
    const order = await OrderModel.findById(id)
      .populate("user", "name email")
      .lean(); // مهم جدًا: يحول الـ Document إلى Object عادي عشان نقدر نعدله

    if (!order) return res.status(404).json({ message: "Order not found" });

    // دمج العناصر المتكررة
    const mergedItemsMap = new Map();

    for (const item of order.items) {
      const key = `${item.product}_${item.snapshot.color}_${item.snapshot.size}`;

      if (mergedItemsMap.has(key)) {
        const existingItem = mergedItemsMap.get(key);
        existingItem.quantity += item.quantity;
        existingItem.snapshot.totalForThisItem += item.snapshot.totalForThisItem;
        existingItem.snapshot.totalDiscount += item.snapshot.totalDiscount;
      } else {
        // ننسخ العنصر عشان ما نأثرش على الأصل
        mergedItemsMap.set(key, { ...item });
      }
    }

    // تحويل الـ Map إلى مصفوفة
    order.items = Array.from(mergedItemsMap.values());

    res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
};



export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await OrderModel.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ orders });
  } catch (err) {
    next(err);
  }
};


export const getOrdersByStatus = async (req, res, next) => {
  try {
    const { status } = req.query;

    const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    if (!status) return res.status(400).json({ message: "Status is required" });
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    const orders = await OrderModel.find({ status })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    if (!orders.length) return res.status(404).json({ message: "No orders found for this status" });

    res.status(200).json({ orders });
  } catch (err) {
    next(err);
  }
};


export const getUserOrders = async (req, res, next) => {
  try {
    const orders = await OrderModel.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({ orders });
  } catch (err) {
    next(err);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await OrderModel.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if(order.user._id.toString() !== req.user.id && req.user.role !== "admin") return res.status(401).json({ message: "You are not authorized to cancel this order" });
    if(order.status !== "pending") return res.status(400).json({ message: "Order can only be cancelled if it is in pending status" });
    order.status = "cancelled";
    await order.save();
    const admins = await UserModel.find({ role: "admin" });
    const adminNotifs = admins.map(admin => ({
    recipient: admin._id,
    title: "Order cancelled ❌",
    message: `${order.orderNumber} has been cancelled by the user.`,
    order: order._id
  }));

  const userNotif = {
    recipient: order.user._id,
    title: "Your order has been cancelled ❌",
    message: `Your order ${order.orderNumber} has been successfully cancelled.`,
    order: order._id
  };


    await NotificationModel.insertMany([...adminNotifs, userNotif]);
    res.status(200).json({ message: "Order cancelled", order });
  } catch (err) {
    next(err);
  }
}

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await OrderModel.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    await order.save();
    await NotificationModel.create({
    recipient: order.user._id,
    title: "Update order status 🔄",
    message: `Your order status ${order.orderNumber} has been updated to "${order.status}".`,
    order: order._id
  });


    res.status(200).json({ message: "Order status updated", order });
  } catch (err) {
    next(err);
  }
};

export const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await OrderModel.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    await OrderModel.findByIdAndDelete(id);
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    next(err);
  }
};

