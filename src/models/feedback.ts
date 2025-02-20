import mongoose, { Schema } from "mongoose";
import { IFeedback } from "../interface/common";


const FeedbackSchema = new Schema<IFeedback>(
  {
    feedbackBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
    feedbackTo: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Appointments",
    },
    feedbackId: {type: String, unique: true},
    status: { type: Boolean, required: true, default:true },
    feedbackText: { type: String },
    rating: { type: Number, required: true, min: 0, max: 5 },
    // sender:{
    //   type: Schema.Types.ObjectId,
    //   required: true,
    //   ref: "Users",
    // },
    // receiver: {
    //   type: Schema.Types.ObjectId,
    //   required: true,
    //   ref: "Users",
    // },
  },
  { timestamps: true }
);

const Feedback = mongoose.model<IFeedback>("feedbacks", FeedbackSchema);

export default Feedback;
