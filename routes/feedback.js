const express = require('express');
const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const WasteRequest = require('../models/WasteRequest');
const validateBody = require('../middleware/validateBody');

const router = express.Router();
const feedbackFields = ['userId', 'wasteRequestId', 'rating', 'comment'];
const requiredFeedbackFields = ['userId', 'rating'];
const validId = (id) => mongoose.isValidObjectId(id);
const userFields = 'firstName lastName email role';

async function validateReferences(fields, res) {
  if (fields.userId !== undefined) {
    if (!validId(fields.userId)) {
      res.status(400).json({ error: { message: 'userId is invalid.' } });
      return false;
    }

    const user = await User.findById(fields.userId).select('role');
    if (!user || user.role !== 'resident') {
      res.status(400).json({
        error: { message: 'userId must reference an existing resident.' },
      });
      return false;
    }
  }

  if (fields.wasteRequestId !== undefined && fields.wasteRequestId !== null) {
    if (!validId(fields.wasteRequestId)
      || !await WasteRequest.exists({ _id: fields.wasteRequestId })) {
      res.status(400).json({
        error: { message: 'wasteRequestId must reference an existing waste request.' },
      });
      return false;
    }
  }

  return true;
}

/**
 * @openapi
 * /api/feedback:
 *   get:
 *     tags: [Feedback]
 *     summary: List resident feedback
 *     responses:
 *       200:
 *         description: Feedback records returned.
 *   post:
 *     tags: [Feedback]
 *     summary: Submit resident feedback
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FeedbackInput'
 *     responses:
 *       201:
 *         description: Feedback created.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/', async (req, res) => {
  const feedback = await Feedback.find()
    .populate('userId', userFields)
    .populate('wasteRequestId')
    .sort({ createdAt: -1 });
  return res.json({ data: feedback });
});

router.post('/', validateBody({
  allowedFields: feedbackFields,
  requiredFields: requiredFeedbackFields,
}), async (req, res) => {
  if (!await validateReferences(req.body, res)) {
    return;
  }

  const feedback = await Feedback.create(req.body);
  await feedback.populate([
    { path: 'userId', select: userFields },
    { path: 'wasteRequestId' },
  ]);
  return res.status(201).json({ data: feedback });
});

/**
 * @openapi
 * /api/feedback/{id}:
 *   get:
 *     tags: [Feedback]
 *     summary: Get feedback by ID
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       200:
 *         description: Feedback returned.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     tags: [Feedback]
 *     summary: Update feedback
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FeedbackUpdate'
 *     responses:
 *       200:
 *         description: Feedback updated.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Feedback]
 *     summary: Delete feedback
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       204:
 *         description: Feedback deleted.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: { message: 'Feedback ID is invalid.' } });
  }

  const feedback = await Feedback.findById(req.params.id)
    .populate('userId', userFields)
    .populate('wasteRequestId');
  if (!feedback) {
    return res.status(404).json({ error: { message: 'Feedback not found.' } });
  }

  return res.json({ data: feedback });
});

router.put('/:id', validateBody({ allowedFields: feedbackFields }), async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: { message: 'Feedback ID is invalid.' } });
  }
  if (!await validateReferences(req.body, res)) {
    return;
  }

  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    return res.status(404).json({ error: { message: 'Feedback not found.' } });
  }

  Object.assign(feedback, req.body);
  await feedback.save();
  await feedback.populate([
    { path: 'userId', select: userFields },
    { path: 'wasteRequestId' },
  ]);
  return res.json({ data: feedback });
});

router.delete('/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: { message: 'Feedback ID is invalid.' } });
  }

  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    return res.status(404).json({ error: { message: 'Feedback not found.' } });
  }

  await feedback.deleteOne();
  return res.status(204).end();
});

module.exports = router;
