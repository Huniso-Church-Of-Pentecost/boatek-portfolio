/* ==========================================================================
   config/projectBudgets.js — loads the shared data/projectBudgets.json
   (single source of truth also served statically to the frontend)
   ========================================================================== */

// Loaded via require() rather than fs.readFileSync so Vercel's serverless
// function bundler (which statically traces require() calls) reliably
// includes this JSON file in the deployment — a dynamic fs path is not
// guaranteed to be picked up the same way.
const projectBudgetsData = require('../../data/projectBudgets.json');

function load() {
  return projectBudgetsData;
}

function getValidProjectKeys() {
  return load().projects.map((p) => p.key);
}

function getValidBudgetKeysForProject(projectKey) {
  const project = load().projects.find((p) => p.key === projectKey);
  return project ? project.budgets.map((b) => b.key) : [];
}

function getProjectLabel(projectKey) {
  const project = load().projects.find((p) => p.key === projectKey);
  return project ? project.label : projectKey;
}

function getBudgetLabel(projectKey, budgetKey) {
  const project = load().projects.find((p) => p.key === projectKey);
  const budget = project && project.budgets.find((b) => b.key === budgetKey);
  if (!budget) return budgetKey;
  if (budget.max === null) return `$${budget.min.toLocaleString()}+`;
  if (budget.min === 0) return `Under $${budget.max.toLocaleString()}`;
  return `$${budget.min.toLocaleString()} – $${budget.max.toLocaleString()}`;
}

module.exports = {
  load,
  getValidProjectKeys,
  getValidBudgetKeysForProject,
  getProjectLabel,
  getBudgetLabel
};
