import { UserDB } from '../db/user.db';

export class UserService {
    constructor(private userDB: UserDB) {}

    isUserRegistered(tid: number): boolean {
        return this.userDB.exists(tid);
    }

    getUser(tid: number) {
        return this.userDB.getUser(tid);
    }

    registerUser(tid: number, name: string) {
        const reg = this.userDB.register(tid, name);

        if (reg.error) {
            return `С возвращением, ${reg.user.name}! 👋`;
        }

        return `Добро пожаловать, ${name}! 🎉`;
    }

    getProfile(tid: number) {
        const user = this.userDB.getUser(tid);

        if (!user) return 'Вы ещё не зарегистрированы. Введите /start';

        return `
            Ваш профиль:
            🆔 ID: ${user.tid}
            👤 Имя: ${user.name}
        `;
    }

    editName(tid: number, newName: string) {
        if (!this.userDB.exists(tid)) {
            return 'Вы ещё не зарегистрированы.';
        }

        this.userDB.editUser(tid, newName);

        return `Имя обновлено ✔️ Новое имя: ${newName}`;
    }

    // Проверка админских прав
    hasAdminAccess(tid: number): boolean {
        const user = this.userDB.getUser(tid);
        return user?.role === 'admin';
    }

    // Установка роли пользователя
    setUserRole(tid: number, role: 'admin' | 'pk' | 'cashier' | 'user'): string {
        if (!this.userDB.exists(tid)) {
            return 'Пользователь не найден. Он должен сначала зарегистрироваться.';
        }

        return this.userDB.setRole(tid, role);
    }

    // Получить всех пользователей
    getAllUsers() {
        return this.userDB.getAllUser();
    }

    // Получить роль пользователя
    getUserRole(tid: number): string {
        const user = this.userDB.getUser(tid);
        return user?.role || 'не зарегистрирован';
    }
}
