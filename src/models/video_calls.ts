import mongoose, { Schema } from "mongoose";
import { IVideoCalls } from "../interface/common";

const VideoCallsSchema = new Schema<IVideoCalls>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "DoctorProfile",
    },
    patientId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "PatientProfile",
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Appointments",
    },
    details: { type: String, required: false },
    videoCallLink: { type: String, required: false },
    status: { type: Boolean, required: true },
    updatedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
  },
  { timestamps: true }
);


const VideoCalls = mongoose.model<IVideoCalls>("video_calls", VideoCallsSchema);

export default VideoCalls;