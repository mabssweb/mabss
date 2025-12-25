import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function seedData() {
    try {
        console.log('Seeding database with older news...');

        const olderNews = [
            {
                title: "Annual Sports Day 2024",
                summary: "Our annual inter-house sports events at the school playground were a massive success.",
                content: "<p>Our annual inter-house sports events at the school playground were a massive success. The competition was fierce but friendly.</p>",
                image: "https://res.cloudinary.com/dr7bzccrr/image/upload/v1765346564/sp_omkmma.jpg",
                created_at: "2024-10-15 10:00:00"
            },
            {
                title: "Prefects Handover Ceremony",
                summary: "The Prefectorial body 2024-25 handing over powers to the New Prefectorial Body 2025-26.",
                content: "<p>The Prefectorial body 2024-25 handing over powers to the New Prefectorial Body 2025-26. We thank the outgoing leaders for their service.</p>",
                image: "https://res.cloudinary.com/dr7bzccrr/image/upload/v1765346562/r_ob1rkp.jpg",
                created_at: "2024-10-10 09:00:00"
            },
            {
                title: "Charity Drive Success",
                summary: "Students donated items to the local community in a show of solidarity.",
                content: "<p>Students donated items to the local community in a show of solidarity. It was a heartwarming event.</p>",
                image: "https://res.cloudinary.com/dr7bzccrr/image/upload/v1765346557/get_tenmdc.jpg",
                created_at: "2024-10-01 14:00:00"
            }
        ];

        for (const news of olderNews) {
            const query = `
                INSERT INTO news (title, summary, content, featured_image_url, created_at)
                VALUES ($1, $2, $3, $4, $5)
            `;
            await pool.query(query, [news.title, news.summary, news.content, news.image, news.created_at]);
            console.log(`Inserted: ${news.title}`);
        }

        console.log('Seeding complete!');
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await pool.end();
    }
}

seedData();
