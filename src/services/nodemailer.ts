"use strict";
import Nodemailer from "nodemailer";

const nodemailerFunction = async (content: any) => {
    const transporter = Nodemailer.createTransport({
        service:'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.gmailEmail,
            pass: process.env.gmailPassword
        }
    });
    // send mail with defined transport object
    await transporter.sendMail(content, function(error: any, info: { response: string; }){
        if (error) {
          console.log('eee',error);
        } else {
          console.log('Email sent: ' + info.response);
        }
    });
}

export const nodemailerFun = async (data: any) => nodemailerFunction(data).catch(console.error);
