/**
 * User Model
 */

export interface User {
  id: string;
  username: string;
  room: string;
  connectedAt: Date;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  room: string;
  text: string;
  timestamp: Date;
}

/**
 * User Manager - Track connected users
 */
class UserManager {
  private users: Map<string, User> = new Map();

  add(user: User): void {
    this.users.set(user.id, user);
  }

  remove(userId: string): User | undefined {
    const user = this.users.get(userId);
    this.users.delete(userId);
    return user;
  }

  get(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getByRoom(room: string): User[] {
    return Array.from(this.users.values()).filter((u) => u.room === room);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  count(): number {
    return this.users.size;
  }

  roomCount(room: string): number {
    return this.getByRoom(room).length;
  }
}

export const userManager = new UserManager();
