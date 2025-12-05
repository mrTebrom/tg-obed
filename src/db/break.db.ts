import fs from 'fs';
import path from 'path';

export interface IBreakRecord {
 tid: number;
 name: string;
 role: string;
 start: string; // ISO datetime
 end: string; // ISO datetime
}

export interface IBreakDayData {
 active: IBreakRecord[];
 history: IBreakRecord[];
}

export class BreakDB {
 private filePath: string;
 public entity: Record<string, IBreakDayData>;

 constructor() {
  this.filePath = path.resolve('break.json');
  this.entity = {};
 }

 init() {
  if (!fs.existsSync(this.filePath)) {
   fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2), 'utf8');
   this.entity = {};
   return;
  }

  const raw = fs.readFileSync(this.filePath, 'utf8').trim();

  if (!raw || raw.length === 0) {
   this.entity = {};
   this.save();
   return;
  }

  try {
   this.entity = JSON.parse(raw);
  } catch (error) {
   console.warn('Ошибка парсинга break.json, инициализируем пустым объектом:', error);
   this.entity = {};
   this.save();
  }
 }

 save() {
  fs.writeFileSync(this.filePath, JSON.stringify(this.entity, null, 2), 'utf8');
 }

 getToday(): string {
  return new Date().toISOString().split('T')[0];
 }

 ensureToday() {
  const today = this.getToday();
  if (!this.entity[today]) {
   this.entity[today] = {
    active: [],
    history: [],
   };
   this.save();
  }
  return today;
 }

 getTodayData() {
  const today = this.ensureToday();
  return this.entity[today];
 }

 addActive(record: IBreakRecord) {
  const today = this.ensureToday();
  this.entity[today].active.push(record);
  this.save();
 }

 finishBreak(tid: number) {
  const today = this.ensureToday();
  const data = this.entity[today];

  const index = data.active.findIndex((r) => r.tid === tid);

  if (index === -1) return false;

  const record = data.active[index];

  // переносим в историю
  data.active.splice(index, 1);
  data.history.push(record);

  this.save();
  return true;
 }

 // Хранение режимов пользователей (tid -> mode)
 private userModes: Record<string, '10' | '15'> = {};

 getUserMode(tid: number): '10' | '15' | null {
  return this.userModes[tid] || null;
 }

 setUserMode(tid: number, mode: '10' | '15') {
  this.userModes[tid] = mode;
 }

 getUserUsage(tid: number): number {
  const today = this.ensureToday();
  const data = this.entity[today];
  // Считаем количество завершенных перерывов за сегодня
  return data.history.filter((r) => r.tid === tid).length;
 }
}
