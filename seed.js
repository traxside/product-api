import pool from './src/db.js';

const CREATE_PRODUCTS_TABLE = `
  CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255)   NOT NULL,
    price       DECIMAL(15, 2) NOT NULL,
    image       VARCHAR(500)   NOT NULL,
    description TEXT           NOT NULL
  )
`;

const CREATE_VARIANTS_TABLE = `
  CREATE TABLE IF NOT EXISTS variants (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    product_id  INT          NOT NULL,
    colorOrSize VARCHAR(100) NOT NULL,
    quantity    INT          NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )
`;

async function insertProductWithVariants(conn, { name, price, image, description, variants }) {
  const [result] = await conn.query(
    'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)',
    [name, price, image, description]
  );

  const productId = result.insertId;

  if (variants.length > 0) {
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

  return productId;
}

async function seed() {
  let conn;

  try {
    conn = await pool.getConnection();

    console.log('Creating tables...');
    await conn.query(CREATE_PRODUCTS_TABLE);
    console.log('✓ products table ready');
    await conn.query(CREATE_VARIANTS_TABLE);
    console.log('✓ variants table ready');

    // Check if demo data already exists to avoid duplicates on re-run
    const [existing] = await conn.query('SELECT COUNT(*) AS count FROM products');
    if (existing[0].count > 0) {
      console.log('Demo data already exists — skipping insert.');
      return;
    }

    console.log('Inserting demo data...');
    await conn.beginTransaction();

    try {
      const product1Id = await insertProductWithVariants(conn, {
        name: 'Nama Product',
        price: 150000,
        image: 'https://placehold.co/600x400/png',
        description: 'Deskripsi singkat product...',
        variants: [
          { colorOrSize: 'S', quantity: 10 },
          { colorOrSize: 'M', quantity: 10 },
          { colorOrSize: 'L', quantity: 10 }
        ]
      });
      console.log(`✓ Product 1 inserted (id: ${product1Id})`);

      const product2Id = await insertProductWithVariants(conn, {
        name: 'Nama Product 2',
        price: 250000,
        image: 'https://placehold.co/600x400/png',
        description: 'Deskripsi singkat product 2...',
        variants: [
          { colorOrSize: 'XL', quantity: 5 },
          { colorOrSize: 'XXL', quantity: 3 }
        ]
      });
      console.log(`✓ Product 2 inserted (id: ${product2Id})`);

      await conn.commit();
    } catch (err) {
      try {
        await conn.rollback();
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr.message);
      }
      throw err;
    }

    console.log('\nSeeding complete! You can now start the server with: node src/index.js');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

seed();
