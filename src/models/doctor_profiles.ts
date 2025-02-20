import mongoose, { Schema } from "mongoose";
import { genderOptions, bloodGroupOptions, weekDays } from "../utils/constants";
import { IDoctor } from "../interface/common";
const AutoIncrement = require("mongoose-sequence")(mongoose);


const DoctorSchema = new Schema<IDoctor>(
  {
    dob: { type: Date,  required:true },
    gender: { type: String, enum: genderOptions, required: true },
    status: { type: Boolean, required: true, default: true },
    specialization: [String],
    bloodGroup: { type: String, enum: bloodGroupOptions },
    experienceYears: { type: Number,  required: true },
    consultTime:{ type: Number,  required: false, default: 20 },
    workingDays: [{
      day: { type: String, required: true, enum: weekDays },
      startTime: { type: String, required: true,},
      endTime: { type: String, required: true,},
      dayOff: { type: Boolean, required: true, default:false},
      resion: { type: String, required: true,},
    }],
    breakTime: {      
      start: { type: String, required: true,},
      end: { type: String, required: true,},
    },
    rating: { type: Number, default: 0 },
    totalFeedback: { type: Number, default: 0 },
    consultationFee: { type: Number },
    detail: { type: String },
    department: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Departments",
    },    
    category: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
    instagram: { type: String },
    facebook: { type: String },
    linkedIn: { type: String },
    twitter: { type: String },
    updatedBy: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Users",
    },
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

// ProfileSchema.pre('validate', function (next) {
//   if (this.address) {
//     let addressField =
//       (Object.keys(this.address).length > 0 &&
//         ['street', 'city', 'state', 'country'].find(
//           (v) => !this.address.hasOwnProperty(v)
//         )) ||
//       '';
//     if (addressField) {
//       return next(new Error(`${addressField} field required`));
//     }
//   }
//   next();
// });

DoctorSchema.pre("save", async function (next) {
  // this.wasNew = this.isNew;
  next();
});

// post function used
DoctorSchema.post("save", async function (error: any, doc: any, next: any) {
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

DoctorSchema.pre("findOneAndUpdate", async function (next) {
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate) {
    // this.oldUserName = docToUpdate.name;
  }
});

// DoctorSchema.pre('updateOne', function() {
//   this.set({ updatedAt: new Date() });
// });

// Instance Method used for get single user detail
DoctorSchema.methods.getProfile = function (fieldValue: any, fieldKey = "_id") {
  const projectionData = {
    __v: 0,
  };
  return mongoose
    .model("users")
    .find({ [fieldKey]: fieldValue }, projectionData);
};

// Static Method used for get single user hobies
// DoctorSchema.static.getUserHobby = function(userId) {
//   return mongoose.model('users').find({_id: userId},)
// };

// virtual set value
// DoctorSchema.virtual('fullName').set(function(v){
//   console.log('name', this, v);
//   return this.firstName + ' ' + this.lastName;
// })

DoctorSchema.plugin(AutoIncrement, {
  inc_field: "id",
  disable_hooks: false,
  start_seq: 40000,
});
// disable_hooks: If true, the counter will not be incremented on saving a new document. Default false.

const DoctorProfile = mongoose.model<IDoctor>(
  "doctor_profiles",
  DoctorSchema
);

export default DoctorProfile;
