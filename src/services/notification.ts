import { nodemailerFun } from "./nodemailer";
import Notifications from "../models/notifications";
import { adminMessaging } from "./firebase";
import { DeviceToken } from "../models/common";

const activationEmail = async (data: {
  email: string;
  name: string;
  activatedToken: string;
  otp: number | string;
}) => {
  const emailContent = {
    from: '"TeleHealth" <mailaddress@yopmail.com>', // sender address
    to: data.email, // list of receivers
    subject: "Activate your account!!", // Subject line
    text: "Welcome", // plain text body
    html: `<div>
            Hi ${data.name}, <br / >
            Welcome to our company. <a href="${process.env.siteUrl}/${data.activatedToken}">click here</a> for activate you account for web. <br/>
            OTP: ${data?.otp} 
        </div>`,
  };
  return await nodemailerFun(emailContent);
};

const forgotPasswordEmail = async (data: {
  email: string;
  name: string;
  resetToken: string;
  otp: number | string;
}) => {
  const emailContent = {
    from: '"TeleHealth" <mailaddress@yopmail.com>', // sender address
    to: data.email, // list of receivers
    subject: "Forgot your password", // Subject line
    text: "Change your password", // plain text body
    html: `<div>
            Hi ${data.name}, <br />
            For reset your passowrd please <a href="${process.env.siteUrl}/${data.resetToken}">click here</a>. <br/>
            OTP: ${data?.otp}
        </div>`,
  };
  return await nodemailerFun(emailContent);
};

const passNotification = async (userId: any, message: any) => {
  const deviceTokens: any = await DeviceToken.find({ userId });
  const tokens = deviceTokens.map((dt: any) => dt?.token);
  if (tokens.length === 0) {
    return { message: "User token not available" };
  }
  const response: any = await adminMessaging.sendEachForMulticast({
    ...message,
    tokens,
  });

  // Clean up invalid tokens
  if (response.failureCount > 0) {
    const failedTokens = response.responses
      .map((resp: { success: any }, idx: string | number) =>
        resp.success ? null : tokens[idx]
      )
      .filter((token: any): token is string => token !== null);

    await DeviceToken.deleteMany({ token: { $in: failedTokens } });
  }
};

const sendNotification = async ({
  userId,
  subject,
  body,
  type,
  notificationType,
}: any) => {
  const notification: any = await Notifications.create({
    subject,
    body,
    type,
    userId,
    notificationType,
  });
  // Get user's device tokens
  // const deviceTokens:any = await DeviceToken.find({ userId });
  // const tokens = deviceTokens.map((dt:any) => dt?.token);
  // if (tokens.length === 0) {
  //   return notification;
  // }
  try {
    // Send FCM notification
    const message = {
      notification: { title: subject, body: body },
      data: {
        subject,
        body,
        type,
        notificationType,
        notificationId: notification._id.toString(),
        createdAt: notification.createdAt.toString(),
      },
    };
    await passNotification(userId, message);
    // const response:any = await adminMessaging.sendEachForMulticast(message);

    // // Clean up invalid tokens
    // if (response.failureCount > 0) {
    //   const failedTokens = response.responses
    //     .map((resp: { success: any; }, idx: string | number) => resp.success ? null : tokens[idx])
    //     .filter((token: any): token is string => token !== null);

    //   await DeviceToken.deleteMany({ token: { $in: failedTokens } });
    // }
  } catch (error) {
    console.error("Error sending FCM notification:", error);
  }
  return notification;
};

export {
  activationEmail,
  forgotPasswordEmail,
  sendNotification,
  passNotification,
};
