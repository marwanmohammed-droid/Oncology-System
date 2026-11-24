// ════════════════════════════════════════════════════════════
// lib/utils/dates.ts
// كل التواريخ "اليومية" (YYYY-MM-DD) لازم تتحسب بتوقيت العيادة (القاهرة)،
// مش UTC. `new Date().toISOString().split('T')[0]` بيرجّع تاريخ الأمس لو
// الوقت بين 12:00 و 02:00 (أو 03:00 صيفي) بعد منتصف الليل في مصر، وده
// بيبوّظ حسابات PFS/OS والتقارير الشهرية.
//
// الدوال دي بتشتغل صح بغض النظر عن timezone الجهاز أو السيرفر.
// ════════════════════════════════════════════════════════════

export const CLINIC_TZ = 'Africa/Cairo'

const clinicFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
})

const pad = (n: number) => String(n).padStart(2, '0')

/** تاريخ (بتوقيت العيادة) للحظة زمنية معيّنة → 'YYYY-MM-DD' */
export function toClinicISO(instant: Date): string {
    return clinicFmt.format(instant)
}

/** تاريخ من Date اتبنى بمكوّنات محلية (new Date(y, m, d)) → 'YYYY-MM-DD' (للتقويم) */
export function toLocalISO(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** تاريخ النهارده بتوقيت العيادة */
export function todayISO(): string {
    return toClinicISO(new Date())
}

function parts(iso: string): [number, number, number] | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

/** أضف/اطرح أيام من تاريخ (الافتراضي: النهارده) → 'YYYY-MM-DD' */
export function addDaysISO(days: number, fromISO: string = todayISO()): string {
    const p = parts(fromISO)
    if (!p) throw new Error(`Invalid ISO date: ${fromISO}`)
    const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + days))
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** تاريخ (بتوقيت العيادة) بعد عدد ساعات من الآن */
export function addHoursISO(hours: number): string {
    return toClinicISO(new Date(Date.now() + hours * 3600000))
}

/** آخر يوم في الشهر. month = 1..12 */
export function lastDayOfMonthISO(year: number, month: number): string {
    const day = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return `${year}-${pad(month)}-${pad(day)}`
}

/** الفرق بالأيام بين تاريخين ISO (b - a) */
export function diffDaysISO(aISO: string, bISO: string): number {
    const a = parts(aISO)
    const b = parts(bISO)
    if (!a || !b) return Number.NaN
    return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000)
}

/**
 * العمر بالسنين الكاملة (تقويمي، مش ÷365.25).
 * dob: 'YYYY-MM-DD' | ISO timestamp | Date.
 * at:  التاريخ المرجعي (الافتراضي النهارده) — استخدمه لحساب العمر عند التشخيص.
 * بيرجّع NaN لو التاريخ غير صالح (عشان الخطأ يبان مش يتخبّى).
 */
export function calcAge(
    dob: string | Date | null | undefined,
    at: string | Date = todayISO(),
): number {
    const toISO = (v: string | Date | null | undefined) =>
        v instanceof Date ? toClinicISO(v) : (v ?? '')
    const b = parts(toISO(dob))
    const a = parts(toISO(at))
    if (!b || !a) return Number.NaN
    let age = a[0] - b[0]
    if (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])) age -= 1
    return age
}
