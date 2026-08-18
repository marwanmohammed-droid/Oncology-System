export const GOVERNORATES = [
    'القاهرة · Cairo', 'الجيزة · Giza', 'الإسكندرية · Alexandria', 'الدقهلية · Dakahlia',
    'البحر الأحمر · Red Sea', 'البحيرة · Beheira', 'الفيوم · Fayoum', 'الغربية · Gharbia',
    'الإسماعيلية · Ismailia', 'المنوفية · Monufia', 'المنيا · Minya', 'القليوبية · Qalyubia',
    'الوادي الجديد · New Valley', 'السويس · Suez', 'أسوان · Aswan', 'أسيوط · Asyut',
    'بني سويف · Beni Suef', 'بورسعيد · Port Said', 'دمياط · Damietta', 'الشرقية · Sharqia',
    'جنوب سيناء · South Sinai', 'كفر الشيخ · Kafr El Sheikh', 'مطروح · Matrouh',
    'الأقصر · Luxor', 'قنا · Qena', 'شمال سيناء · North Sinai', 'سوهاج · Sohag',
    'أخرى · Other',
]

export const COUNTRIES = [
    'Egyptian', 'Saudi', 'Emirati (UAE)', 'Kuwaiti', 'Qatari', 'Bahraini', 'Omani',
    'Jordanian', 'Lebanese', 'Syrian', 'Iraqi', 'Palestinian', 'Yemeni', 'Libyan',
    'Sudanese', 'Moroccan', 'Algerian', 'Tunisian', 'Mauritanian', 'Somali', 'Djiboutian',
    'Comorian', 'American', 'British', 'French', 'German', 'Italian', 'Spanish',
    'Canadian', 'Indian', 'Pakistani', 'Chinese', 'Turkish', 'Other',
]

export const PRIMARY_SITES = [
    // Breast
    'Breast',
    // Thoracic
    'Lung', 'Pleura (Mesothelioma)', 'Thymus', 'Trachea',
    // GI
    'Esophagus', 'Stomach', 'Small Intestine', 'Colon', 'Rectal', 'Anal',
    'Liver (HCC)', 'Gallbladder', 'Bile Duct (Cholangiocarcinoma)', 'Pancreas', 'Appendix',
    // Genitourinary
    'Kidney (RCC)', 'Renal Pelvis / Ureter', 'Bladder', 'Urethra',
    'Prostate', 'Testis', 'Penile',
    // Gynecologic
    'Cervix', 'Endometrium', 'Ovary', 'Fallopian Tube', 'Vulva', 'Vagina', 'Gestational Trophoblastic',
    // Head & Neck
    'Oral Cavity', 'Oropharynx', 'Nasopharynx', 'Hypopharynx', 'Larynx',
    'Salivary Gland', 'Nasal Cavity / Paranasal Sinus', 'Thyroid', 'Parathyroid',
    // Skin
    'Melanoma (Skin)', 'Non-Melanoma Skin (BCC/SCC)', 'Merkel Cell Carcinoma',
    // CNS
    'Brain (Glioma)', 'Brain (Meningioma)', 'Brain (Medulloblastoma)', 'Brain (Other)',
    'Spinal Cord', 'Pituitary',
    // Bone & Soft Tissue
    'Bone (Osteosarcoma)', 'Bone (Ewing Sarcoma)', 'Bone (Chondrosarcoma)', 'Soft Tissue Sarcoma',
    // Hematologic
    'Lymphoma (Hodgkin)', 'Lymphoma (Non-Hodgkin — B-cell)', 'Lymphoma (Non-Hodgkin — T-cell)',
    'Leukemia (AML)', 'Leukemia (ALL)', 'Leukemia (CML)', 'Leukemia (CLL)', 'Leukemia (Hairy Cell)',
    'Multiple Myeloma / Plasmacytoma', 'Myelodysplastic Syndrome (MDS)', 'Myeloproliferative Neoplasm (MPN)',
    // Endocrine / NET
    'Adrenal', 'Neuroendocrine Tumor (GI)', 'Neuroendocrine Tumor (Pancreatic)', 'Neuroendocrine Tumor (Lung/Bronchial)',
    'Pheochromocytoma / Paraganglioma',
    // Pediatric-specific
    'Neuroblastoma', 'Wilms Tumor (Nephroblastoma)', 'Retinoblastoma', 'Hepatoblastoma', 'Rhabdomyosarcoma (site)',
    // Other
    'Eye (Ocular)', 'Unknown Primary', 'Other',
]

export const HISTOLOGY_TYPES = [
    // General carcinomas
    'Adenocarcinoma', 'Squamous cell carcinoma', 'Adenosquamous carcinoma',
    'Small cell carcinoma', 'Large cell carcinoma', 'Large cell neuroendocrine carcinoma',
    'Undifferentiated carcinoma', 'Anaplastic carcinoma', 'Sarcomatoid carcinoma',
    'Basaloid carcinoma', 'Mixed carcinoma',
    // Breast
    'Ductal carcinoma in situ (DCIS)', 'Invasive ductal carcinoma (NST)', 'Invasive lobular carcinoma',
    'Mucinous (colloid) carcinoma', 'Tubular carcinoma', 'Medullary carcinoma (breast)',
    'Papillary carcinoma (breast)', 'Inflammatory carcinoma', 'Metaplastic carcinoma (breast)',
    'Paget disease of the breast', 'Phyllodes tumor',
    // Lung
    'Adenocarcinoma in situ (lung)', 'Bronchioloalveolar carcinoma', 'Carcinoid tumor (typical)', 'Carcinoid tumor (atypical)',
    // GI / Hepatobiliary
    'Signet ring cell carcinoma', 'Hepatocellular carcinoma', 'Fibrolamellar HCC', 'Cholangiocarcinoma',
    'Gastrointestinal stromal tumor (GIST)', 'Neuroendocrine tumor (well differentiated)',
    'Neuroendocrine carcinoma (poorly differentiated)', 'Mixed adenoneuroendocrine carcinoma (MANEC)',
    'Acinar cell carcinoma (pancreas)', 'Pancreatoblastoma',
    // Genitourinary
    'Clear cell renal cell carcinoma', 'Papillary renal cell carcinoma', 'Chromophobe renal cell carcinoma',
    'Collecting duct carcinoma', 'Transitional cell (urothelial) carcinoma', 'Squamous cell carcinoma (bladder)',
    'Seminoma', 'Non-seminomatous germ cell tumor', 'Embryonal carcinoma', 'Yolk sac tumor',
    'Choriocarcinoma', 'Teratoma', 'Mixed germ cell tumor', 'Leydig cell tumor', 'Sertoli cell tumor',
    'Acinar adenocarcinoma (prostate)', 'Ductal adenocarcinoma (prostate)',
    // Gynecologic
    'Endometrioid carcinoma', 'Serous carcinoma', 'Clear cell carcinoma (gynecologic)',
    'Mucinous carcinoma (ovarian)', 'Carcinosarcoma (gynecologic)', 'Granulosa cell tumor',
    'Sertoli-Leydig cell tumor', 'Dysgerminoma', 'Leiomyosarcoma (uterine)', 'Endometrial stromal sarcoma',
    'Hydatidiform mole', 'Placental site trophoblastic tumor',
    // Thyroid
    'Papillary thyroid carcinoma', 'Follicular thyroid carcinoma', 'Medullary thyroid carcinoma',
    'Anaplastic thyroid carcinoma', 'Hurthle cell carcinoma',
    // Head & Neck
    'Nasopharyngeal carcinoma (keratinizing)', 'Nasopharyngeal carcinoma (non-keratinizing)',
    'Mucoepidermoid carcinoma', 'Adenoid cystic carcinoma', 'Acinic cell carcinoma',
    'Pleomorphic adenoma (malignant transformation)', 'Verrucous carcinoma',
    // Lymphoma / Hematologic
    'Diffuse large B-cell lymphoma', 'Follicular lymphoma', 'Mantle cell lymphoma',
    'Marginal zone lymphoma', 'Burkitt lymphoma', 'Small lymphocytic lymphoma',
    'Lymphoplasmacytic lymphoma (Waldenström)', 'Hodgkin lymphoma (classical, nodular sclerosis)',
    'Hodgkin lymphoma (classical, mixed cellularity)', 'Hodgkin lymphoma (nodular lymphocyte predominant)',
    'Peripheral T-cell lymphoma', 'Anaplastic large cell lymphoma', 'Angioimmunoblastic T-cell lymphoma',
    'Mycosis fungoides', 'Sezary syndrome', 'Primary CNS lymphoma',
    'Acute myeloid leukemia', 'Acute promyelocytic leukemia', 'Acute lymphoblastic leukemia (B-cell)',
    'Acute lymphoblastic leukemia (T-cell)', 'Chronic myeloid leukemia', 'Chronic lymphocytic leukemia',
    'Hairy cell leukemia', 'Multiple myeloma', 'Plasmacytoma', 'MGUS',
    // Sarcomas
    'Leiomyosarcoma', 'Liposarcoma', 'Rhabdomyosarcoma (embryonal)', 'Rhabdomyosarcoma (alveolar)',
    'Synovial sarcoma', 'Angiosarcoma', 'Kaposi sarcoma', 'Fibrosarcoma', 'Osteosarcoma',
    'Chondrosarcoma', 'Ewing sarcoma', 'Malignant peripheral nerve sheath tumor',
    'Dermatofibrosarcoma protuberans', 'Undifferentiated pleomorphic sarcoma', 'Epithelioid sarcoma',
    'Alveolar soft part sarcoma',
    // Skin
    'Melanoma (superficial spreading)', 'Melanoma (nodular)', 'Melanoma (acral lentiginous)',
    'Melanoma (lentigo maligna)', 'Basal cell carcinoma', 'Squamous cell carcinoma (skin)',
    'Merkel cell carcinoma', 'Cutaneous T-cell lymphoma',
    // CNS
    'Glioblastoma', 'Astrocytoma (diffuse)', 'Anaplastic astrocytoma', 'Pilocytic astrocytoma',
    'Oligodendroglioma', 'Ependymoma', 'Meningioma (benign)', 'Meningioma (atypical/malignant)',
    'Medulloblastoma', 'Craniopharyngioma', 'Schwannoma', 'Pituitary adenoma', 'Pineoblastoma',
    'Choroid plexus carcinoma', 'DIPG (diffuse intrinsic pontine glioma)',
    // Pediatric
    'Neuroblastoma', 'Ganglioneuroblastoma', 'Nephroblastoma (Wilms tumor)', 'Clear cell sarcoma of the kidney',
    'Rhabdoid tumor', 'Retinoblastoma', 'Hepatoblastoma', 'Pancreatoblastoma',
    // Endocrine / NET / Other
    'Pheochromocytoma', 'Paraganglioma', 'Adrenocortical carcinoma',
    'Mesothelioma (epithelioid)', 'Mesothelioma (sarcomatoid)', 'Mesothelioma (biphasic)',
    'Thymoma', 'Thymic carcinoma', 'Uveal melanoma', 'Conjunctival melanoma',
    'Other',
]

// خريطة: كل عضو (Primary Site) مرتبط بقايمة Histology خاصة بيه
// أي عضو مش موجود هنا هيستخدم القايمة الكاملة تلقائيًا كـ fallback
export const PRIMARY_SITE_HISTOLOGY_MAP: Record<string, string[]> = {
    'Breast': [
        'Ductal carcinoma in situ (DCIS)', 'Invasive ductal carcinoma (NST)', 'Invasive lobular carcinoma',
        'Mucinous (colloid) carcinoma', 'Tubular carcinoma', 'Medullary carcinoma (breast)',
        'Papillary carcinoma (breast)', 'Inflammatory carcinoma', 'Metaplastic carcinoma (breast)',
        'Paget disease of the breast', 'Phyllodes tumor', 'Adenocarcinoma',
    ],
    'Lung': [
        'Adenocarcinoma', 'Adenocarcinoma in situ (lung)', 'Bronchioloalveolar carcinoma',
        'Squamous cell carcinoma', 'Small cell carcinoma', 'Large cell carcinoma',
        'Large cell neuroendocrine carcinoma', 'Carcinoid tumor (typical)', 'Carcinoid tumor (atypical)',
        'Adenosquamous carcinoma', 'Sarcomatoid carcinoma',
    ],
    'Colon': ['Adenocarcinoma', 'Signet ring cell carcinoma', 'Mucinous carcinoma (ovarian)', 'Neuroendocrine tumor (well differentiated)', 'GIST'],
    'Rectal': ['Adenocarcinoma', 'Signet ring cell carcinoma', 'Squamous cell carcinoma'],
    'Anal': ['Squamous cell carcinoma', 'Adenocarcinoma', 'Melanoma (nodular)'],
    'Stomach': ['Adenocarcinoma', 'Signet ring cell carcinoma', 'GIST', 'Neuroendocrine tumor (well differentiated)', 'Lymphoma (Non-Hodgkin — B-cell)'],
    'Esophagus': ['Squamous cell carcinoma', 'Adenocarcinoma'],
    'Liver (HCC)': ['Hepatocellular carcinoma', 'Fibrolamellar HCC', 'Cholangiocarcinoma', 'Angiosarcoma', 'Hepatoblastoma'],
    'Gallbladder': ['Adenocarcinoma', 'Squamous cell carcinoma'],
    'Bile Duct (Cholangiocarcinoma)': ['Cholangiocarcinoma', 'Adenocarcinoma'],
    'Pancreas': ['Adenocarcinoma', 'Acinar cell carcinoma (pancreas)', 'Neuroendocrine tumor (well differentiated)', 'Mixed adenoneuroendocrine carcinoma (MANEC)', 'Pancreatoblastoma'],
    'Small Intestine': ['Adenocarcinoma', 'GIST', 'Neuroendocrine tumor (well differentiated)', 'Lymphoma (Non-Hodgkin — B-cell)'],
    'Kidney (RCC)': ['Clear cell renal cell carcinoma', 'Papillary renal cell carcinoma', 'Chromophobe renal cell carcinoma', 'Collecting duct carcinoma', 'Rhabdoid tumor'],
    'Bladder': ['Transitional cell (urothelial) carcinoma', 'Squamous cell carcinoma (bladder)', 'Adenocarcinoma', 'Small cell carcinoma'],
    'Prostate': ['Acinar adenocarcinoma (prostate)', 'Ductal adenocarcinoma (prostate)', 'Small cell carcinoma'],
    'Testis': ['Seminoma', 'Non-seminomatous germ cell tumor', 'Embryonal carcinoma', 'Yolk sac tumor', 'Choriocarcinoma', 'Teratoma', 'Mixed germ cell tumor', 'Leydig cell tumor', 'Sertoli cell tumor'],
    'Cervix': ['Squamous cell carcinoma', 'Adenocarcinoma', 'Adenosquamous carcinoma', 'Small cell carcinoma'],
    'Endometrium': ['Endometrioid carcinoma', 'Serous carcinoma', 'Clear cell carcinoma (gynecologic)', 'Carcinosarcoma (gynecologic)', 'Leiomyosarcoma (uterine)', 'Endometrial stromal sarcoma'],
    'Ovary': ['Serous carcinoma', 'Mucinous carcinoma (ovarian)', 'Endometrioid carcinoma', 'Clear cell carcinoma (gynecologic)', 'Granulosa cell tumor', 'Sertoli-Leydig cell tumor', 'Dysgerminoma', 'Teratoma'],
    'Gestational Trophoblastic': ['Hydatidiform mole', 'Choriocarcinoma', 'Placental site trophoblastic tumor'],
    'Thyroid': ['Papillary thyroid carcinoma', 'Follicular thyroid carcinoma', 'Medullary thyroid carcinoma', 'Anaplastic thyroid carcinoma', 'Hurthle cell carcinoma'],
    'Nasopharynx': ['Nasopharyngeal carcinoma (keratinizing)', 'Nasopharyngeal carcinoma (non-keratinizing)', 'Lymphoma (Non-Hodgkin — B-cell)'],
    'Salivary Gland': ['Mucoepidermoid carcinoma', 'Adenoid cystic carcinoma', 'Acinic cell carcinoma', 'Pleomorphic adenoma (malignant transformation)'],
    'Oral Cavity': ['Squamous cell carcinoma', 'Verrucous carcinoma'],
    'Oropharynx': ['Squamous cell carcinoma'],
    'Larynx': ['Squamous cell carcinoma', 'Verrucous carcinoma'],
    'Melanoma (Skin)': ['Melanoma (superficial spreading)', 'Melanoma (nodular)', 'Melanoma (acral lentiginous)', 'Melanoma (lentigo maligna)'],
    'Non-Melanoma Skin (BCC/SCC)': ['Basal cell carcinoma', 'Squamous cell carcinoma (skin)'],
    'Merkel Cell Carcinoma': ['Merkel cell carcinoma'],
    'Brain (Glioma)': ['Glioblastoma', 'Astrocytoma (diffuse)', 'Anaplastic astrocytoma', 'Pilocytic astrocytoma', 'Oligodendroglioma', 'DIPG (diffuse intrinsic pontine glioma)'],
    'Brain (Meningioma)': ['Meningioma (benign)', 'Meningioma (atypical/malignant)'],
    'Brain (Medulloblastoma)': ['Medulloblastoma'],
    'Brain (Other)': ['Ependymoma', 'Craniopharyngioma', 'Schwannoma', 'Choroid plexus carcinoma', 'Pineoblastoma'],
    'Pituitary': ['Pituitary adenoma'],
    'Bone (Osteosarcoma)': ['Osteosarcoma'],
    'Bone (Ewing Sarcoma)': ['Ewing sarcoma'],
    'Bone (Chondrosarcoma)': ['Chondrosarcoma'],
    'Soft Tissue Sarcoma': ['Leiomyosarcoma', 'Liposarcoma', 'Synovial sarcoma', 'Angiosarcoma', 'Kaposi sarcoma', 'Fibrosarcoma', 'Malignant peripheral nerve sheath tumor', 'Dermatofibrosarcoma protuberans', 'Undifferentiated pleomorphic sarcoma', 'Epithelioid sarcoma', 'Alveolar soft part sarcoma'],
    'Rhabdomyosarcoma (site)': ['Rhabdomyosarcoma (embryonal)', 'Rhabdomyosarcoma (alveolar)'],
    'Lymphoma (Hodgkin)': ['Hodgkin lymphoma (classical, nodular sclerosis)', 'Hodgkin lymphoma (classical, mixed cellularity)', 'Hodgkin lymphoma (nodular lymphocyte predominant)'],
    'Lymphoma (Non-Hodgkin — B-cell)': ['Diffuse large B-cell lymphoma', 'Follicular lymphoma', 'Mantle cell lymphoma', 'Marginal zone lymphoma', 'Burkitt lymphoma', 'Small lymphocytic lymphoma', 'Lymphoplasmacytic lymphoma (Waldenström)', 'Primary CNS lymphoma'],
    'Lymphoma (Non-Hodgkin — T-cell)': ['Peripheral T-cell lymphoma', 'Anaplastic large cell lymphoma', 'Angioimmunoblastic T-cell lymphoma', 'Mycosis fungoides', 'Sezary syndrome'],
    'Leukemia (AML)': ['Acute myeloid leukemia', 'Acute promyelocytic leukemia'],
    'Leukemia (ALL)': ['Acute lymphoblastic leukemia (B-cell)', 'Acute lymphoblastic leukemia (T-cell)'],
    'Leukemia (CML)': ['Chronic myeloid leukemia'],
    'Leukemia (CLL)': ['Chronic lymphocytic leukemia'],
    'Leukemia (Hairy Cell)': ['Hairy cell leukemia'],
    'Multiple Myeloma / Plasmacytoma': ['Multiple myeloma', 'Plasmacytoma', 'MGUS'],
    'Adrenal': ['Pheochromocytoma', 'Adrenocortical carcinoma'],
    'Neuroendocrine Tumor (GI)': ['Neuroendocrine tumor (well differentiated)', 'Neuroendocrine carcinoma (poorly differentiated)'],
    'Neuroendocrine Tumor (Pancreatic)': ['Neuroendocrine tumor (well differentiated)', 'Neuroendocrine carcinoma (poorly differentiated)'],
    'Neuroendocrine Tumor (Lung/Bronchial)': ['Carcinoid tumor (typical)', 'Carcinoid tumor (atypical)'],
    'Pheochromocytoma / Paraganglioma': ['Pheochromocytoma', 'Paraganglioma'],
    'Neuroblastoma': ['Neuroblastoma', 'Ganglioneuroblastoma'],
    'Wilms Tumor (Nephroblastoma)': ['Nephroblastoma (Wilms tumor)', 'Clear cell sarcoma of the kidney', 'Rhabdoid tumor'],
    'Retinoblastoma': ['Retinoblastoma'],
    'Hepatoblastoma': ['Hepatoblastoma'],
    'Pleura (Mesothelioma)': ['Mesothelioma (epithelioid)', 'Mesothelioma (sarcomatoid)', 'Mesothelioma (biphasic)'],
    'Thymus': ['Thymoma', 'Thymic carcinoma'],
    'Eye (Ocular)': ['Uveal melanoma', 'Conjunctival melanoma', 'Retinoblastoma'],
}

export const IMAGING_TYPES = [
    { key: 'xray', label: 'أشعة سينية (X-Ray)' },
    { key: 'ct', label: 'أشعة مقطعية (CT)' },
    { key: 'ct_chest', label: 'أشعة مقطعية على الصدر (CT Chest)' },
    { key: 'ct_abdomen_pelvis', label: 'أشعة مقطعية على البطن والحوض (CT Abdomen/Pelvis)' },
    { key: 'pet', label: 'بيت سكان (PET)' },
    { key: 'pet_ct', label: 'بيت-مقطعية (PET/CT)' },
    { key: 'bone_scan', label: 'مسح عظمي (Bone Scan)' },
    { key: 'mri', label: 'رنين مغناطيسي (MRI)' },
    { key: 'mri_brain', label: 'رنين مغناطيسي على المخ (MRI Brain)' },
    { key: 'mri_spine', label: 'رنين مغناطيسي على العمود الفقري (MRI Spine)' },
    { key: 'ultrasound', label: 'موجات صوتية (Ultrasound)' },
    { key: 'mammogram', label: 'ماموجرام (Mammogram)' },
    { key: 'echo', label: 'إيكو القلب (Echo)' },
    { key: 'breast_US', label: 'موجات صوتية على الثدي (Breast US)' },
    { key: 'chest_US', label: 'موجات صوتية على الصدر (Chest US' },
    { key: 'abdomino_pelvic_US', label: 'موجات صوتية على البطن والحوض (Abdominal-pelvic US)' },
    { key: 'ecg', label: 'رسم قلب (ECG)' },
    { key: 'eeg', label: 'رسم مخ (EEG)' },
    { key: 'upper_endoscopy', label: 'منظار علوي (Upper Endoscopy)' },
    { key: 'colonoscopy', label: 'منظار قولون (Colonoscopy)' },
    { key: 'psma', label: 'PSMA PET/CT' },
    { key: 'dexa', label: 'قياس كثافة العظام (DEXA)' },
    { key: 'biopsy_guided_imaging', label: 'أشعة موجهة لأخذ عينة (Biopsy-guided Imaging)' },
]

export interface LabPanelItem {
    name: string
    unit?: string
    referenceRange?: string
}

export interface LabPanel {
    key: string
    label: string
    category: 'cbc' | 'chemistry' | 'tumor_markers' | 'coagulation' | 'liver_function' | 'kidney_function' | 'lipid' | 'thyroid' | 'electrolytes' | 'urinalysis' | 'other'
    items: LabPanelItem[]
}

export const LAB_PANELS: LabPanel[] = [
    {
        key: 'cbc', label: 'CBC (Complete Blood Count)', category: 'cbc',
        items: [
            { name: 'WBC', unit: '×10³/µL', referenceRange: '4.0-11.0' },
            { name: 'RBC', unit: '×10⁶/µL', referenceRange: '4.2-5.9' },
            { name: 'Hemoglobin (Hgb)', unit: 'g/dL', referenceRange: '12.0-17.5' },
            { name: 'Hematocrit (Hct)', unit: '%', referenceRange: '36-50' },
            { name: 'MCV', unit: 'fL', referenceRange: '80-100' },
            { name: 'MCH', unit: 'pg', referenceRange: '27-33' },
            { name: 'MCHC', unit: 'g/dL', referenceRange: '32-36' },
            { name: 'Platelets (PLT)', unit: '×10³/µL', referenceRange: '150-450' },
            { name: 'Neutrophils (%)', unit: '%', referenceRange: '40-75' },
            { name: 'ANC (Absolute Neutrophil Count)', unit: '×10³/µL', referenceRange: '1.5-8.0' },
            { name: 'Lymphocytes (%)', unit: '%', referenceRange: '20-45' },
            { name: 'Monocytes (%)', unit: '%', referenceRange: '2-10' },
            { name: 'Eosinophils (%)', unit: '%', referenceRange: '1-6' },
            { name: 'Basophils (%)', unit: '%', referenceRange: '0-2' },
        ],
    },
    {
        key: 'chemistry', label: 'Basic Metabolic Panel (BMP)', category: 'chemistry',
        items: [
            { name: 'Glucose (Fasting)', unit: 'mg/dL', referenceRange: '70-100' },
            { name: 'Glucose (Random)', unit: 'mg/dL', referenceRange: '<140' },
            { name: 'Calcium', unit: 'mg/dL', referenceRange: '8.5-10.5' },
            { name: 'Magnesium', unit: 'mg/dL', referenceRange: '1.7-2.2' },
            { name: 'Phosphorus', unit: 'mg/dL', referenceRange: '2.5-4.5' },
            { name: 'Total Protein', unit: 'g/dL', referenceRange: '6.0-8.3' },
            { name: 'Albumin', unit: 'g/dL', referenceRange: '3.5-5.0' },
            { name: 'LDH', unit: 'U/L', referenceRange: '140-280' },
            { name: 'Uric Acid', unit: 'mg/dL', referenceRange: '3.5-7.2' },
        ],
    },
    {
        key: 'electrolytes', label: 'Electrolyte Panel', category: 'electrolytes',
        items: [
            { name: 'Sodium (Na)', unit: 'mmol/L', referenceRange: '135-145' },
            { name: 'Potassium (K)', unit: 'mmol/L', referenceRange: '3.5-5.1' },
            { name: 'Chloride (Cl)', unit: 'mmol/L', referenceRange: '98-107' },
            { name: 'Bicarbonate (HCO3)', unit: 'mmol/L', referenceRange: '22-29' },
        ],
    },
    {
        key: 'liver_function', label: 'Liver Function Test (LFT)', category: 'liver_function',
        items: [
            { name: 'ALT (SGPT)', unit: 'U/L', referenceRange: '7-56' },
            { name: 'AST (SGOT)', unit: 'U/L', referenceRange: '10-40' },
            { name: 'ALP (Alkaline Phosphatase)', unit: 'U/L', referenceRange: '44-147' },
            { name: 'GGT', unit: 'U/L', referenceRange: '9-48' },
            { name: 'Total Bilirubin', unit: 'mg/dL', referenceRange: '0.3-1.2' },
            { name: 'Direct Bilirubin', unit: 'mg/dL', referenceRange: '0.0-0.3' },
            { name: 'Indirect Bilirubin', unit: 'mg/dL', referenceRange: '0.2-0.9' },
            { name: 'PT (Prothrombin Time)', unit: 'sec', referenceRange: '11-13.5' },
            { name: 'INR', unit: '', referenceRange: '0.8-1.1' },
        ],
    },
    {
        key: 'kidney_function', label: 'Kidney Function Test (KFT)', category: 'kidney_function',
        items: [
            { name: 'Creatinine', unit: 'mg/dL', referenceRange: '0.6-1.3' },
            { name: 'BUN (Blood Urea Nitrogen)', unit: 'mg/dL', referenceRange: '7-20' },
            { name: 'eGFR', unit: 'mL/min/1.73m²', referenceRange: '>90' },
            { name: 'Cystatin C', unit: 'mg/L', referenceRange: '0.5-1.0' },
        ],
    },
    {
        key: 'coagulation', label: 'Coagulation Profile', category: 'coagulation',
        items: [
            { name: 'PT (Prothrombin Time)', unit: 'sec', referenceRange: '11-13.5' },
            { name: 'PTT (Partial Thromboplastin Time)', unit: 'sec', referenceRange: '25-35' },
            { name: 'INR', unit: '', referenceRange: '0.8-1.1' },
            { name: 'Fibrinogen', unit: 'mg/dL', referenceRange: '200-400' },
            { name: 'D-Dimer', unit: 'µg/mL FEU', referenceRange: '<0.5' },
        ],
    },
    {
        key: 'lipid', label: 'Lipid Profile', category: 'lipid',
        items: [
            { name: 'Total Cholesterol', unit: 'mg/dL', referenceRange: '<200' },
            { name: 'LDL Cholesterol', unit: 'mg/dL', referenceRange: '<100' },
            { name: 'HDL Cholesterol', unit: 'mg/dL', referenceRange: '>40' },
            { name: 'Triglycerides', unit: 'mg/dL', referenceRange: '<150' },
            { name: 'VLDL', unit: 'mg/dL', referenceRange: '5-40' },
        ],
    },
    {
        key: 'thyroid', label: 'Thyroid Function Test (TFT)', category: 'thyroid',
        items: [
            { name: 'TSH', unit: 'µIU/mL', referenceRange: '0.4-4.0' },
            { name: 'Free T4', unit: 'ng/dL', referenceRange: '0.8-1.8' },
            { name: 'Free T3', unit: 'pg/mL', referenceRange: '2.3-4.2' },
            { name: 'Total T4', unit: 'µg/dL', referenceRange: '5.0-12.0' },
            { name: 'Total T3', unit: 'ng/dL', referenceRange: '80-200' },
            { name: 'Anti-TPO', unit: 'IU/mL', referenceRange: '<34' },
        ],
    },
    {
        key: 'tumor_markers_ca', label: 'Tumor Markers — GI/General', category: 'tumor_markers',
        items: [
            { name: 'CEA', unit: 'ng/mL', referenceRange: '<3.0' },
            { name: 'CA 19-9', unit: 'U/mL', referenceRange: '<37' },
            { name: 'AFP (Alpha-Fetoprotein)', unit: 'ng/mL', referenceRange: '<10' },
            { name: 'CA 72-4', unit: 'U/mL', referenceRange: '<6.9' },
        ],
    },
    {
        key: 'tumor_markers_breast_ovary', label: 'Tumor Markers — Breast/Ovary', category: 'tumor_markers',
        items: [
            { name: 'CA 15-3', unit: 'U/mL', referenceRange: '<30' },
            { name: 'CA 27-29', unit: 'U/mL', referenceRange: '<38' },
            { name: 'CA-125', unit: 'U/mL', referenceRange: '<35' },
            { name: 'HE4', unit: 'pmol/L', referenceRange: '<140' },
        ],
    },
    {
        key: 'tumor_markers_prostate_testis', label: 'Tumor Markers — Prostate/Testis', category: 'tumor_markers',
        items: [
            { name: 'PSA (Total)', unit: 'ng/mL', referenceRange: '<4.0' },
            { name: 'PSA (Free)', unit: 'ng/mL', referenceRange: 'variable' },
            { name: 'Beta-hCG', unit: 'mIU/mL', referenceRange: '<5' },
            { name: 'LDH', unit: 'U/L', referenceRange: '140-280' },
        ],
    },
    {
        key: 'tumor_markers_other', label: 'Tumor Markers — Other', category: 'tumor_markers',
        items: [
            { name: 'NSE (Neuron-Specific Enolase)', unit: 'ng/mL', referenceRange: '<16.3' },
            { name: 'Chromogranin A', unit: 'ng/mL', referenceRange: '<95' },
            { name: 'Beta-2 Microglobulin', unit: 'mg/L', referenceRange: '0.7-1.8' },
            { name: 'Calcitonin', unit: 'pg/mL', referenceRange: '<10' },
            { name: 'Thyroglobulin', unit: 'ng/mL', referenceRange: '<55' },
            { name: 'SCC Antigen', unit: 'ng/mL', referenceRange: '<1.5' },
        ],
    },
    {
        key: 'urinalysis', label: 'Urinalysis', category: 'urinalysis',
        items: [
            { name: 'Urine Color' }, { name: 'Urine pH', referenceRange: '4.5-8.0' },
            { name: 'Specific Gravity', referenceRange: '1.005-1.030' },
            { name: 'Protein (Urine)' }, { name: 'Glucose (Urine)' },
            { name: 'Ketones (Urine)' }, { name: 'Blood (Urine)' }, { name: 'WBC (Urine)' },
            { name: 'RBC (Urine)' }, { name: 'Bacteria (Urine)' },
        ],
    },
    {
        key: 'inflammatory', label: 'Inflammatory Markers', category: 'other',
        items: [
            { name: 'CRP (C-Reactive Protein)', unit: 'mg/L', referenceRange: '<5' },
            { name: 'ESR (Erythrocyte Sedimentation Rate)', unit: 'mm/hr', referenceRange: '0-20' },
            { name: 'Procalcitonin', unit: 'ng/mL', referenceRange: '<0.05' },
            { name: 'Ferritin', unit: 'ng/mL', referenceRange: '20-250' },
        ],
    },
    {
        key: 'vitamins_minerals', label: 'Vitamins & Minerals', category: 'other',
        items: [
            { name: 'Vitamin D (25-OH)', unit: 'ng/mL', referenceRange: '30-100' },
            { name: 'Vitamin B12', unit: 'pg/mL', referenceRange: '200-900' },
            { name: 'Folate', unit: 'ng/mL', referenceRange: '2.7-17.0' },
            { name: 'Iron', unit: 'µg/dL', referenceRange: '60-170' },
            { name: 'TIBC', unit: 'µg/dL', referenceRange: '240-450' },
            { name: 'Transferrin Saturation', unit: '%', referenceRange: '20-50' },
        ],
    },
    {
        key: 'virology', label: 'Virology Screen', category: 'other',
        items: [
            { name: 'HBsAg' }, { name: 'Anti-HBs' }, { name: 'Anti-HBc' },
            { name: 'Anti-HCV' }, { name: 'HIV Ab/Ag' },
        ],
    },
    {
        key: 'hba1c', label: 'HbA1c', category: 'chemistry',
        items: [
            { name: 'HbA1c', unit: '%', referenceRange: '<5.7' },
        ],
    },
]