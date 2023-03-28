import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'a!950403',
  database: 'exam',
  entities: ['dist/**/*.entity{.d.ts,.js}', '**/*.entity{.d.ts,.js}'],
  charset: 'utf8mb4',
  synchronize: false,
  logging: true,
});

export default dataSource;
dataSource
  .initialize()
  .then(() => console.log('Data Source has been initialized'))
  .catch((error) => console.error('Error initializing Data Source', error));
