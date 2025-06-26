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
  quantity: Number,
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  images: [
    {
      url: String,
      public_id: String,
    }
  ],
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  colors: {
    type: [String],
    default: [],
  },
  size: {
    type: [String],
    default: [],
  },
}, { timestamps: true });


export const ProductModel = mongoose.model("Product", productSchema);
