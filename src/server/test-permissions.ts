import express from 'express';
import { apiRouter } from './api.ts';
import http from 'http';

async function runTests() {
  console.log('--- STARTING PERMISSION, INTEGRITY & SECURITY AUDIT ---');

  const app = express();
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api`;

  let passCount = 0;
  let failCount = 0;

  async function testCase(name: string, fn: () => Promise<boolean>) {
    try {
      const res = await fn();
      if (res) {
        console.log(`[PASS] ${name}`);
        passCount++;
      } else {
        console.error(`[FAIL] ${name}`);
        failCount++;
      }
    } catch (e: any) {
      console.error(`[FAIL] ${name} -> Error: ${e.message}`);
      failCount++;
    }
  }

  // 1. Viewer Role Rejections
  await testCase('1. Viewer rejected from creating locations (403)', async () => {
    const res = await fetch(`${baseUrl}/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Viewer',
      },
      body: JSON.stringify({ name: 'Unauthorized Room', code: 'UNAUTH-01' }),
    });
    return res.status === 403;
  });

  await testCase('2. Viewer rejected from creating equipment (403)', async () => {
    const res = await fetch(`${baseUrl}/equipment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Viewer',
      },
      body: JSON.stringify({ equipmentCode: 'UNAUTH-EQ', equipmentName: 'Fake' }),
    });
    return res.status === 403;
  });

  await testCase('3. Viewer rejected from creating cables (403)', async () => {
    const res = await fetch(`${baseUrl}/cables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Viewer',
      },
      body: JSON.stringify({ cableId: 'CB-FAKE-01', fromEquipmentCode: 'UT-01', toEquipmentCode: 'MSB-01' }),
    });
    return res.status === 403;
  });

  await testCase('4. Viewer rejected from saving ITR draft (403)', async () => {
    const res = await fetch(`${baseUrl}/itr-instances/1/save`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Viewer',
      },
      body: JSON.stringify({ formData: {} }),
    });
    return res.status === 403;
  });

  await testCase('5. Viewer rejected from reviewing ITR (403)', async () => {
    const res = await fetch(`${baseUrl}/itr-instances/1/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Viewer',
      },
      body: JSON.stringify({ action: 'Approve' }),
    });
    return res.status === 403;
  });

  // 2. Tradesperson Role Permissions & Restrictions
  await testCase('6. Tradesperson rejected from creating ITR templates (403)', async () => {
    const res = await fetch(`${baseUrl}/itr-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Tradesperson',
      },
      body: JSON.stringify({ code: 'UNAUTH-TPL', title: 'Fake Tpl', schemaDefinition: {} }),
    });
    return res.status === 403;
  });

  await testCase('7. Tradesperson rejected from approving/reviewing ITR (403)', async () => {
    const res = await fetch(`${baseUrl}/itr-instances/2/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Tradesperson',
      },
      body: JSON.stringify({ action: 'Approve' }),
    });
    return res.status === 403;
  });

  await testCase('8. Tradesperson rejected from importing cables (403)', async () => {
    const res = await fetch(`${baseUrl}/cables/import-commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Tradesperson',
      },
      body: JSON.stringify({ newRecords: [] }),
    });
    return res.status === 403;
  });

  // 3. Data Integrity & Immutability Rules
  await testCase('9. Rejection of modification to APPROVED ITR (400)', async () => {
    // ITR 1 is Approved
    const res = await fetch(`${baseUrl}/itr-instances/1/save`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Tradesperson',
      },
      body: JSON.stringify({ formData: { tampering: 'true' } }),
    });
    const data = await res.json();
    return res.status === 400 && data.error.includes('Approved inspections are permanently locked');
  });

  await testCase('10. Rejection of re-reviewing already APPROVED ITR (400)', async () => {
    const res = await fetch(`${baseUrl}/itr-instances/1/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Supervisor',
      },
      body: JSON.stringify({ action: 'Approve' }),
    });
    const data = await res.json();
    return res.status === 400 && data.error.includes('already approved');
  });

  await testCase('11. Rejection of duplicate Cable ID in same project (409 Conflict)', async () => {
    const res = await fetch(`${baseUrl}/cables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Supervisor',
      },
      body: JSON.stringify({
        cableId: 'CB-L02-UT01-001', // already exists
        fromEquipmentCode: 'UT-01',
        toEquipmentCode: 'MSB-01',
      }),
    });
    return res.status === 409;
  });

  await testCase('12. Rejection of negative cable length (400)', async () => {
    const res = await fetch(`${baseUrl}/cables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Supervisor',
      },
      body: JSON.stringify({
        cableId: 'CB-TEST-NEG-LEN',
        fromEquipmentCode: 'UT-01',
        toEquipmentCode: 'MSB-01',
        length: -25,
      }),
    });
    return res.status === 400;
  });

  await testCase('13. Rejection of foreign/cross-project location reference (400)', async () => {
    const res = await fetch(`${baseUrl}/equipment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Administrator',
      },
      body: JSON.stringify({
        projectId: 1,
        locationId: 999999, // does not exist in project 1
        equipmentCode: 'EQ-CROSS-99',
        equipmentName: 'Test',
      }),
    });
    return res.status === 400;
  });

  // 4. Authorized Actions
  await testCase('14. Administrator authorized to create ITR Template (200)', async () => {
    const res = await fetch(`${baseUrl}/itr-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Administrator',
      },
      body: JSON.stringify({
        code: `ITR-SEC-AUDIT-${Date.now()}`,
        title: 'Security Audit QA Template',
        discipline: 'Electrical',
        schemaDefinition: JSON.stringify({ sections: [] }),
      }),
    });
    return res.status === 200;
  });

  await testCase('15. Tradesperson authorized to save draft ITR (200)', async () => {
    // ITR 2 is Draft or In Progress
    const res = await fetch(`${baseUrl}/itr-instances/2/save`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Tradesperson',
      },
      body: JSON.stringify({ formData: { test: 'value' } }),
    });
    return res.status === 200;
  });

  server.close();

  console.log(`--- AUDIT COMPLETE: ${passCount} PASSED, ${failCount} FAILED ---`);
  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
