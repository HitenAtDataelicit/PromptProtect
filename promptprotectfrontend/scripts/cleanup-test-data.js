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

    // Remove users and orgs related to the test workspace
    const Org = mongoose.model("Organization", new mongoose.Schema({ workspace: String }));
    const User = mongoose.model("User", new mongoose.Schema({ org: mongoose.Schema.Types.ObjectId, userEmail: String }));

    const targetWorkspace = process.env.TEST_WORKSPACE || "acme_corp";
    const org = await Org.findOne({ workspace: targetWorkspace });
    if (org) {
      await User.deleteMany({ org: org._id });
      await Org.deleteOne({ _id: org._id });
      console.log(`Deleted org '${targetWorkspace}' and its users.`);
    }
    
    await User.deleteMany({ userEmail: /test\.com$/i });
    console.log("Deleted all users with @test.com emails.");

  } catch (err) {
    console.error("Error during cleanup:", err);
  } finally {
    await mongoose.disconnect();
  }
}

cleanup();
