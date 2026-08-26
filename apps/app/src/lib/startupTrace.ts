/*
 * [DEBUG] Temporary startup instrumentation — remove once the slow-launch bug
 * is understood. Logs elapsed milliseconds since the JS bundle started
 * executing, so each link of the launch chain can be timed from the Metro
 * console. No PII: labels carry booleans and codes only, never a uid or email.
 */
const t0 = Date.now();

export const mark = (label: string): void => {
  console.log(`[DEBUG:async] +${String(Date.now() - t0).padStart(6, ' ')}ms ${label}`);
};

mark('startupTrace module evaluated (t0)');
