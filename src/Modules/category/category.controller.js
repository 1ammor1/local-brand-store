import { CategoryModel } from "../../DB/models/category.model.js";

export const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: "Category name is required" });

    const existing = await CategoryModel.findOne({ name });
    if (existing) return res.status(400).json({ message: "Category already exists" });


    const category = await CategoryModel.create({ name });

    return res.status(201).json({ message: "Category created successfully", category });
  } catch (err) {
    next(err);
  }
};

export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await CategoryModel.find().select("_id name");
    res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await CategoryModel.findById(id).select("_id name");

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ category });
  } catch (err) {
    next(err);
  }
};


export const updateCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    const updatedData = {};
    if (name) {
      updatedData.name = name;
    }

    const category = await CategoryModel.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    if (!category) return res.status(404).json({ message: "Category not found" });

    res.status(200).json({ message: "Category updated", category });
  } catch (err) {
    next(err);
  }
};


export const deleteCategory = async (req, res, next) => {
  try {
    const category = await CategoryModel.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    res.status(200).json({ message: "Category deleted" });
  } catch (err) {
    next(err);
  }
};
