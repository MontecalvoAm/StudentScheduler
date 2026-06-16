import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@scheduletracker.app";
const APP_NAME = "Schedule Tracker";

// ─── Account Creation ─────────────────────────────────────────────────────────
export async function sendWelcomeEmail(params: {
  to: string;
  firstName: string;
  tempPassword: string;
  role: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Welcome to ${APP_NAME} — Account Created`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ${APP_NAME}</h2>
        <p>Hello, <strong>${params.firstName}</strong>!</p>
        <p>Your account has been created with the role: <strong>${params.role}</strong>.</p>
        <p>Your temporary password is:</p>
        <div style="background:#f4f4f4; padding:12px; border-radius:6px; font-size:18px; letter-spacing:2px; font-family:monospace;">
          ${params.tempPassword}
        </div>
        <p><strong>Please change your password immediately after logging in.</strong></p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/" style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Login Now</a></p>
        <hr/>
        <p style="color:#999; font-size:12px;">This is an automated message. Do not reply.</p>
      </div>
    `,
  });
}

// ─── Schedule Change ──────────────────────────────────────────────────────────
export async function sendScheduleChangeEmail(params: {
  to: string;
  firstName: string;
  subjectName: string;
  changeDescription: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Schedule Update — ${params.subjectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Schedule Change Notification</h2>
        <p>Hello, <strong>${params.firstName}</strong>!</p>
        <p>There has been a change to your schedule for <strong>${params.subjectName}</strong>:</p>
        <div style="background:#fef9c3; padding:12px; border-radius:6px; border-left:4px solid #eab308;">
          ${params.changeDescription}
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/student/schedule" style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">View My Schedule</a></p>
        <hr/>
        <p style="color:#999; font-size:12px;">This is an automated message. Do not reply.</p>
      </div>
    `,
  });
}

// ─── Low Attendance Alert ─────────────────────────────────────────────────────
export async function sendLowAttendanceAlert(params: {
  to: string;
  firstName: string;
  subjectName: string;
  attendancePercentage: number;
  threshold: number;
}): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `⚠️ Low Attendance Alert — ${params.subjectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>⚠️ Low Attendance Warning</h2>
        <p>Hello, <strong>${params.firstName}</strong>!</p>
        <p>Your attendance in <strong>${params.subjectName}</strong> has dropped to 
           <strong style="color:#dc2626;">${params.attendancePercentage.toFixed(1)}%</strong>, 
           which is below the required threshold of <strong>${params.threshold}%</strong>.</p>
        <p>Please contact your instructor if you have concerns.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/student/attendance" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">View Attendance</a></p>
        <hr/>
        <p style="color:#999; font-size:12px;">This is an automated message. Do not reply.</p>
      </div>
    `,
  });
}

// ─── Password Reset ───────────────────────────────────────────────────────────
export async function sendPasswordResetEmail(params: {
  to: string;
  firstName: string;
  resetToken: string;
}): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${params.resetToken}`;
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `${APP_NAME} — Password Reset Request`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello, <strong>${params.firstName}</strong>!</p>
        <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <p><a href="${resetUrl}" style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Reset Password</a></p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
        <hr/>
        <p style="color:#999; font-size:12px;">This is an automated message. Do not reply.</p>
      </div>
    `,
  });
}
