import { Op } from 'sequelize';
import { sequelize, User, Chat, Message, StressScore, EmergencyAlert, AuditLog } from '../models/index.js';
import PDFDocument from 'pdfkit';

export const getAdminOverview = async (req, res, next) => {
  try {
    const totalEmployees = await User.count({ where: { role: 'Employee' } });
    const activeChatsCount = await Chat.count();
    const activeAlertsCount = await EmergencyAlert.count();

    const departmentDistributionRaw = await User.findAll({
      where: { role: 'Employee' },
      attributes: [
        'department',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['department'],
      raw: true
    });

    const departmentDistribution = departmentDistributionRaw.map(item => ({
      _id: item.department || 'Unassigned',
      count: Number(item.count)
    }));

    const categoryScoresRaw = await StressScore.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category'],
      raw: true
    });

    const stressDistribution = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    categoryScoresRaw.forEach(item => {
      if (item.category && stressDistribution[item.category] !== undefined) {
        stressDistribution[item.category] = Number(item.count);
      }
    });

    const recentAlerts = await EmergencyAlert.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'department', 'phone', 'profilePhoto']
      }]
    });

    const insights = [
      "Department alignment: Tech Support department shows 12% higher stress indicators this week. Recommend team breathing breaks.",
      "Time trend: Peak tension is noted between 2 PM and 4 PM on Tuesdays. Encouraging Pomodoro interval focus blocks.",
      "Engagement: Wellness score index has risen by 5% overall since the launch of meditation playlists."
    ];

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeChatsCount,
        activeAlertsCount,
        departmentDistribution,
        stressDistribution,
        recentAlerts,
        insights
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployees = async (req, res, next) => {
  try {
    const { search, department, company, page = 1, limit = 10 } = req.query;

    const whereClause = { role: 'Employee' };

    if (search) {
      const term = `%${search}%`;
      whereClause[Op.or] = [
        { fullName: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { employeeId: { [Op.like]: term } }
      ];
    }

    if (department) {
      whereClause.department = department;
    }

    if (company) {
      whereClause.company = company;
    }

    const limitNum = Number(limit);
    const offset = (Number(page) - 1) * limitNum;

    const { count: total, rows: employees } = await User.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    res.status(200).json({
      success: true,
      count: employees.length,
      page: Number(page),
      totalPages: Math.ceil(total / limitNum),
      total,
      employees
    });
  } catch (error) {
    next(error);
  }
};

export const addEmployee = async (req, res, next) => {
  try {
    const { fullName, email, password, department, company, employeeId, age, gender, phone } = req.body;

    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      return res.status(400).json({ success: false, error: 'User already exists with this email' });
    }

    const employee = await User.create({
      fullName,
      email,
      password,
      department,
      company,
      employeeId,
      age: age ? Number(age) : null,
      gender,
      phone,
      profilePhoto: '/uploads/default-avatar.png',
      streak: 0
    });

    await AuditLog.create({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'ADMIN_CREATE_USER',
      details: `Admin created user: ${employee.fullName} (${employee.email})`
    });

    res.status(201).json({ success: true, employee });
  } catch (error) {
    next(error);
  }
};

export const editEmployee = async (req, res, next) => {
  try {
    const { fullName, email, department, company, employeeId, age, gender, phone, role } = req.body;

    const employee = await User.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    if (role !== undefined) {
      if (req.user.role !== 'Super Admin') {
        return res.status(403).json({ success: false, error: 'Only Super Admin can change user roles' });
      }
      const ALLOWED_ROLES = ['Employee', 'Admin', 'Super Admin'];
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role value' });
      }
      if (String(req.user.id) === String(req.params.id)) {
        return res.status(403).json({ success: false, error: 'You cannot change your own role' });
      }
      employee.role = role;
    }

    if (fullName) employee.fullName = fullName;
    if (email) employee.email = email;
    if (department) employee.department = department;
    if (company) employee.company = company;
    if (employeeId) employee.employeeId = employeeId;
    if (age) employee.age = Number(age);
    if (gender) employee.gender = gender;
    if (phone) employee.phone = phone;

    await employee.save();

    await AuditLog.create({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'ADMIN_UPDATE_USER',
      details: `Admin updated employee details: ${employee.fullName}`
    });

    res.status(200).json({ success: true, employee });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await User.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    await employee.destroy();

    await AuditLog.create({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'ADMIN_DELETE_USER',
      details: `Admin deleted user: ${employee.fullName} (${employee.email})`
    });

    res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getChatTranscripts = async (req, res, next) => {
  try {
    const transcripts = await Chat.findAll({
      order: [['updatedAt', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'department', 'profilePhoto'] },
        { model: Message, as: 'messages' }
      ]
    });

    res.status(200).json({ success: true, count: transcripts.length, transcripts });
  } catch (error) {
    next(error);
  }
};

export const getChatTranscriptById = async (req, res, next) => {
  try {
    const chat = await Chat.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'department', 'age', 'gender', 'profilePhoto'] },
        { model: Message, as: 'messages' }
      ]
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Transcript record not found' });
    }

    res.status(200).json({ success: true, chat });
  } catch (error) {
    next(error);
  }
};

export const downloadReport = async (req, res, next) => {
  try {
    const { format } = req.query;

    const employees = await User.findAll({ where: { role: 'Employee' } });

    const scores = await StressScore.findAll({
      order: [['createdAt', 'DESC']],
      limit: 20,
      include: [{ model: User, as: 'user', attributes: ['fullName', 'department'] }]
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=mindguard_wellness_report.csv');

      let csvContent = 'Full Name,Email,Employee ID,Department,Company,Streak,Registered Date\n';
      employees.forEach(emp => {
        csvContent += `"${emp.fullName}","${emp.email}","${emp.employeeId || ''}","${emp.department || ''}","${emp.company || ''}",${emp.streak || 0},"${new Date(emp.createdAt).toISOString()}"\n`;
      });

      return res.status(200).send(csvContent);
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=mindguard_wellness_report.pdf');

    doc.pipe(res);

    doc.fontSize(22).fillColor('#4F46E5').text('MindGuard Platform Report', { align: 'center' });
    doc.fontSize(12).fillColor('#4B5563').text('Corporate Mental Wellness Auditing Systems', { align: 'center' });
    doc.moveDown();
    doc.lineWidth(1).strokeColor('#E5E7EB').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(2);

    doc.fontSize(16).fillColor('#1F2937').text('Organization Summary', { underline: true });
    doc.moveDown();
    doc.fontSize(11).fillColor('#374151').text(`Total Monitored Employees: ${employees.length}`);
    doc.text(`Active Alert Triggers (All-Time): ${await EmergencyAlert.count()}`);
    doc.text(`Total Counseling Chats Opened: ${await Chat.count()}`);
    doc.moveDown(2);

    doc.fontSize(16).fillColor('#1F2937').text('Recent Stress Score Samples', { underline: true });
    doc.moveDown();

    const initialY = doc.y;
    doc.fontSize(10).fillColor('#1F2937').text('Employee', 50, initialY);
    doc.text('Department', 200, initialY);
    doc.text('Score', 350, initialY);
    doc.text('Intensity', 420, initialY);
    doc.text('Date', 490, initialY);
    doc.moveDown();
    doc.lineWidth(1).strokeColor('#F3F4F6').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    scores.forEach(score => {
      const name = score.user ? score.user.fullName : 'Deleted User';
      const dept = score.user ? score.user.department : 'N/A';

      const currentY = doc.y;
      doc.fontSize(9).fillColor('#4B5563').text(name, 50, currentY);
      doc.text(dept, 200, currentY);
      doc.text(score.score.toString(), 350, currentY);
      doc.text(score.category, 420, currentY);
      doc.text(new Date(score.createdAt).toLocaleDateString(), 490, currentY);
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};
