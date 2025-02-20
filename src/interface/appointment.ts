import { Types } from "mongoose";
import { IListQuery } from "./common";


export interface IAppointment extends Document {
  doctorId?: Types.ObjectId;  
  patientId?: Types.ObjectId;
  reason: string;
  videoCallLink?: string;
  timestamp?: string;
  status?: boolean;
  appointmentTime?: String;
  date?: Date | String;
  type?: String;
  paymentId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

// Define the Appointment type
// export interface IAppointment extends Document {
//   doctorId: Types.ObjectId;
//   patientId: Types.ObjectId;
//   status: boolean;
//   appointmentTime: string;
//   date: Date | string;
//   type: string;
//   createdBy: Types.ObjectId;
//   updatedBy: Types.ObjectId;
//   reason?: string;
//   _id?:Types.ObjectId;
// }

export interface IAppointmentScheduleData  extends IAppointment{
  appointmentId?: Types.ObjectId;
  _id?:Types.ObjectId;
}

// Type for query parameters
export interface IAppointmentQuery extends IListQuery {
  doctorId?: Types.ObjectId | string;
  patientId?: Types.ObjectId | string;
}

export interface IMatchFilter {
  status: boolean;
  doctorId?: Types.ObjectId;
  patientId?: Types.ObjectId;
}

export interface IAppointmentSlot {
  date: Date | string;
  doctorId?: Types.ObjectId | string;
  patientId?: Types.ObjectId | string;
  appointmentTime?: string;
  time?: string;
}

export interface IUpdateAppointmentRequest {
  status?: boolean;
  reason?: string;
  appointmentTime?: string;
  type?: string;
}
