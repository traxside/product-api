// Swagger specification — defined manually as an ESM module.
// Imported by index.js and served via swagger-ui-express at /api-docs.

const errorResponse = (description, error) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
      example: { error }
    }
  }
});

const INTERNAL_SERVER_ERROR = errorResponse('Internal server error', 'Internal server error');
const INVALID_PRODUCT_ID = errorResponse(
  'Product id must be a positive integer',
  'Product id must be a positive integer'
);
const REQUEST_TOO_LARGE = errorResponse('Request body is too large', 'Request body is too large');

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Product API',
    version: '1.0.0',
    description: 'E-Commerce Catalog REST API Service — Full CRUD with MySQL database'
  },
  paths: {

    // -------------------------------------------------------------------------
    // /api/products
    // -------------------------------------------------------------------------

    '/api/products': {

      // GET /api/products
      get: {
        tags: ['Products'],
        summary: 'Get all products',
        description: 'Returns a list of all products stored in MySQL.',
        responses: {
          200: {
            description: 'Successfully retrieved all products',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Product' }
                },
                example: [
                  {
                    id: 1,
                    name: 'Nama Product',
                    price: 150000,
                    image: 'https://placehold.co/600x400/png',
                    variants: [
                      { colorOrSize: 'S', quantity: 10 },
                      { colorOrSize: 'M', quantity: 10 },
                      { colorOrSize: 'L', quantity: 10 }
                    ],
                    description: 'Deskripsi singkat product...'
                  }
                ]
              }
            }
          },
          500: INTERNAL_SERVER_ERROR
        }
      },

      // POST /api/products
      post: {
        tags: ['Products'],
        summary: 'Create a new product',
        description: 'Adds a new product to the MySQL database. An `id` is assigned automatically.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductInput' },
              example: {
                name: 'Product Baru',
                price: 200000,
                image: 'https://placehold.co/600x400/png',
                variants: [{ colorOrSize: 'M', quantity: 5 }],
                description: 'Deskripsi product baru...'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Product created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' },
                example: {
                  id: 3,
                  name: 'Product Baru',
                  price: 200000,
                  image: 'https://placehold.co/600x400/png',
                  variants: [{ colorOrSize: 'M', quantity: 5 }],
                  description: 'Deskripsi product baru...'
                }
              }
            }
          },
          400: {
            description: 'Missing or invalid fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  error: "Fields 'name', 'price', 'image', 'variants', 'description' are required"
                }
              }
            }
          },
          413: REQUEST_TOO_LARGE,
          500: INTERNAL_SERVER_ERROR
        }
      }
    },

    // -------------------------------------------------------------------------
    // /api/products/{id}
    // -------------------------------------------------------------------------

    '/api/products/{id}': {

      // GET /api/products/:id
      get: {
        tags: ['Products'],
        summary: 'Get a product by ID',
        description: 'Returns a single product matching the given ID.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Numeric ID of the product to retrieve',
            schema: { type: 'integer', minimum: 1, example: 1 }
          }
        ],
        responses: {
          200: {
            description: 'Product found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' },
                example: {
                  id: 1,
                  name: 'Nama Product',
                  price: 150000,
                  image: 'https://placehold.co/600x400/png',
                  variants: [
                    { colorOrSize: 'S', quantity: 10 },
                    { colorOrSize: 'M', quantity: 10 },
                    { colorOrSize: 'L', quantity: 10 }
                  ],
                  description: 'Deskripsi singkat product...'
                }
              }
            }
          },
          400: INVALID_PRODUCT_ID,
          404: {
            description: 'Product not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { error: 'Product with id 99 not found' }
              }
            }
          },
          500: INTERNAL_SERVER_ERROR
        }
      },

      // PUT /api/products/:id
      put: {
        tags: ['Products'],
        summary: 'Update a product by ID',
        description: 'Partially updates an existing product. Only the fields provided in the request body will be updated — all other fields remain unchanged.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Numeric ID of the product to update',
            schema: { type: 'integer', minimum: 1, example: 1 }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductUpdate' },
              example: {
                price: 175000,
                description: 'Deskripsi yang sudah diperbarui.'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Product updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' },
                example: {
                  id: 1,
                  name: 'Nama Product',
                  price: 175000,
                  image: 'https://placehold.co/600x400/png',
                  variants: [
                    { colorOrSize: 'S', quantity: 10 },
                    { colorOrSize: 'M', quantity: 10 },
                    { colorOrSize: 'L', quantity: 10 }
                  ],
                  description: 'Deskripsi yang sudah diperbarui.'
                }
              }
            }
          },
          400: {
            description: 'Invalid product id, empty body, unsupported field, or invalid field value',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { error: 'Request body cannot be empty' }
              }
            }
          },
          404: {
            description: 'Product not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { error: 'Product with id 99 not found' }
              }
            }
          },
          413: REQUEST_TOO_LARGE,
          500: INTERNAL_SERVER_ERROR
        }
      },

      // DELETE /api/products/:id
      delete: {
        tags: ['Products'],
        summary: 'Delete a product by ID',
        description: 'Removes a product and all its variants from the MySQL database permanently.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Numeric ID of the product to delete',
            schema: { type: 'integer', minimum: 1, example: 1 }
          }
        ],
        responses: {
          200: {
            description: 'Product deleted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessMessage' },
                example: { message: 'Product with id 1 has been deleted' }
              }
            }
          },
          400: INVALID_PRODUCT_ID,
          404: {
            description: 'Product not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { error: 'Product with id 99 not found' }
              }
            }
          },
          500: INTERNAL_SERVER_ERROR
        }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // Reusable schemas
  // ---------------------------------------------------------------------------

  components: {
    schemas: {

      // Full product object (includes auto-generated id)
      Product: {
        type: 'object',
        required: ['id', 'name', 'price', 'image', 'variants', 'description'],
        properties: {
          id: {
            type: 'integer',
            description: 'Auto-assigned unique product identifier',
            example: 1
          },
          name: {
            type: 'string',
            description: 'Product name',
            example: 'Nama Product'
          },
          price: {
            type: 'number',
            description: 'Product price in IDR',
            example: 150000
          },
          image: {
            type: 'string',
            description: 'URL of the product image',
            example: 'https://placehold.co/600x400/png'
          },
          variants: {
            type: 'array',
            description: 'Available size/color variants with stock quantity',
            items: { $ref: '#/components/schemas/Variant' }
          },
          description: {
            type: 'string',
            description: 'Short product description',
            example: 'Deskripsi singkat product...'
          }
        }
      },

      // Input schema for POST (id is excluded — assigned automatically)
      ProductInput: {
        type: 'object',
        required: ['name', 'price', 'image', 'variants', 'description'],
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            example: 'Nama Product'
          },
          price: {
            type: 'number',
            minimum: 0,
            maximum: 9999999999999.99,
            example: 150000
          },
          image: {
            type: 'string',
            format: 'uri',
            maxLength: 500,
            example: 'https://placehold.co/600x400/png'
          },
          variants: {
            type: 'array',
            items: { $ref: '#/components/schemas/Variant' }
          },
          description: {
            type: 'string',
            minLength: 1,
            description: 'Non-empty description, at most 65535 bytes',
            example: 'Deskripsi singkat product...'
          }
        }
      },

      // Input schema for PUT (partial update — every field is optional)
      ProductUpdate: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            example: 'Nama Product'
          },
          price: {
            type: 'number',
            minimum: 0,
            maximum: 9999999999999.99,
            example: 150000
          },
          image: {
            type: 'string',
            format: 'uri',
            maxLength: 500,
            example: 'https://placehold.co/600x400/png'
          },
          variants: {
            type: 'array',
            items: { $ref: '#/components/schemas/Variant' }
          },
          description: {
            type: 'string',
            minLength: 1,
            description: 'Non-empty description, at most 65535 bytes',
            example: 'Deskripsi singkat product...'
          }
        }
      },

      // Single variant object
      Variant: {
        type: 'object',
        required: ['colorOrSize', 'quantity'],
        properties: {
          colorOrSize: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'Size label (e.g. S, M, L) or color name',
            example: 'M'
          },
          quantity: {
            type: 'integer',
            minimum: 0,
            maximum: 2147483647,
            description: 'Stock quantity for this variant',
            example: 10
          }
        }
      },

      // Standard error response
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Product with id 99 not found'
          }
        }
      },

      // Standard success message response
      SuccessMessage: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Product with id 1 has been deleted'
          }
        }
      }
    }
  }
};

export default swaggerSpec;
