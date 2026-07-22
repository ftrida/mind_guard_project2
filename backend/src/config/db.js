import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

export const sequelize = dbUrl
  ? new Sequelize(dbUrl, {
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
      dialectOptions: {
        ssl: process.env.MYSQL_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false
      }
    })
  : new Sequelize(
      process.env.MYSQL_DATABASE || 'mindguard',
      process.env.MYSQL_USER || 'root',
      process.env.MYSQL_PASSWORD || 'password',
      {
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: parseInt(process.env.MYSQL_PORT || '3306', 10),
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
      }
    );

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL Database connected successfully via Sequelize.');
  } catch (error) {
    console.error(`MySQL Connection Error: ${error.message}`);
    // Non-fatal warning log if DB is unreachable during build or initial setup
  }
};
