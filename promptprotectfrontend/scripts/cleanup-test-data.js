const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../PromptprotectBackend/.env") });

const MONGODB_URI = process.env.MONGODB_URI;

async function cleanup() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not found in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Cleaning up test data in MongoDB...");

    // Remove all organizations and users related to E2E tests
    const Org = mongoose.models.Organization || mongoose.model("Organization", new mongoose.Schema({ workspace: String }));
    const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({ org: mongoose.Schema.Types.ObjectId, userEmail: String }));

    const oRes = await Org.deleteMany({ workspace: /^e2e_ws_/ });
    const uRes = await User.deleteMany({ userEmail: { $regex: /mail\.com$|test\.com$/ } });

    console.log(`Cleanup complete: Deleted ${oRes.deletedCount} organizations and ${uRes.deletedCount} users.`);

  } catch (err) {
    console.error("Error during cleanup:", err);
  } finally {
    await mongoose.disconnect();
  }
}

cleanup();
