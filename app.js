import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import authRoutes from "./src/Modules/auth/auth.routes.js";
import userRoutes from "./src/Modules/user/user.routes.js";
import adminRoutes from "./src/Modules/admin/admin.routes.js";
import categoryRoutes from "./src/Modules/category/category.routes.js";
import productRoutes from "./src/Modules/product/product.routes.js";
import cartRoutes from "./src/Modules/cart/cart.routes.js";
import orderRoutes from "./src/Modules/order/order.routes.js";
import discountRouter from "./src/Modules/discount/discount.routes.js";
import notficationRouter from "./src/Modules/notification/notification.routes.js";
import { connectDB } from "./src/DB/connection.js";
import helmet from "helmet";
import xss from "xss-clean";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";

dotenv.config();

const app = express();

app.use(mongoSanitize());
app.use(hpp());
app.use(xss());
app.use(helmet());
app.use(cors()); 
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/product", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/discount", discountRouter);
app.use("/api/order", orderRoutes);
app.use("/api/notification", notficationRouter);

app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

app.get("/api", (req, res) => {
  return res.status(200).json({ message: "Welcome to API" });
});
app.use((req, res) => {
  return res.status(404).json({ message: "API Not Found" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(()=>{
app.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}/api/`);
});

});
import "./src/utils/logoutInactiveUsers.js";
