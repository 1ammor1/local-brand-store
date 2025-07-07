import { Readable } from "stream";
import cloudinary from "../../utils/cloudinary.js";
import { ProductModel } from "../../DB/models/product.model.js";
import { CategoryModel } from "../../DB/models/category.model.js";
import mongoose from "mongoose";

function bufferToStream(buffer) {
        return Readable.from(buffer);
      }
export const getAllProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    let productsQuery = ProductModel.find()
      .sort({ createdAt: -1 })
      .populate("category")
      .select("title description originalPrice price quantity discount category images.url colors size");


    let totalProducts = await ProductModel.countDocuments();

    if (!isNaN(page) && !isNaN(limit)) {
      const skip = (page - 1) * limit;
      productsQuery = productsQuery.skip(skip).limit(limit);

      const products = await productsQuery;

      return res.status(200).json({
        totalProducts,
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        products,
      });
    }

    const products = await productsQuery;
    res.status(200).json({ totalProducts, products });

  } catch (err) {
    next(err);
  }
};



export const getProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.query;
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    if (!category) return res.status(400).json({ message: "Category ID is required" });
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    let query = ProductModel.find({ category })
      .sort({ createdAt: -1 })
      .populate("category")
      .select("title description originalPrice price quantity discount category images.url colors size");


    const totalProducts = await ProductModel.countDocuments({ category });

    if (!isNaN(page) && !isNaN(limit)) {
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(limit);

      const products = await query;

      return res.status(200).json({
        totalProducts,
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        products,
      });
    }

    const products = await query;
    res.status(200).json({ totalProducts, products });

  } catch (err) {
    next(err);
  }
};




export const createProduct = async (req, res, next) => {
  try {
    const {
      title,
      description,
      originalPrice,
      quantity,
      category,
      colors,
      size,
      discount
    } = req.body;

    const Categoty = await CategoryModel.findById(category);
    if (!Categoty) return res.status(404).json({ message: "Category not found" });

    let images = [];


      if (req.files?.length) {
        const results = await Promise.all(
          req.files.map(
            (file) =>
              new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                  { folder: `products/${req.user.id}` },
                  (error, result) => {
                    if (error) return reject(error);
                    resolve({ url: result.secure_url, public_id: result.public_id });
                  }
                );
                bufferToStream(file.buffer).pipe(stream);
              })
          )
        );
        images = results;
      }

    let finalPrice = originalPrice;
    if (discount?.type && discount?.amount) {
      if (discount.type === "percentage") {
        finalPrice = originalPrice - (originalPrice * (discount.amount / 100));
      } else if (discount.type === "fixed") {
        finalPrice = originalPrice - discount.amount;
      }
      if (finalPrice < 0) finalPrice = 0;
    }

    const product = await ProductModel.create({
      title,
      description,
      originalPrice,
      price: Math.round(finalPrice * 100) / 100,
      discount: discount?.type && discount?.amount ? discount : undefined,
      quantity,
      category,
      colors,
      size,
      images,
      user: req.user.id,
    });

    res.status(201).json({ message: "Product created", product });
  } catch (err) {
    next(err);
  }
};


export const getProductById = async (req, res, next) => {
  try {
    const product = await ProductModel.findById(req.params.id).populate("category");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const {
      title,
      description,
      originalPrice,
      quantity,
      category,
      colors,
      size,
      discount
    } = req.body;

    if (req.files?.length) {
      for (const img of product.images) {
        if (img.public_id) await cloudinary.uploader.destroy(img.public_id);
      }

      const results = await Promise.all(
          req.files.map(
            (file) =>
              new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                  { folder: `products/${req.user.id}` },
                  (error, result) => {
                    if (error) return reject(error);
                    resolve({ url: result.secure_url, public_id: result.public_id });
                  }
                );
                bufferToStream(file.buffer).pipe(stream);
              })
          )
        );

product.images = results;

      product.images = results;
    }

    if (title) product.title = title;
    if (description) product.description = description;
    if (originalPrice) product.originalPrice = originalPrice;
    if (quantity) product.quantity = quantity;
    if (category) product.category = category;
    if (colors) product.colors = colors;
    if (size) product.size = size;

    if (discount?.type && discount?.amount) {
      product.discount = discount;

      let finalPrice = product.originalPrice;
      if (discount.type === "percentage") {
        finalPrice = finalPrice - (finalPrice * (discount.amount / 100));
      } else if (discount.type === "fixed") {
        finalPrice = finalPrice - discount.amount;
      }
      if (finalPrice < 0) finalPrice = 0;

      product.price = Math.round(finalPrice * 100) / 100;
    } else {
      product.discount = undefined;
      product.price = product.originalPrice;
    }

    await product.save();
    return res.status(200).json({ message: "Product updated", product });
  } catch (err) {
    next(err);
  }
};



export const deleteProduct = async (req, res, next) => {
  try {
    const product = await ProductModel.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    for (const img of product.images) {
      if (img.public_id) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    }

    const folderPath = `products/${product.user}`; 
    try {
      await cloudinary.api.delete_folder(folderPath);
    } catch (folderErr) {
      console.warn("Folder deletion skipped:", folderErr.message);
    }

    res.status(200).json({ message: "Product deleted" });
  } catch (err) {
    next(err);
  }
};
