const { Schema, model } = require("mongoose");
const Joi = require("joi");
const { handleMongooseError } = require("../helpers");

const emailRegexp = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
const subscriptionList = ["starter", "pro", "business"];

const userSchema = new Schema(
    {
        password: {
            type: String,
            required: [true, 'Password is required'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            match: emailRegexp,
        },
        subscription: {
            type: String,
            enum: ["starter", "pro", "business"],
            default: "starter"
        },
        token: {
            type: String,
            default: null,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        }
    }, { versionKey: false, timestamps: true }
);

userSchema.post("save", handleMongooseError);

const registerSchema = Joi.object({
    email: Joi.string().pattern(emailRegexp).required(),
	password: Joi.string().min(8).required(),
	subscription: Joi.string().valid(...subscriptionList),
	token: Joi.string(),
});
const loginSchema = Joi.object({
	email: Joi.string().pattern(emailRegexp).required(),
    password: Joi.string().min(6).required(),
});
const subscriptionSchema = Joi.object({
	subscription: Joi.string().valid(...subscriptionList),
});

const schemas = { 
    registerSchema, 
    loginSchema, 
    subscriptionSchema,
};

const User = model("user", userSchema);

module.exports = { 
    User, 
    schemas 
};