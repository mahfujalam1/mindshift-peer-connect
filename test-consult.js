const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.DATABASE_URL);
  const Consult = mongoose.models.Consult || mongoose.model('Consult', new mongoose.Schema({}, { strict: false }));
  const count = await Consult.countDocuments();
  console.log('TOTAL_CONSULTS_IN_DB:', count);
  const all = await Consult.find().select('issue city province country author').lean();
  console.log('CONSULTS:', all.map(c => ({ id: c._id, issue: c.issue, city: c.city, province: c.province, country: c.country, author: c.author })));
  await mongoose.disconnect();
}

run().catch(console.error);
