const bcrypt = require('bcryptjs');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Collection = require('../models/Collection');
const Feedback = require('../models/Feedback');
const WasteRequest = require('../models/WasteRequest');
const validateBody = require('../middleware/validateBody');

const router = express.Router();
const userFields = ['firstName', 'lastName', 'email', 'password', 'role'];
const requiredUserFields = userFields;
const validId = (id) => mongoose.isValidObjectId(id);
const publicUser = (user) => {
  const result = user.toObject();
  delete result.password;
  return result;
};

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List users
 *     responses:
 *       200:
 *         description: Users returned without password hashes.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   post:
 *     tags: [Users]
 *     summary: Create a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: User created; password is never returned.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.get('/', async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ data: users });
});

router.post('/', validateBody({
  allowedFields: userFields,
  requiredFields: requiredUserFields,
}), async (req, res) => {
  const user = new User({
    ...req.body,
    password: await bcrypt.hash(req.body.password, 12),
  });
  await user.save();
  res.status(201).json({ data: publicUser(user) });
});

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by ID
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       200:
 *         description: User returned without a password hash.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     tags: [Users]
 *     summary: Update a user
 *     description: Updates the provided fields. If password is supplied, it is hashed before storage.
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: User updated.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       204:
 *         description: User deleted.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.get('/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: { message: 'User ID is invalid.' } });
  }

  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found.' } });
  }

  return res.json({ data: user });
});

router.put('/:id', validateBody({ allowedFields: userFields }), async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: { message: 'User ID is invalid.' } });
  }

  const updates = { ...req.body };
  if (updates.password !== undefined) {
    updates.password = await bcrypt.hash(updates.password, 12);
  }

  const user = await User.findById(req.params.id).select('+password');
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found.' } });
  }

  Object.assign(user, updates);
  await user.save();
  return res.json({ data: publicUser(user) });
});

router.delete('/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: { message: 'User ID is invalid.' } });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found.' } });
  }

  const hasRequests = await WasteRequest.exists({ residentId: user._id });
  const hasCollections = await Collection.exists({ collectorId: user._id });
  const hasFeedback = await Feedback.exists({ userId: user._id });
  if (hasRequests || hasCollections || hasFeedback) {
    return res.status(409).json({
      error: { message: 'Cannot delete a user referenced by waste requests, collections, or feedback.' },
    });
  }

  await user.deleteOne();
  return res.status(204).end();
});

module.exports = router;
