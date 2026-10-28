import pool from './db.js';

const JOIN_QUERY = `
  SELECT p.*, v.id AS variant_id, v.colorOrSize, v.quantity
  FROM products p
  LEFT JOIN variants v ON p.id = v.product_id
`;

export function groupProducts(rows) {
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

async function insertVariants(conn, productId, variants) {
  if (variants.length === 0) return;

  const values = variants.map((variant) => [
    productId,
    variant.colorOrSize,
    variant.quantity
  ]);

  await conn.query(
    'INSERT INTO variants (product_id, colorOrSize, quantity) VALUES ?',
    [values]
  );
}

async function replaceVariants(conn, productId, variants) {
  await conn.query('DELETE FROM variants WHERE product_id = ?', [productId]);
  await insertVariants(conn, productId, variants);
}

async function rollbackQuietly(conn) {
  try {
    await conn.rollback();
  } catch (err) {
    console.error('Rollback error:', err.message);
  }
}

export async function findAllProducts() {
  const [rows] = await pool.query(JOIN_QUERY + ' ORDER BY p.id, v.id');
  return groupProducts(rows);
}

export async function findProductById(id) {
  const [rows] = await pool.query(
    JOIN_QUERY + ' WHERE p.id = ? ORDER BY v.id',
    [id]
  );

  return rows.length === 0 ? null : groupProducts(rows)[0];
}

export async function createProduct({ name, price, image, description, variants }) {
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)',
      [name, price, image, description]
    );
    const newId = result.insertId;

    await insertVariants(conn, newId, variants);

    const [rows] = await conn.query(
      JOIN_QUERY + ' WHERE p.id = ? ORDER BY v.id',
      [newId]
    );

    await conn.commit();
    return groupProducts(rows)[0];
  } catch (err) {
    if (conn) await rollbackQuietly(conn);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

export async function updateProduct(id, fields) {
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
      return null;
    }

    // Build a dynamic UPDATE for scalar fields — only update fields that were sent
    const scalarFields = {
      name: fields.name,
      price: fields.price,
      image: fields.image,
      description: fields.description
    };
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
    if (fields.variants !== undefined) {
      await replaceVariants(conn, id, fields.variants);
    }

    const [rows] = await conn.query(
      JOIN_QUERY + ' WHERE p.id = ? ORDER BY v.id',
      [id]
    );

    await conn.commit();
    return groupProducts(rows)[0];
  } catch (err) {
    if (conn) await rollbackQuietly(conn);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

export async function deleteProduct(id) {
  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
