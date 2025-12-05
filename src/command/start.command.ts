import TelegramBot from 'node-telegram-bot-api';
import { UserService } from '../service/user.service';
import { MenuService } from './menu.command';

export function startCommand(bot: TelegramBot, userService: UserService, menuService: MenuService) {
    const awaitingName = new Set<number>(); // кто должен ввести имя вручную

    // --- /start ---
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const tid = msg.from?.id!;
        const name = msg.from?.first_name || 'Безымянный';

        // Проверяем, зарегистрирован ли пользователь
        if (userService.isUserRegistered(tid)) {
            const user = userService.getUser(tid);
            bot.sendMessage(chatId, `С возвращением, ${user?.name}! 👋`);
            menuService.sendMenu(chatId);
            return;
        }

        // Если не зарегистрирован, показываем кнопки регистрации
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

    // --- Обработка кнопок ---
    bot.on('callback_query', (query) => {
        const data = query.data;
        const msg = query.message;
        if (!msg || !data) return;

        const chatId = msg.chat.id;

        // Нажал "Да"
        if (data.startsWith('reg_yes_')) {
            const parts = data.split('_'); // reg yes tid name
            const tid = Number(parts[2]);
            const name = parts.slice(3).join('_'); // на случай пробелов

            const reply = userService.registerUser(tid, name);
            bot.sendMessage(chatId, reply);

            // Показываем меню после регистрации
            menuService.sendMenu(chatId);

            bot.answerCallbackQuery(query.id);
        }

        // Нажал "Нет"
        if (data.startsWith('reg_no_')) {
            const tid = Number(data.split('_')[2]);

            awaitingName.add(tid);

            bot.sendMessage(chatId, 'Хорошо, напишите своё имя:');
            bot.answerCallbackQuery(query.id);
        }
    });

    // --- Обработка имени, если пользователь выбрал "Нет" ---
    bot.on('message', (msg) => {
        const tid = msg.from?.id!;
        const text = msg.text!;

        if (text.startsWith('/')) return;

        if (awaitingName.has(tid)) {
            awaitingName.delete(tid);

            const reply = userService.registerUser(tid, text);
            bot.sendMessage(msg.chat.id, reply);

            // ПОКАЗЫВАЕМ МЕНЮ ПОСЛЕ РЕГИСТРАЦИИ
            menuService.sendMenu(msg.chat.id);
        }
    });
}
