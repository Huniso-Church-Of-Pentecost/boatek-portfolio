/* ==========================================================================
   middleware/validateContact.js — server-side validation for /api/contact
   Validates against the shared data/projectBudgets.json so the
   project -> budget pairing can't be tampered with client-side.
   ========================================================================== */

const { getValidProjectKeys, getValidBudgetKeysForProject } = require('../config/projectBudgets');

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateContact(req, res, next) {
  const { name, email, project, budget, message } = req.body || {};
  const errors = {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.name = 'Please provide your full name.';
  }
  if (!email || typeof email !== 'string' || !isEmail(email.trim())) {
    errors.email = 'Please provide a valid email address.';
  }

  const validProjects = getValidProjectKeys();
  if (!project || !validProjects.includes(project)) {
    errors.project = 'Please select a valid project type.';
  }

  if (!errors.project) {
    const validBudgets = getValidBudgetKeysForProject(project);
    if (!budget || !validBudgets.includes(budget)) {
      // this also catches a budget value that doesn't belong to the chosen
      // project - i.e. someone editing the DOM/request to mismatch the pair
      errors.budget = 'Please select a budget range that matches the chosen project type.';
    }
  }

  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    errors.message = 'Message should be at least 10 characters.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: 'Validation failed.', errors });
  }

  req.body = {
    name: name.trim().slice(0, 200),
    email: email.trim().slice(0, 200),
    project,
    budget,
    message: message.trim().slice(0, 5000),
    website: req.body.website // honeypot passthrough — checked in the controller
  };

  next();
}

module.exports = { validateContact };
