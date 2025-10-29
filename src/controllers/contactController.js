const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const Contact = require('../models/Contact');
const { sendContactConfirmationEmail, sendAdminNotificationEmail } = require('../services/emailService');

const submitContactForm = asyncHandler(async (req, res, next) => {
  const { name, email, subject, message } = req.body;

  const contact = await Contact.create({
    name,
    email,
    subject,
    message,
    status: 'new',
  });

  await sendContactConfirmationEmail(email, name);

  await sendAdminNotificationEmail(
    'New Contact Form Submission',
    `<p>A new contact form has been submitted:</p>
     <p><strong>Name:</strong> ${name}</p>
     <p><strong>Email:</strong> ${email}</p>
     <p><strong>Subject:</strong> ${subject}</p>
     <p><strong>Message:</strong> ${message}</p>
     <p><a href="${process.env.FRONTEND_UR}/admin/contacts/${contact._id}">View in Dashboard</a></p>`
  );

  res.status(201).json({
    success: true,
    message: 'Message submitted successfully. We will get back to you soon.',
    data: {
      contactId: contact._id,
    },
  });
});

const getAllContacts = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};

  if (status) {
    query.status = status;
  }

  const contacts = await Contact.find(query)
    .populate('assignedTo', 'email')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Contact.countDocuments(query);

  res.status(200).json({
    success: true,
    data: contacts,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalRecords: count,
    },
  });
});

const getContactById = asyncHandler(async (req, res, next) => {
  const contact = await Contact.findById(req.params.id)
    .populate('assignedTo', 'email')
    .populate('internalNotes.addedBy', 'email')
    .populate('responsesSent.sentBy', 'email');

  if (!contact) {
    return next(new ErrorResponse('Contact not found', 404));
  }

  res.status(200).json({
    success: true,
    data: contact,
  });
});

const updateContactStatus = asyncHandler(async (req, res, next) => {
  const { status, assignedTo } = req.body;

  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return next(new ErrorResponse('Contact not found', 404));
  }

  if (status) {
    contact.status = status;
  }

  if (assignedTo) {
    contact.assignedTo = assignedTo;
  }

  await contact.save();

  res.status(200).json({
    success: true,
    message: 'Contact updated successfully',
    data: contact,
  });
});

const addInternalNote = asyncHandler(async (req, res, next) => {
  const { note } = req.body;

  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return next(new ErrorResponse('Contact not found', 404));
  }

  contact.internalNotes.push({
    note,
    addedBy: req.user._id,
  });

  await contact.save();

  res.status(200).json({
    success: true,
    message: 'Note added successfully',
    data: contact,
  });
});

const sendResponse = asyncHandler(async (req, res, next) => {
  const { message } = req.body;

  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return next(new ErrorResponse('Contact not found', 404));
  }

  contact.responsesSent.push({
    message,
    sentBy: req.user._id,
  });

  await contact.save();

  res.status(200).json({
    success: true,
    message: 'Response recorded successfully',
    data: contact,
  });
});

module.exports = {
  submitContactForm,
  getAllContacts,
  getContactById,
  updateContactStatus,
  addInternalNote,
  sendResponse,
};
