import TelegramBot from 'node-telegram-bot-api';
import { UserService } from '../service/user.service';
import { MenuService } from './menu.command';

export function startCommand(bot: TelegramBot, userService: UserService, menuService: MenuService) {
    const awaitingName = new Set<number>(); // ждём ввод имени вручную
    const awaitingRole = new Set<number>(); // ждём выбор роли

    // -------------------- /start --------------------
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const tid = msg.from?.id!;
        const name = msg.from?.first_name || 'Безымянный';

        // Если уже зарегистрирован
        if (userService.isUserRegistered(tid)) {
            const user = userService.getUser(tid);

            // Если роль ещё не установлена — отправляем выбор роли
            if (!user?.role || user.role === 'user') {
                sendRoleMenu(bot, chatId, tid, awaitingRole);
                return;
            }

            bot.sendMessage(chatId, `С возвращением, ${user?.name}! 👋`);
            menuService.sendMenu(chatId);
            return;
        }

        // Диалог подтверждения имени
        const buttons = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Да', callback_data: `reg_yes_${tid}_${name}` },
                        { text: 'Нет', callback_data: `reg_no_${tid}` },
                    ],
                ],
            },
        };

        bot.sendMessage(chatId, `Ваше имя *${name}*?`, { parse_mode: 'Markdown', ...buttons });
    });

    // -------------------- обработка callback --------------------
    bot.on('callback_query', (query) => {
        const data = query.data;
        const msg = query.message;
        if (!msg || !data) return;

        const chatId = msg.chat.id;

        // ----------- подтвердил имя -----------
        if (data.startsWith('reg_yes_')) {
            const parts = data.split('_'); // reg yes tid name
            const tid = Number(parts[2]);
            const name = parts.slice(3).join('_');

            const reply = userService.registerUser(tid, name);
            bot.sendMessage(chatId, reply);

            // Переходим к выбору роли
            sendRoleMenu(bot, chatId, tid, awaitingRole);

            bot.answerCallbackQuery(query.id);
        }

        // ----------- отказался от имени → ввод вручную -----------
        if (data.startsWith('reg_no_')) {
            const tid = Number(data.split('_')[2]);

            awaitingName.add(tid);
            bot.sendMessage(chatId, 'Хорошо, напишите своё имя:');
            bot.answerCallbackQuery(query.id);
        }

        // ----------- выбор роли -----------
        if (data.startsWith('role_')) {
            const parts = data.split('_'); // role pk tid
            const role = parts[1];
            const tid = Number(parts[2]);

            if (!awaitingRole.has(tid)) {
                bot.answerCallbackQuery(query.id);
                return;
            }

            awaitingRole.delete(tid);

            const result = userService.setUserRole(tid, role as 'admin' | 'pk' | 'cashier' | 'user');
            bot.sendMessage(chatId, result);

            // Показать меню
            menuService.sendMenu(chatId);

            bot.answerCallbackQuery(query.id);
        }
    });

    // -------------------- имя вручную --------------------
    bot.on('message', (msg) => {
        const tid = msg.from?.id!;
        const text = msg.text!;
        if (text.startsWith('/')) return;

        // Если ожидаем ввод имени
        if (awaitingName.has(tid)) {
            awaitingName.delete(tid);

            const reply = userService.registerUser(tid, text);
            bot.sendMessage(msg.chat.id, reply);

            // После имени → выбор роли
            sendRoleMenu(bot, msg.chat.id, tid, awaitingRole);
        }
    });
}

// ------------------------------------------------------
// 🔥 Выбор роли (вынесен в отдельную мини-функцию)
// ------------------------------------------------------
function sendRoleMenu(bot: TelegramBot, chatId: number, tid: number, awaitingRole: Set<number>) {
    awaitingRole.add(tid); // Добавляем пользователя в ожидающие выбор роли
    
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'ПК', callback_data: `role_pk_${tid}` },
                    { text: 'Кассир', callback_data: `role_cashier_${tid}` },
                ],
                [{ text: 'Админ', callback_data: `role_admin_${tid}` }],
            ],
        },
    };

    bot.sendMessage(chatId, 'Выберите вашу роль:', keyboard);
}
