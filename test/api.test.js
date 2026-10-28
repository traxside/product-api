import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testDatabase = `product_api_test_${process.pid}`;
const adminConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? ''
};

let adminConnection;
let server;
let serverExit;
let serverOutput = '';
let baseUrl;
let createdProductId;

const delay = (ms, unref = false) => new Promise((resolve) => {
  const timer = setTimeout(resolve, ms);
  if (unref) timer.unref();
});

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();

    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function runNode(args, extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: projectRoot,
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
        return;
      }

      reject(new Error(`node ${args.join(' ')} failed with code ${code}\n${output}`));
    });
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Server exited before becoming ready\n${serverOutput}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/products`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }

    await delay(100);
  }

  throw new Error(`Server did not become ready\n${serverOutput}`);
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const text = await response.text();

  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Keep non-JSON bodies (for example Swagger UI HTML) as text.
  }

  return { status: response.status, body };
}

function jsonRequest(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

before(async () => {
  adminConnection = await mysql.createConnection(adminConfig);
  await adminConnection.query(`CREATE DATABASE \`${testDatabase}\``);

  await runNode(['seed.js'], { DB_NAME: testDatabase });

  const port = await findFreePort();
  baseUrl = `http://127.0.0.1:${port}`;

  server = spawn(process.execPath, ['src/index.js'], {
    cwd: projectRoot,
    env: { ...process.env, DB_NAME: testDatabase, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  serverExit = once(server, 'exit');

  server.stdout.on('data', (chunk) => {
    serverOutput += chunk;
  });
  server.stderr.on('data', (chunk) => {
    serverOutput += chunk;
  });

  await waitForServer();
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([serverExit, delay(5000, true)]);
  }

  if (adminConnection) {
    await adminConnection.query(`DROP DATABASE IF EXISTS \`${testDatabase}\``);
    await adminConnection.end();
  }
});

describe('Product API', () => {
  it('GET /api/products returns seeded products', async () => {
    const { status, body } = await request('/api/products');

    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 2);

    for (const product of body) {
      assert.deepEqual(Object.keys(product).sort(), [
        'description',
        'id',
        'image',
        'name',
        'price',
        'variants'
      ]);
      assert.equal(typeof product.id, 'number');
      assert.equal(typeof product.name, 'string');
      assert.equal(typeof product.price, 'number');
      assert.equal(typeof product.image, 'string');
      assert.ok(Array.isArray(product.variants));
      assert.equal(typeof product.description, 'string');
    }
  });

  it('GET /api/products/:id returns a product with variants', async () => {
    const { status, body } = await request('/api/products/1');

    assert.equal(status, 200);
    assert.equal(body.id, 1);
    assert.equal(body.name, 'Nama Product');
    assert.equal(typeof body.price, 'number');
    assert.ok(body.variants.length > 0);
    assert.deepEqual(body.variants[0], { colorOrSize: 'S', quantity: 10 });
  });

  it('GET /api/products/:id returns 404 for missing product', async () => {
    const { status, body } = await request('/api/products/9999');

    assert.equal(status, 404);
    assert.match(body.error, /9999/);
  });

  it('rejects an invalid product id', async () => {
    const { status, body } = await request('/api/products/abc');

    assert.equal(status, 400);
    assert.equal(body.error, 'Product id must be a positive integer');
  });

  it('POST /api/products creates a product and variants', async () => {
    const payload = {
      name: 'Product Baru',
      price: 200000,
      image: 'https://placehold.co/600x400/png',
      variants: [
        { colorOrSize: 'M', quantity: 5 },
        { colorOrSize: 'L', quantity: 3 }
      ],
      description: 'Deskripsi product baru dari Postman.'
    };

    const { status, body } = await request('/api/products', jsonRequest('POST', payload));

    assert.equal(status, 201);
    assert.equal(body.name, payload.name);
    assert.equal(body.price, payload.price);
    assert.deepEqual(body.variants, payload.variants);
    assert.equal(typeof body.id, 'number');
    assert.ok(body.id >= 1);

    createdProductId = body.id;
  });

  it('POST /api/products returns 400 when required fields are missing', async () => {
    const { status, body } = await request(
      '/api/products',
      jsonRequest('POST', { name: 'Produk Tidak Lengkap' })
    );

    assert.equal(status, 400);
    assert.match(body.error, /required/);
  });

  it('POST /api/products rejects values outside database limits', async () => {
    const base = {
      name: 'Valid Product',
      price: 1000,
      image: 'https://placehold.co/600x400/png',
      variants: [],
      description: 'Valid description'
    };

    const cases = [
      {
        payload: { ...base, name: 'a'.repeat(256) },
        error: /at most 255 characters/
      },
      {
        payload: { ...base, price: -1 },
        error: /non-negative number/
      },
      {
        payload: { ...base, price: 10000000000000 },
        error: /must not exceed/
      },
      {
        payload: { ...base, image: 'not-a-url' },
        error: /valid URL/
      },
      {
        payload: {
          ...base,
          variants: [{ colorOrSize: 'M', quantity: 2147483648 }]
        },
        error: /must not exceed 2147483647/
      },
      {
        payload: {
          ...base,
          variants: [{ colorOrSize: 'M'.repeat(101), quantity: 1 }]
        },
        error: /at most 100 characters/
      },
      {
        payload: { ...base, description: 'a'.repeat(65536) },
        error: /at most 65535 bytes/
      }
    ];

    for (const testCase of cases) {
      const { status, body } = await request(
        '/api/products',
        jsonRequest('POST', testCase.payload)
      );

      assert.equal(status, 400, JSON.stringify(testCase.payload));
      assert.match(body.error, testCase.error);
    }
  });

  it('POST /api/products returns 413 for an oversized request body', async () => {
    const { status, body } = await request(
      '/api/products',
      jsonRequest('POST', {
        name: 'Too Large',
        price: 1000,
        image: 'https://placehold.co/600x400/png',
        variants: [],
        description: 'a'.repeat(101 * 1024)
      })
    );

    assert.equal(status, 413);
    assert.equal(body.error, 'Request body is too large');
  });

  it('PUT /api/products/:id updates only supplied fields', async () => {
    const { status, body } = await request(
      '/api/products/1',
      jsonRequest('PUT', {
        price: 175000,
        description: 'Deskripsi yang sudah diperbarui via Postman.'
      })
    );

    assert.equal(status, 200);
    assert.equal(body.id, 1);
    assert.equal(body.price, 175000);
    assert.equal(body.description, 'Deskripsi yang sudah diperbarui via Postman.');
    assert.equal(body.name, 'Nama Product');
    assert.equal(body.image, 'https://placehold.co/600x400/png');
    assert.ok(body.variants.length > 0);
  });

  it('PUT /api/products/:id replaces variants when supplied', async () => {
    const variants = [{ colorOrSize: 'Z', quantity: 1 }];
    const { status, body } = await request(
      `/api/products/${createdProductId}`,
      jsonRequest('PUT', { variants })
    );

    assert.equal(status, 200);
    assert.deepEqual(body.variants, variants);
  });

  it('PUT /api/products/:id returns 400 for an empty body', async () => {
    const { status, body } = await request(
      '/api/products/1',
      jsonRequest('PUT', {})
    );

    assert.equal(status, 400);
    assert.match(body.error, /empty/);
  });

  it('PUT /api/products/:id rejects unsupported fields', async () => {
    const { status, body } = await request(
      '/api/products/1',
      jsonRequest('PUT', { stock: 10 })
    );

    assert.equal(status, 400);
    assert.match(body.error, /Unsupported field/);
  });

  it('PUT /api/products/:id returns 404 for missing product', async () => {
    const { status, body } = await request(
      '/api/products/9999',
      jsonRequest('PUT', { price: 99000 })
    );

    assert.equal(status, 404);
    assert.match(body.error, /9999/);
  });

  it('DELETE /api/products/:id deletes the product and cascades variants', async () => {
    const { status, body } = await request(`/api/products/${createdProductId}`, {
      method: 'DELETE'
    });

    assert.equal(status, 200);
    assert.match(body.message, new RegExp(`${createdProductId}`));
    assert.match(body.message, /deleted/);

    const [variantRows] = await adminConnection.query(
      `SELECT COUNT(*) AS count FROM \`${testDatabase}\`.variants WHERE product_id = ?`,
      [createdProductId]
    );
    assert.equal(Number(variantRows[0].count), 0);
  });

  it('DELETE /api/products/:id returns 404 for missing product', async () => {
    const { status, body } = await request('/api/products/9999', {
      method: 'DELETE'
    });

    assert.equal(status, 404);
    assert.match(body.error, /9999/);
  });

  it('DELETE /api/products/:id rejects an invalid id', async () => {
    const { status, body } = await request('/api/products/0', {
      method: 'DELETE'
    });

    assert.equal(status, 400);
    assert.equal(body.error, 'Product id must be a positive integer');
  });

  it('GET /api/products no longer contains the deleted product', async () => {
    const { status, body } = await request('/api/products');

    assert.equal(status, 200);
    assert.equal(
      body.some((product) => product.id === createdProductId),
      false
    );
  });

  it('returns JSON 404 for unknown routes', async () => {
    const { status, body } = await request('/api/unknown');

    assert.equal(status, 404);
    assert.equal(body.error, 'Route GET /api/unknown not found');
  });

  it('returns JSON 400 for malformed JSON', async () => {
    const { status, body } = await request('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{'
    });

    assert.equal(status, 400);
    assert.equal(body.error, 'Invalid JSON in request body');
  });

  it('serves Swagger UI', async () => {
    const { status, body } = await request('/api-docs/');

    assert.equal(status, 200);
    assert.match(body, /Swagger UI/);
  });
});
