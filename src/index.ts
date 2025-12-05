import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

import { UserDB } from './db/user.db';
import { UserService } from './service/user.service';

import { startCommand } from './command/start.command';
import { MenuService } from './command/menu.command';

import { LunchDB } from './db/lunch.db';
import { LunchService } from './service/lunch.service';
import { lunchCommand } from './command/lunch.command';

import { BreakDB } from './db/break.db';
import { BreakService } from './service/break.service';
import { breakCommand } from './command/break.command';

import { adminCommand } from './command/admin.command';
// Загружаем переменные окружения
dotenv.config();

const token = process.env.BOT_TOKEN;

if (!token) {
 throw new Error('BOT_TOKEN не найден в .env');
}

// --- BOT ---
const bot = new TelegramBot(token, { polling: true });

// --- DB ---
const userDB = new UserDB();
userDB.init();

const lunchDB = new LunchDB();
lunchDB.init();

const breakDB = new BreakDB();
breakDB.init();

// --- SERVICE ---
const userService = new UserService(userDB);
const lunchService = new LunchService(lunchDB, userDB);
const breakService = new BreakService(breakDB, userDB, lunchDB, bot);
const menuService = new MenuService(bot, userService, lunchService, breakService);

// --- COMMANDS ---
startCommand(bot, userService, menuService);
lunchCommand(bot, lunchService);
breakCommand(bot, breakService, userService);
adminCommand(bot, lunchService, userService, breakService, menuService);

console.log('Бот запущен...');
