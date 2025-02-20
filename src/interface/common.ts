import { Document, Types } from "mongoose";

export interface IListQuery {
  limit?: string | number;
  page?: string | number;
  sortBy?: string;
  sort?: "asc" | "desc";
  status?: string;
  search?: string;
}

export interface IRole extends Document {
  role: string;
  status: boolean;
  _id: Types.ObjectId;
}

export interface IDepartment extends Document {
  name: string;
  status: boolean;
  note: string;
  icon: string;
  updatedBy?: Types.ObjectId;
  categoryId?: Types.ObjectId;
}

export interface IDesignation extends Document {
  name: string;
  status: boolean;
}

export interface ICategory extends Document {
  name: string;
  status: boolean;
  departmentId?: Types.ObjectId;
  note?: string;
  icon?: string;
}

export interface IMedicalHistory extends Document {
  date: Date | string;
  departmentId: Types.ObjectId;
  description?: string;
  doctorId?: Types.ObjectId;
  patientId?: Types.ObjectId;
}

export interface IAddress extends Document {
  street?: string;
  nearBy?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface IChatGroup extends Document {
  name?: string;
  status?: boolean;
}


// Define the Chats interface
export interface IChats extends Document {
  message: string;
  messageType?: string;
  files?: string[];
  sender: Types.ObjectId;
  receiver: Types.ObjectId; 
  appointmentId?: Types.ObjectId;
  timestamp?: string;
  read?: boolean;
  status?: boolean;
  isDoctor?: boolean;
  // chatId?: string;
}

// Define the Feedback interface
export interface IFeedback extends Document {
  feedbackText?: string;
//   sender: Types.ObjectId;
//   receiver: Types.ObjectId;
  feedbackBy?: Types.ObjectId;  
  feedbackTo?: Types.ObjectId;  
  appointmentId?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  timestamp?: string;
  feedbackId: string;
  status?: boolean;
//   isDoctor?: boolean;
  rating?: number;
}

export interface IFeedbackAggResult {
  totalRatings: number;
  count: number;
  averageRating: number;
}

// Define the Notifications interface
export interface INotifications extends Document {
  subject: string;
  body: string;
  sendId?: Types.ObjectId;
  receiverId?: Types.ObjectId[];
  type?: string;
  updatedBy?: Types.ObjectId;
  userId?: Types.ObjectId;
  isRead?: boolean;
  notificationType?: string;
}

export interface IDeviceToken extends Document {
  userId: string;
  token: string;
  createdAt: Date;
}


export interface IAmbulanceReq extends Document {
  // doctorId?: Types.ObjectId;  
  patientId?: Types.ObjectId;  
  // appointmentId?: Types.ObjectId;
  notes: string;
  destination: string;
  pickupLocation?: string;
  updatedBy?: Types.ObjectId;
  timestamp?: string;
  status?: boolean;
}


interface IworkingDays {
  day: string; // e.g., "Monday", "Tuesday", etc.
  startTime: string,
  endTime: string,
  startBreakTime: string,
  endBreakTime: string,
  dayOff: boolean,
  resion: string,
}

export interface IDoctor extends Document {
  gender: string;
  specialization: string[];
  experienceYears: number;
  workingDays?: IworkingDays[];
  breakTime?: {start: string; end:string};
  consultTime?: number;
  instagram: string;
  facebook: string;
  linkedIn: string;
  twitter: string;
  bloodGroup?: string;
  // documents:[]
  timestamp?: string;
  status?: boolean;
  dob?: Date | string;
  rating?: number;
  totalFeedback?: number;
  consultationFee?: number;
  detail: string;
  department?: Types.ObjectId;
  userId?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  category?: Types.ObjectId;
}


export interface IPatient extends Document {
  dob?: Date | string;
  gender: string;
  status?: boolean;
  bloodGroup?: string;
  verified?: Types.ObjectId;
  emergencyContact: string;
  userId?: Types.ObjectId;
  appointments?: Types.ObjectId;
  patientId: number;
  likedDoctors?: Types.ObjectId;
  // documents:[]
  timestamp?: string;
  detail: string;
  updatedBy?: Types.ObjectId;
}


export interface IPayment extends Document {
  doctorId?: Types.ObjectId;
  patientId?: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  amount?: number;
  timestamp?: string;
  status?: boolean;
  paymentStatus?: boolean;
  paymentDate?: AlignSetting;
  transactionId?: String;
  method?: String;
  PaymentId?: number;
}


// Define the Users interface
export interface IUsers extends Document {
  firstName: string;
  lastName: string;
  name?: string;
  email: string;
  secondaryEmail?: string;
  username: string;
  countryCode: string;
  phone: string;
  photo: string;
  status: boolean;
  role: Types.ObjectId;
  roleName: string;
  address?: IAddress;
  password?: string;
  activatedToken?: string | object;
  resetToken?: string;
  token?: string;
  userId: number;
  isActivated?: boolean;
  assignTo?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  getUser: (fieldValue: any, fieldKey?: string) => any;
  lastLogin?: string;
  videoCallEnabled?: boolean;
  chatEnabled?: boolean;
  otp?: string,
  otpExpires?: Date,
  provider?: string,
  socialId?: string,
  contactUser?: Types.ObjectId[];
  _id: Types.ObjectId;
}


export interface IVideoCalls extends Document {
  doctorId?: Types.ObjectId;  
  patientId?: Types.ObjectId;  
  appointmentId?: Types.ObjectId;
  details: string;
  videoCallLink?: string;
  updatedBy?: Types.ObjectId;
  timestamp?: string;
  status?: boolean;
}