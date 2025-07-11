import { CartModel } from "../../DB/models/cart.model.js";
import {ProductModel} from "../../DB/models/product.model.js";
import { OrderModel } from "../../DB/models/order.model.js";
import { PendingCheckoutModel } from "../../DB/models/pendingCheckout.model.js"; 
import { CounterModel } from "../../DB/models/counter.model.js";
import { NotificationModel } from "../../DB/models/notification.model.js";
import { UserModel } from "../../DB/models/user.model.js";

export const createOrder = async (req, res, next) => {
  const counter = await CounterModel.findOneAndUpdate(
    { name: "orderNumber" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  const orderNumber = "#" + counter.value.toString().padStart(6, "0");

  try {
    const userId = req.user.id;

    const session = await PendingCheckoutModel.findOne({ user: userId });
    if (!session || !session.shippingAddress) {
      return res.status(400).json({ message: "Shipping address is required (Please Complete Checkout First)" });
    }

    if (!session.items || session.items.length === 0) {
      return res.status(400).json({ message: "No items in checkout session" });
    }

    const shipping = session.shipping || 0;
    const totalPrice = session.totalPrice || 0;
    const discount = session.discount || 0;
    const finalTotal = session.finalTotal || (totalPrice + shipping - discount);

    const orderItems = session.items.map(item => ({
      product: item.product,
      quantity: item.quantity,
      snapshot: { ...item.snapshot }
    }));

    for (const item of session.items) {
      const productDoc = await ProductModel.findById(item.product);
      if (!productDoc || productDoc.quantity < item.quantity) {
        return res.status(400).json({ message: `Product out of stock: ${item.snapshot.title}` });
      }
      productDoc.quantity -= item.quantity;
      await productDoc.save();
    }

    const order = await OrderModel.create({
      user: userId,
      orderNumber,
      items: orderItems,
      totalPrice,
      discount,
      shipping,
      finalTotal,
      paymentMethod: req.body.paymentMethod || "cash",
      shippingAddress: session.shippingAddress,
      notes: session.notes || "",
    });

    const admins = await UserModel.find({ role: "admin" });
    const notifications = admins.map(admin => ({
      recipient: admin._id,
      title: "🚚 New order",
      message: `A new order has been created ${order.orderNumber}`,
      order: order._id,
    }));

    await NotificationModel.insertMany(notifications);
    await CartModel.findOneAndUpdate({ user: userId }, { items: [] });
    await PendingCheckoutModel.deleteOne({ user: userId });

    res.status(201).json({ message: "Order created", order });

  } catch (err) {
    next(err);
  }
};


export const getSingleOrder = async (req, res, next) => {
  try {
    const id = req.params.id;
    const order = await OrderModel.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
}
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await OrderModel.find()
      .sort({ createdAt: -1 });
    return res.status(200).json({ orders });
  } catch (err) {
    next(err);
  }
};

export const getOrdersByStatus = async (req, res, next) => {
  try {
    const { status } = req.query;
    if(!status) return res.status(400).json({ message: "Status is required" });
    if(status !== "pending" && status !== "confirmed" && status !== "shipped" && status !== "delivered" && status !== "cancelled") return res.status(400).json({ message: "status must be pending, confirmed, shipped, delivered, or cancelled" });
    const orders = await OrderModel.find({ status }).sort({ createdAt: -1 });
    if (!orders) return res.status(404).json({ message: "Orders not found" });
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
