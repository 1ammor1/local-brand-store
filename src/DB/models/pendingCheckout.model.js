import mongoose from "mongoose";

const pendingCheckoutSchema = new mongoose.Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", unique: true },
  shippingAddress: {
    fullName: String,
    phone: String,
    anotherPhone: String,
    addressLine: String,
    city: String,
    gov: String,
    country: String,
  },
  notes: String,
  totalPrice: Number,
  discount: Number,
  shipping: Number,
  finalTotal: Number,
  items: [
    {
      product: { type: mongoose.Types.ObjectId, ref: "Product" },
      quantity: Number,
      snapshot: {
        title: String,
        image: String,
        originalPrice: Number,
        priceAfterDiscount: Number,
        discount: {
          type: {
            type: String,
            enum: ["percentage", "fixed"]
          },
          amount: Number
        },
        discountValuePerItem: Number,
        totalDiscount: Number,
        totalForThisItem: Number
      },
    },
  ],
}, { timestamps: true });

export const PendingCheckoutModel = mongoose.model("PendingCheckout", pendingCheckoutSchema);
