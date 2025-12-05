import path from 'path';
import fs from 'fs';

export interface IUser {
 tid: number;
 name: string;
 role: 'admin' | 'pk' | 'cashier' | 'user';
}

export class UserDB {
 private filePath: string;
 public entity: Record<string, IUser>;

 constructor() {
  this.filePath = path.resolve('user.json');
  this.entity = {};
 }

 init() {
  if (!fs.existsSync(this.filePath)) {
   fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2), 'utf8');
   this.entity = {};
   return;
  }

  const raw = fs.readFileSync(this.filePath, 'utf8').trim();

  // Если файл пустой или содержит только пробелы, инициализируем пустым объектом
  if (!raw || raw.length === 0) {
   this.entity = {};
   this.save();
   return;
  }

  try {
   this.entity = JSON.parse(raw);
  } catch (error) {
   // Если JSON невалидный, инициализируем пустым объектом
   console.warn('Ошибка парсинга user.json, инициализируем пустым объектом:', error);
   this.entity = {};
   this.save();
  }
 }

 private save() {
  fs.writeFileSync(this.filePath, JSON.stringify(this.entity, null, 2), 'utf8');
 }

 // Проверка существования пользователя
 exists(tid: number): boolean {
  return Boolean(this.entity[tid]);
 }

 // Регистрация
 // роль ставим 'user' по умолчанию
 register(tid: number, name: string) {
  if (this.exists(tid)) {
   return { error: true, user: this.entity[tid] };
  }

  this.entity[tid] = {
   tid,
   name,
   role: 'user',
  };

  this.save();

  return { error: false, user: this.entity[tid] };
 }

 // Установка роли
 setRole(tid: number, role: IUser['role']) {
  const user = this.getUser(tid);
  if (!user) return 'Пользователь не найден.';

  user.role = role;
  this.entity[tid] = user;
  this.save();

  return `Роль обновлена: ${role}`;
 }

 getUser(tid: number): IUser | null {
  return this.entity[tid] || null;
 }

 getAllUser() {
  return this.entity;
 }

 editUser(tid: number, name: string) {
  const user = this.getUser(tid);
  if (!user) return null;

  user.name = name;

  this.entity[tid] = user;
  this.save();

  return user;
 }
}
