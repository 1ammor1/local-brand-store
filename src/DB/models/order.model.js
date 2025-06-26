import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  snapshot: {
    title: String,
    image: String,
    originalPrice: Number,
    priceAfterDiscount: Number,
    discount: {
      type: {
        type: String,
      },
      amount: Number
    },
    discountValuePerItem: Number,
    totalDiscount: Number,
    totalForThisItem: Number
  }
});


const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderNumber: {
      type: String,
      unique: true,
      required: true
    },
    items: [orderItemSchema],
    totalPrice: { type: Number, required: true },
    discount: { type: Number},    
    shipping: { type: Number },
    finalTotal: { type: Number },
    status: {
      type: String,
      enum: [ "pending","processing","shipped","delivered","cancelled"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      default: "cash"
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      anotherPhone: { type: String },
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      gov: { type: String, required: true },
      country: { type: String, required: true }
    },
    notes: { type: String },
  },
  { timestamps: true }
);


export const OrderModel = mongoose.model("Order", orderSchema);
