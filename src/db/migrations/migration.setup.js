import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationManager {
    constructor() {
        this.migrations = new Map();
        this.migrationModel = mongoose.model('Migration', new mongoose.Schema({
            name: {
                type: String,
                required: true,
                unique: true
            },
            status: {
                type: String,
                enum: ['PENDING', 'SUCCESS', 'FAILED'],
                default: 'PENDING'
            },
            error: String,
            appliedAt: {
                type: Date,
                default: Date.now
            }
        }));
    }

    async loadMigrations() {
        const migrationsDir = __dirname;
        const files = await fs.readdir(migrationsDir);
        
        for (const file of files) {
            if (file.endsWith('.migration.js') && !file.includes('migration.setup')) {
                const migration = await import(path.join(migrationsDir, file));
                this.migrations.set(file, migration.default);
            }
        }
    }

    async runMigrations() {
        try {
            console.log('Starting migrations...');
            
            const appliedMigrations = await this.migrationModel.find().select('name status');
            const pendingMigrations = new Map(this.migrations);

            // Remove successfully applied migrations
            appliedMigrations.forEach(migration => {
                if (migration.status === 'SUCCESS') {
                    pendingMigrations.delete(migration.name);
                }
            });

            for (const [name, migration] of pendingMigrations) {
                console.log(`Running migration: ${name}`);
                try {
                    await migration();
                    await this.migrationModel.findOneAndUpdate(
                        { name },
                        { 
                            status: 'SUCCESS',
                            error: null,
                            appliedAt: new Date()
                        },
                        { upsert: true }
                    );
                    console.log(`Completed migration: ${name}`);
                } catch (error) {
                    console.error(`Error in migration ${name}:`, error);
                    await this.migrationModel.findOneAndUpdate(
                        { name },
                        { 
                            status: 'FAILED',
                            error: error.message,
                            appliedAt: new Date()
                        },
                        { upsert: true }
                    );
                    // Continue with next migration instead of throwing
                }
            }

            console.log('Migration process completed');
        } catch (error) {
            console.error('Error in migration process:', error);
            // Don't throw error to prevent app crash
        }
    }
}

export const migrationManager = new MigrationManager();