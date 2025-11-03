const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createSuperAdminAccount = async () => {
  const superAdminEmail = 'aborisadedev@gmail.com'; // Set your super admin email
  const superAdminPassword = '33848822Abo'; // Strong password for the super admin

  try {
    // 🔍 Check if super admin already exists
    const existingAdmin = await User.findOne({ email: superAdminEmail });
    if (existingAdmin) {
      console.log('✅ Super admin account already exists');
      return;
    }

    // 🔐 Hash the password before saving
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

    // 🧑‍💻 Create the super admin
    const superAdmin = await User.create({
      email: superAdminEmail,
      password: superAdminPassword,
      role: 'superadmin',
      firstName: 'Victor',
      lastName: 'Aborisade',
      isActive: true,
      isEmailVerified: true,
    });

    console.log('🎉 Super admin account created successfully:', superAdmin.email);
  } catch (error) {
    console.error('❌ Error creating super admin account:', error.message);
  }
};

module.exports = { createSuperAdminAccount };
