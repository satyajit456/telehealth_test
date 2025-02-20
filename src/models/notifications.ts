import mongoose, { Schema } from "mongoose";
import { INotifications } from "../interface/common";

const NotificationsSchema = new Schema<INotifications>(
  {
    subject: { type: String, required: true },
    body: { type: String, required: true },
    sendId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      // required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: false,
    },
    type: { type: String, required: true, enum: ['email','rtn', 'email-rtn'], default:'rtn' },
    notificationType: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // lastLogin: { type: Date },
    // token: { type: String }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Notifications = mongoose.model<INotifications>("notifications", NotificationsSchema);

export default Notifications;
