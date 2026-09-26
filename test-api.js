// test-api.js
require('dotenv').config();
const http = require('http');
const app = require('./server');

const TEST_PORT = 5001;

async function runTests() {
  console.log('🧪 Starting API Verification Tests...\n');

  // Start temporary test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  const baseUrl = `http://localhost:${TEST_PORT}/api`;

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${testName}`);
      failed++;
    }
  };

  try {
    // 1. Health Check
    console.log('--- 1. Testing Health Check ---');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200, 'GET /api/health status is 200');
    assert(healthJson.success === true, 'GET /api/health success is true');
    assert(healthJson.message === 'Investor Services API is running.', 'GET /api/health message matches');

    // 2. Authentication Login
    console.log('\n--- 2. Testing Authentication ---');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin@1234' }),
    });
    const loginJson = await loginRes.json();
    assert(loginRes.status === 200, 'POST /api/auth/login status is 200');
    assert(loginJson.success === true, 'POST /api/auth/login success is true');
    assert(!!loginJson.data.token, 'POST /api/auth/login returns JWT token');
    assert(loginJson.data.user.username === 'admin', 'POST /api/auth/login returns admin user');

    const token = loginJson.data.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 3. User Management (Admin only)
    console.log('\n--- 3. Testing User Management ---');
    const usersRes = await fetch(`${baseUrl}/users?limit=100`, { headers: authHeaders });
    const usersJson = await usersRes.json();
    assert(usersRes.status === 200, 'GET /api/users status is 200');
    assert(Array.isArray(usersJson.data.users), 'GET /api/users returns users array');
    assert(usersJson.data.total >= 1, 'GET /api/users total count >= 1');

    // 4. Clients
    console.log('\n--- 4. Testing Clients API ---');
    const clientsRes = await fetch(`${baseUrl}/clients?limit=500`, { headers: authHeaders });
    const clientsJson = await clientsRes.json();
    assert(clientsRes.status === 200, 'GET /api/clients status is 200');
    assert(Array.isArray(clientsJson.data.clients), 'GET /api/clients returns clients array');
    assert(clientsJson.data.total >= 2, 'GET /api/clients returns seeded clients');

    const firstClient = clientsJson.data.clients[0];
    const clientDetailRes = await fetch(`${baseUrl}/clients/${firstClient.id}`, { headers: authHeaders });
    const clientDetailJson = await clientDetailRes.json();
    assert(clientDetailRes.status === 200, 'GET /api/clients/:id status is 200');
    assert(clientDetailJson.data.client.id === firstClient.id, 'GET /api/clients/:id returns correct client');

    // 5. Services
    console.log('\n--- 5. Testing Services API ---');
    const servicesRes = await fetch(`${baseUrl}/services?limit=100&is_active=true`, { headers: authHeaders });
    const servicesJson = await servicesRes.json();
    assert(servicesRes.status === 200, 'GET /api/services status is 200');
    assert(Array.isArray(servicesJson.data.services), 'GET /api/services returns services array');
    assert(servicesJson.data.services.length >= 3, 'GET /api/services returns at least 3 services');
    assert(servicesJson.data.services[0].operations_count !== undefined, 'GET /api/services includes operations_count');

    // 6. Operations
    console.log('\n--- 6. Testing Operations API & LEFT JOINs ---');
    const opsRes = await fetch(`${baseUrl}/operations?limit=500`, { headers: authHeaders });
    const opsJson = await opsRes.json();
    assert(opsRes.status === 200, 'GET /api/operations status is 200');
    assert(Array.isArray(opsJson.data.operations), 'GET /api/operations returns operations array');
    assert(opsJson.data.total >= 3, 'GET /api/operations returns seeded operations');

    const firstOp = opsJson.data.operations[0];
    assert(!!firstOp.client_name, `Operation includes client_name: "${firstOp.client_name}"`);
    assert(!!firstOp.service_name, `Operation includes service_name: "${firstOp.service_name}"`);

    // Test creating an operation
    console.log('\n--- 7. Testing Operation Creation ---');
    const newOpRes = await fetch(`${baseUrl}/operations`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        client_id: firstClient.id,
        service_id: servicesJson.data.services[0].id,
        status: 'pending',
        priority: 'high',
        notes: JSON.stringify({ _amount: 2500, _receipt: 'TEST-REC', _notes: 'اختبار تشغيلي للنظام' }),
      }),
    });
    const newOpJson = await newOpRes.json();
    assert(newOpRes.status === 201, 'POST /api/operations status is 201');
    assert(!!newOpJson.data.operation.id, 'POST /api/operations returns created operation id');
    assert(!!newOpJson.data.operation.client_name, 'POST /api/operations includes client_name in return payload');
    assert(!!newOpJson.data.operation.service_name, 'POST /api/operations includes service_name in return payload');

    // Test status update (PATCH)
    console.log('\n--- 8. Testing Operation Status Update ---');
    const patchRes = await fetch(`${baseUrl}/operations/${newOpJson.data.operation.id}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'in_progress' }),
    });
    const patchJson = await patchRes.json();
    assert(patchRes.status === 200, 'PATCH /api/operations/:id/status status is 200');
    assert(patchJson.data.operation.status === 'in_progress', 'Operation status transitioned to in_progress');

    // Clean up created test operation
    await fetch(`${baseUrl}/operations/${newOpJson.data.operation.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n====================================================');
    console.log(`🏁 Test Summary: ${passed} passed, ${failed} failed`);
    console.log('====================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Delay briefly to allow main server testConnection to complete
setTimeout(runTests, 1000);
