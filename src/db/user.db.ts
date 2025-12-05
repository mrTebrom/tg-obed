import path from 'path';
import fs from 'fs';

interface IUser {
    tid: number;
    name: string;
}

export class UserDB {
    private filePath: string;
    public entity: Record<string, IUser>;

    constructor() {
        this.filePath = path.resolve('user.json');
        this.entity = {};
    }

    init() {
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2), 'utf8');
        }

        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.entity = JSON.parse(raw);
    }

    private save() {
        fs.writeFileSync(this.filePath, JSON.stringify(this.entity, null, 2), 'utf8');
    }

    // Проверка существования пользователя
    exists(tid: number): boolean {
        return Boolean(this.entity[tid]);
    }

    // Регистрация с проверкой exists
    register(tid: number, name: string) {
        if (this.exists(tid)) {
            return { error: true, message: 'Пользователь уже существует', user: this.entity[tid] };
        }

        this.entity[tid] = { tid, name };
        this.save();

        return { error: false, user: this.entity[tid] };
    }

    getUser(tid: number): IUser | null {
        return this.entity[tid] || null;
    }

    getAllUser() {
        return this.entity;
    }

    editUser(tid: number, name: string) {
        if (!this.exists(tid)) return null;

        this.entity[tid].name = name;
        this.save();

        return this.entity[tid];
    }
}
