import path from 'path';
import fs from 'fs';

export class LunchDB {
 private filePath: string;

 public entity: {
  [date: string]: {
   [slot: string]: number[];
  };
 };

 constructor() {
  this.filePath = path.resolve('lunch.json');
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
   console.warn('Ошибка парсинга lunch.json, инициализируем пустым объектом:', error);
   this.entity = {};
   this.save();
  }
 }

 save() {
  fs.writeFileSync(this.filePath, JSON.stringify(this.entity, null, 2), 'utf8');
 }
}
