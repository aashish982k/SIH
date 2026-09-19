import bcrypt from 'bcryptjs';
import { query } from '../../src/config/db';

export async function seedUsers(): Promise<void> {
  const users = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Admin User',
      email: 'admin@nwis.com',
      password: 'admin1234',
      role: 'administrator',
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@nwis.com',
      password: 'engineer1234',
      role: 'engineer',
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Priya Dutta',
      email: 'priya.dutta@nwis.com',
      password: 'engineer1234',
      role: 'engineer',
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'Field Operator',
      email: 'operator@nwis.com',
      password: 'operator1234',
      role: 'operator',
    },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await query(
      `INSERT IGNORE INTO users (id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [u.id, u.name, u.email, hash, u.role]
    );
  }

  console.log(`  ✔ Seeded ${users.length} users`);
}
