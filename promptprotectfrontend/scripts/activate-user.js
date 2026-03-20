const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../PromptprotectBackend/.env") });

const MONGODB_URI = process.env.MONGODB_URI;
const TEST_EMAIL = process.argv[2] || process.env.TEST_EMAIL;

if (!TEST_EMAIL) {
  console.error("Email is required (provide as argument or TEST_EMAIL env var)");
  process.exit(1);
}

async function activate() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not found in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB:", MONGODB_URI);

    const UserSchema = new mongoose.Schema({}, { strict: false, collection: "users" });
    const User = mongoose.model("User", UserSchema);

    const result = await User.updateOne(
      { userEmail: TEST_EMAIL.toLowerCase().trim() },
      { 
        $set: { 
          status: "ACTIVE", 
          emailVerified: true 
        } 
      }
    );

    if (result.matchedCount > 0) {
      console.log(`Successfully activated user: ${TEST_EMAIL}`);
    } else {
      console.log(`User not found: ${TEST_EMAIL}`);
    }

  } catch (err) {
    console.error("Error during activation:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

activate();
