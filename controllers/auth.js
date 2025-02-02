const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const path = require("path");
const fs = require("fs/promises");
const jimp = require("jimp");
const { nanoid } = require("nanoid");

const { User } = require("../models/user");
const { HttpError, ctrlWrapper, sendEmail } = require("../helpers");
const { SECRET_KEY, BASE_URL } = process.env;
const avatarsDir = path.join(__dirname, "../", "public", "avatars");

const register = async (req, res) => {
	const { email, password } = req.body;
	const user = await User.findOne({ email });
	if (user) {
		throw HttpError(409, "Email already in use");
	}
	const hashPassword = await bcrypt.hash(password, 10);
	const avatarURL = gravatar.url(email);
	const verificationCode = nanoid();

	const newUser = await User.create({ ...req.body, password: hashPassword, avatarURL, verificationCode});
	const verifyEmail = {
		to: email,
		subject: "Verify email",
		html: `<a target="_blank" href="${BASE_URL}/api/auth/verify/${verificationCode}">Click here to verify email</a>`,
	};

	await sendEmail(verifyEmail);

	res.status(201).json({ 
        email: newUser.email, 
        subscription: newUser.subscription,
    });
};

const verifyEmail = async (req, res) => {
	const { verificationCode } = req.params;
	const user = await User.findOne({ verificationCode });
	if (!user) {
		throw HttpError(404, "User not found");
	}

	await User.findByIdAndUpdate(user._id, { verify: true, verificationCode: "" });

	res.json({ 
		message: "Verification successful" 
	});
};

const resendVerifyEmail = async (req, res) => {
	const { email } = req.body;
	const user = await User.findOne({ email });
	if (!user) {
		throw HttpError(404, "User not found");
	}
	if (user.verify) {
		throw HttpError(400, "Verification has already been passed");
	}
	const verifyEmail = {
		to: email,
		subject: "Verify email",
		html: `<a target="_blank" href="${BASE_URL}/api/auth/verify/${user.verificationCode}">Click here to verify email</a>`,
	};

	await sendEmail(verifyEmail);

	res.json({ 
		message: "Verification email send success" 
	});
};

const login = async (req, res) => {
	const { email, password } = req.body;
	const user = await User.findOne({ email });
	if (!user) {
		throw HttpError(401, "Email or password is wrong");
	}
	if (!user.verify) {
		throw HttpError(401, "Email not verified");
	}
	const passwordCompare = await bcrypt.compare(password, user.password);
	if (!passwordCompare) {
		throw HttpError(401, "Password invalid");
	}

	const payload = {
		id: user._id,
	};

	const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
	await User.findByIdAndUpdate(user._id, { token });
	res.json({ token, user: { email: user.email, subscription: user.subscription } });
};

const getCurrent = async (req, res) => {
	const { email, name } = req.user;
	res.json({ 
        email, 
        name 
    });
};

const logout = async (req, res) => {
	const { _id } = req.user;
	await User.findByIdAndUpdate(_id, { token: "" });

	res.json({
		message: "Logout success",
	});
};

const subscription = async (req, res) => {
	const { _id } = req.user;
	const updatedUser = await User.findByIdAndUpdate(_id, req.body, { new: true });
	if (!updatedUser) {
		throw HttpError(404, "Not Found");
	}
	res.json({ 
        email: updatedUser.email, 
        subscription: updatedUser.subscription,
    });
};

const updateAvatar = async (req, res) => {
	const { _id } = req.user;
	const { path: tempUpload, originalname } = req.file;
	const image = await jimp.read(tempUpload);
	await image
		.autocrop()
		.cover(250, 250, jimp.HORIZONTAL_ALIGN_CENTER || jimp.VERTICAL_ALIGN_MIDDLE)
		.writeAsync(tempUpload);
	const filename = `${_id}_${originalname}`;
	const resultUpload = path.join(avatarsDir, filename);
	await fs.rename(tempUpload, resultUpload);
	const avatarURL = path.join("avatars", filename);
	await User.findByIdAndUpdate(_id, { avatarURL });

	res.json({ 
		avatarURL,
	});
};


module.exports = {
	register: ctrlWrapper(register),
	verifyEmail: ctrlWrapper(verifyEmail),
	resendVerifyEmail: ctrlWrapper(resendVerifyEmail),
	login: ctrlWrapper(login),
	getCurrent: ctrlWrapper(getCurrent),
	logout: ctrlWrapper(logout),
	subscription: ctrlWrapper(subscription),
	updateAvatar: ctrlWrapper(updateAvatar),
};