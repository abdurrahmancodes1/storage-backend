import mongoose from "mongoose";
const uri = process.env.MONGO_URI;

export async function connectDB() {
  try {
    await mongoose.connect(uri, {
      dbName: "storageApp",
    });
    console.log("Mongoose connected");
  } catch (error) {
    console.log(error);
    console.log("failed connetion with db");
    process.exit(1);
  }
}
