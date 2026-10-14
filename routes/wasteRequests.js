const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Collection = require('../models/Collection');
const Feedback = require('../models/Feedback');
const WasteRequest = require('../models/WasteRequest');
const validateBody = require('../middleware/validateBody');

const router = express.Router();
const requestFields = [
  'residentId',
  'wasteType',
  'address',
  'description',
  'preferredCollectionDate',
  'status',
];
const requiredRequestFields = [
  'residentId',
  'wasteType',
  'address',
  'description',
  'preferredCollectionDate',
];
const validId = (id) => mongoose.isValidObjectId(id);
const residentFields = 'firstName lastName email role';

async function validateResident(residentId, res) {
  if (!validId(residentId)) {
    res.status(400).json({ error: { message: 'residentId is invalid.' } });
    return false;
  }

  const resident = await User.findById(residentId).select('role');
  if (!resident || resident.role !== 'resident') {
    res.status(400).json({
      error: { message: 'residentId must reference an existing resident user.' },
    });
    return false;
  }

  return true;
}

/**
 * @openapi
 * /api/waste-requests:
 *   get:
 *     tags: [Waste Requests]
 *     summary: List waste requests
 *     responses:
 *       200:
 *         description: Waste requests returned with resident details.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   post:
 *     tags: [Waste Requests]
 *     summary: Create a waste request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WasteRequestInput'
 *     responses:
 *       201:
 *         description: Waste request created.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/', async (req, res) => {
  const requests = await WasteRequest.find()
    .populate('residentId', residentFields)
    .sort({ createdAt: -1 });
  res.json({ data: requests });
});

router.post('/', validateBody({
  allowedFields: requestFields,
  requiredFields: requiredRequestFields,
}), async (req, res) => {
  if (!await validateResident(req.body.residentId, res)) {
    return;
  }

  const request = await WasteRequest.create(req.body);
  await request.populate('residentId', residentFields);
  return res.status(201).json({ data: request });
});

/**
 * @openapi
 * /api/waste-requests/{id}:
 *   get:
 *     tags: [Waste Requests]
 *     summary: Get a waste request by ID
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       200:
 *         description: Waste request returned with resident details.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     tags: [Waste Requests]
 *     summary: Update a waste request
 *     description: Updates the provided fields.
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WasteRequestUpdate'
 *     responses:
 *       200:
 *         description: Waste request updated.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Waste Requests]
 *     summary: Delete a waste request
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       204:
 *         description: Waste request deleted.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: { message: 'Waste request ID is invalid.' } });
  }

  const request = await WasteRequest.findById(req.params.id)
    .populate('residentId', residentFields);
  if (!request) {
    return res.status(404).json({ error: { message: 'Waste request not found.' } });
  }

  return res.json({ data: request });
});

router.put('/:id', validateBody({ allowedFields: requestFields }), async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: { message: 'Waste request ID is invalid.' } });
  }

  if (req.body.residentId !== undefined && !await validateResident(req.body.residentId, res)) {
    return;
  }

  const request = await WasteRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ error: { message: 'Waste request not found.' } });
  }

  Object.assign(request, req.body);
  await request.save();
  await request.populate('residentId', residentFields);
  return res.json({ data: request });
});

router.delete('/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: { message: 'Waste request ID is invalid.' } });
  }

  const request = await WasteRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ error: { message: 'Waste request not found.' } });
  }

  const hasCollections = await Collection.exists({ wasteRequestId: request._id });
  const hasFeedback = await Feedback.exists({ wasteRequestId: request._id });
  if (hasCollections || hasFeedback) {
    return res.status(409).json({
      error: { message: 'Cannot delete a waste request referenced by collections or feedback.' },
    });
  }

  await request.deleteOne();
  return res.status(204).end();
});

module.exports = router;
