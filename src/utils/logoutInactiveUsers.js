import cron from "node-cron";
import { UserModel } from "../DB/models/user.model.js";
cron.schedule("*/10 * * * *", async () => {
  console.log("Checking for expired sessions...");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); 

  const users = await UserModel.updateMany(
    {
      isLoggedIn: true,
      lastLogin: { $lt: oneHourAgo }, 
    },
    {
      isLoggedIn: false,
    }
  );

//   if (users.modifiedCount > 0) {
//     console.log(`✅ ${users.modifiedCount} users logged out due to token expiration.`);
//   } else {
//     console.log("✅ No inactive users found.");
//   }
});
