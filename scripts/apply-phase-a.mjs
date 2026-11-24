#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// scripts/apply-phase-a.mjs
// بيطبّق تعديلات المرحلة A على ملفات المشروع الموجودة.
//
//   node scripts/apply-phase-a.mjs --dry-run     # يعرض بس، من غير ما يكتب
//   node scripts/apply-phase-a.mjs               # يطبّق (مع نسخ احتياطي)
//   node scripts/apply-phase-a.mjs --root ../my-app
//
// الأمان:
//  • كل ملف: يا كل تعديلاته تتطبق يا ولا واحد (لو فيه anchor مش لاقيه، الملف مش بيتلمس).
//  • آمن لو اتشغّل مرتين (بيتعرّف على التعديلات المطبّقة).
//  • نسخة احتياطية من الأصل في .phase-a-backup/ قبل أي كتابة.
//  • بيتجاهل اختلاف المسافات/الأسطر (CRLF/LF) في الـ anchors.
// ════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry-run')
const ri = argv.indexOf('--root')
const ROOT = path.resolve(ri >= 0 ? argv[ri + 1] : '.')

// ── helpers ──────────────────────────────────────────────
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** نص حرفي → regex بيتسامح مع اختلاف المسافات والأسطر */
const W = (lit) => new RegExp(lit.trim().split(/\s+/).map(esc).join('\\s+'), 'g')
const L = (...lines) => lines.join('\n')

const DATE_FNS = ['todayISO', 'addDaysISO', 'addHoursISO', 'lastDayOfMonthISO', 'calcAge', 'toLocalISO', 'toClinicISO']

// ── التعديلات المحددة لكل ملف ────────────────────────────
// done = نص/regex موجود فقط بعد التطبيق (للتعرف على المطبّق مسبقًا)
const EDITS = {
    'components/patients/registration/Step2Medical.tsx': [
        {
            desc: 'import validateMinimumDataset',
            find: W("import { DateInputHybrid } from '@/components/shared/DateInputHybrid'"),
            replace: L(
                "import { DateInputHybrid } from '@/components/shared/DateInputHybrid'",
                "import { validateMinimumDataset } from '@/lib/validation/minimumDataset'",
            ),
            done: "from '@/lib/validation/minimumDataset'",
        },
        {
            desc: 'schema: icd10_code / icd10_code_2',
            find: W("primary_site_2: z.string().optional().or(z.literal('')),"),
            replace: L(
                "primary_site_2: z.string().optional().or(z.literal('')),",
                "    icd10_code: z.string().optional().or(z.literal('')),",
                "    icd10_code_2: z.string().optional().or(z.literal('')),",
            ),
            done: 'icd10_code_2: z.string()',
        },
        {
            desc: 'ECOG: شيل الافتراضي 0 (كان بيتسجل PS 0 لأي مريض بدون اختيار)',
            find: W("history: { ecog_ps: '0', previous_chemo: 'none', previous_radiation: 'none' },"),
            replace: "history: { ecog_ps: '', previous_chemo: 'none', previous_radiation: 'none' },",
            done: "history: { ecog_ps: '', previous_chemo",
        },
        {
            desc: 'state: validationErrors',
            find: W("const [ocpUse, setOcpUse] = useState('')"),
            replace: L(
                "const [ocpUse, setOcpUse] = useState('')",
                '  const [validationErrors, setValidationErrors] = useState<string[]>([])',
            ),
            done: 'setValidationErrors] = useState',
        },
        {
            desc: 'onSubmit: فحص الحد الأدنى من البيانات',
            find: W('const onSubmit = (data: FormData) => {'),
            replace: L(
                'const onSubmit = (data: FormData) => {',
                '    const problems = validateMinimumDataset(',
                '      { diagnosis: data.diagnosis, history: data.history },',
                '      { patientNotPresent: !!patientNotPresent },',
                '    )',
                '    setValidationErrors(problems)',
                '    if (problems.length > 0) {',
                "      window.scrollTo({ top: 0, behavior: 'smooth' })",
                '      return Promise.resolve()',
                '    }',
            ),
            done: 'validateMinimumDataset(\n',
        },
        {
            desc: 'عرض أخطاء الحد الأدنى',
            find: W('{error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}'),
            replace: L(
                '{error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}',
                '',
                '      {validationErrors.length > 0 && (',
                '        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">',
                '          <p className="font-bold mb-1">Minimum dataset — البيانات الإلزامية ناقصة:</p>',
                '          <ul className="list-disc pr-5 space-y-0.5">',
                '            {validationErrors.map(m => <li key={m}>{m}</li>)}',
                '          </ul>',
                '        </div>',
                '      )}',
            ),
            done: 'validationErrors.length > 0',
        },
        {
            desc: 'حقول ICD-10 (كانت مفقودة من التسجيل)',
            find: W('<div className="grid grid-cols-2 gap-3 mb-4"> <div> <label className="field-label-en">2ry site (metastasis)?</label>'),
            replace: L(
                '<div className="grid grid-cols-2 gap-3 mb-4">',
                '            <div>',
                "              <label className=\"field-label-en\">ICD-10 {doublePrimary === 'yes' ? '(site 1)' : ''}</label>",
                '              <input {...register(\'diagnosis.icd10_code\')} placeholder="e.g. C50.9" className="input-en-full font-mono" />',
                '            </div>',
                "            {doublePrimary === 'yes' && (",
                '              <div>',
                '                <label className="field-label-en">ICD-10 (site 2)</label>',
                '                <input {...register(\'diagnosis.icd10_code_2\')} placeholder="e.g. C34.9" className="input-en-full font-mono" />',
                '              </div>',
                '            )}',
                '          </div>',
                '',
                '          <div className="grid grid-cols-2 gap-3 mb-4">',
                '            <div>',
                '              <label className="field-label-en">2ry site (metastasis)?</label>',
            ),
            done: 'ICD-10 (site 2)',
        },
        {
            desc: 'Treatment intent: خيار فاضي (كان بيتسجل Curative تلقائيًا)',
            find: W('<option value="curative">Curative</option>'),
            replace: L(
                '<option value="">— Select —</option>',
                '                <option value="curative">Curative</option>',
            ),
            done: /<option value="">— Select —<\/option>\s*<option value="curative">/,
        },
        {
            desc: 'باج: تاريخ التحليل الجزيئي كان بيتكتب في قايمة IHC',
            find: W("onChange={v => updateTest('ihc', t.id, 'test_date', v)}"),
            nth: 2, count: 2,
            replace: "onChange={v => updateTest('molecular', t.id, 'test_date', v)}",
            done: "updateTest('molecular', t.id, 'test_date', v)",
        },
    ],

    'components/patients/registration/Step1Personal.tsx': [
        {
            desc: 'التدخين: الافتراضي غير محدد بدل never',
            find: W("useState<'never' | 'cigarettes' | 'former' | 'passive' | 'other'>('never')"),
            replace: "useState<'' | 'never' | 'cigarettes' | 'former' | 'passive' | 'other'>('')",
            done: "useState<'' | 'never'",
        },
        {
            desc: 'التدخين: القيمة المحمّلة',
            find: W("setSmokingStatus(initialSocialHabits.smoking_status || 'never')"),
            replace: "setSmokingStatus(initialSocialHabits.smoking_status || '')",
            done: "smoking_status || '')",
        },
        {
            desc: 'التدخين: خيار غير محدد',
            find: W('<option value="never">لا يوجد · Never</option>'),
            replace: L(
                '<option value="">غير محدد · Unknown</option>',
                '                <option value="never">لا يوجد · Never</option>',
            ),
            done: 'غير محدد · Unknown',
        },
    ],

    'app/(app)/patients/new/page.tsx': [
        {
            desc: 'redirect بس لو الحفظ نجح',
            find: W('await saveStep2(data) if (patientId) router.push(`/patients/${patientId}`)'),
            replace: L(
                'const ok = await saveStep2(data)',
                '    if (ok && patientId) router.push(`/patients/${patientId}`)',
            ),
            done: 'const ok = await saveStep2(data)',
        },
    ],

    'app/(app)/patients/[id]/page.tsx': [
        {
            desc: 'عرض التاريخ العائلي من oncology_fh_details',
            find: W("{medicalHistory.oncology_fh_person ? `القريب: ${medicalHistory.oncology_fh_person}` : ''} {medicalHistory.oncology_fh_type ? ` · النوع: ${medicalHistory.oncology_fh_type}` : ''}"),
            replace: L(
                '{Array.isArray(medicalHistory.oncology_fh_details) && medicalHistory.oncology_fh_details.length > 0',
                "                  ? medicalHistory.oncology_fh_details.map((e: any) => `${e.person}${e.type ? ` (${e.type})` : ''}`).join(' · ')",
                '                  : <>',
                "                      {medicalHistory.oncology_fh_person ? `القريب: ${medicalHistory.oncology_fh_person}` : ''}",
                "                      {medicalHistory.oncology_fh_type ? ` · النوع: ${medicalHistory.oncology_fh_type}` : ''}",
                '                    </>}',
            ),
            done: 'medicalHistory.oncology_fh_details.map',
        },
    ],

    'app/(app)/patients/[id]/edit/page.tsx': [
        {
            desc: 'ECOG: شيل الافتراضي 0 (الحالة الابتدائية)',
            find: W("ecog_ps: '0', previous_surgeries: '',"),
            replace: L("ecog_ps: '',", "        previous_surgeries: '',"),
            done: /ecog_ps: '',\s*previous_surgeries: '',/,
        },
        {
            desc: 'ECOG: عند التحميل',
            find: W("ecog_ps: hist.ecog_ps || '0',"),
            replace: "ecog_ps: hist.ecog_ps || '',",
            done: "ecog_ps: hist.ecog_ps || '',",
        },
        {
            desc: 'التدخين: الافتراضي غير محدد (الحالة الابتدائية)',
            find: W("smoking_status: 'never', cigarettes_pack_per_day: '',"),
            replace: "smoking_status: '', cigarettes_pack_per_day: '',",
            done: "smoking_status: '', cigarettes_pack_per_day: ''",
        },
        {
            desc: 'التدخين: عند التحميل',
            find: W("smoking_status: hist.smoking_status || 'never',"),
            replace: "smoking_status: hist.smoking_status || '',",
            done: "smoking_status: hist.smoking_status || '',",
        },
        {
            desc: 'التدخين: خيار غير محدد',
            find: W('<option value="never">Never</option>'),
            replace: L('<option value="">Unknown</option>', '                                        <option value="never">Never</option>'),
            done: '<option value="">Unknown</option>',
        },
        {
            desc: 'التدخين: خيار passive (كان ناقص في التعديل ويتحوّل لـ never)',
            find: W('<option value="former">Former smoker</option>'),
            replace: L('<option value="former">Former smoker</option>', '                                        <option value="passive">Passive smoking</option>'),
            done: '<option value="passive">Passive smoking</option>',
        },
    ],

    'lib/hooks/usePatientList.ts': [
        {
            desc: 'العمر: حساب تقويمي دقيق',
            find: W('const dob = new Date(pt.date_of_birth) const age = new Date().getFullYear() - dob.getFullYear()'),
            replace: 'const age = calcAge(pt.date_of_birth)',
            done: 'const age = calcAge(pt.date_of_birth)',
        },
        {
            desc: 'select: trial_enrollments',
            find: W('insurance_policies(insurance_type, is_active)'),
            replace: L('insurance_policies(insurance_type, is_active),', '          trial_enrollments(status)'),
            done: 'trial_enrollments(status)',
        },
        {
            desc: 'select: intent',
            find: W('status, regimen_id,'),
            replace: 'status, regimen_id, intent,',
            done: 'regimen_id, intent,',
        },
        {
            desc: 'شيل تخمين palliative من الـ stage واستخدم نية الخطة',
            find: W("else if (dx?.stage?.includes('IV')) status = 'palliative'"),
            replace: "else if (activePlan.intent === 'palliative') status = 'palliative'",
            done: "activePlan.intent === 'palliative'",
        },
        {
            desc: 'in_trial من trial_enrollments (القديم كان دايمًا false لأن select مفيهوش consent_type)',
            find: W("const inTrial = consents.some((c: any) => c.consent_type === 'research_trials' && c.status === 'signed')"),
            replace: L(
                'const trialEnrollments: any[] = (pt.trial_enrollments as any) || []',
                "        const inTrial = trialEnrollments.some((e: any) => e.status === 'enrolled' || e.status === 'active')",
            ),
            done: 'trialEnrollments.some',
        },
    ],

    'app/(app)/patients/page.tsx': [
        {
            desc: 'getAge → calcAge',
            find: W('function getAge(dob: string) { const diff = Date.now() - new Date(dob).getTime() return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) }'),
            replace: L('function getAge(dob: string) {', '    return calcAge(dob)', '  }'),
            done: 'return calcAge(dob)',
        },
    ],

    'lib/hooks/useImaging.ts': [
        {
            desc: 'نوع with_contrast',
            find: W('is_baseline: boolean'),
            replace: L('is_baseline: boolean', '    with_contrast: boolean | null'),
            done: 'with_contrast: boolean | null',
        },
    ],

    'app/(app)/imaging/page.tsx': [
        {
            desc: 'عدّ "بالصبغة" من العمود بدل نص notes',
            find: W("const withContrastCount = studies.filter(s => (s.notes || '').includes('بالصبغة')).length"),
            replace: 'const withContrastCount = studies.filter(s => s.with_contrast === true).length',
            done: 's.with_contrast === true',
        },
        {
            desc: 'حفظ with_contrast',
            find: W("is_baseline: form.is_baseline, status: 'completed',"),
            replace: L('is_baseline: form.is_baseline,', '                with_contrast: form.with_contrast,', "                status: 'completed',"),
            done: 'with_contrast: form.with_contrast',
        },
    ],

    'lib/hooks/useNotifications.ts': [
        {
            desc: 'رقم العيادة في رسائل SMS: من env بدل placeholder',
            find: W("phone: '01XXXXXXXXX',"),
            replace: "phone: process.env.NEXT_PUBLIC_CLINIC_PHONE || '',",
            done: 'NEXT_PUBLIC_CLINIC_PHONE',
        },
        {
            desc: 'sentToday: قارن بتوقيت العيادة',
            find: W("const sentToday = notifications.filter(n => n.sent_at?.startsWith(new Date().toISOString().split('T')[0])).length"),
            replace: 'const sentToday = notifications.filter(n => n.sent_at && toClinicISO(new Date(n.sent_at)) === todayISO()).length',
            done: 'toClinicISO(new Date(n.sent_at))',
        },
    ],

    'lib/hooks/useCalendarView.ts': [
        {
            desc: 'todayStr بتوقيت العيادة',
            find: W("const todayStr = today.toISOString().split('T')[0]"),
            replace: 'const todayStr = todayISO()',
            done: 'const todayStr = todayISO()',
        },
        {
            desc: 'خلايا التقويم: تاريخ محلي (كانت بتتزحزح يوم)',
            find: W("dt.toISOString().split('T')[0]"),
            count: 4,
            replace: 'toLocalISO(dt)',
            done: 'toLocalISO(dt)',
        },
    ],
}

// ── قواعد عامة تتطبق على كل الملفات ──────────────────────
const RULES = [
    { // new Date().toISOString().split('T')[0]
        re: /new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/g,
        to: () => 'todayISO()',
    },
    { // new Date(Date.now() + N * 86400000)  (أيام)
        re: /new Date\(Date\.now\(\)\s*\+\s*([^)]+?)\s*\*\s*(?:86400000|864e5)\)\.toISOString\(\)\.split\('T'\)\[0\]/g,
        to: (_m, n) => `addDaysISO(${n})`,
    },
    { // new Date(Date.now() + N * 3600000)  (ساعات)
        re: /new Date\(Date\.now\(\)\s*\+\s*([^)]+?)\s*\*\s*3600000\)\.toISOString\(\)\.split\('T'\)\[0\]/g,
        to: (_m, n) => `addHoursISO(${n})`,
    },
    { // new Date(year, month, 0).toISOString()...  → آخر يوم في الشهر (كانت بترجّع اليوم اللي قبله)
        re: /new Date\(\s*(\w+)\s*,\s*(\w+)\s*,\s*0\s*\)\.toISOString\(\)\.split\('T'\)\[0\]/g,
        to: (_m, y, mo) => `lastDayOfMonthISO(${y}, ${mo})`,
    },
    { // العمر ÷ 365.25
        re: /Math\.floor\(\(Date\.now\(\)\s*-\s*new Date\(([\w.?]+)\)\.getTime\(\)\)\s*\/\s*\(1000 \* 60 \* 60 \* 24 \* 365\.25\)\)/g,
        to: (_m, dob) => `calcAge(${dob})`,
    },
]

// ── تنفيذ ────────────────────────────────────────────────
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.phase-a-backup'])
function* walk(dir) {
    if (!fs.existsSync(dir)) return
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(ent.name)) continue
        const p = path.join(dir, ent.name)
        if (ent.isDirectory()) yield* walk(p)
        else if (/\.(ts|tsx)$/.test(ent.name)) yield p
    }
}

function ensureDatesImport(src) {
    const used = DATE_FNS.filter((n) => new RegExp(`\\b${n}\\(`).test(src))
    if (used.length === 0) return src
    const re = /import\s*\{([^}]*)\}\s*from\s*['"]@\/lib\/utils\/dates['"]\s*;?/
    const m = re.exec(src)
    if (m) {
        const have = new Set(m[1].split(',').map((s) => s.trim()).filter(Boolean))
        used.forEach((n) => have.add(n))
        return src.replace(re, () => `import { ${[...have].sort().join(', ')} } from '@/lib/utils/dates'`)
    }
    const line = `import { ${[...used].sort().join(', ')} } from '@/lib/utils/dates'`
    const lines = src.split('\n')
    let idx = 0
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
        if (/^\s*['"]use (client|server)['"]\s*;?\s*$/.test(lines[i])) { idx = i + 1; break }
    }
    lines.splice(idx, 0, line)
    return lines.join('\n')
}

const isDone = (src, done) => (done instanceof RegExp ? done.test(src) : src.includes(done))

const report = { changed: [], unchanged: [], failed: [], leftovers: [] }
const files = new Set()
for (const d of ['app', 'components', 'lib']) for (const f of walk(path.join(ROOT, d))) files.add(path.relative(ROOT, f))
for (const rel of Object.keys(EDITS)) files.add(rel)

for (const rel of [...files].sort()) {
    const abs = path.join(ROOT, rel)
    const norm = rel.split(path.sep).join('/')
    if (norm === 'lib/utils/dates.ts') continue

    if (!fs.existsSync(abs)) {
        report.failed.push(`${norm}: الملف غير موجود`)
        continue
    }
    const raw = fs.readFileSync(abs, 'utf8')
    const crlf = raw.includes('\r\n')
    let src = raw.replace(/\r\n/g, '\n')
    const original = src
    const problems = []
    const applied = []

    // 1) التعديلات المحددة
    for (const e of EDITS[norm] || []) {
        if (isDone(src, e.done)) { applied.push(`✓ (مطبّق مسبقًا) ${e.desc}`); continue }
        const total = [...src.matchAll(e.find)].length
        const expected = e.count ?? 1
        if (total !== expected) {
            problems.push(`✗ ${e.desc} — لقيت ${total} تطابق والمتوقع ${expected}`)
            continue
        }
        let i = 0
        src = src.replace(e.find, (m) => {
            i += 1
            if (e.nth && i !== e.nth) return m
            return e.replace
        })
        applied.push(`+ ${e.desc}`)
    }

    if (problems.length) {
        report.failed.push(`${norm}\n      ${problems.join('\n      ')}`)
        continue // all-or-nothing: الملف مش بيتلمس
    }

    // 2) القواعد العامة
    for (const r of RULES) src = src.replace(r.re, r.to)

    // 3) import
    if (src !== original) src = ensureDatesImport(src)

    // 4) تحذير: بقايا toISOString().split('T')[0] محتاجة مراجعة يدوية
    src.split('\n').forEach((line, i) => {
        if (/toISOString\(\)\.split\('T'\)\[0\]/.test(line)) report.leftovers.push(`${norm}:${i + 1}  ${line.trim()}`)
    })

    if (src === original) { if (applied.length) report.unchanged.push(norm); continue }

    report.changed.push(`${norm}\n      ${applied.join('\n      ') || '(قواعد التواريخ/العمر)'}`)
    if (!DRY) {
        const bak = path.join(ROOT, '.phase-a-backup', norm)
        fs.mkdirSync(path.dirname(bak), { recursive: true })
        if (!fs.existsSync(bak)) fs.writeFileSync(bak, raw)
        fs.writeFileSync(abs, crlf ? src.replace(/\n/g, '\r\n') : src)
    }
}

const out = (t, arr) => { if (arr.length) console.log(`\n${t} (${arr.length})\n  - ${arr.join('\n  - ')}`) }
console.log(DRY ? '— DRY RUN (مفيش كتابة) —' : '— تم التطبيق —')
out('✅ اتعدّل', report.changed)
out('⏭️  مطبّق مسبقًا', report.unchanged)
out('❌ فشل (الملف ما اتلمسش)', report.failed)
out('⚠️  بقايا toISOString().split("T")[0] — راجعها يدويًا (لو التاريخ لحظة زمنية استخدم toClinicISO، ولو Date محلي استخدم toLocalISO)', report.leftovers)
if (report.failed.length) process.exitCode = 1
