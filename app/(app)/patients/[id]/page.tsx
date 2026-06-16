'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function PatientProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [patient, setPatient] = useState<any>(null)
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    async function load() {
      const { data: pt } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single()

      const { data: diag } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      setPatient(pt)
      setDiagnosis(diag)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#8e97b5', fontFamily: 'Cairo' }}>
      جارٍ التحميل...
    </div>
  )

  if (!patient) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#e53e3e', fontFamily: 'Cairo' }}>
      المريض غير موجود
    </div>
  )

  const age = Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))

  const tabs = [
    { id: 'overview', label: '⊞ نظرة عامة' },
    { id: 'medical', label: '🔬 السجل الطبي' },
    { id: 'consents', label: '📄 الموافقات' },
    { id: 'financial', label: '💳 المالية' },
  ]

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl', minHeight: '100vh', background: '#f7f8fc' }}>

      {/* Patient Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1f3a 0%, #132d52 60%, #1e4580 100%)',
        padding: '24px 28px 0',
      }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 16, display: 'flex', gap: 6 }}>
          <Link href="/patients" style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'none' }}>المرضى</Link>
          <span>›</span>
          <span style={{ color: '#fff' }}>{patient.first_name_ar} {patient.last_name_ar}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, position: 'relative' }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2ab8a0, #1a8a78)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
            border: '3px solid rgba(255,255,255,.2)',
          }}>
            {patient.first_name_ar[0]}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
              {patient.first_name_ar} {patient.last_name_ar}
            </h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', fontFamily: 'DM Mono', margin: '4px 0 8px' }}>
              {patient.first_name_en} {patient.last_name_en} · {age} سنة · {patient.sex === 'M' ? 'ذكر' : 'أنثى'}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: patient.mrn, mono: true },
                diagnosis && { label: `${diagnosis.primary_site} · ${diagnosis.stage || '—'}` },
                { label: patient.mobile_primary, mono: true },
              ].filter(Boolean).map((chip: any, i) => (
                <span key={i} style={{
                  background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.85)',
                  padding: '3px 10px', borderRadius: 20, fontSize: 10,
                  fontFamily: chip.mono ? 'DM Mono' : 'inherit',
                  border: '1px solid rgba(255,255,255,.1)',
                }}>
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/patients/${id}/edit`} style={{
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,.22)',
              background: 'rgba(255,255,255,.1)', color: '#fff',
              fontSize: 11, fontWeight: 600, textDecoration: 'none',
            }}>
              ✏️ تعديل
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginTop: 16 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '9px 16px', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(255,255,255,.1)' : 'transparent',
              color: activeTab === tab.id ? '#2ab8a0' : 'rgba(255,255,255,.45)',
              fontSize: 11, fontWeight: 600, fontFamily: 'Cairo, sans-serif',
              borderBottom: activeTab === tab.id ? '2.5px solid #2ab8a0' : '2.5px solid transparent',
              transition: 'all .15s',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 28px' }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Personal Info */}
            <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>👤</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>البيانات الشخصية</p>
                  <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>Personal Information</p>
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {[
                  ['MRN', patient.mrn],
                  ['تاريخ الميلاد', patient.date_of_birth],
                  ['الجنس', patient.sex === 'M' ? 'ذكر · Male' : 'أنثى · Female'],
                  ['الجنسية', patient.nationality],
                  ['الموبايل', patient.mobile_primary],
                  ['البريد الإلكتروني', patient.email || '—'],
                  ['المحافظة', patient.governorate || '—'],
                  ['جهة الطوارئ', patient.emergency_name + ' · ' + (patient.emergency_relation || '')],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef0f6' }}>
                    <span style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>{k}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e2540' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Diagnosis */}
            <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>🔬</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>التشخيص</p>
                  <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>Diagnosis</p>
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {diagnosis ? [
                  ['Primary site', diagnosis.primary_site],
                  ['ICD-10', diagnosis.icd10_code],
                  ['Histology', diagnosis.histology],
                  ['Stage', diagnosis.stage || '—'],
                  ['TNM', `${diagnosis.tnm_t || '—'} ${diagnosis.tnm_n || '—'} ${diagnosis.tnm_m || '—'}`],
                  ['Intent', diagnosis.treatment_intent || '—'],
                  ['تاريخ التشخيص', diagnosis.date_of_diagnosis],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef0f6' }}>
                    <span style={{ fontSize: 10, color: '#8e97b5', fontFamily: 'DM Mono' }}>{k}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e2540' }}>{v}</span>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: 20, color: '#8e97b5' }}>
                    <p style={{ fontSize: 12 }}>لم يتم إدخال التشخيص بعد</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MEDICAL TAB */}
        {activeTab === 'medical' && (
          <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 24, textAlign: 'center', color: '#8e97b5' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔬</div>
            <p style={{ fontWeight: 600, color: '#4a5580' }}>السجل الطبي الكامل</p>
            <p style={{ fontSize: 12 }}>قيد التطوير — سيتم إضافته قريباً</p>
          </div>
        )}

        {/* CONSENTS TAB */}
        {activeTab === 'consents' && (
          <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 24, textAlign: 'center', color: '#8e97b5' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <p style={{ fontWeight: 600, color: '#4a5580' }}>الموافقات</p>
            <p style={{ fontSize: 12 }}>قيد التطوير — سيتم إضافته قريباً</p>
          </div>
        )}

        {/* FINANCIAL TAB */}
        {activeTab === 'financial' && (
          <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, padding: 24, textAlign: 'center', color: '#8e97b5' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💳</div>
            <p style={{ fontWeight: 600, color: '#4a5580' }}>المالية والتأمين</p>
            <p style={{ fontSize: 12 }}>قيد التطوير — سيتم إضافته قريباً</p>
          </div>
        )}

      </div>
    </div>
  )
}