// import { model, Schema } from "mongoose";

// const directorySchema = new Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//     },
//     userId: {
//       type: Schema.Types.ObjectId,
//       required: true,
//     },
//     parentDirId: {
//       type: Schema.Types.ObjectId,
//       default: null,
//       ref: "Directory",
//     },
//   },
//   {
//     strict: "throw",
//   }
// );

// const Directory = model("Directory", directorySchema);

// export default Directory;
import { model, Schema } from "mongoose";

const directorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    parentDirId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "Directory",
    },
    size: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

const Directory = model("Directory", directorySchema);
export default Directory;
