async function testLogin() {
    try {
        console.log('--- Testing /api/news/latest (Control) ---');
        const r1 = await fetch('http://localhost:3000/api/news/latest');
        console.log(`Status: ${r1.status}`);

        console.log('--- Testing /api/login (Target) ---');
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'test' })
        });

        console.log(`Status: ${response.status}`);
        const data = await response.json().catch(() => null);
        console.log('Response:', data);

        if (response.status === 404) {
            console.error('FAIL: Endpoint not found (404)');
        } else if (response.status === 401 || response.status === 200) {
            console.log('SUCCESS: Endpoint is reachable!');
        } else {
            console.log('Unknown status.');
        }

    } catch (error) {
        console.error('Network Error:', error.message);
    }
}

testLogin();
