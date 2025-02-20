import  mongoose, { Schema } from 'mongoose';
import { IAddress, IChatGroup, ICategory, IDepartment, IDesignation, IMedicalHistory, IRole, IDeviceToken } from '../interface/common';

// Profile Role Schema
const RoleSchema = new Schema<IRole>({
  role: { type: String, required: true, unique:true },
  status: {type: Boolean, default: true },
},{
  timestamps: {
    createdAt: true,
    updatedAt: false,
  }
});
export const Roles = mongoose.model('roles', RoleSchema);

// Department Schema
const DepartmentSchema = new Schema<IDepartment>({
  name: { type: String, required: true, unique:true },
  note: { type: String, required: false,},
  icon: { type: String, required: false,},
  status: {type: Boolean, default: true },
  categoryId: [{
    type: Schema.Types.ObjectId,
    required: false,
    ref: "Category",
  }],
  updatedBy: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Users",
  },
},{
  timestamps: {
    createdAt: true,
    updatedAt: false,
  }
});
export const Department = mongoose.model('department', DepartmentSchema);

// Designation Schema
const DesignationSchema = new Schema<IDesignation>({
  name: { type: String, required: true, unique:true },
  status: {type: Boolean, default: true },
},{
  timestamps: {
    createdAt: true,
    updatedAt: false,
  }
});

export const Designation = mongoose.model('designation', DesignationSchema);

// Category Schema
const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true, unique:true },
  note: { type: String, required: false,},
  icon: { type: String, required: false,},
  departmentId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "department",
  },
  status: {type: Boolean, default: true },
},{
  timestamps: {
    createdAt: true,
    updatedAt: false,
  }
});

export const Category = mongoose.model('category', CategorySchema);

// Medical History Schema
const MedicalHistorySchema = new Schema<IMedicalHistory>({
  date: Date,
  departmentId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "department",
    },
  description: String,
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
},{
  timestamps: {
    createdAt: true,
    updatedAt: false,
  }
});
export const MedicalHistory = mongoose.model('medical_history', MedicalHistorySchema);

// Address Schema
export const AddressSchema = new Schema<IAddress>(
  {
    street: { type: String, required: false },
    nearBy: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    postalCode: { type: String, required: false },
    country: { type: String, required: false },
  },
  { _id: false } // Prevent _id field for this sub-schema
);


// Chat Group Schema
export const ChatGroupSchema = new Schema<IChatGroup>(
  {
    name: { type: String, required: false },
    status: { type: Boolean, required: false },
  },{
    timestamps: {
      createdAt: true,
      updatedAt: false,
    }
  });
export const ChatGroup = mongoose.model('chat_group', ChatGroupSchema);

// Device Token Schema
const DeviceTokenSchema = new mongoose.Schema<IDeviceToken>({
  userId: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 24 * 60 * 60, // Token documents will be automatically deleted after 60 days
  },
});

DeviceTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

export const DeviceToken = mongoose.model('DeviceToken', DeviceTokenSchema);
