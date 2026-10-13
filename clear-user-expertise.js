const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not found in .env file');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await mongoose.connect(dbUrl);
  console.log('Connected successfully!');

  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    email: String,
    expertise: Array,
  }, { strict: false }));

  // Find all users where expertise array is not empty
  const filter = { 'expertise.0': { $exists: true } };
  const usersWithExpertise = await User.find(filter).select('_id email expertise').lean();

  console.log(`Found ${usersWithExpertise.length} user(s) with non-empty expertise array.`);

  if (usersWithExpertise.length > 0) {
    usersWithExpertise.forEach((u, idx) => {
      console.log(`[${idx + 1}] ID: ${u._id} | Email: ${u.email} | Expertise Count: ${u.expertise ? u.expertise.length : 0}`);
    });

    const result = await User.updateMany(filter, { $set: { expertise: [] } });
    console.log(`\nUpdated ${result.modifiedCount} user(s). Their expertise arrays are now empty ([]).`);
  } else {
    console.log('No users found with expertise > 0. Nothing to update.');
  }

  await mongoose.disconnect();
  console.log('Disconnected from database.');
}

run().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});
