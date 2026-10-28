import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  findAllProducts,
  findProductById,
  updateProduct
} from '../productRepository.js';
import {
  UPDATABLE_FIELDS,
  getFieldValidationError,
  getProductValidationError,
  parseProductId
} from '../productValidator.js';

const router = Router();

// GET /api/products — Return all products
router.get('/', async (req, res) => {
  try {
    const products = await findAllProducts();
    res.status(200).json(products);
  } catch (err) {
    console.error('GET /api/products error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id — Return a single product by ID
router.get('/:id', async (req, res) => {
  const id = parseProductId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Product id must be a positive integer' });
  }

  try {
    const product = await findProductById(id);

    if (!product) {
      return res.status(404).json({ error: `Product with id ${id} not found` });
    }

    res.status(200).json(product);
  } catch (err) {
    console.error('GET /api/products/:id error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products — Create a new product
router.post('/', async (req, res) => {
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

  try {
    const product = await createProduct({ name, price, image, variants, description });
    res.status(201).json(product);
  } catch (err) {
    console.error('POST /api/products error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/products/:id — Update an existing product (partial update supported)
router.put('/:id', async (req, res) => {
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

  for (const field of UPDATABLE_FIELDS) {
    const value = req.body[field];

    if (value === undefined) continue;

    const validationError = getFieldValidationError(field, value);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
  }

  try {
    const product = await updateProduct(id, req.body);

    if (!product) {
      return res.status(404).json({ error: `Product with id ${id} not found` });
    }

    res.status(200).json(product);
  } catch (err) {
    console.error('PUT /api/products/:id error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/products/:id — Delete a product by ID
router.delete('/:id', async (req, res) => {
  const id = parseProductId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Product id must be a positive integer' });
  }

  try {
    const deleted = await deleteProduct(id);

    if (!deleted) {
      return res.status(404).json({ error: `Product with id ${id} not found` });
    }

    res.status(200).json({ message: `Product with id ${id} has been deleted` });
  } catch (err) {
    console.error('DELETE /api/products/:id error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
