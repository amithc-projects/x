
export interface LogEntry {
    filename: string;
    date: string;
    gps?: string;
    people?: string; // Names or count
    width: number;
    height: number;
    [key: string]: any;
}

export class CSVLogger {
    private entries: LogEntry[] = [];

    addEntry(entry: LogEntry) {
        this.entries.push(entry);
    }

    clear() {
        this.entries = [];
    }

    generateCSV(): string {
        if (this.entries.length === 0) return '';

        // Collect all unique keys for header
        const allKeys = new Set<string>();
        // Ensure specific order for main keys
        const priorityKeys = ['filename', 'date', 'width', 'height', 'gps', 'people'];
        priorityKeys.forEach(k => allKeys.add(k));

        this.entries.forEach(entry => {
            Object.keys(entry).forEach(k => allKeys.add(k));
        });

        const headers = Array.from(allKeys);

        const rows = this.entries.map(entry => {
            return headers.map(header => {
                const val = entry[header];
                if (val === undefined || val === null) return '';
                // Escape quotes and wrap in quotes if contains comma or quote
                const strVal = String(val);
                if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                    return `"${strVal.replace(/"/g, '""')}"`;
                }
                return strVal;
            }).join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }

    getBlob(): Blob {
        const csv = this.generateCSV();
        return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    }
}
