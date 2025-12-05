import TelegramBot from 'node-telegram-bot-api';
import { LunchService } from '../service/lunch.service';
import { UserService } from '../service/user.service';
import { BreakService } from '../service/break.service';
import { MenuService } from './menu.command';

export function adminCommand(bot: TelegramBot, lunchService: LunchService, userService: UserService, breakService: BreakService, menuService: MenuService) {
 // Обработка админских кнопок меню
 bot.on('message', (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const tid = msg.from!.id;
  const text = msg.text;

  // Проверяем, что это админ и это админская кнопка
  if (!userService.hasAdminAccess(tid)) return;

  const adminButtons = ['📋 Расписание обедов', '☕ Кто на перерыве', '📊 Расписание перерывов', '✅ Кто свободен'];

  if (adminButtons.includes(text)) {
   menuService.handleAdminMenu(chatId, text);
  }
 });
 bot.onText(/\/admin_lunch/, (msg): void => {
  const chatId = msg.chat.id;
  const tid = msg.from!.id;

  // Проверка прав через роли
  if (!userService.hasAdminAccess(tid)) {
   bot.sendMessage(chatId, '⛔ У вас нет доступа к админским командам.');
   return;
  }

  const list = lunchService.getLunchList();

  if (list.length === 0) {
   bot.sendMessage(chatId, 'Сегодня записей на обед нет.');
   return;
  }

  let text = `📋 *Список записанных на обед*\n\n`;

  for (const slotInfo of list) {
   const users = slotInfo.users;

   if (users.length === 0) {
    text += `• ${slotInfo.slot}: _никого_\n`;
   } else {
    text += `• ${slotInfo.slot}:\n`;
    for (const u of users) {
     text += `    — ${u.name}`;
    }
   }
  }

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
 });

 // Команда для установки ролей
 bot.onText(/\/set_role (\d+) (admin|pk|cashier|user)/, (msg, match) => {
  const chatId = msg.chat.id;
  const adminTid = msg.from!.id;

  // Только админы могут менять роли
  if (!userService.hasAdminAccess(adminTid)) {
   bot.sendMessage(chatId, '⛔ У вас нет прав для изменения ролей.');
   return;
  }

  const targetTid = Number(match![1]);
  const newRole = match![2] as 'admin' | 'pk' | 'cashier' | 'user';

  const result = userService.setUserRole(targetTid, newRole);
  bot.sendMessage(chatId, result);
 });

 // Команда для просмотра всех пользователей
 bot.onText(/\/users/, (msg) => {
  const chatId = msg.chat.id;
  const tid = msg.from!.id;

  if (!userService.hasAdminAccess(tid)) {
   bot.sendMessage(chatId, '⛔ У вас нет доступа.');
   return;
  }

  const users = userService.getAllUsers();
  let text = '👥 *Все пользователи:*\n\n';

  for (const user of Object.values(users)) {
   const roleEmoji = {
    admin: '👑',
    pk: '🍳',
    cashier: '💰',
    user: '👤',
   };

   text += `${roleEmoji[user.role]} ${user.name} (ID: ${user.tid}) - ${user.role}\n`;
  }

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
 });
}
