import { IAppointmentSlot } from "../../interface/appointment";
import Appointments from "../../models/appointments";
import { ObjectId } from "../../utils/global";

// Check booked slots
export const checkBookedSlot = async ({
  doctorId,
  date,
  time,
  patientId,
}: IAppointmentSlot) => {
  let filter: IAppointmentSlot = { date: new Date(date) };
  if (doctorId) filter.doctorId = new ObjectId(doctorId);
  if (patientId) filter.patientId = new ObjectId(patientId);
  if (time) filter.appointmentTime = time;
  return Appointments.find(filter, { appointmentTime: 1, status: 1, type: 1 });
};
