import mongoose, { Schema } from "mongoose";
import { generateJWTToken } from "../services/auth";
import bcrypt from "bcrypt";
import { AddressSchema } from "./common";
import { socialOptions } from "../utils/constants";
import { IUsers } from "../interface/common";
const AutoIncrement = require("mongoose-sequence")(mongoose);


const UsersSchema = new Schema<IUsers>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    photo: { type: String, },
    name: String,
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v: string) =>
          /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
            v
          ),
        message: (props: { value: string }) =>
          `${props.value} is not a valid email address!`,
      },
    },
    secondaryEmail: {
      type: String,
      unique: false,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v: string) =>
          /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
            v
          ),
        message: (props: { value: string }) =>
          `${props.value} is not a valid secondary email address!`,
      },
    },
    username: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
    },
    countryCode: { type: String, required: false },
    phone: {
      type: String,
      validate: {
        validator: function (v: string | any[]) {
          // return /\d{3}-\d{3}-\d{4}/.test(v);      // checked phone not format xxx-xxx-xxxx
          return v.length === 10;
        },
        message: (props: { value: any }) =>
          `${props.value} is not a valid phone number!`,
      },
      required: [false, "User phone number required"],
    },
    status: { type: Boolean, required: true, default: true },
    address: { type: AddressSchema, required: false },
    role: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Roles",
    },
    /*roles: [String],*/
    password: { type: String },
    otp: { type: String },
    otpExpires: { type: Date },
    activatedToken: { type: String },
    resetToken: { type: String },
    isActivated: {type: Boolean, default:false},
    userId: Number,
    videoCallEnabled: { type: Boolean, default: false },
    chatEnabled: { type: Boolean, default: false },
    provider: {
      type: String,
      enum: socialOptions
    },
    socialId: {
      type: String,
    },
    assignTo: {
      type: Schema.Types.ObjectId,
      // required: true,
      ref: "users",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    lastLogin: { type: Date },
    token: { type: String },    
    contactUser: [{
      type: Schema.Types.ObjectId,
      required: true,
      ref: "users",
      default: []
    }], 
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

UsersSchema.pre("validate", function (next) {
  if (this.address) {
    let addressField =
      (Object.keys(this.address).length > 0 &&
        ["street", "city", "state", "country"].find(
          (v) => !this.address?.hasOwnProperty(v)
        )) ||
      "";
    if (addressField) {
      return next(new Error(`${addressField} field required`));
    }
  }
  next();
});

// Pre-save middleware for the User schema
UsersSchema.pre("save", async function (next: any) {
  if (this.firstName !== "" && this.lastName !== "") {
    this.name = this.firstName.trim() + " " + this.lastName.trim();
  }
  const password = this.password || "";
  if (password !== "") {
    const encryptedPassword: string =
      (await bcrypt.hash(password, Number(process.env.saltRounds))) || "";
    this.password = encryptedPassword;
  }
  if (this.isNew) {
    this.activatedToken = (await generateJWTToken(this, "2h")) || "";
  }
  next();
});

// post function used
UsersSchema.post(
  "save",
  async function (error: any, doc: IUsers, next: any) {
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
  }
);


UsersSchema.pre("findOneAndUpdate", async function (next) {
  const docToUpdate = await this.model.findOne(this.getQuery());
  // console.log('docToUpdate', docToUpdate)
  if (docToUpdate) {
    // this.oldUserName = docToUpdate.name;
    // this.set({ oldUserName: docToUpdate.name }); // new way
  }
  // this.set({ updatedAt: new Date() });
});

// Instance Method used for get single user detail
UsersSchema.methods.getUser = function (
  this: IUsers,
  fieldValue: any,
  fieldKey = "_id"
) {
  const projectionData = {
    activatedToken: 0,
    resetToken: 0,
    password: 0,
    // role: 0,
    otp: 0 ,
    otpExpires: 0,
  };

  return mongoose
    .model("users").aggregate([
    { $match: { [fieldKey]: fieldValue } },
    // Lookup to join with the 'roles' collection based on the 'role' field
    {$lookup: {
      from: "roles",
      localField: "role",
      foreignField: "_id",
      as: "roleName",
      pipeline: [
        { $match: { status: true } },
        { $project: { role: 1 } },
      ],
    },
  },
  { $unwind: "$roleName" },
  {$set: {"roleName": "$roleName.role"}},
    {
      $project: {
        ...projectionData,
      },
    },
  ])
  .then((result: any) => {
      return result.length > 0 ? result[0] : null;
  })
  .catch((error) => {
    // Handle error if necessary
    throw error;
  });

};


// Apply AutoIncrement plugin to add userId
UsersSchema.plugin(AutoIncrement, {
  inc_field: "userId",
  start_seq: 1,
  disable_hooks: false, // disable_hooks: If true, the counter will not be incremented on saving a new document. Default false.
});

const Users = mongoose.model<IUsers>("users", UsersSchema);

export default Users;
