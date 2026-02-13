import mongoose from "mongoose";
import { type } from "os";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // required: true,
      minlength: 4,
    },
    rootDirId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Directory",
      required: true,
    },
    picture: {
      type: String,
      default: "",
    },
    storageUsed: {
      type: Number,
      default: 0,
    },

    maxStorageLimit: {
      type: Number,
      default: 256 * 1024 * 1024,
    },
    role: {
      type: String,
      enum: ["Admin", "Manager", "User"],
      default: "User",
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
    versionKey: false,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
