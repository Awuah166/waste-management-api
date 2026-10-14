const express = require('express');
const mongoose = require('mongoose');
const Collection = require('../models/Collection');
const User = require('../models/User');
const WasteRequest = require('../models/WasteRequest');
const validateBody = require('../middleware/validateBody');

const router = express.Router();
const collectionFields = [
  'wasteRequestId',
  'collectorId',
  'scheduledDate',
  'status',
  'completedAt',
  'notes',
];
const requiredCollectionFields = ['wasteRequestId', 'collectorId', 'scheduledDate'];
const validId = (id) => mongoose.isValidObjectId(id);
const userFields = 'firstName lastName email role';

async function validateReferences(fields, res) {
  if (fields.wasteRequestId !== undefined) {
    if (!validId(fields.wasteRequestId)
      || !await WasteRequest.exists({ _id: fields.wasteRequestId })) {
      res.status(400).json({
        error: { message: 'wasteRequestId must reference an existing waste request.' },
      });
      return false;
    }
  }

  if (fields.collectorId !== undefined) {
    if (!validId(fields.collectorId)) {
      res.status(400).json({ error: { message: 'collectorId is invalid.' } });
      return false;
    }

    const collector = await User.findById(fields.collectorId).select('role');
    if (!collector || collector.role !== 'collector') {
      res.status(400).json({
        error: { message: 'collectorId must reference an existing collector.' },
      });
      return false;
    }
  }

  return true;
}

/**
 * @openapi
 * /api/collections:
 *   get:
 *     tags: [Collections]
 *     summary: List collection assignments
 *     security:
 *       - GoogleOAuth: []
 *     responses:
 *       200:
 *         description: Collection assignments returned.
 *   post:
 *     tags: [Collections]
 *     summary: Create a collection assignment
 *     security:
 *       - GoogleOAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CollectionInput'
 *     responses:
 *       201:
 *         description: Collection assignment created.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/', async (req, res) => {
  const collections = await Collection.find()
    .populate('wasteRequestId')
    .populate('collectorId', userFields)
    .sort({ scheduledDate: 1 });
  return res.json({ data: collections });
});

router.post('/', validateBody({
  allowedFields: collectionFields,
  requiredFields: requiredCollectionFields,
}), async (req, res) => {
  if (!await validateReferences(req.body, res)) {
    return;
  }

  const collection = await Collection.create(req.body);
  await collection.populate([
    { path: 'wasteRequestId' },
    { path: 'collectorId', select: userFields },
  ]);
  return res.status(201).json({ data: collection });
});

/**
 * @openapi
 * /api/collections/{id}:
 *   get:
 *     tags: [Collections]
 *     summary: Get a collection assignment
 *     security:
 *       - GoogleOAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       200:
 *         description: Collection assignment returned.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     tags: [Collections]
 *     summary: Update a collection assignment
 *     security:
 *       - GoogleOAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CollectionUpdate'
 *     responses:
 *       200:
 *         description: Collection assignment updated.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Collections]
 *     summary: Delete a collection assignment
 *     security:
 *       - GoogleOAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       204:
 *         description: Collection assignment deleted.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: { message: 'Collection ID is invalid.' } });
  }

  const collection = await Collection.findById(req.params.id)
    .populate('wasteRequestId')
    .populate('collectorId', userFields);
  if (!collection) {
    return res.status(404).json({ error: { message: 'Collection not found.' } });
  }

  return res.json({ data: collection });
});

router.put('/:id', validateBody({ allowedFields: collectionFields }), async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: { message: 'Collection ID is invalid.' } });
  }
  if (!await validateReferences(req.body, res)) {
    return;
  }

  const collection = await Collection.findById(req.params.id);
  if (!collection) {
    return res.status(404).json({ error: { message: 'Collection not found.' } });
  }

  Object.assign(collection, req.body);
  await collection.save();
  await collection.populate([
    { path: 'wasteRequestId' },
    { path: 'collectorId', select: userFields },
  ]);
  return res.json({ data: collection });
});

router.delete('/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: { message: 'Collection ID is invalid.' } });
  }

  const collection = await Collection.findById(req.params.id);
  if (!collection) {
    return res.status(404).json({ error: { message: 'Collection not found.' } });
  }

  await collection.deleteOne();
  return res.status(204).end();
});

module.exports = router;
