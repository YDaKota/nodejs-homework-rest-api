const { Contact } = require("../models/contact");
const { HttpError, ctrlWrapper } = require("../helpers");

const getAll = async (req, res) => {
    const result = await Contact.find({}, "-createdAt -updatedAt");
    res.json(result);
}

const getById = async (req, res) => {
    const { contactId } = req.params;
    const result = await Contact.findById(contactId);
    if (!result) {
        throw HttpError(404, "Not found");
    }
    res.json(result);
}

const add = async (req, res) => {
    const result = await Contact.add(req.body);
    res.status(201).json(result);
}

const updateById = async (req, res) => {
    const { contactId } = req.params;
    const result = await Contact.findByIdAndUpdate(contactId, req.body, { new: true });
    if (!result) {
        throw HttpError(404, "Not found");
    }
    res.json(result);
}

const deleteById = async (req, res) => {
    const { contactId } = req.params;
    const result = await Contact.findByIdAndRemove(contactId);
    if (!result) {
        throw HttpError(404, "Not found");
    }
    res.json({
        message: "Delete success"
    })
}

const updateFavorite = async (req, res) => {
	const { contactId } = req.params;
    const result = await Contact.findByIdAndUpdate(contactId, req.body, {new: true});
	if (!result) {
		res.status(400).json({ message: 'missing field favorite' })
	}
	const contact = await Contact.updateStatusContact(contactId)

	if (contact) {
		res.status(200).json(contact)
	} else {
		res.status(404).json({ message: 'Not found' })
	}
}

module.exports = {
    getAll: ctrlWrapper(getAll),
    getById: ctrlWrapper(getById),
    add: ctrlWrapper(add),
    updateById: ctrlWrapper(updateById),
    deleteById: ctrlWrapper(deleteById),
    updateFavorite: ctrlWrapper(updateFavorite),
}