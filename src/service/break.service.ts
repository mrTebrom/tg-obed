import { BreakDB } from '../db/break.db';
import { UserDB } from '../db/user.db';
import { LunchDB } from '../db/lunch.db';
import TelegramBot from 'node-telegram-bot-api';

export class BreakService {
 constructor(private breakDB: BreakDB, private userDB: UserDB, private lunchDB: LunchDB, private bot: TelegramBot) {}

 // Режимы: 10 минут × 4 или 15 минут × 3
 private modeLimits = {
  '10': 4,
  '15': 3,
 };
 getMode(tid: number): '10' | '15' | null {
  return this.breakDB.getUserMode(tid);
 }
 // Пользователь выбирает режим (10 или 15)
 chooseMode(tid: number, mode: '10' | '15') {
  const user = this.userDB.getUser(tid);
  if (!user) return 'Вы не зарегистрированы.';

  const existingMode = this.breakDB.getUserMode(tid);
  if (existingMode) {
   return `Вы уже выбрали режим перерывов: ${existingMode} минут.`;
  }

  this.breakDB.setUserMode(tid, mode);
  return `Вы выбрали режим перерывов: ${mode} минут.`;
 }

 // Проверка, можно ли начать перерыв (никто другой не на перерыве)
 canStartBreak(): { can: boolean; message?: string } {
  const todayData = this.breakDB.getTodayData();

  if (todayData.active.length > 0) {
   const activeUser = todayData.active[0];
   return {
    can: false,
    message: `Сейчас на перерыве: *${activeUser.name}*. Перерыв закончится в *${new Date(activeUser.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}*. Подождите, пока он закончится.`,
   };
  }

  return { can: true };
 }

 startBreak(tid: number): { success: boolean; message: string; startTime?: string; endTime?: string } {
  const user = this.userDB.getUser(tid);
  if (!user) {
   return { success: false, message: 'Вы не зарегистрированы.' };
  }

  const mode = this.breakDB.getUserMode(tid);
  if (!mode) {
   return { success: false, message: 'Выберите режим перерывов: 10 минут × 4 или 15 минут × 3.' };
  }

  const used = this.breakDB.getUserUsage(tid);
  const limit = this.modeLimits[mode];

  if (used >= limit) {
   return { success: false, message: `Вы уже использовали все свои перерывы (${limit}).` };
  }

  const todayData = this.breakDB.getTodayData();

  // Проверяем, не активный ли уже перерыв у этого пользователя
  if (todayData.active.find((r) => r.tid === tid)) {
   return { success: false, message: 'Вы уже на перерыве.' };
  }

  // Проверяем, не занят ли перерыв другим пользователем
  const canStart = this.canStartBreak();
  if (!canStart.can) {
   return { success: false, message: canStart.message || 'Перерыв занят другим пользователем.' };
  }

  const duration = Number(mode); // 10 или 15 минут
  const start = new Date();
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const startTimeStr = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const endTimeStr = end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const record = {
   tid,
   name: user.name,
   role: user.role,
   start: start.toISOString(),
   end: end.toISOString(),
  };

  this.breakDB.addActive(record);

  // Автоматическое завершение
  setTimeout(() => {
   this.breakDB.finishBreak(tid);
   this.bot.sendMessage(tid, 'Ваш перерыв окончен ⏰');
  }, duration * 60 * 1000);

  return {
   success: true,
   message: `Вы на перерыве ☕`,
   startTime: startTimeStr,
   endTime: endTimeStr,
  };
 }

 // Админу показать текущих людей на перерыве
 getActiveBreaks() {
  const todayData = this.breakDB.getTodayData();
  return todayData.active;
 }

 // Получить историю перерывов за сегодня
 getBreakHistory() {
  const todayData = this.breakDB.getTodayData();
  const history = todayData.history;

  // Группируем по пользователям
  const userMap: Record<number, { name: string; breaks: string[] }> = {};

  for (const record of history) {
   if (!userMap[record.tid]) {
    userMap[record.tid] = {
     name: record.name,
     breaks: [],
    };
   }
   userMap[record.tid].breaks.push(record.start);
  }

  return Object.values(userMap);
 }

 // Получить список свободных (не на обеде и не на перерыве)
 getFreeUsers() {
  const allUsers = this.userDB.getAllUser();
  const todayData = this.breakDB.getTodayData();
  const today = new Date().toISOString().split('T')[0];

  // Получаем всех кто на перерыве
  const onBreak = new Set<number>();
  for (const record of todayData.active) {
   onBreak.add(record.tid);
  }

  // Получаем всех кто на обеде
  const onLunch = new Set<number>();
  if (this.lunchDB.entity[today]) {
   for (const slot of Object.values(this.lunchDB.entity[today])) {
    if (Array.isArray(slot)) {
     slot.forEach((tid) => onLunch.add(tid));
    }
   }
  }

  const result: { tid: number; name: string; role: string }[] = [];

  for (const user of Object.values(allUsers)) {
   if (!onBreak.has(user.tid) && !onLunch.has(user.tid)) {
    result.push({
     tid: user.tid,
     name: user.name,
     role: user.role,
    });
   }
  }

  return result;
 }
}
