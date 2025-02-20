import mongoose, { Schema } from "mongoose";
import { IPayment } from "../interface/common";
const AutoIncrement = require("mongoose-sequence")(mongoose);

const PaymentsSchema =  new Schema<IPayment>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "PatientProfile",
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "DoctorProfile",
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Appointments",
    },
    amount: { type: Number, required: true },
    paymentStatus: { type: Boolean, default: false },
    paymentDate: { type: Date, required: true },
    transactionId: { type: String, required: true, unique: true },
    PaymentId: {type: Number},
    method: {
      type: String,
      required: true,
      enum: ["credit card", "cash", "debit card"],
    },
  },
  { timestamps: true });

PaymentsSchema.pre("save", async function (next) {
  // this.wasNew = this.isNew;
  // console.log('save', this);
  // if (this.accountNumber !== "") {
  //   this.accountNo = "xxxxxxxxxxxx" + this.accountNumber.slice(-4);
  // }
  next();
});

PaymentsSchema.plugin(AutoIncrement, {
  inc_field: "PaymentId",
  disable_hooks: false,
  start_seq: 10000,
});

const Payments = mongoose.model < IPayment > ("payments", PaymentsSchema);

export default Payments;
