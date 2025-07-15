/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as dotenv from "dotenv";
dotenv.config();

import { setGlobalOptions } from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import twilio from "twilio";
import { FieldValue } from "firebase-admin/firestore";

setGlobalOptions({ maxInstances: 10 });
admin.initializeApp();
const db = admin.firestore();

// Twilio config (use environment variables for security)
const twilioAccountSid = functions.config().twilio?.sid || process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = functions.config().twilio?.token || process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = functions.config().twilio?.phone || process.env.TWILIO_PHONE_NUMBER;
const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

// 1. Analyze Image (Vision API or Gemini)
export const analyzeImage = onCall(async (request) => {
  // TODO: Integrate with Google Vision API or Gemini for real labels
  // For now, return mock labels
  return { labels: ["electronics", "device", "phone", "technology", "mobile"] };
});

// 2. Find Matches (Smart Matching)
export const findMatches = onCall(async (request) => {
  // TODO: Integrate with Gemini for smart similarity
  // For now, return mock matches
  return { matches: [] };
});

// 3. Send Claim OTP (SMS via Twilio)
export const sendClaimOTP = onCall(async (request) => {
  const { itemId, userEmail, userPhone } = request.data;
  if (!userPhone) {
    throw new Error("Phone number required for OTP");
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Store OTP in Firestore (for demo, expires in 10 min)
  await db.collection("otps").doc(`${itemId}_${userEmail}`).set({
    otp,
    itemId,
    userEmail,
    userPhone,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  // Send OTP via Twilio SMS
  try {
    await twilioClient.messages.create({
      body: `Your verification code is: ${otp}`,
      from: twilioPhone,
      to: userPhone,
    });
  } catch (err) {
    console.error("Twilio SMS error:", err);
    throw new Error("Failed to send OTP SMS");
  }
  return { success: true };
});

// 4. Verify Claim OTP
export const verifyClaimOTP = onCall(async (request) => {
  const { itemId, userEmail, otp } = request.data;
  const otpId = `${itemId}_${userEmail}`;
  const otpDoc = await db.collection("otps").doc(otpId).get();
  if (!otpDoc.exists || otpDoc.data()?.otp !== otp) {
    throw new Error("Invalid OTP");
  }
  // Mark item as claimed
  await db.collection("items").doc(itemId).update({
    status: "claimed",
    claimantEmail: userEmail,
    claimedAt: FieldValue.serverTimestamp(),
  });
  await db.collection("otps").doc(otpId).delete();
  return { success: true };
});

// 5. Moderate Item (Admin)
export const moderateItem = onCall(async (request) => {
  const { itemId, action } = request.data; // action: 'approve' | 'reject'
  await db.collection("items").doc(itemId).update({
    isApproved: action === "approve",
    isRejected: action === "reject",
    moderatedAt: FieldValue.serverTimestamp(),
  });
  return { success: true };
});

// 6. Flag Duplicate
export const flagDuplicate = onCall(async (request) => {
  const { itemId, duplicateOfId } = request.data;
  await db.collection("items").doc(itemId).update({
    duplicateOf: duplicateOfId,
    isDuplicate: true,
  });
  return { success: true };
});

// 7. Send Match Notification (FCM, on new item)
export const sendMatchNotification = onDocumentCreated("items/{itemId}", async (event) => {
  const item = event.data?.data();
  // TODO: Implement smart matching and FCM notification logic
  // For now, just log
  console.log("New item created, would check for matches and notify.", item);
});
