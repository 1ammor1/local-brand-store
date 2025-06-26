import {CouponModel} from "../../DB/models/coupon.model.js";
import {ProductModel} from "../../DB/models/product.model.js";


export const applyDiscount = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { type, amount } = req.body;

    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let finalPrice = product.originalPrice;

    if (type && amount) {
      if (type === "percentage") {
        finalPrice -= finalPrice * (amount / 100);
      } else if (type === "fixed") {
        finalPrice -= amount;
      }

      if (finalPrice < 0) {
        return res.status(400).json({ message: "Discount results in negative price" });
      }

      product.discount = { type, amount };
      product.price = Math.round(finalPrice * 100) / 100;
    } else {
      product.discount = undefined;
      product.price = product.originalPrice;
    }

    await product.save();
    res.status(200).json({ message: "Discount updated", product });
  } catch (err) {
    next(err);
  }
};

