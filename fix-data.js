"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const fixData = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl)
            throw new Error('DATABASE_URL not found in .env');
        yield mongoose_1.default.connect(dbUrl);
        console.log('Connected to DB');
        const db = mongoose_1.default.connection.db;
        if (!db)
            throw new Error('DB is undefined');
        const usersCollection = db.collection('users');
        const users = yield usersCollection.find({
            profession: { $type: "string" }
        }).toArray();
        console.log(`Found ${users.length} users with string profession`);
        for (const user of users) {
            if (user.profession && user.profession.length !== 24) {
                console.log(`Fixing user ${user._id}: profession "${user.profession}" -> null`);
                yield usersCollection.updateOne({ _id: user._id }, { $unset: { profession: "" } });
            }
            else if (user.profession && user.profession.length === 24) {
                console.log(`Casting string to ObjectId for user ${user._id}`);
                yield usersCollection.updateOne({ _id: user._id }, { $set: { profession: new mongoose_1.default.Types.ObjectId(user.profession) } });
            }
        }
        console.log('Data fix complete.');
        process.exit(0);
    }
    catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
});
fixData();
