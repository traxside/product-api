import pool from './src/db.js';

async function seed() {
  try {
    console.log('Creating tables...');

    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(255)   NOT NULL,
        price       DECIMAL(15, 2) NOT NULL,
        image       VARCHAR(500)   NOT NULL,
        description TEXT           NOT NULL
      )
    `);
    console.log('✓ products table ready');

    // Create variants table with FK referencing products(id)
    // ON DELETE CASCADE — deleting a product automatically deletes its variants
    await pool.query(`
      CREATE TABLE IF NOT EXISTS variants (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        product_id  INT          NOT NULL,
        colorOrSize VARCHAR(100) NOT NULL,
        quantity    INT          NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ variants table ready');

    // Check if demo data already exists to avoid duplicates on re-run
    const [existing] = await pool.query('SELECT COUNT(*) AS count FROM products');
    if (existing[0].count > 0) {
      console.log('Demo data already exists — skipping insert.');
      return;
    }

    console.log('Inserting demo data...');

    // Insert Product 1
    const [result1] = await pool.query(
      'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)',
      ['Nama Product', 150000, 'https://placehold.co/600x400/png', 'Deskripsi singkat product...']
    );
    const product1Id = result1.insertId;

    await pool.query(
      'INSERT INTO variants (product_id, colorOrSize, quantity) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)',
      [
        product1Id, 'S', 10,
        product1Id, 'M', 10,
        product1Id, 'L', 10
      ]
    );
    console.log(`✓ Product 1 inserted (id: ${product1Id})`);

    // Insert Product 2
    const [result2] = await pool.query(
      'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)',
      ['Nama Product 2', 250000, 'https://placehold.co/600x400/png', 'Deskripsi singkat product 2...']
    );
    const product2Id = result2.insertId;

    await pool.query(
      'INSERT INTO variants (product_id, colorOrSize, quantity) VALUES (?, ?, ?), (?, ?, ?)',
      [
        product2Id, 'XL',  5,
        product2Id, 'XXL', 3
      ]
    );
    console.log(`✓ Product 2 inserted (id: ${product2Id})`);

    console.log('\nSeeding complete! You can now start the server with: node src/index.js');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
