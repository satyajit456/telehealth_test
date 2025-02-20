export const messages = {
  userNotFound: 'User not found',
  InvalidValues: 'Please enter valid values',
  InvalidUser: 'Please enter valid login detail',  
  inActiveUser: 'User Account not activated now. please activate you account',
  InvalidPassword: 'Please enter valid password',
  InvalidOldPassword: 'Please enter correct old password',
  TokenRequired: 'Authorization token missing',
  InvalidToken: 'Invalid Token',
  successCall: 'Success',
  failCall: 'Getting some error',
  noAccess: "You don't have access to perform this action",
  success: "Successfull",
  forgotPassword: 'Please check your email for reset your password',
  notFound: "Data not found",
  unableToDelete: "Unable to delete data, It may not exist",
  removedItem: 'Data remove/delete successfull',
  roleNotExist: "User Role not exist",
  successLogout:"Successfully logged out",
  
  appointment:{
    slotNoAvailable: "No available slots for this date or time",
    slotAlreadyBooked: 'Slot already booked by another user'
  },
  token:{
    exist: "Token already exists",
    removeDeviceToken:"Device token removed successfully"
  },

  idRequired: (val:string)=> `${val} ID is required`,
  idNotMatch: (val:string)=> `${val} ID not matched`,
};
