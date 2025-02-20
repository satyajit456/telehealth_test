import mongoose, { Schema } from "mongoose";
import { genderOptions, bloodGroupOptions } from "../utils/constants";
import { IPatient } from "../interface/common";
const AutoIncrement = require("mongoose-sequence")(mongoose);


const patientSchema = new Schema<IPatient>(
  {
    dob: { type: Date, required:false },
    gender: { type: String, enum: genderOptions, required:false },
    status: { type: Boolean, required: true, default: true },
    detail: String,
    bloodGroup: {
      type: String,
      enum: bloodGroupOptions,
      required: false,
    },
    verified: {
      type: Boolean,
      default: false, // Initially set to false
    },
    emergencyContact: { type: String },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
    likedDoctors: [{
      type: Schema.Types.ObjectId,
      required: false,
      ref: "DoctorProfile",
    }],
    appointments: [Schema.Types.ObjectId],
    updatedBy: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Users",
    },
    patientId: Number,
    // documents:{
    //   type: Array,
    // }
  },
  {
    id: false,
    timestamps: true,
  }
  // { versionKey: '_somethingElse' }  // if you want to change __v key value (__v = ''versionKey')
);

patientSchema.pre("save", async function (next) {
  // this.wasNew = this.isNew;
  next();
});

// post function used
patientSchema.post("save", async function (error:any, doc:any, next:any) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(
      new Error(
        error.keyValue[Object.keys(error.keyValue)[0]] +
          " is duplicate key value"
      )
    );
  } else {
    next();
  }
});

patientSchema.pre("findOneAndUpdate", async function (next) {
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate) {
    // this.oldUserName = docToUpdate.name;
  }
});

// patientSchema.pre('updateOne', function() {
//   this.set({ updatedAt: new Date() });
// });

// Instance Method used for get single user detail
patientSchema.methods.getProfile = function (fieldValue:any, fieldKey = "_id") {
  const projectionData = {
    __v: 0,
  };
  return mongoose
    .model("users")
    .find({ [fieldKey]: fieldValue }, projectionData);
};


patientSchema.plugin(AutoIncrement, {
  inc_field: "patientId",
  disable_hooks: false,
  start_seq: 50000,
});
// disable_hooks: If true, the counter will not be incremented on saving a new document. Default false.

const PatientProfile = mongoose.model<IPatient>("patient_profile", patientSchema);

export default PatientProfile;
