import mongoose from "mongoose";

const gifSchema = new mongoose.Schema(
  {
    url: String,
    staticUrl: String,
    description: String,
    sortOrder: Number,
  },
  {
    toObject: {
      virtuals: true,
      transform: (doc: Document, ret: Record<string, unknown>) => {
        delete ret._id;
        return ret;
      },
    },
    toJSON: {
      virtuals: true,
      transform: (doc: Document, ret: Record<string, unknown>) => {
        delete ret._id;
        return ret;
      },
    },
    timestamps: true,
  }
);

const gifCategorySchema = new mongoose.Schema(
  {
    name: String,
    sortOrder: Number,
    imgUrl: String,
  },
  {
    toObject: {
      virtuals: true,
      transform: (doc: Document, ret: Record<string, unknown>) => {
        delete ret._id;
        return ret;
      },
    },
    toJSON: {
      virtuals: true,
      transform: (doc: Document, ret: Record<string, unknown>) => {
        delete ret._id;
        return ret;
      },
    },
    timestamps: true,
  }
);

const GifModel = mongoose.model("Gif", gifSchema);
const GifCategoryModel = mongoose.model("GifCategory", gifCategorySchema, "gif_categories");

export { gifSchema, GifModel, gifCategorySchema, GifCategoryModel };
