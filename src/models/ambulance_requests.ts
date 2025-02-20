import mongoose, { Schema } from "mongoose";
import { IAmbulanceReq } from "../interface/common";

const AmbulanceRequestsSchema = new Schema<IAmbulanceReq>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "PatientProfile",
    },
    status: { type: Number, enum: [0, 1, 2], required: true }, // 0 in-progress, 1 completed, 2 pending
    pickupLocation: { type: String, required: false },
    destination: { type: String, required: false },
    notes: { type: String, required: false },
    updatedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
  },
  { timestamps: true }
);

const AmbulanceRequests = mongoose.model<IAmbulanceReq>(
  "ambulance_requests",
  AmbulanceRequestsSchema
);

export default AmbulanceRequests;
