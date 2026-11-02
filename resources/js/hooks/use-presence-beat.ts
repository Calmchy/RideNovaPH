// While a signed-in page is open and visible, tell the server "I'm here" so other people see me as online
// and my waiting messages are marked delivered. The server writes at most once per 30 seconds.
import { useEffect } from 'react';

function xsrf(): string {
    const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    return m ? decodeURIComponent(m[1]) : '';
}

export function usePresenceBeat(everyMs = 45000): void {
    useEffect(() => {
        const ping = () => {
            if (document.hidden) {
                return;
            }

            fetch('/presence', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': xsrf(),
                },
            }).catch(() => {
                /* offline: the next beat will try again */
            });
        };

        ping();
        const t = setInterval(ping, everyMs);
        document.addEventListener('visibilitychange', ping);

        return () => {
            clearInterval(t);
            document.removeEventListener('visibilitychange', ping);
        };
    }, [everyMs]);
}
