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
      .select("title description originalPrice price quantity discount category images.url colors size variants");


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
      .select("title description originalPrice price quantity discount category images.url colors size variants");


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

export const getProductById = async (req, res, next) => {
  try {
    const product = await ProductModel.findById(req.params.id).populate("category");
    if (!product) return res.status(404).json({ message: "Product not found" });

    // ✅ استخرج الألوان والمقاسات الفريدة من الـ variants
    const colors = [...new Set(product.variants.map(v => v.color))];
    const sizes = [...new Set(product.variants.map(v => v.size))];

    // ✅ جهز الريسبونس مع دمجهم
    const formattedProduct = {
      ...product.toObject(),
      colors,
      size: sizes,
    };

    res.status(200).json({ product: formattedProduct });
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
      category,
      discount, // ممكن تيجي undefined
      variants // 👈 ده جاي string من form-data
    } = req.body;

    // ✅ Parse variants manually from string to array
    let parsedVariants;
    try {
      parsedVariants = JSON.parse(variants);
      if (!Array.isArray(parsedVariants)) {
        return res.status(400).json({ message: "Variants must be an array" });
      }
    } catch (err) {
      return res.status(400).json({ message: "Invalid variants format. Must be a JSON array." });
    }

    // ✅ Parse discount if provided
    let parsedDiscount;
    if (discount) {
      try {
        parsedDiscount = JSON.parse(discount);
      } catch (err) {
        return res.status(400).json({ message: "Invalid discount format. Must be a JSON object." });
      }
    }

    // ✅ Upload images
    let images = [];
    if (req.files?.length) {
      const uploadedImages = await Promise.all(
        req.files.map((file) => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: `products/${req.user.id}` },
              (error, result) => {
                if (error) return reject(error);
                resolve({ url: result.secure_url, public_id: result.public_id });
              }
            );
            bufferToStream(file.buffer).pipe(stream);
          });
        })
      );
      images = uploadedImages;
    }

    // ✅ Calculate discounted price
    let price = originalPrice;
    if (parsedDiscount?.amount && parsedDiscount?.type) {
      if (parsedDiscount.type === "percentage") {
        price = originalPrice - (originalPrice * parsedDiscount.amount) / 100;
      } else if (parsedDiscount.type === "fixed") {
        price = originalPrice - parsedDiscount.amount;
      }
    }

    const product = await ProductModel.create({
      title,
      description,
      originalPrice,
      price: Math.round(price * 100) / 100,
      discount: parsedDiscount,
      category,
      variants: parsedVariants,
      images,
      imageUrl: images[0]?.url || null,
      user: req.user.id
    });

    return res.status(201).json({ message: "Product created", product });
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
      category,
      discount,
      variants // 👈 جاي كـ JSON string زي في create
    } = req.body;

    // ✅ Parse discount if provided
    let parsedDiscount;
    if (discount) {
      try {
        parsedDiscount = JSON.parse(discount);
      } catch (err) {
        return res.status(400).json({ message: "Invalid discount format. Must be a JSON object." });
      }
    }

    // ✅ Parse variants if provided
    let parsedVariants;
    if (variants) {
      try {
        parsedVariants = JSON.parse(variants);
        if (!Array.isArray(parsedVariants)) {
          return res.status(400).json({ message: "Variants must be an array" });
        }
      } catch (err) {
        return res.status(400).json({ message: "Invalid variants format. Must be a JSON array." });
      }
    }

    // ✅ تعديل الصور لو فيه صور جديدة
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
    }

    // ✅ تعديل البيانات الأساسية
    if (title) product.title = title;
    if (description) product.description = description;
    if (originalPrice) product.originalPrice = originalPrice;
    if (category) product.category = category;

    // ✅ تعديل الخصم والسعر
    if (parsedDiscount?.type && parsedDiscount?.amount) {
      product.discount = parsedDiscount;

      let finalPrice = product.originalPrice;
      if (parsedDiscount.type === "percentage") {
        finalPrice -= (finalPrice * parsedDiscount.amount) / 100;
      } else if (parsedDiscount.type === "fixed") {
        finalPrice -= parsedDiscount.amount;
      }

      product.price = Math.max(Math.round(finalPrice * 100) / 100, 0);
    } else {
      product.discount = undefined;
      product.price = product.originalPrice;
    }

    // ✅ لو فيه variants جديدة ابعتها
    if (parsedVariants) {
      product.variants = parsedVariants;
    }

    await product.save();
    res.status(200).json({ message: "Product updated", product });
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
