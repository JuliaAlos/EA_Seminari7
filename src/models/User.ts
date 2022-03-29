import { Schema, model } from "mongoose";
import Role from "./Role";
import bcrypt from "bcryptjs"

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now() },
    posts: [{
        type: Schema.Types.ObjectId,
        ref: 'Post'
    }],
    roles: [{
        type: Schema.Types.ObjectId,
        ref: 'Role'
    }]
});

UserSchema.statics.encryptPassword = async (password: string) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

UserSchema.statics.comparePassword = async (password: string, receivedPassword: string) => {
    return await bcrypt.compare(password, receivedPassword);
}

export default model('User', UserSchema);
