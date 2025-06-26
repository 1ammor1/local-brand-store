import { CartModel } from "../../DB/models/cart.model.js";
import { PendingCheckoutModel } from "../../DB/models/pendingCheckout.model.js";
import { Governorates, shippingPrices } from "../../utils/governorates.js";

export const previewCheckout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, notes } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({ message: "Shipping address is required" });
    }

    const shippingGov = shippingAddress.gov;

    if (!Governorates.includes(shippingGov)) {
      return res.status(400).json({ message: "Invalid governorate" });
    }

    const shipping = shippingPrices[shippingGov];

    const cart = await CartModel.findOne({ user: userId }).populate("items.product");
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const orderItems = [];
    let totalPrice = 0;
    let totalDiscountAllItems = 0;

    for (const item of cart.items) {
      const product = item.product;
      if (!product) {
        return res.status(400).json({ message: "Product not found in cart" });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient quantity for: ${product.title}` });
      }

      const quantity = item.quantity;
      const originalPrice = product.originalPrice || product.price;
      const discount = product.discount;
      let discountValuePerItem = 0;
      let priceAfterDiscount = originalPrice;

      if (discount?.type === "percentage") {
        discountValuePerItem = (originalPrice * discount.amount) / 100;
        priceAfterDiscount = originalPrice - discountValuePerItem;
      } else if (discount?.type === "fixed") {
        discountValuePerItem = discount.amount;
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
          image: typeof product.images?.[0] === "object" ? product.images?.[0]?.url : product.images?.[0] || "",
          originalPrice,
          priceAfterDiscount,
          discount: discount || null,
          discountValuePerItem,
          totalDiscount,
          totalForThisItem,
        },
      });
    }

    const finalTotal = totalPrice + shipping;

    await PendingCheckoutModel.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        shippingAddress,
        notes,
        totalPrice,
        discount: totalDiscountAllItems,
        shipping,
        finalTotal,
        items: orderItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          snapshot: { ...item.snapshot },
        })),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      message: "Checkout preview ready",
      shippingAddress,
      items: orderItems,
      notes,
      shipping,
      finalTotal,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
