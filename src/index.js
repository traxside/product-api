import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../swagger.js';
import pool from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: parse incoming JSON request bodies
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---------------------------------------------------------------------------
// Helper: convert flat LEFT JOIN rows into nested product objects
// ---------------------------------------------------------------------------

function groupProducts(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        name: row.name,
        price: parseFloat(row.price), // DECIMAL comes back as string from mysql2
        image: row.image,
        description: row.description,
        variants: []
      });
    }

    if (row.variant_id) {
      map.get(row.id).variants.push({
        colorOrSize: row.colorOrSize,
        quantity: row.quantity
      });
    }
  }

  return Array.from(map.values());
}

// Shared JOIN query used by all read operations
const JOIN_QUERY = `
  SELECT p.*, v.id AS variant_id, v.colorOrSize, v.quantity
  FROM products p
  LEFT JOIN variants v ON p.id = v.product_id
`;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const UPDATABLE_FIELDS = new Set(['name', 'price', 'image', 'description', 'variants']);

function parseProductId(rawId) {
  if (!/^[1-9]\d*$/.test(rawId)) return null;

  const id = Number(rawId);
  return Number.isSafeInteger(id) ? id : null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isValidPrice(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isValidUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidVariant(variant) {
  return (
    variant !== null &&
    typeof variant === 'object' &&
    !Array.isArray(variant) &&
    isNonEmptyString(variant.colorOrSize) &&
    typeof variant.quantity === 'number' &&
    Number.isInteger(variant.quantity) &&
    variant.quantity >= 0
  );
}

function isValidVariants(variants) {
  return Array.isArray(variants) && variants.every(isValidVariant);
}

function getProductValidationError({ name, price, image, variants, description }) {
  if (!isNonEmptyString(name)) return "Field 'name' must be a non-empty string";
  if (!isValidPrice(price)) return "Field 'price' must be a non-negative number";
  if (!isValidUrl(image)) return "Field 'image' must be a valid URL";
  if (!isValidVariants(variants)) {
    return "Field 'variants' must be an array of objects with 'colorOrSize' (string) and 'quantity' (integer)";
  }
  if (!isNonEmptyString(description)) return "Field 'description' must be a non-empty string";

  return null;
}

// Replace every variant for a product. Caller controls the transaction.
async function replaceVariants(conn, productId, variants) {
  await conn.query('DELETE FROM variants WHERE product_id = ?', [productId]);

  for (const variant of variants) {
    await conn.query(
      'INSERT INTO variants (product_id, colorOrSize, quantity) VALUES (?, ?, ?)',
      [productId, variant.colorOrSize, variant.quantity]
    );
  }
}

async function rollbackQuietly(conn) {
  try {
    await conn.rollback();
  } catch (err) {
    console.error('Rollback error:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/products — Return all products
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query(JOIN_QUERY + ' ORDER BY p.id, v.id');
    res.status(200).json(groupProducts(rows));
  } catch (err) {
    console.error('GET /api/products error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id — Return a single product by ID
app.get('/api/products/:id', async (req, res) => {
  const id = parseProductId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Product id must be a positive integer' });
  }

  try {
    const [rows] = await pool.query(
      JOIN_QUERY + ' WHERE p.id = ? ORDER BY v.id',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `Product with id ${id} not found` });
    }

    res.status(200).json(groupProducts(rows)[0]);
  } catch (err) {
    console.error('GET /api/products/:id error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products — Create a new product
app.post('/api/products', async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  const { name, price, image, variants, description } = req.body;
  const requiredFields = { name, price, image, variants, description };
  const missingFields = Object.entries(requiredFields)
    .filter(([, value]) => value === undefined || value === null || value === '')
    .map(([field]) => field);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: "Fields 'name', 'price', 'image', 'variants', 'description' are required"
    });
  }

  const validationError = getProductValidationError(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Insert into products first to get the new ID
    const [result] = await conn.query(
      'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)',
      [name, price, image, description]
    );
    const newId = result.insertId;

    // Insert each variant linked to the new product
    await replaceVariants(conn, newId, variants);

    // Re-fetch the created product with its variants
    const [rows] = await conn.query(
      JOIN_QUERY + ' WHERE p.id = ? ORDER BY v.id',
      [newId]
    );

    await conn.commit();
    res.status(201).json(groupProducts(rows)[0]);
  } catch (err) {
    if (conn) await rollbackQuietly(conn);
    console.error('POST /api/products error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
});

// PUT /api/products/:id — Update an existing product (partial update supported)
app.put('/api/products/:id', async (req, res) => {
  const id = parseProductId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Product id must be a positive integer' });
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Request body cannot be empty' });
  }

  const unsupportedFields = Object.keys(req.body).filter((field) => !UPDATABLE_FIELDS.has(field));
  if (unsupportedFields.length > 0) {
    return res.status(400).json({
      error: `Unsupported field(s): ${unsupportedFields.join(', ')}`
    });
  }

  const { name, price, image, description, variants } = req.body;

  if (name !== undefined && !isNonEmptyString(name)) {
    return res.status(400).json({ error: "Field 'name' must be a non-empty string" });
  }
  if (price !== undefined && !isValidPrice(price)) {
    return res.status(400).json({ error: "Field 'price' must be a non-negative number" });
  }
  if (image !== undefined && !isValidUrl(image)) {
    return res.status(400).json({ error: "Field 'image' must be a valid URL" });
  }
  if (description !== undefined && !isNonEmptyString(description)) {
    return res.status(400).json({ error: "Field 'description' must be a non-empty string" });
  }
  if (variants !== undefined && !isValidVariants(variants)) {
    return res.status(400).json({
      error: "Field 'variants' must be an array of objects with 'colorOrSize' (string) and 'quantity' (integer)"
    });
  }

  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Lock the row so concurrent updates cannot interleave
    const [existing] = await conn.query(
      'SELECT id FROM products WHERE id = ? FOR UPDATE',
      [id]
    );
    if (existing.length === 0) {
      await rollbackQuietly(conn);
      return res.status(404).json({ error: `Product with id ${id} not found` });
    }

    // Build a dynamic UPDATE for scalar fields — only update fields that were sent
    const scalarFields = { name, price, image, description };
    const fieldsToUpdate = Object.entries(scalarFields).filter(([, value]) => value !== undefined);

    if (fieldsToUpdate.length > 0) {
      const setClauses = fieldsToUpdate.map(([column]) => `${column} = ?`).join(', ');
      const values = fieldsToUpdate.map(([, value]) => value);
      await conn.query(
        `UPDATE products SET ${setClauses} WHERE id = ?`,
        [...values, id]
      );
    }

    // If variants were provided, fully replace them
    if (variants !== undefined) {
      await replaceVariants(conn, id, variants);
    }

    // Re-fetch and return the updated product
    const [rows] = await conn.query(
      JOIN_QUERY + ' WHERE p.id = ? ORDER BY v.id',
      [id]
    );

    await conn.commit();
    res.status(200).json(groupProducts(rows)[0]);
  } catch (err) {
    if (conn) await rollbackQuietly(conn);
    console.error('PUT /api/products/:id error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
});

// DELETE /api/products/:id — Delete a product by ID
app.delete('/api/products/:id', async (req, res) => {
  const id = parseProductId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Product id must be a positive integer' });
  }

  try {
    // Delete product — ON DELETE CASCADE removes variants automatically
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `Product with id ${id} not found` });
    }

    res.status(200).json({ message: `Product with id ${id} has been deleted` });
  } catch (err) {
    console.error('DELETE /api/products/:id error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Fallback handlers
// ---------------------------------------------------------------------------

// Unknown route — always return JSON instead of Express's HTML 404 page
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Malformed JSON and other unexpected errors — always return JSON
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }

  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process and restart.`);
  } else {
    console.error('Server failed to start:', err.message);
  }
  process.exit(1);
});
