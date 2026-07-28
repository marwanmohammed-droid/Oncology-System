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
    'Breast', 'Lung', 'Colorectal', 'Colon', 'Rectal', 'Anal',
    'Lymphoma (Hodgkin)', 'Lymphoma (Non-Hodgkin)',
    'Leukemia (AML)', 'Leukemia (ALL)', 'Leukemia (CML)', 'Leukemia (CLL)',
    'Liver (HCC)', 'Gallbladder', 'Bile Duct (Cholangiocarcinoma)',
    'Cervix', 'Endometrium', 'Ovary', 'Vulva', 'Vagina', 'Fallopian Tube',
    'Prostate', 'Testis', 'Penile', 'Bladder', 'Kidney (RCC)', 'Ureter', 'Urethra',
    'Thyroid', 'Parathyroid', 'Adrenal',
    'Brain (Glioma)', 'Brain (Meningioma)', 'Brain (Medulloblastoma)', 'Spinal Cord',
    'Pancreas', 'Stomach', 'Esophagus', 'Small Intestine', 'GIST',
    'Head & Neck', 'Nasopharynx', 'Oropharynx', 'Larynx', 'Oral Cavity', 'Salivary Gland',
    'Melanoma (Skin)', 'Non-Melanoma Skin', 'Merkel Cell Carcinoma',
    'Sarcoma (Soft Tissue)', 'Sarcoma (Bone/Osteosarcoma)', 'Ewing Sarcoma',
    'Multiple Myeloma', 'Myelodysplastic Syndrome (MDS)', 'Myeloproliferative Neoplasm (MPN)',
    'Neuroendocrine Tumor (NET)', 'Mesothelioma', 'Thymoma', 'Unknown Primary', 'Other',
]

export const HISTOLOGY_TYPES = [
    // Carcinomas — general
    'Adenocarcinoma', 'Squamous cell carcinoma', 'Adenosquamous carcinoma',
    'Small cell carcinoma', 'Large cell carcinoma', 'Large cell neuroendocrine carcinoma',
    'Undifferentiated carcinoma', 'Anaplastic carcinoma', 'Sarcomatoid carcinoma',
    // Breast
    'Ductal carcinoma in situ (DCIS)', 'Invasive ductal carcinoma', 'Invasive lobular carcinoma',
    'Mucinous (colloid) carcinoma', 'Tubular carcinoma', 'Medullary carcinoma (breast)',
    'Papillary carcinoma (breast)', 'Inflammatory carcinoma',
    // GI / Liver
    'Signet ring cell carcinoma', 'Hepatocellular carcinoma', 'Cholangiocarcinoma',
    'Gastrointestinal stromal tumor (GIST)', 'Neuroendocrine tumor (well differentiated)',
    'Neuroendocrine carcinoma (poorly differentiated)',
    // Genitourinary
    'Clear cell renal cell carcinoma', 'Papillary renal cell carcinoma', 'Chromophobe renal cell carcinoma',
    'Transitional cell (urothelial) carcinoma', 'Seminoma', 'Non-seminomatous germ cell tumor',
    'Embryonal carcinoma', 'Yolk sac tumor', 'Choriocarcinoma', 'Teratoma',
    // Gynecologic
    'Endometrioid carcinoma', 'Serous carcinoma', 'Clear cell carcinoma (gynecologic)',
    'Mucinous carcinoma (ovarian)', 'Granulosa cell tumor', 'Sertoli-Leydig cell tumor',
    // Thyroid
    'Papillary thyroid carcinoma', 'Follicular thyroid carcinoma', 'Medullary thyroid carcinoma',
    'Anaplastic thyroid carcinoma',
    // Lymphoma / Hematologic
    'Diffuse large B-cell lymphoma', 'Follicular lymphoma', 'Mantle cell lymphoma',
    'Marginal zone lymphoma', 'Burkitt lymphoma', 'Hodgkin lymphoma (classical)',
    'Hodgkin lymphoma (nodular lymphocyte predominant)', 'Peripheral T-cell lymphoma',
    'Anaplastic large cell lymphoma', 'Mycosis fungoides',
    'Acute myeloid leukemia', 'Acute promyelocytic leukemia', 'Acute lymphoblastic leukemia (B-cell)',
    'Acute lymphoblastic leukemia (T-cell)', 'Chronic myeloid leukemia', 'Chronic lymphocytic leukemia',
    'Hairy cell leukemia', 'Multiple myeloma / Plasmacytoma',
    // Sarcomas
    'Leiomyosarcoma', 'Liposarcoma', 'Rhabdomyosarcoma', 'Synovial sarcoma',
    'Angiosarcoma', 'Fibrosarcoma', 'Osteosarcoma', 'Chondrosarcoma', 'Ewing sarcoma',
    'Malignant peripheral nerve sheath tumor', 'Dermatofibrosarcoma protuberans',
    // Skin
    'Melanoma (superficial spreading)', 'Melanoma (nodular)', 'Melanoma (acral lentiginous)',
    'Basal cell carcinoma', 'Merkel cell carcinoma',
    // CNS
    'Glioblastoma', 'Astrocytoma', 'Oligodendroglioma', 'Ependymoma',
    'Meningioma', 'Medulloblastoma', 'Craniopharyngioma', 'Schwannoma',
    // Other
    'Mesothelioma', 'Thymoma', 'Thymic carcinoma', 'Pheochromocytoma', 'Paraganglioma',
    'Other',
]

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
    { key: 'ecg', label: 'رسم قلب (ECG)' },
    { key: 'eeg', label: 'رسم مخ (EEG)' },
    { key: 'upper_endoscopy', label: 'منظار علوي (Upper Endoscopy)' },
    { key: 'colonoscopy', label: 'منظار قولون (Colonoscopy)' },
    { key: 'psma', label: 'PSMA PET/CT' },
    { key: 'dexa', label: 'قياس كثافة العظام (DEXA)' },
    { key: 'biopsy_guided_imaging', label: 'أشعة موجهة لأخذ عينة (Biopsy-guided Imaging)' },
]