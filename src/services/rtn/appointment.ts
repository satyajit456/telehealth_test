import { sendNotification } from "../notification";
import Users from "../../models/users";
import moment from "moment-timezone";
import { findDoctorProfile } from "../../controller/doctor";
import { findPatientProfile } from "../../controller/patient";
import { IAppointmentScheduleData } from "../../interface/appointment";


export async function scheduleAppointment(data: IAppointmentScheduleData) {
  try{
  const {
    // appointmentId,
    appointmentTime,
    date,
    doctorId,
    patientId,
    reason,
    type,
  }:any = data;

  const doctor:any = await findDoctorProfile(doctorId.toString());
  const patient:any = await findPatientProfile(patientId.toString());

  if(patientId){
    let reminderText;
    switch(type) {
        case 'call':reminderText = "Please ensure you are available 10 minutes before your scheduled call time.";
            break;
        case 'location':
            reminderText = `Please arrive at [location] 10 minutes prior to your appointment time.`;
            break;
        case 'chat':
            reminderText = "Please log in to the platform 10 minutes before your scheduled chat session.";
            break;
        default:
            reminderText = "Please make sure to arrive at least 10 minutes before your scheduled time.";
    }
    let notifData = {userId: patientId, notificationType: 'info', subject: 'Your appointment confirmed!', body:''} 
    notifData.body = `<div><p>Your appointment with Dr. ${doctor?.user?.firstName} ${doctor?.user?.lastName} is confirmed!</p><p><strong>Date:</strong> ${moment(date).format('DD MMM, YYYY')}</p><p><strong>Time:</strong> ${appointmentTime}</p><p><strong>Schedule Type:</strong> ${type}</p><p>${reminderText}</p></div>`

    await sendNotification(notifData)
  }

  if(doctorId){
    let notifData = {userId: doctorId, notificationType: 'info', subject: 'New appointment booking!', body:''} 
    notifData.body = `<div><p>You have a new appointment booking!</p><p>Patient: ${patient?.user?.firstName} ${patient?.user?.lastName}</p><p>Date: ${moment(date).format('DD MMM, YYYY')}, Time: ${appointmentTime}</p><p>Resion: ${reason}</p><p>Please review and available.</p></div>`;
    await sendNotification(notifData);    
  }
 } catch (error) {
    console.error('Error sending notification:', error);
 }
}
