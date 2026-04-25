# Garden Management System

## Stack
- Backend: Node.js + Fastify + MySQL
- Frontend: Next.js
- Upload: Cloudinary

## Requirements
- Node.js 18+
- MySQL 8+
- npm

## 1. Create database
```sql
CREATE DATABASE garden_management CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;


## Backup checklist
- Backup MySQL database
- Backup Cloudinary credentials
- Backup .env files
- Backup migration + seed files

## DB backup
```bash
mysqldump -u root -p garden_management > backup.sql

## Run migrations
```bash
cd api
npm run migrate

cd api
npm run seed