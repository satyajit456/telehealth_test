import mongoose, { Schema } from "mongoose";
import { messageOptions } from "../utils/constants";
import { IChats } from "../interface/common";

const ChatsSchema = new Schema<IChats>(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Appointments",
    },
    sender:{
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
    receiver: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
    files: [String],
    read: { type: Boolean, required: true, default:false },
    status: { type: Boolean, required: true, default:true },
    message: { type: String, required: true },
    messageType: { type: String, required: true, enum: messageOptions, default:'text' },
    // chatId: { type: String, required: true },
  },
  { timestamps: true }
);

const Chats = mongoose.model<IChats>("chats", ChatsSchema);

export default Chats;
