const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        let uri = process.env.MONGODB_URI;

        // Automatically use the test database if in test mode
        // if (process.env.NODE_ENV === 'test') {
        //     console.log("Running in TEST mode - ensuring test database is used.");
        //     if (uri.includes('?')) {
        //         uri = uri.replace(/\/[^?]+(?=\?)/, '/test_promptprotect');
        //     } else {
        //         uri = uri.replace(/\/[^/]*$/, '/test_promptprotect');
        //     }
        // }

        console.log(uri);

        await mongoose.connect(uri);
        console.log(`MongoDB Connected to: ${mongoose.connection.name}`);
    } catch (err) {
        console.log("DB Error:", err);
        process.exit(1);
    }
};

module.exports = connectDB;
