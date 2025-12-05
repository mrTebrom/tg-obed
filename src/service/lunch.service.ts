import { LunchDB } from '../db/lunch.db';
import { UserDB } from '../db/user.db';

export class LunchService {
 private slots = ['12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00'];

 constructor(private lunchDB: LunchDB, private userDB: UserDB) {}

 private today() {
  return new Date().toISOString().split('T')[0];
 }

 getSlots(): Record<string, number> {
  const date = this.today();

  if (!this.lunchDB.entity[date]) {
   this.lunchDB.entity[date] = {};
  }

  const result: Record<string, number> = {};

  for (const slot of this.slots) {
   const users = this.lunchDB.entity[date][slot] || [];
   result[slot] = users.length;
  }

  return result;
 }

 bookLunch(tid: number, slot: string) {
  const user = this.userDB.getUser(tid);
  if (!user) return 'Вы не зарегистрированы.';

  const date = this.today();

  if (!this.slots.includes(slot)) {
   return 'Неверный слот.';
  }

  if (!this.lunchDB.entity[date]) {
   this.lunchDB.entity[date] = {};
  }

  if (!this.lunchDB.entity[date][slot]) {
   this.lunchDB.entity[date][slot] = [];
  }

  // Проверяем, есть ли запись уже у пользователя на сегодня
  for (const sl of this.slots) {
   if (this.lunchDB.entity[date][sl]?.includes(tid)) {
    return `Вы уже записаны на обед (${sl}).`;
   }
  }

  // Проверка лимита
  if (this.lunchDB.entity[date][slot].length >= 2) {
   return 'Этот слот уже полностью занят.';
  }

  this.lunchDB.entity[date][slot].push(tid);
  this.lunchDB.save();

  return `Вы успешно записаны на обед: ${slot}`;
 }

 cancelLunch(tid: number) {
  const date = this.today();

  if (!this.lunchDB.entity[date]) return 'Сегодня нет броней.';

  for (const slot of this.slots) {
   const arr = this.lunchDB.entity[date][slot];
   if (!arr) continue;

   const index = arr.indexOf(tid);
   if (index !== -1) {
    arr.splice(index, 1);
    this.lunchDB.save();
    return `Бронь на обед (${slot}) отменена.`;
   }
  }

  return 'У вас нет брони на сегодня.';
 }

 getLunchList() {
  const date = this.today();

  const result: { slot: string; users: { tid: number; name: string }[] }[] = [];

  if (!this.lunchDB.entity[date]) {
   return [];
  }

  for (const slot of this.slots) {
   const tids = this.lunchDB.entity[date][slot] || [];

   result.push({
    slot,
    users: tids.map((tid) => {
     const user = this.userDB.getUser(tid);
     return {
      tid,
      name: user?.name || 'Неизвестно',
     };
    }),
   });
  }

  return result;
 }

 // Проверка, находится ли пользователь в активном слоте обеда (текущее время попадает в слот)
 isUserOnActiveLunch(tid: number): boolean {
  const date = this.today();

  if (!this.lunchDB.entity[date]) {
   return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute; // время в минутах от начала дня

  // Ищем пользователя во всех слотах
  for (const slot of this.slots) {
   const tids = this.lunchDB.entity[date][slot] || [];

   if (!tids.includes(tid)) {
    continue;
   }

   // Парсим слот (формат: "12:00-13:00")
   const [startStr, endStr] = slot.split('-');
   const [startHour, startMin] = startStr.split(':').map(Number);
   const [endHour, endMin] = endStr.split(':').map(Number);

   const startTime = startHour * 60 + startMin;
   const endTime = endHour * 60 + endMin;

   // Проверяем, попадает ли текущее время в диапазон слота
   if (currentTime >= startTime && currentTime < endTime) {
    return true;
   }
  }

  return false;
 }
}
