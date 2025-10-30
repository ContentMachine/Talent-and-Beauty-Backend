// utils/createSuperAdmin.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const createSuperAdminAccount = async () => {
  const superAdminEmail = 'aborisadedev@gmail.com'; // Set your super admin email
  const superAdminPassword = '33848822Abo'; // Set a super strong password for the super admin

  // Check if a super admin already exists
  const existingAdmin = await User.findOne({ email: superAdminEmail });
  if (existingAdmin) {
    console.log('Super admin account already exists');
    return;
  }

  // Hash the password before saving
  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  const superAdmin = new User({
    email: superAdminEmail,
    password: hashedPassword,
    role: 'superadmin',  // Assign super_admin role
    isActive: true,
    isEmailVerified: true,
  });

  await superAdmin.save();
  console.log('Super admin account created successfully');
};

module.exports = createSuperAdminAccount;