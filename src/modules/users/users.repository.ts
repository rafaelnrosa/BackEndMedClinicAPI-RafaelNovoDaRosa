import { Repository, EntityManager } from 'typeorm';
import { User, UserRole } from '../../entities/User.entity';
import { AppDataSource } from '../../config/database';

export interface IUsersRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  create(data: { name: string; email: string; passwordHash: string; roles: UserRole[] }): Promise<User>;
  createWithManager(
    em: EntityManager,
    data: { name: string; email: string; passwordHash: string; roles: UserRole[] },
  ): Promise<User>;
}

export class UsersRepository implements IUsersRepository {
  private get repo(): Repository<User> {
    return AppDataSource.getRepository(User);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    roles: UserRole[];
  }): Promise<User> {
    const user = this.repo.create({
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      roles: data.roles,
    });
    return this.repo.save(user);
  }

  async createWithManager(
    em: EntityManager,
    data: { name: string; email: string; passwordHash: string; roles: UserRole[] },
  ): Promise<User> {
    const user = em.create(User, {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      roles: data.roles,
    });
    return em.save(User, user);
  }
}
