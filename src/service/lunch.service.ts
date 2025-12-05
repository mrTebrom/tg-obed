import { LunchDB } from '../db/lunch.db';
import { UserDB } from '../db/user.db';

export class LunchService {
    private slots = [
        '12:00-13:00',
        '13:00-14:00',
        '14:00-15:00',
        '15:00-16:00',
        '16:00-17:00',
        '17:00-18:00',
        '18:00-19:00',
    ];

    constructor(private lunchDB: LunchDB, private userDB: UserDB) {}

    private today() {
        return new Date().toISOString().split('T')[0];
    }

    getSlots() {
        const date = this.today();

        // создаём запись дня, если её нет
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

        // Проверяем, есть ли запись уже у пользователя
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
}
