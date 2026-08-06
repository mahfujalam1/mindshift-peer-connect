import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixData = async () => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not found in .env');
    
    await mongoose.connect(dbUrl);
    console.log('Connected to DB');
    
    const db = mongoose.connection.db;
    if (!db) throw new Error('DB is undefined');

    const usersCollection = db.collection('users');
    
    const users = await usersCollection.find({ 
      profession: { $type: "string" } 
    }).toArray();
    
    console.log(`Found ${users.length} users with string profession`);
    
    for (const user of users) {
      if (user.profession && user.profession.length !== 24) {
        console.log(`Fixing user ${user._id}: profession "${user.profession}" -> null`);
        await usersCollection.updateOne(
          { _id: user._id },
          { $unset: { profession: "" } }
        );
      } else if (user.profession && user.profession.length === 24) {
         console.log(`Casting string to ObjectId for user ${user._id}`);
         await usersCollection.updateOne(
          { _id: user._id },
          { $set: { profession: new mongoose.Types.ObjectId(user.profession) } }
        );
      }
    }
    
    console.log('Data fix complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

fixData();
