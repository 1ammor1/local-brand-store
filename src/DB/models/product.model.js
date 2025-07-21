import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  color: { type: String, required: true },
  size: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 }
});

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: false },
    description: {type:String, required:false},
    originalPrice: { type: Number, required: false },
    price: { type: Number, required: true },
    discount: {
      amount: Number,
      type: { type: String, enum: ["percentage", "fixed"] }
    },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    images: [
      {
        url: String,
        public_id: String
      }
    ],
    variants: [variantSchema], // ← color + size + quantity
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

productSchema.virtual("imageUrl").get(function () {
  return this.images?.[0]?.url || null;
});

export const ProductModel = mongoose.model("Product", productSchema);
