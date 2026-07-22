import { Op } from 'sequelize';
import { User, EmergencyAlert, Notification, AuditLog } from '../models/index.js';
import { Resend } from 'resend';

const getResendClient = () => {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("❌ RESEND_API_KEY is missing in .env file");
  }
  return new Resend(key);
};

export const triggerEmergency = async (req, res, next) => {
  try {
    const { triggeredByScore } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const contactName = user.emergencyContactName;
    const contactPhone = user.emergencyContactPhone;
    const contactEmail = user.emergencyContactEmail;

    if (!contactName) {
      return res.status(400).json({
        success: false,
        error: 'No emergency contact registered. Please configure it in Profile settings.'
      });
    }

    const rawScore = Number(triggeredByScore);
    const score = !isNaN(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 90;

    const emailSubject = `🚨 MindGuard EMERGENCY ALERT: ${user.fullName}`;
    const messageContent = `
Emergency Alert,

Employee: ${user.fullName}
Employee ID: ${user.employeeId || 'N/A'}
Stress Level: ${score}/100
Phone: ${user.phone || 'N/A'}
Department: ${user.department || 'N/A'}

Emergency Contact: ${contactName}

Please reach out immediately.
`;

    let emailSent = false;
    let errorLog = [];

    if (contactEmail && process.env.RESEND_API_KEY) {
      try {
        const resend = getResendClient();
        const response = await resend.emails.send({
          from: "MindGuard <alerts@resend.dev>",
          to: contactEmail,
          subject: emailSubject,
          text: messageContent,
        });
        emailSent = true;
        console.log("✅ EMAIL SENT:", response.id);
      } catch (err) {
        console.log("❌ EMAIL FAILED:", err.message);
        errorLog.push(`Email: ${err.message}`);
      }
    }

    const alert = await EmergencyAlert.create({
      userId: user.id,
      contactName,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      triggeredByScore: score,
      status: emailSent ? 'sent' : 'failed',
      details: errorLog.length ? errorLog.join(" | ") : "Processed"
    });

    const admins = await User.findAll({
      where: {
        role: { [Op.in]: ['Admin', 'Super Admin'] }
      }
    });

    await Promise.all(
      admins.map(admin =>
        Notification.create({
          userId: admin.id,
          title: `🚨 Emergency: ${user.fullName}`,
          message: `Critical stress alert triggered. Score: ${score}`,
          type: 'stress_alert'
        })
      )
    );

    await AuditLog.create({
      actorId: user.id,
      actorEmail: user.email,
      action: 'EMERGENCY_TRIGGER',
      details: `Score ${score}, Contact ${contactName}`
    });

    res.status(201).json({
      success: true,
      alert,
      emailSent,
      smsSent: false,
      simulated: !emailSent,
      message: "Emergency protocol executed"
    });

  } catch (error) {
    next(error);
  }
};

export const getAlertHistory = async (req, res, next) => {
  try {
    const alerts = await EmergencyAlert.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    next(error);
  }
};