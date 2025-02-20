import mongoose, { Schema } from "mongoose";
import { appointmentType } from "../utils/constants";
import { IAppointment } from "../interface/appointment";
const AutoIncrement = require("mongoose-sequence")(mongoose);

const AppointmentsSchema = new Schema<IAppointment>(
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
    date: { type: Date, required: true },
    appointmentTime: { type: String, required: true },
    status: { type: Boolean, required: true, default:true },
    reason: { type: String, required: false },
    type:  { type: String, required: false, enum: appointmentType },
    videoCallLink: { type: String, required: false },
    paymentId:{
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
    // accepted: { type: Boolean, default: false },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
  },
  { timestamps: true }
);

AppointmentsSchema.plugin(AutoIncrement, {
  inc_field: "appointmentId",
  disable_hooks: false,
  start_seq: 80000,
});

const Appointments = mongoose.model<IAppointment>("appointments", AppointmentsSchema);

export default Appointments;
