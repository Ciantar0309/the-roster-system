import nodemailer from 'nodemailer';

// Email configuration using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,  // Changed to true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 10000,  // 10 second timeout
  greetingTimeout: 10000,
  socketTimeout: 15000
});

const FROM_EMAIL = process.env.SMTP_FROM || `"RosterPro" <${process.env.SMTP_USER}>`;

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email service ready');
  }
});

// Send invite email
export async function sendInviteEmail(to: string, inviteLink: string, employeeName?: string) {
  const mailOptions = {
    from: FROM_EMAIL,
    to,
    subject: 'You\'ve been invited to RosterPro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Welcome to RosterPro!</h2>
        <p>Hi${employeeName ? ` ${employeeName}` : ''},</p>
        <p>You've been invited to join RosterPro, our roster management system.</p>
        <p>Click the button below to set your password and activate your account:</p>
        <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">
          Activate Account
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 7 days.</p>
        <p style="color: #666; font-size: 12px;">If you didn't expect this invitation, please ignore this email.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📧 Invite email sent to:', to);
    return true;
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return false;
  }
}

// Send leave request status email
export async function sendLeaveStatusEmail(
  to: string, 
  employeeName: string, 
  status: 'approved' | 'rejected',
  leaveType: string,
  startDate: string,
  endDate: string,
  reason?: string
) {
  const isApproved = status === 'approved';
  
  const mailOptions = {
    from: FROM_EMAIL,
    to,
    subject: `Leave Request ${isApproved ? 'Approved' : 'Rejected'} - RosterPro`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isApproved ? '#22c55e' : '#ef4444'};">
          Leave Request ${isApproved ? 'Approved ✓' : 'Rejected ✗'}
        </h2>
        <p>Hi ${employeeName},</p>
        <p>Your leave request has been <strong>${status}</strong>.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Type:</strong> ${leaveType}</p>
          <p style="margin: 4px 0;"><strong>Dates:</strong> ${startDate} to ${endDate}</p>
          ${reason ? `<p style="margin: 4px 0;"><strong>Note:</strong> ${reason}</p>` : ''}
        </div>
        <p>Log in to RosterPro to view your updated schedule.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📧 Leave status email sent to:', to);
    return true;
  } catch (error) {
    console.error('Failed to send leave status email:', error);
    return false;
  }
}

// Send shift swap status email
export async function sendSwapStatusEmail(
  to: string,
  employeeName: string,
  status: 'approved' | 'rejected',
  shiftDate: string,
  swapWithName: string
) {
  const isApproved = status === 'approved';
  
  const mailOptions = {
    from: FROM_EMAIL,
    to,
    subject: `Shift Swap ${isApproved ? 'Approved' : 'Rejected'} - RosterPro`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isApproved ? '#22c55e' : '#ef4444'};">
          Shift Swap ${isApproved ? 'Approved ✓' : 'Rejected ✗'}
        </h2>
        <p>Hi ${employeeName},</p>
        <p>Your shift swap request has been <strong>${status}</strong>.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Shift Date:</strong> ${shiftDate}</p>
          <p style="margin: 4px 0;"><strong>Swap With:</strong> ${swapWithName}</p>
        </div>
        <p>Log in to RosterPro to view your updated schedule.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📧 Swap status email sent to:', to);
    return true;
  } catch (error) {
    console.error('Failed to send swap status email:', error);
    return false;
  }
}

export default transporter;
