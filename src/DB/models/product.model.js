import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: String,
  description: String,
  originalPrice: Number,
  price: Number,
  discount: {
    amount: Number,
    type: { type: String, enum: ["percentage", "fixed"] }
  },
  // الكمية لكل variant (color + size)
  variants: [{
    color: String,
    size: String,
    quantity: { type: Number, default: 0 }
  }],
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  images: [
    {
      url: String,
      public_id: String,
    }
  ],
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});


productSchema.virtual("imageUrl").get(function () {
  return this.images?.[0]?.url || null;
});

export const ProductModel = mongoose.model("Product", productSchema);
