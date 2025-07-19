import { roles,UserModel } from "../../DB/models/user.model.js";
import { ProductModel } from "../../DB/models/product.model.js";
import { OrderModel } from "../../DB/models/order.model.js";


export const getAllUsers = async (req, res) => {
  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);

  let users;
  let total;

  if (!page || !limit) {
    users = await UserModel.find().select("firstName lastName email role");
    total = users.length;

    return res.status(200).json({
      total,
      users,
    });
  }

  const skip = (page - 1) * limit;

  const result = await Promise.all([
    UserModel.find()
      .select("firstName lastName email role")
      .skip(skip)
      .limit(limit),
    UserModel.countDocuments(),
  ]);

  users = result[0];
  total = result[1];

  res.status(200).json({
    total,
    page,
    pages: Math.ceil(total / limit),
    users,
  });
};


export const promoteUser = async (req, res) => {
  const { role } = req.body;

  if (!Object.values(roles).includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const user = await UserModel.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  );

  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({ message: `User promoted to ${role}` });
};

export const deleteUser = async (req, res) => {
  const user = await UserModel.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({ message: "User deleted successfully" });
};


export const getExtendedStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      ordersThisMonth,
      rawDailyRevenue,
      zeroStockProducts,
      ordersByStatus,
      topSellingProducts,
      categoryRevenue,
      topLocations
    ] = await Promise.all([
      UserModel.countDocuments(),
      ProductModel.countDocuments(),
      OrderModel.countDocuments(),
      OrderModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      OrderModel.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$subTotal" }
          }
        }
      ]),
      ProductModel.find({ quantity: 0 }, "title"),
      OrderModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      // topSellingProducts
      OrderModel.aggregate([
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalSold: { $sum: "$items.quantity" }
          }
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productInfo"
          }
        },
        { $unwind: "$productInfo" },
        {
          $project: {
            _id: 0,
            productId: "$_id",
            title: "$productInfo.title",
            totalSold: 1
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 }
      ]),

      // categoryRevenue
      OrderModel.aggregate([
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productInfo"
          }
        },
        { $unwind: "$productInfo" },
        {
          $group: {
            _id: "$productInfo.category",
            revenue: { $sum: "$items.totalForThisItem" }
          }
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "categoryInfo"
          }
        },
        { $unwind: "$categoryInfo" },
        {
          $project: {
            _id: 0,
            category: "$categoryInfo.name",
            revenue: 1
          }
        }
      ]),

      // topLocations by gov
      OrderModel.aggregate([
        {
          $group: {
            _id: "$shippingAddress.gov",
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            city: "$_id",
            count: 1
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    const dailyRevenue = last7Days.map(date => {
      const found = rawDailyRevenue.find(d => d._id === date);
      return { date, total: found?.total || 0 };
    });

    res.status(200).json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: dailyRevenue.reduce((acc, curr) => acc + curr.total, 0),
      averageOrderValue:
        totalOrders > 0
          ? parseFloat((dailyRevenue.reduce((acc, curr) => acc + curr.total, 0) / totalOrders).toFixed(2))
          : 0,
      ordersThisMonth,
      dailyRevenueLast7Days: dailyRevenue,
      zeroStockProducts,
      ordersByStatus,
      topSellingProducts,
      categoryRevenue,
      topLocations
    });
  } catch (err) {
    next(err);
  }
};
