'use client'
import { useState } from 'react'
import { useProgressNotes, NOTE_TYPE_LABELS } from '@/lib/hooks/useProgressNotes'

export function ProgressNotesPanel({ patientId }: { patientId: string }) {
    const { notes, loading, saving, error, addNote, updateNote, deleteNote } = useProgressNotes(patientId)
    const [showForm, setShowForm] = useState(false)
    const [editTarget, setEditTarget] = useState<any>(null)
    const [deleteTarget, setDeleteTarget] = useState<any>(null)

    return (
        <div style={{ background: '#fff', border: '1.5px solid #dde2ee', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>ملاحظات المتابعة</p>
                    <p style={{ fontSize: 9, color: '#8e97b5', fontFamily: 'DM Mono', margin: 0 }}>Progress Notes · {notes.length}</p>
                </div>
                <button onClick={() => setShowForm(true)} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid rgba(42,184,160,.3)', background: '#e6f7f4', color: '#1a8a78', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    + إضافة ملاحظة
                </button>
            </div>

            {error && <div style={{ margin: 12, background: '#fde8e8', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#e53e3e' }}>{error}</div>}

            {loading ? (
                <p style={{ padding: 20, textAlign: 'center', color: '#8e97b5', fontSize: 12 }}>جارٍ التحميل...</p>
            ) : notes.length === 0 ? (
                <p style={{ padding: 20, textAlign: 'center', color: '#8e97b5', fontSize: 12 }}>لا توجد ملاحظات متابعة مسجلة</p>
            ) : (
                <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto' }}>
                    {notes.map(n => (
                        <NoteCard key={n.id} note={n} onEdit={() => setEditTarget(n)} onDelete={() => setDeleteTarget(n)} />
                    ))}
                </div>
            )}

            {showForm && (
                <NoteFormModal
                    saving={saving}
                    onClose={() => setShowForm(false)}
                    onSave={async (data: any) => { await addNote(data); setShowForm(false) }}
                />
            )}

            {editTarget && (
                <NoteFormModal
                    saving={saving}
                    note={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSave={async (data: any) => { await updateNote(editTarget.id, data); setEditTarget(null) }}
                />
            )}

            {deleteTarget && (
                <DeleteConfirmModal
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={async () => { await deleteNote(deleteTarget.id); setDeleteTarget(null) }}
                />
            )}
        </div>
    )
}

const NOTE_TYPE_COLORS: Record<string, { color: string; bg: string }> = {
    follow_up: { color: '#1a8a78', bg: '#e6f7f4' },
    admission: { color: '#e53e3e', bg: '#fde8e8' },
    consultation: { color: '#9333ea', bg: '#faf5ff' },
    phone_call: { color: '#4a5580', bg: '#f7f8fc' },
    emergency: { color: '#e53e3e', bg: '#fde8e8' },
    other: { color: '#b45309', bg: '#fff3cd' },
}

function NoteCard({ note, onEdit, onDelete }: any) {
    const cfg = NOTE_TYPE_COLORS[note.note_type] || NOTE_TYPE_COLORS.other
    const hasSOAP = note.subjective || note.objective || note.assessment || note.plan

    return (
        <div style={{ border: '1px solid #eef0f6', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9, padding: '2px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>
                        {NOTE_TYPE_LABELS[note.note_type] || note.note_type}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: '#4a5580', fontWeight: 700 }}>{note.note_date}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#8e97b5' }}>✏️</button>
                    <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#e53e3e' }}>🗑️</button>
                </div>
            </div>

            {hasSOAP ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {note.subjective && <SOAPLine label="S" text={note.subjective} />}
                    {note.objective && <SOAPLine label="O" text={note.objective} />}
                    {note.assessment && <SOAPLine label="A" text={note.assessment} />}
                    {note.plan && <SOAPLine label="P" text={note.plan} />}
                </div>
            ) : (
                <p style={{ fontSize: 12, color: '#4a5580', margin: 0, lineHeight: 1.6 }}>{note.free_text}</p>
            )}

            {note.author?.full_name_ar && (
                <p style={{ fontSize: 9, color: '#8e97b5', margin: '8px 0 0', fontFamily: 'DM Mono' }}>
                    بواسطة: {note.author.full_name_ar}
                </p>
            )}
        </div>
    )
}

function SOAPLine({ label, text }: { label: string; text: string }) {
    return (
        <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: '#1a8a78', fontFamily: 'DM Mono', minWidth: 14 }}>{label}:</span>
            <span style={{ color: '#4a5580', flex: 1 }}>{text}</span>
        </div>
    )
}

function NoteFormModal({ note, saving, onClose, onSave }: any) {
    const [mode, setMode] = useState<'soap' | 'free'>(note?.free_text ? 'free' : 'soap')
    const [form, setForm] = useState({
        note_date: note?.note_date || new Date().toISOString().split('T')[0],
        note_type: note?.note_type || 'follow_up',
        subjective: note?.subjective || '',
        objective: note?.objective || '',
        assessment: note?.assessment || '',
        plan: note?.plan || '',
        free_text: note?.free_text || '',
    })
    const [error, setError] = useState('')

    async function handleSubmit() {
        const hasContent = mode === 'soap'
            ? (form.subjective || form.objective || form.assessment || form.plan)
            : form.free_text
        if (!hasContent) {
            setError('يرجى كتابة محتوى الملاحظة')
            return
        }
        setError('')
        try {
            await onSave({
                note_date: form.note_date,
                note_type: form.note_type,
                subjective: mode === 'soap' ? (form.subjective || null) : null,
                objective: mode === 'soap' ? (form.objective || null) : null,
                assessment: mode === 'soap' ? (form.assessment || null) : null,
                plan: mode === 'soap' ? (form.plan || null) : null,
                free_text: mode === 'free' ? (form.free_text || null) : null,
            })
        } catch (e: any) {
            setError(e.message)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 540, maxHeight: '88vh', overflowY: 'auto', direction: 'rtl', fontFamily: 'Cairo' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0b1f3a', margin: 0 }}>{note ? '✏️ تعديل ملاحظة' : '📝 ملاحظة متابعة جديدة'}</p>
                    <button onClick={onClose} style={{ background: '#f7f8fc', border: '1px solid #dde2ee', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#8e97b5' }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <div style={{ background: '#fde8e8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e53e3e' }}>{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>التاريخ</label>
                            <input type="date" value={form.note_date} onChange={e => setForm(f => ({ ...f, note_date: e.target.value }))}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>نوع الزيارة</label>
                            <select value={form.note_type} onChange={e => setForm(f => ({ ...f, note_type: e.target.value }))}
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }}>
                                {Object.entries(NOTE_TYPE_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setMode('soap')} style={{
                            flex: 1, padding: '7px', borderRadius: 7, border: 'none', cursor: 'pointer',
                            background: mode === 'soap' ? '#1a8a78' : '#f7f8fc', color: mode === 'soap' ? '#fff' : '#4a5580',
                            fontSize: 11, fontWeight: 600,
                        }}>
                            تنسيق SOAP
                        </button>
                        <button onClick={() => setMode('free')} style={{
                            flex: 1, padding: '7px', borderRadius: 7, border: 'none', cursor: 'pointer',
                            background: mode === 'free' ? '#1a8a78' : '#f7f8fc', color: mode === 'free' ? '#fff' : '#4a5580',
                            fontSize: 11, fontWeight: 600,
                        }}>
                            ملاحظة حرة
                        </button>
                    </div>

                    {mode === 'soap' ? (
                        <>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>S — Subjective (الأعراض المذكورة)</label>
                                <textarea value={form.subjective} onChange={e => setForm(f => ({ ...f, subjective: e.target.value }))} rows={2}
                                    placeholder="ما ذكره المريض من أعراض وشكاوى..."
                                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>O — Objective (الفحص والنتائج)</label>
                                <textarea value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} rows={2}
                                    placeholder="نتائج الفحص السريري، العلامات الحيوية، التحاليل..."
                                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>A — Assessment (التقييم)</label>
                                <textarea value={form.assessment} onChange={e => setForm(f => ({ ...f, assessment: e.target.value }))} rows={2}
                                    placeholder="التقييم الإكلينيكي للحالة..."
                                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>P — Plan (الخطة)</label>
                                <textarea value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} rows={2}
                                    placeholder="الخطة العلاجية والمتابعة القادمة..."
                                    style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5580', display: 'block', marginBottom: 5 }}>الملاحظة</label>
                            <textarea value={form.free_text} onChange={e => setForm(f => ({ ...f, free_text: e.target.value }))} rows={6}
                                placeholder="اكتب ملاحظة المتابعة..."
                                style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #dde2ee', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Cairo', boxSizing: 'border-box' }} />
                        </div>
                    )}
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #eef0f6', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a8a78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'جارٍ الحفظ...' : 'حفظ الملاحظة'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function DeleteConfirmModal({ onClose, onConfirm }: any) {
    const [deleting, setDeleting] = useState(false)
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,58,.6)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 18, width: 380, direction: 'rtl', fontFamily: 'Cairo', padding: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0b1f3a', margin: '0 0 8px' }}>حذف الملاحظة؟</p>
                <p style={{ fontSize: 12, color: '#8e97b5', margin: '0 0 16px' }}>هذا الإجراء لا يمكن التراجع عنه.</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #dde2ee', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4a5580' }}>إلغاء</button>
                    <button onClick={async () => { setDeleting(true); await onConfirm() }} disabled={deleting} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#e53e3e', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: deleting ? .6 : 1 }}>
                        {deleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
                    </button>
                </div>
            </div>
        </div>
    )
}