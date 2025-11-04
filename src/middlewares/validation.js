const { body, validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    return next(new ErrorResponse(errorMessages, 400));
  }
  next();
};

const signupValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['client', 'talent']).withMessage('Role must be either client or talent'),
  body('companyName').if(body('role').equals('client')).notEmpty().withMessage('Company name is required for clients'),
  body('industry').if(body('role').equals('client')).notEmpty().withMessage('Industry is required for clients'),
  body('location').if(body('role').equals('client')).notEmpty().withMessage('Location is required for clients'),
  validate,
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const talentSubmissionValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('dateOfBirth').isISO8601().withMessage('Please provide a valid date of birth'),
  body('talentCategory').isIn(['actor', 'model', 'voice-artist', 'musician', 'dancer', 'influencer', 'other']).withMessage('Invalid talent category'),
  validate,
];

const contactValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('reasonForContact').isEmail().withMessage('Reason is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message is required').isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters'),
  validate,
];

const requestValidation = [
  body('talentId').notEmpty().withMessage('Talent ID is required'),
  body('projectTitle').notEmpty().withMessage('Project title is required'),
  body('projectDescription').notEmpty().withMessage('Project description is required'),
  validate,
];

const paymentInitValidation = [
  body('amount').isNumeric().withMessage('Amount must be a number').isFloat({ min: 100 }).withMessage('Amount must be at least 100'),
  validate,
];

const adCreationValidation = [
  body('requestId').notEmpty().withMessage('Request ID is required'),
  body('title').notEmpty().withMessage('Ad title is required'),
  body('description').notEmpty().withMessage('Ad description is required'),
  body('category').isIn(['tv-commercial', 'radio', 'print', 'digital', 'social-media', 'billboard', 'other']).withMessage('Invalid ad category'),
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  validate,
];

module.exports = {
  signupValidation,
  loginValidation,
  talentSubmissionValidation,
  contactValidation,
  requestValidation,
  paymentInitValidation,
  adCreationValidation,
};
