const bcrypt = require('bcryptjs');

module.exports = {
  async up(db, client) {
    const adminEmail = 'admin@digitaltrust.com';

    // 1. Check if admin already exists to prevent duplicate errors
    const existingAdmin = await db.collection('users').findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('Admin user already exists. Skipping seed.');
      return;
    }

    // 2. Hash the password (DO NOT store plain text)
    // Default password: 'password123' (Change this immediately after login!)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 3. Insert the Admin User
    await db.collection('users').insertOne({
      name: 'System Administrator',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin', // Grants access to the Forensic Dashboard
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Admin created: ${adminEmail} / password123`);
  },

  async down(db, client) {
    // Remove the seeded admin
    await db.collection('users').deleteOne({ email: 'admin@digitaltrust.com' });
  },
};