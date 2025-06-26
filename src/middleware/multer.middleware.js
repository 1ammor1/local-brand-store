import multer, { memoryStorage } from "multer";

export const fileValidation = {
  images: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  files: ["application/pdf"],
};

export const uploadCloud = (filetype = "images") => {
  const storage = memoryStorage();

  const fileFilter = (req, file, cb) => {
    if (fileValidation[filetype]?.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type."), false);
    }
  };

  return multer({ storage, fileFilter });
};
