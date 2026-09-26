// src/controllers/operationController.js
const { query } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const OPERATION_BASE_QUERY = `
  SELECT 
    o.id,
    o.client_id,
    o.service_id,
    o.assigned_to,
    o.status,
    o.priority,
    o.notes,
    o.started_at,
    o.completed_at,
    o.created_by,
    o.created_at,
    o.updated_at,
    c.full_name AS client_name,
    s.name AS service_name,
    u.full_name AS assigned_to_name
  FROM operations o
  LEFT JOIN clients c ON o.client_id = c.id
  LEFT JOIN services s ON o.service_id = s.id
  LEFT JOIN users u ON o.assigned_to = u.id
`;

/**
 * Get all operations with filtering, pagination, and LEFT JOINs for client & service names
 * GET /api/operations?limit=500&status=...&priority=...&client_id=...&service_id=...
 */
const getOperations = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '500', 10), 1000);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const offset = (page - 1) * limit;

    const { status, priority, client_id, service_id, assigned_to, from_date, to_date, search } = req.query;

    const conditions = [];
    const params = [];

    if (status) {
      params.push(status.toLowerCase());
      conditions.push(`o.status = $${params.length}`);
    }

    if (priority) {
      params.push(priority.toLowerCase());
      conditions.push(`o.priority = $${params.length}`);
    }

    if (client_id) {
      params.push(client_id);
      conditions.push(`o.client_id = $${params.length}`);
    }

    if (service_id) {
      params.push(service_id);
      conditions.push(`o.service_id = $${params.length}`);
    }

    if (assigned_to) {
      params.push(assigned_to);
      conditions.push(`o.assigned_to = $${params.length}`);
    }

    if (from_date) {
      params.push(from_date);
      conditions.push(`o.created_at >= $${params.length}`);
    }

    if (to_date) {
      params.push(to_date);
      conditions.push(`o.created_at <= $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const p = `$${params.length}`;
      conditions.push(`(c.full_name ILIKE ${p} OR s.name ILIKE ${p} OR o.notes ILIKE ${p})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total Count
    const countSql = `
      SELECT COUNT(*) 
      FROM operations o 
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN services s ON o.service_id = s.id
      ${whereClause}
    `;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // List with joins
    const dataParams = [...params, limit, offset];
    const dataSql = `
      ${OPERATION_BASE_QUERY}
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const result = await query(dataSql, dataParams);

    return sendSuccess(
      res,
      {
        operations: result.rows,
        total,
        page,
        limit,
      },
      'Operations retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get operation by ID
 * GET /api/operations/:id
 */
const getOperationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`${OPERATION_BASE_QUERY} WHERE o.id = $1`, [id]);

    if (result.rowCount === 0) {
      return sendError(res, 'Operation not found.', [], 404);
    }

    const operation = result.rows[0];

    return sendSuccess(res, { operation }, 'Operation retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new operation
 * POST /api/operations
 */
const createOperation = async (req, res, next) => {
  try {
    const { client_id, service_id, assigned_to, status, priority, notes, started_at, completed_at } = req.body;

    if (!client_id || !service_id) {
      return sendError(res, 'client_id and service_id are required.', [], 400);
    }

    // Validate client existence
    const clientCheck = await query('SELECT id FROM clients WHERE id = $1', [client_id]);
    if (clientCheck.rowCount === 0) {
      return sendError(res, 'Specified client does not exist.', [], 400);
    }

    // Validate service existence
    const serviceCheck = await query('SELECT id FROM services WHERE id = $1', [service_id]);
    if (serviceCheck.rowCount === 0) {
      return sendError(res, 'Specified service does not exist.', [], 400);
    }

    const opStatus = status ? status.toLowerCase() : 'pending';
    const opPriority = priority ? priority.toLowerCase() : 'normal';

    const insertResult = await query(
      `INSERT INTO operations (
        client_id, service_id, assigned_to, status, priority, notes, started_at, completed_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        client_id,
        service_id,
        assigned_to || null,
        opStatus,
        opPriority,
        notes !== undefined ? (typeof notes === 'object' ? JSON.stringify(notes) : notes) : null,
        started_at || (opStatus === 'in_progress' ? new Date() : null),
        completed_at || (opStatus === 'completed' ? new Date() : null),
        req.user?.id || null,
      ]
    );

    const newId = insertResult.rows[0].id;

    // Retrieve with full joins
    const fullResult = await query(`${OPERATION_BASE_QUERY} WHERE o.id = $1`, [newId]);
    const operation = fullResult.rows[0];

    return sendSuccess(res, { operation }, 'Operation created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing operation
 * PUT /api/operations/:id
 */
const updateOperation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { client_id, service_id, assigned_to, status, priority, notes, started_at, completed_at } = req.body;

    const check = await query('SELECT * FROM operations WHERE id = $1', [id]);
    if (check.rowCount === 0) {
      return sendError(res, 'Operation not found.', [], 404);
    }

    const current = check.rows[0];

    const updatedClientId = client_id || current.client_id;
    const updatedServiceId = service_id || current.service_id;
    const updatedAssignedTo = assigned_to !== undefined ? assigned_to : current.assigned_to;
    const updatedStatus = status ? status.toLowerCase() : current.status;
    const updatedPriority = priority ? priority.toLowerCase() : current.priority;

    let updatedNotes = current.notes;
    if (notes !== undefined) {
      updatedNotes = typeof notes === 'object' ? JSON.stringify(notes) : notes;
    }

    let updatedStartedAt = started_at !== undefined ? started_at : current.started_at;
    let updatedCompletedAt = completed_at !== undefined ? completed_at : current.completed_at;

    if (updatedStatus === 'in_progress' && !updatedStartedAt) {
      updatedStartedAt = new Date();
    }
    if (updatedStatus === 'completed' && !updatedCompletedAt) {
      updatedCompletedAt = new Date();
    }

    await query(
      `UPDATE operations
       SET client_id = $1, service_id = $2, assigned_to = $3, status = $4, priority = $5, notes = $6, started_at = $7, completed_at = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [
        updatedClientId,
        updatedServiceId,
        updatedAssignedTo,
        updatedStatus,
        updatedPriority,
        updatedNotes,
        updatedStartedAt,
        updatedCompletedAt,
        id,
      ]
    );

    const fullResult = await query(`${OPERATION_BASE_QUERY} WHERE o.id = $1`, [id]);
    const operation = fullResult.rows[0];

    return sendSuccess(res, { operation }, 'Operation updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Update operation status only
 * PATCH /api/operations/:id/status
 */
const updateOperationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendError(res, 'Status is required.', [], 400);
    }

    const normalizedStatus = status.toLowerCase();
    const validStatuses = ['pending', 'in_progress', 'completed', 'rejected', 'cancelled'];
    if (!validStatuses.includes(normalizedStatus)) {
      return sendError(
        res,
        `Invalid status value. Must be one of: ${validStatuses.join(', ')}`,
        [],
        400
      );
    }

    const check = await query('SELECT * FROM operations WHERE id = $1', [id]);
    if (check.rowCount === 0) {
      return sendError(res, 'Operation not found.', [], 404);
    }

    const current = check.rows[0];
    let started_at = current.started_at;
    let completed_at = current.completed_at;

    if (normalizedStatus === 'in_progress' && !started_at) {
      started_at = new Date();
    }
    if (normalizedStatus === 'completed') {
      completed_at = new Date();
    }

    await query(
      `UPDATE operations
       SET status = $1, started_at = $2, completed_at = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [normalizedStatus, started_at, completed_at, id]
    );

    const fullResult = await query(`${OPERATION_BASE_QUERY} WHERE o.id = $1`, [id]);
    const operation = fullResult.rows[0];

    return sendSuccess(res, { operation }, 'Operation status updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Delete an operation
 * DELETE /api/operations/:id
 */
const deleteOperation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM operations WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return sendError(res, 'Operation not found.', [], 404);
    }

    return sendSuccess(res, { id }, 'Operation deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOperations,
  getOperationById,
  createOperation,
  updateOperation,
  updateOperationStatus,
  deleteOperation,
};
