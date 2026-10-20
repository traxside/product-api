import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';

const app = express();
const PORT = 3000;

// Middleware: parse incoming JSON request bodies
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---------------------------------------------------------------------------
// In-Memory Data Store
// ---------------------------------------------------------------------------

let products = [
  {
    id: 1,
    name: "Nama Product",
    price: 150000,
    image: "https://placehold.co/600x400/png",
    variants: [
      { colorOrSize: "S", quantity: 10 },
      { colorOrSize: "M", quantity: 10 },
      { colorOrSize: "L", quantity: 10 }
    ],
    description: "Deskripsi singkat product..."
  },
  {
    id: 2,
    name: "Nama Product 2",
    price: 250000,
    image: "https://placehold.co/600x400/png",
    variants: [
      { colorOrSize: "XL", quantity: 5 },
      { colorOrSize: "XXL", quantity: 3 }
    ],
    description: "Deskripsi singkat product 2..."
  }
];

// Auto-increment counter — always points to the next available ID
let nextId = 3;

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/products — Return all products
app.get('/api/products', (req, res) => {
  res.status(200).json(products);
});

// GET /api/products/:id — Return a single product by ID
app.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ error: `Product with id ${id} not found` });
  }

  res.status(200).json(product);
});

// POST /api/products — Create a new product
app.post('/api/products', (req, res) => {
  const { name, price, image, variants, description } = req.body;

  // Validate all required fields are present
  if (!name || !price || !image || !variants || !description) {
    return res.status(400).json({
      error: "Fields 'name', 'price', 'image', 'variants', 'description' are required"
    });
  }

  const newProduct = { id: nextId++, name, price, image, variants, description };
  products.push(newProduct);

  res.status(201).json(newProduct);
});

// PUT /api/products/:id — Update an existing product (partial update supported)
app.put('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);

  // Validate request body is not empty
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "Request body cannot be empty" });
  }

  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ error: `Product with id ${id} not found` });
  }

  // Merge updated fields into existing product object
  Object.assign(product, req.body);

  res.status(200).json(product);
});

// DELETE /api/products/:id — Delete a product by ID
app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: `Product with id ${id} not found` });
  }

  products.splice(index, 1);

  res.status(200).json({ message: `Product with id ${id} has been deleted` });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});
