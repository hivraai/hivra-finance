import { Search } from 'lucide-react';

// Plain GET form: ?symbol=XYZ on the given page. Works without JavaScript.
export default function SymbolForm({ action, defaultValue }: { action: string; defaultValue: string }) {
    return (
        <form action={action} className="flex items-center gap-2">
            <input name="symbol" defaultValue={defaultValue} maxLength={10} autoComplete="off" spellCheck={false}
                className="mono h-9 w-28 rounded-lg border border-line bg-canvas px-2.5 text-[14px] uppercase outline-none focus-visible:ring-2 focus-visible:ring-brand/40" />
            <button type="submit" className="btn btn-ghost h-9 w-9 p-0" aria-label="Go"><Search /></button>
        </form>
    );
}
