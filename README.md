# MABSS News System

A professional, maintainable news system for Mbarara Army Boarding Secondary School (MABSS) built with Vercel Serverless Functions and Neon PostgreSQL.

## 🎯 Overview

This news system provides a complete solution for managing and displaying school news and updates. It features a responsive frontend with a professional admin dashboard, backed by a scalable serverless API.

### ✨ Features

- **📱 Responsive Design**: Mobile-first design matching MABSS branding
- **📰 News Management**: Create, read, and display news articles
- **🔐 Admin Authentication**: Secure admin access with password protection
- **📄 Rich Content**: Support for formatted text, images, and HTML content
- **🔍 Pagination**: Efficient news listing with pagination
- **⚡ Serverless**: Vercel Functions for scalable backend
- **🗄️ PostgreSQL**: Neon database for reliable data storage
- **🛡️ Security**: Input sanitization and CORS protection

## 📋 Prerequisites

- Node.js 18+ (for local development)
- Vercel CLI (`npm i -g vercel`)
- Neon PostgreSQL account (free tier available)
- Git repository

## 🤝 Collaborator Setup (Testing this Branch)

If you are pulling this branch to test the new **Admin News Management** features, follow these steps:

### 1. Environment Configuration
Create a file named `.env` in the root directory (this file is ignored by git).
Add the following credentials (ask the team lead for the actual values):

```ini
DATABASE_URL="postgres://user:password@ep-cool-project-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
ADMIN_PASSWORD="your-secure-password"
```

### 2. Install & Run
```bash
npm install
npm run start-local
```
*Note: `npm run start-local` runs `vercel dev` which correctly loads the `.env` file.*

### 3. Verify Admin Features
1. Go to `http://localhost:3000/admin.html`
2. Log in with the `ADMIN_PASSWORD` you set in `.env`.
3. Test **Add News**, **Edit News**, and **Delete News**.

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd mabss
npm install
```

### 2. Database Setup (Neon PostgreSQL)

#### Create Neon Database
1. Go to [neon.tech](https://neon.tech) and sign up for free
2. Create a new project
3. Copy the connection string from the dashboard

#### Run Database Schema
1. In Neon dashboard, open the SQL Editor
2. Copy and paste the contents of `database-schema.sql`
3. Execute the SQL to create tables and sample data

### 3. Vercel Deployment

#### Install Vercel CLI
```bash
npm install -g vercel
```

#### Deploy to Vercel
```bash
vercel
```

Follow the prompts:
- Link to existing project or create new
- Set project name (e.g., `mabss-news`)
- Configure environment variables (see below)

#### Set Environment Variables
In Vercel dashboard or CLI:

```bash
vercel env add DATABASE_URL
vercel env add ADMIN_PASSWORD
```

**Required Environment Variables:**
- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `ADMIN_PASSWORD`: Secure password for admin access (e.g., `mabss_admin_2025`)

### 4. Test Deployment

```bash
vercel --prod
```

Visit your deployed URL to test the application.

## 📁 Project Structure

```
mabss/
├── api/
│   └── news/
│       ├── index.js          # GET/POST /api/news
│       └── [id].js           # GET /api/news/[id]
├── database-schema.sql       # Neon PostgreSQL schema
├── package.json              # Dependencies and scripts
├── vercel.json               # Vercel configuration
├── index.html                # Homepage with latest news
├── news.html                 # News listing page
├── news-detail.html          # Individual news article
├── admin.html                # Admin dashboard
└── README.md                 # This file
```

## 🔧 API Documentation

### GET /api/news/latest
Returns the 3 most recent news articles for homepage display.

**Response:**
```json
{
  "news": [
    {
      "id": 1,
      "title": "News Title",
      "summary": "Brief summary...",
      "image": "https://...",
      "date": "2024-12-20"
    }
  ]
}
```

### GET /api/news
Returns paginated news articles.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 6)

**Response:**
```json
{
  "news": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### GET /api/news/[id]
Returns a single news article by ID.

**Response:**
```json
{
  "id": 1,
  "title": "News Title",
  "summary": "Brief summary...",
  "content": "<p>Full HTML content...</p>",
  "image": "https://...",
  "date": "2024-12-20"
}
```

### POST /api/news
Creates a new news article (admin only).

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_PASSWORD
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "News Title",
  "summary": "Brief summary...",
  "content": "<p>Full HTML content...</p>",
  "featuredImageUrl": "https://..."
}
```

**Response:**
```json
{
  "id": 123,
  "title": "News Title",
  "summary": "Brief summary...",
  "image": "https://...",
  "date": "2024-12-20",
  "message": "News article created successfully"
}
```

## 🧪 Testing

### Local Development
```bash
npm run dev
```

### API Testing with curl

**Test Latest News:**
```bash
curl https://your-app.vercel.app/api/news/latest
```

**Test News Listing:**
```bash
curl "https://your-app.vercel.app/api/news?page=1&limit=6"
```

**Test Single News:**
```bash
curl https://your-app.vercel.app/api/news/1
```

**Test Admin Creation:**
```bash
curl -X POST https://your-app.vercel.app/api/news \
  -H "Authorization: Bearer YOUR_ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test News",
    "summary": "Test summary",
    "content": "<p>Test content</p>"
  }'
```

## 🔒 Security Features

- **Authentication**: Bearer token for admin operations
- **Sanitization**: HTML content cleaned to prevent XSS
- **CORS**: Configured for cross-origin requests
- **Input Validation**: Required fields and data type checking
- **Environment Variables**: Sensitive data stored securely

## 🎨 Customization

### Branding
Update colors in CSS files:
- Primary green: `#0e7704`
- Secondary green: `#006341`
- Dark green: `#004d33`

### Content
- Modify sample data in `database-schema.sql`
- Update school information in HTML files
- Customize admin password and security settings

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify `DATABASE_URL` is correct
- Check Neon database is active
- Ensure SSL is enabled in connection string

**Admin Authentication Failed**
- Confirm `ADMIN_PASSWORD` environment variable is set
- Use correct Bearer token format: `Bearer your_password`

**CORS Errors**
- Check Vercel domain is allowed
- Verify API endpoints are correctly deployed

**Static Files Not Loading**
- Ensure all HTML/CSS/JS files are in root directory
- Check Vercel build configuration

### Logs and Debugging

**Vercel Logs:**
```bash
vercel logs
```

**Database Logs:**
Check Neon dashboard for query logs and errors.

## 📈 Performance

- **Database Indexing**: Optimized queries with created_at index
- **Pagination**: Efficient loading of large datasets
- **Caching**: Browser caching for static assets
- **CDN**: Vercel automatically serves content via CDN

## 🚀 Deployment Checklist

- [ ] Neon database created and schema applied
- [ ] Environment variables configured in Vercel
- [ ] Domain configured (optional)
- [ ] SSL certificate active
- [ ] Admin password set securely
- [ ] Sample data inserted
- [ ] All pages tested
- [ ] API endpoints verified

## 📞 Support

For technical issues:
1. Check Vercel function logs
2. Verify database connectivity
3. Test API endpoints with curl
4. Review environment variables

## 📝 License

This project is developed for Mbarara Army Boarding Secondary School.

---

**Built with ❤️ for MABSS Community**

*Creativity For Excellence*
