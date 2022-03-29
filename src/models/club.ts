import mongoose, { Document } from "mongoose";
import User from '../models/User';

const Schema = mongoose.Schema;
const model = mongoose.model;


const clubSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  usersList: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  category: { type: String, required: true },
},
  { timestamps: true }
);

export const ClubModel = mongoose.model("Club", clubSchema);
