import "./constants";
import { Types } from "mongoose";
export const ObjectId = Types.ObjectId;
export const isValidObjectId = (id:string | Types.ObjectId) => Types.ObjectId.isValid(id)
const sessionTimeoutTime = process.env.session_timeout_time as string;
const sessionTimeoutType = process.env.session_timeout_type as string;
export const sessionTimeOut:any =  sessionTimeoutTime + sessionTimeoutType;
export const Moment = require("moment-timezone");
// export const async = require('async');
export const dateFormat = "YYYY-MM-DD";
export const setSuccess = (data:any | null, type:string | null = 'get', message:string = 'success') => {
  const dataValue = data ? data : null;
  return {...dataValue, message: type === 'new'? 'created successfully':message, status: type === 'new' ? 201 : 200,}  
};

export const setError = (e:any, code?:number) => {
  if (!code) {
    code = 400;
  }
  let err:any = new Error(e);
  err.messages = err.message || `${e.message}` || e;
  err.status = code;
  return err;
};
export const throwError = (err:string | object, code = 400) => {
  if (typeof err === "string") {
    throw setError(err, code);
  } else {
    throw err;
  }
};

export const isBetween = function (start: any, end:any, value: any) {
  var min = Math.min(start, end),
    max = Math.max(start, end);
  return value > min && value < max;
};
export const replaceAll = function (string: string, search: any, replacement: any) {
  return string.split(search).join(replacement);
};
export const getDomain = function (string: string) {
  return string.replace(/.*@/, "");
};


export const toISO = (date: any, format = "YYYY-MM-DD") => {
  return new Date(Moment(date).format(format));
};

export const getHost = (url: string | URL) => {
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch (e) {
    return "";
  }
};
export const normalizePhone = (value: string) => {
  try {
    if (!value) return value;
    const onlyNo = value.replace(/[^\d]/g, "");
    if (onlyNo.length <= 3) return onlyNo;
    if (onlyNo.length <= 7)
      return `(${onlyNo.slice(0, 3)}) ${onlyNo.slice(3, 7)}`;
    return `(${onlyNo.slice(0, 3)}) ${onlyNo.slice(3, 6)}-${onlyNo.slice(
      6,
      10
    )}`;
  } catch (err) {
    return "";
  }
};

/**
 * Checks if a valid array
 * @param arr: array
 */
export const strictValidArray = (arr: any) => arr && Array.isArray(arr);

/**
 * Checks if a valid array with length
 * @param arr: array
 */
export const strictValidArrayWithLength = (arr: string | any[]) =>
  strictValidArray(arr) && !!arr.length;

/**
 * Checks if a valid object
 * @param obj: object
 */
export const strictValidObject = (obj: any) =>
  obj &&
  obj === Object(obj) &&
  Object.prototype.toString.call(obj) !== "[object Array]";

/**
 * Checks if a valid object with keys
 * @param obj: object
 */
export const strictValidObjectWithKeys = (obj: {}) =>
  strictValidObject(obj) && !!Object.keys(obj).length;

/**
 * Checks if a valid object with specified keys
 * @param obj: object
 * @param parameterKeys: array
 */
// export const validObjectWithParameterKeys = (obj: {}, parameterKeys = []) =>
//   strictValidObjectWithKeys(obj) &&
//   strictValidArrayWithLength(parameterKeys) &&
//   Object.keys(obj).filter((k:any) => k parameterKeys.indexOf(k) > -1).length ===
//     parameterKeys.length;

/**
 *
 * @param {*} val
 * @returns boolean value
 */
export const validValue = (val: string | null | undefined) =>
  typeof val !== "undefined" &&
  val !== undefined &&
  val !== null &&
  val !== "undefined";

/**
 * Checks if given value is strictly a number
 * @param num: number
 */
export const strictValidNumber = (num: any) =>
  validValue(num) && typeof num === "number" && !isNaN(num);

/**
 * Checks if a valid string
 * @param str: string
 */
export const strictValidString = (str: any) => !!str && typeof str === "string";

/**
 * Checks if given value is function
 * @param fn: function
 */
export const isFunction = (fn: any) => validValue(fn) && typeof fn === "function";

/**
 * Time Difference from array times values
 * @param {*} array
 * @returns
 */
export const checkTimeValue = (st: any, et: any) => {
  let startTime = Moment(st, "HH:mm a");
  let endTime = Moment(et, "HH:mm a");
  const duration = Moment.duration(endTime.diff(startTime));
  const hours = parseInt(duration.asHours());
  // const minutes = parseInt(duration.asMinutes()) % 60;
  return hours;
};

export const strictTimeDifference = async (
  value: any,
  currentTime = Moment(new Date(), "HH:mm a")
) => {
  try {
    if (strictValidArrayWithLength(value)) {
      return value.map((v: any) => {
        return checkTimeValue(v, currentTime);
      });
    }
    if (validValue(value) && strictValidString(value)) {
      return checkTimeValue(value, currentTime);
    }
  } catch (e) {
    console.log("e", e);
  }
};

/**
 * all enumerateDaysBetweenDates data from start to end
 */

export const enumerateDaysBetweenDates = (startDate: any, endDate: any) => {
  let date = [];
  while (Moment(startDate) <= Moment(endDate)) {
    date.push(Moment(startDate));
    startDate = Moment(startDate).add(1, "days"); //.format(dateFormat);
  }
  // while (new Date(startDate) <= new Date(endDate)) {
  //   date.push(new Date(startDate));
  //   startDate = (new Date(startDate)).setHours(24,0,0,0)  //.format("YYYY-MM-DD");
  // }
  return date;
};
