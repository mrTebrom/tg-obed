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
        }

        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.entity = JSON.parse(raw);
    }

    save() {
        fs.writeFileSync(this.filePath, JSON.stringify(this.entity, null, 2), 'utf8');
    }
}
