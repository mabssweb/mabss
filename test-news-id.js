async function testNewsId() {
    try {
        // 1. Get List to find an ID
        console.log('Fetching list...');
        const listRes = await fetch('http://localhost:3000/api/news?limit=1');
        const listData = await listRes.json();

        if (!listData.news || listData.news.length === 0) {
            console.log('No news found to test.');
            return;
        }

        const id = listData.news[0].id;
        console.log(`Testing ID: ${id}`);

        // 2. Fetch Detail
        const detailRes = await fetch(`http://localhost:3000/api/news/${id}`);
        const detailData = await detailRes.json();

        console.log('Detail Response:', JSON.stringify(detailData, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testNewsId();
