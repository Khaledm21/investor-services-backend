// src/controllers/clientController.js
const { query } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Get all clients with search, filtering, and pagination
 * GET /api/clients?page=1&limit=500&search=...
 */
const getClients = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(parseInt(req.query.limit || '500', 10), 1000);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';

    let whereClause = '';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE (c.full_name ILIKE $1 OR c.national_id ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1)`;
    }

    const countQuery = `SELECT COUNT(*) FROM clients c ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params];
    dataParams.push(limit);
    dataParams.push(offset);

    const limitParamIndex = dataParams.length - 1;
    const offsetParamIndex = dataParams.length;

    // We also aggregate operations to provide an operations array or count for frontend
    const dataQuery = `
      SELECT 
        c.id,
        c.full_name,
        c.national_id,
        c.phone,
        c.email,
        c.address,
        c.notes,
        c.is_active,
        c.created_at,
        c.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', o.id,
              'service_id', o.service_id,
              'status', o.status,
              'priority', o.priority,
              'created_at', o.created_at
            )
          ) FILTER (WHERE o.id IS NOT NULL),
          '[]'
        ) AS operations
      FROM clients c
      LEFT JOIN operations o ON c.id = o.client_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const clientsResult = await query(dataQuery, dataParams);

    return sendSuccess(
      res,
      {
        clients: clientsResult.rows,
        total,
        page,
        limit,
      },
      'Clients retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get client by ID (or National ID)
 * GET /api/clients/:id
 */
const getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check by UUID id or national_id
    const clientResult = await query(
      `SELECT 
        c.id,
        c.full_name,
        c.national_id,
        c.phone,
        c.email,
        c.address,
        c.notes,
        c.is_active,
        c.created_at,
        c.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', o.id,
              'service_id', o.service_id,
              'service_name', s.name,
              'status', o.status,
              'priority', o.priority,
              'notes', o.notes,
              'created_at', o.created_at
            )
          ) FILTER (WHERE o.id IS NOT NULL),
          '[]'
        ) AS operations
       FROM clients c
       LEFT JOIN operations o ON c.id = o.client_id
       LEFT JOIN services s ON o.service_id = s.id
       WHERE c.id::text = $1 OR c.national_id = $1
       GROUP BY c.id`,
      [id]
    );

    if (clientResult.rowCount === 0) {
      return sendError(res, 'Client not found.', [], 404);
    }

    const client = clientResult.rows[0];

    return sendSuccess(res, { client }, 'Client details retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new client
 * POST /api/clients
 */
const createClient = async (req, res, next) => {
  try {
    const { full_name, national_id, phone, email, address, notes, is_active } = req.body;

    if (!full_name || !national_id) {
      return sendError(res, 'Full name and National ID are required.', [], 400);
    }

    // Check duplicate national_id
    const existing = await query('SELECT id FROM clients WHERE national_id = $1', [national_id.trim()]);
    if (existing.rowCount > 0) {
      return sendError(res, 'A client with this National ID already exists.', [], 409);
    }

    const result = await query(
      `INSERT INTO clients (full_name, national_id, phone, email, address, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, full_name, national_id, phone, email, address, notes, is_active, created_at, updated_at`,
      [
        full_name.trim(),
        national_id.trim(),
        phone ? phone.trim() : null,
        email ? email.trim().toLowerCase() : null,
        address ? address.trim() : null,
        notes || null,
        is_active !== undefined ? is_active : true,
      ]
    );

    const newClient = {
      ...result.rows[0],
      operations: [],
    };

    return sendSuccess(res, { client: newClient }, 'Client created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing client
 * PUT /api/clients/:id
 */
const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, national_id, phone, email, address, notes, is_active } = req.body;

    // Check client existence
    const checkClient = await query('SELECT * FROM clients WHERE id::text = $1 OR national_id = $1', [id]);
    if (checkClient.rowCount === 0) {
      return sendError(res, 'Client not found.', [], 404);
    }

    const existingClient = checkClient.rows[0];

    // Check duplicate national_id if changed
    if (national_id && national_id.trim() !== existingClient.national_id) {
      const duplicate = await query('SELECT id FROM clients WHERE national_id = $1 AND id != $2', [
        national_id.trim(),
        existingClient.id,
      ]);
      if (duplicate.rowCount > 0) {
        return sendError(res, 'Another client already uses this National ID.', [], 409);
      }
    }

    const updatedFullName = full_name !== undefined ? full_name.trim() : existingClient.full_name;
    const updatedNationalId = national_id !== undefined ? national_id.trim() : existingClient.national_id;
    const updatedPhone = phone !== undefined ? phone.trim() : existingClient.phone;
    const updatedEmail = email !== undefined ? (email ? email.trim().toLowerCase() : null) : existingClient.email;
    const updatedAddress = address !== undefined ? address.trim() : existingClient.address;
    const updatedNotes = notes !== undefined ? notes : existingClient.notes;
    const updatedIsActive = is_active !== undefined ? is_active : existingClient.is_active;

    const result = await query(
      `UPDATE clients
       SET full_name = $1, national_id = $2, phone = $3, email = $4, address = $5, notes = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, full_name, national_id, phone, email, address, notes, is_active, created_at, updated_at`,
      [
        updatedFullName,
        updatedNationalId,
        updatedPhone,
        updatedEmail,
        updatedAddress,
        updatedNotes,
        updatedIsActive,
        existingClient.id,
      ]
    );

    const updatedClient = {
      ...result.rows[0],
    };

    return sendSuccess(res, { client: updatedClient }, 'Client updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a client
 * DELETE /api/clients/:id
 */
const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM clients WHERE id::text = $1 OR national_id = $1 RETURNING id, full_name', [id]);

    if (result.rowCount === 0) {
      return sendError(res, 'Client not found.', [], 404);
    }

    return sendSuccess(res, { id: result.rows[0].id }, 'Client deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
