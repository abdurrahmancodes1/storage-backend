import { model, Schema } from "mongoose";

const fileSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    extension: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    parentDirId: { type: Schema.Types.ObjectId, ref: "Directory" },
    size: { type: Number },
    isUploading: { type: Boolean, default: false },
  },
  { timestamps: true, strict: "throw" },
);

const File = model("File", fileSchema);
export default File;
