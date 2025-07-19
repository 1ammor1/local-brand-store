import cron from "node-cron";
import { UserModel } from "../DB/models/user.model.js";

cron.schedule("0 2 * * *", async () => {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  try {
    const result = await UserModel.deleteMany({
      confirmEmail: false,
      createdAt: { $lt: fourteenDaysAgo }
    });

    console.log(`🧹 Clean-up done: ${result.deletedCount} unconfirmed users removed.`);
  } catch (error) {
    console.error("❌ Failed to clean up unconfirmed users:", error);
  }
});
