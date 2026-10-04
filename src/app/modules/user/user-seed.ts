import config from '../../config';
import User from './user-model';

const seedAdminUser = async () => {
  const { email, password } = config.admin_seed;

  if (!email && !password) {
    return;
  }

  if (!email || !password) {
    throw new Error('Both ADMIN_EMAIL and ADMIN_PASSWORD must be configured to seed an admin.');
  }

  const normalizedEmail = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }

  if (password.length < 6) {
    throw new Error('ADMIN_PASSWORD must be at least 6 characters long.');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    if (existingUser.role !== 'admin') {
      throw new Error('ADMIN_EMAIL is already registered to a non-admin user.');
    }

    console.log('Bootstrap admin account already exists.');
    return;
  }

  await User.create({
    fullName: 'Admin',
    email: normalizedEmail,
    password,
    role: 'admin',
    isVerified: true,
    isActive: true,
  });

  console.log('Bootstrap admin account created.');
};

export default seedAdminUser;
