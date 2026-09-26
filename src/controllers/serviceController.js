// src/controllers/serviceController.js
const { query } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Get all services with optional is_active filter and operations_count
 * GET /api/services?limit=100&page=1&is_active=true
 */
const getServices = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const offset = (page - 1) * limit;

    let isActiveFilter = null;
    if (req.query.is_active !== undefined) {
      isActiveFilter = req.query.is_active === 'true' || req.query.is_active === '1';
    }

    const countQuery = `
      SELECT COUNT(*) FROM services
      WHERE ($1::boolean IS NULL OR is_active = $1)
    `;
    const countResult = await query(countQuery, [isActiveFilter]);
    const total = parseInt(countResult.rows[0].count, 10);

    const servicesQuery = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.category,
        s.is_active,
        s.created_at,
        s.updated_at,
        COUNT(o.id)::int AS operations_count
      FROM services s
      LEFT JOIN operations o ON s.id = o.service_id
      WHERE ($1::boolean IS NULL OR s.is_active = $1)
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(servicesQuery, [isActiveFilter, limit, offset]);

    return sendSuccess(
      res,
      {
        services: result.rows,
        total,
        page,
        limit,
      },
      'Services retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get service by ID
 * GET /api/services/:id
 */
const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        s.id,
        s.name,
        s.description,
        s.category,
        s.is_active,
        s.created_at,
        s.updated_at,
        COUNT(o.id)::int AS operations_count
       FROM services s
       LEFT JOIN operations o ON s.id = o.service_id
       WHERE s.id = $1
       GROUP BY s.id`,
      [id]
    );

    if (result.rowCount === 0) {
      return sendError(res, 'Service not found.', [], 404);
    }

    const service = result.rows[0];

    return sendSuccess(res, { service }, 'Service retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new service
 * POST /api/services
 */
const createService = async (req, res, next) => {
  try {
    const { name, description, category, is_active } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, 'Service name is required.', [], 400);
    }

    const result = await query(
      `INSERT INTO services (name, description, category, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, category, is_active, created_at, updated_at`,
      [
        name.trim(),
        description ? description.trim() : null,
        category ? category.trim() : 'عام',
        is_active !== undefined ? is_active : true,
      ]
    );

    const newService = {
      ...result.rows[0],
      operations_count: 0,
    };

    return sendSuccess(res, { service: newService }, 'Service created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing service
 * PUT /api/services/:id
 */
const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, category, is_active } = req.body;

    const checkService = await query('SELECT * FROM services WHERE id = $1', [id]);
    if (checkService.rowCount === 0) {
      return sendError(res, 'Service not found.', [], 404);
    }

    const current = checkService.rows[0];

    const updatedName = name !== undefined ? name.trim() : current.name;
    const updatedDescription = description !== undefined ? description.trim() : current.description;
    const updatedCategory = category !== undefined ? category.trim() : current.category;
    const updatedIsActive = is_active !== undefined ? is_active : current.is_active;

    const result = await query(
      `UPDATE services
       SET name = $1, description = $2, category = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, description, category, is_active, created_at, updated_at`,
      [updatedName, updatedDescription, updatedCategory, updatedIsActive, id]
    );

    const countRes = await query('SELECT COUNT(*)::int AS cnt FROM operations WHERE service_id = $1', [id]);
    const updatedService = {
      ...result.rows[0],
      operations_count: countRes.rows[0].cnt,
    };

    return sendSuccess(res, { service: updatedService }, 'Service updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a service
 * DELETE /api/services/:id
 */
const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if any operations reference this service
    const opsCount = await query('SELECT COUNT(*)::int AS count FROM operations WHERE service_id = $1', [id]);
    if (opsCount.rows[0].count > 0) {
      return sendError(
        res,
        `Cannot delete service because it is linked to ${opsCount.rows[0].count} operations. Please archive or reassign operations first.`,
        [],
        400
      );
    }

    const result = await query('DELETE FROM services WHERE id = $1 RETURNING id, name', [id]);

    if (result.rowCount === 0) {
      return sendError(res, 'Service not found.', [], 404);
    }

    return sendSuccess(res, { id }, 'Service deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
