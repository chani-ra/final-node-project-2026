import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { seedDefaultData } from "./seedDefaultData.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
if (process.env.NODE_ENV !== "production") {
  await seedDefaultData();
}

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});