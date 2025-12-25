async function testUpdate() {
    try {
        // 1. Get ID
        const listRes = await fetch('http://localhost:3000/api/news?limit=1');
        const listData = await listRes.json();
        const id = listData.news[0].id;
        console.log(`Testing Update on ID: ${id}`);

        // 2. Try Update
        const response = await fetch(`http://localhost:3000/api/news/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.ADMIN_PASSWORD || 'Mabss@2014'}`
            },
            body: JSON.stringify({
                title: 'Updated Title Test',
                summary: 'Updated Summary Test',
                content: '<p>Updated Content</p>',
                featuredImageUrl: 'https://via.placeholder.com/150'
            })
        });

        console.log(`Status: ${response.status}`);
        const data = await response.json();
        console.log('Response:', data);

    } catch (error) {
        console.error('Error:', error);
    }
}

testUpdate();
