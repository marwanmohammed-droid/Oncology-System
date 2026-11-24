// ════════════════════════════════════════════════════════════
// lib/validation/minimumDataset.ts
// الحد الأدنى من البيانات اللي لازم تتسجل لمريض مؤكد الإصابة،
// عشان الداتا تنفع لتحليل / case report / clinical trial.
// بيستخدمه Step2Medical (قبل الحفظ) و useRegistration.saveStep2 (على الحفظ).
// ════════════════════════════════════════════════════════════
import { todayISO } from '@/lib/utils/dates'

// أورام دم ما بيتعملهاش stage بنظام TNM
const NO_STAGE_PREFIXES = ['Leukemia', 'Myelodysplastic', 'Myeloproliferative']

const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === ''
const isYes = (v: unknown) => v === true || v === 'yes'
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export type MinimumDatasetInput = {
    diagnosis?: Record<string, any>
    history?: Record<string, any>
}

export type MinimumDatasetOptions = {
    patientNotPresent?: boolean
    /** تاريخ ميلاد المريض 'YYYY-MM-DD' (لو متاح) للتحقق إن التشخيص بعده */
    dateOfBirth?: string | null
}

/** بيرجّع قايمة مشاكل (فاضية = تمام). الرسائل ثنائية اللغة. */
export function validateMinimumDataset(
    input: MinimumDatasetInput,
    opts: MinimumDatasetOptions = {},
): string[] {
    const d = input.diagnosis ?? {}
    const h = input.history ?? {}
    const errors: string[] = []

    // الحد الأدنى بينطبق على مريض مؤكد الإصابة فقط
    if (!isYes(d.confirmed_cancer_patient)) return errors

    if (isBlank(d.primary_site)) errors.push('موقع الورم الأساسي مطلوب (Primary site)')
    if (isBlank(d.histology)) errors.push('نوع الأنسجة مطلوب (Histology)')

    const site: string = String(d.primary_site ?? '')
    const stageNotApplicable = NO_STAGE_PREFIXES.some(p => site.startsWith(p))
    if (!stageNotApplicable && isBlank(d.stage)) errors.push('المرحلة مطلوبة (Stage)')

    if (isBlank(d.treatment_intent)) errors.push('النية العلاجية مطلوبة (Treatment intent)')

    if (isBlank(d.date_of_diagnosis)) {
        errors.push('تاريخ التشخيص مطلوب (Date of diagnosis)')
    } else if (!ISO_RE.test(String(d.date_of_diagnosis))) {
        errors.push('تاريخ التشخيص بصيغة غير صحيحة (Date of diagnosis)')
    } else {
        const dx = String(d.date_of_diagnosis)
        if (dx > todayISO()) errors.push('تاريخ التشخيص في المستقبل (Date of diagnosis)')
        if (opts.dateOfBirth && ISO_RE.test(opts.dateOfBirth) && dx < opts.dateOfBirth) {
            errors.push('تاريخ التشخيص قبل تاريخ ميلاد المريض (Date of diagnosis)')
        }
    }

    if (isYes(d.double_primary)) {
        if (isBlank(d.primary_site_2)) errors.push('موقع الورم الثاني مطلوب (Primary site 2)')
        if (isBlank(d.histology_2)) errors.push('نوع أنسجة الورم الثاني مطلوب (Histology 2)')
    }

    if (isYes(d.metastasis_flag) && isBlank(d.metastatic_sites)) {
        errors.push('مواقع النقائل مطلوبة (Metastatic sites)')
    }

    if (!opts.patientNotPresent && isBlank(h.ecog_ps)) {
        errors.push('ECOG مطلوب — اختار قيمة صريحة (الافتراضي مبقاش 0)')
    }

    return errors
}
