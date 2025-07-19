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
      discount,
      category,
      variants // 👈 جايه من form-data كـ string
    } = req.body;

    // ✅ Parse variants
    let parsedVariants = [];
    if (!variants) {
      return res.status(400).json({ message: "Variants are required" });
    }

    try {
      parsedVariants = JSON.parse(variants);

      if (!Array.isArray(parsedVariants)) {
        return res.status(400).json({ message: "Variants must be an array" });
      }

      const isValid = parsedVariants.every(v =>
        v.size && v.color && typeof v.quantity === "number"
      );

      if (!isValid) {
        return res.status(400).json({ message: "Each variant must include size, color, and quantity" });
      }
    } catch (err) {
      return res.status(400).json({ message: "Invalid variants JSON format" });
    }

    // ✅ رفع الصور إلى Cloudinary
    let images = [];
    if (req.files?.length) {
      const uploaded = await Promise.all(
        req.files.map(file => {
          return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: `products/${req.user.id}` },
              (error, result) => {
                if (error) return reject(error);
                resolve({ url: result.secure_url, public_id: result.public_id });
              }
            );
            bufferToStream(file.buffer).pipe(uploadStream);
          });
        })
      );
      images = uploaded;
    }

    // ✅ حساب السعر بعد الخصم
    let price = originalPrice;
    if (discount && typeof discount === "object") {
      const { amount, type } = discount;

      if (amount && type === "percentage") {
        price = originalPrice - (originalPrice * amount) / 100;
      } else if (amount && type === "fixed") {
        price = originalPrice - amount;
      }
    }

    // ✅ إعداد صورة رئيسية
    const imageUrl = images[0]?.url || null;

    // ✅ إنشاء المنتج
    const product = await ProductModel.create({
      title,
      description,
      originalPrice,
      price: Math.round(price * 100) / 100,
      discount: discount?.amount ? discount : undefined,
      category,
      variants: parsedVariants,
      images,
      imageUrl,
      user: req.user.id,
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
      discount,
      category,
      sizes,
      colors,
      quantity
    } = req.body;

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
    if (discount?.type && discount?.amount) {
      product.discount = discount;

      let finalPrice = product.originalPrice;
      if (discount.type === "percentage") {
        finalPrice -= (finalPrice * discount.amount) / 100;
      } else if (discount.type === "fixed") {
        finalPrice -= discount.amount;
      }

      product.price = Math.max(Math.round(finalPrice * 100) / 100, 0);
    } else {
      product.discount = undefined;
      product.price = product.originalPrice;
    }

    // ✅ بناء الـ variants من جديد
    if (sizes && colors && quantity) {
      const parsedSizes = Array.isArray(sizes) ? sizes : [sizes];
      const parsedColors = Array.isArray(colors) ? colors : [colors];

      const variants = [];
      for (const size of parsedSizes) {
        for (const color of parsedColors) {
          variants.push({ size, color, quantity });
        }
      }

      product.variants = variants;
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
