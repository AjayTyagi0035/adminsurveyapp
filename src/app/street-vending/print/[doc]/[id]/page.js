"use client"
/* eslint-disable @next/next/no-img-element */
import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'
import { FIELDS, MEDIA, OPTIONS, SECTIONS, display, formatDate, fullName, localAddressLine, mediaUrl } from '../../../options'

const LOGO = '/street-vending/logo_emblem.png'
const NAVY = '#1A3A6B'

/**
 * Printable documents for one vendor (same layouts as the app's PDFs):
 *   /street-vending/print/card/[id]          Form III ID card, front + back on A4
 *   /street-vending/print/card/[id]?mode=cr80 one card-sized page per side (card printer)
 *   /street-vending/print/form2/[id]         Form II application
 *   /street-vending/print/form1/[id]         Form I survey answers
 */
export default function StreetVendorPrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading…</div>}>
      <PrintDocument />
    </Suspense>
  )
}

function docTitle(doc, v) {
  if (doc === 'card') return `ID Card - ${v.id_card_no ?? ''}`
  if (doc === 'form2') return `Form II - ${v.application_no ?? ''}`
  return `Form I - ${fullName(v)}`
}

function PrintDocument() {
  const { doc, id } = useParams()
  const search = useSearchParams()
  const cr80 = doc === 'card' && search.get('mode') === 'cr80'
  const [v, setV] = useState(null)
  const [error, setError] = useState(null)
  const [qr, setQr] = useState(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/street-vending/${id}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed to load vendor')
        setV(d.record)
      })
      .catch(err => setError(err.message))
  }, [id])

  useEffect(() => {
    if (!v || doc !== 'card') return
    QRCode.toDataURL(`${v.id_card_no ?? ''}|${fullName(v)}|${v.mobile_no ?? ''}`, { margin: 0, width: 200 })
      .then(setQr)
      .catch(() => setQr(null))
  }, [v, doc])

  useEffect(() => {
    if (v) document.title = docTitle(doc, v)
  }, [v, doc])

  if (error) return <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#b91c1c' }}>{error}</div>
  if (!v) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading…</div>

  const notIssued = (doc === 'card' || doc === 'form2') && v.status !== 'idIssued'
  const title = docTitle(doc, v)

  return (
    <div className="sv-print-root">
      <style>{PRINT_CSS(cr80)}</style>

      <div className="sv-toolbar">
        <strong>{title}</strong>
        {doc === 'card' && (
          <a href={cr80 ? `?` : `?mode=cr80`} className="sv-btn sv-btn-light">
            {cr80 ? 'Show on A4' : 'Card printer (CR80)'}
          </a>
        )}
        <button className="sv-btn" onClick={() => window.print()}>🖨️ Print</button>
      </div>

      {notIssued && (
        <div className="sv-warning">
          This record is a draft — the application / ID card numbers have not been generated yet.
          Generate them from the vendor page before printing.
        </div>
      )}

      {doc === 'card' && (cr80 ? (
        <>
          <div className="sv-cr80-page"><CardFront v={v} /></div>
          <div className="sv-cr80-page"><CardBack v={v} qr={qr} /></div>
        </>
      ) : (
        <div className="sv-a4">
          <div style={{ textAlign: 'center', fontWeight: 700, lineHeight: 1.5 }}>
            <div>Form-III</div>
            <div>Identity card format</div>
            <div>(SMART ID Cards)</div>
          </div>
          <div className="sv-card-slot"><CardFront v={v} /><b>Front</b></div>
          <div className="sv-card-slot"><CardBack v={v} qr={qr} /><b>Back</b></div>
        </div>
      ))}

      {doc === 'form2' && <Form2 v={v} />}
      {doc === 'form1' && <Form1 v={v} />}
    </div>
  )
}

// ---------------- Form III : ID card ----------------

function CardFrame({ v, children }) {
  return (
    <div className="sv-card">
      <div className="sv-card-head">
        <img src={LOGO} alt="" />
        <span>MUNICIPALITY: {(v.municipality_name ?? '').toUpperCase()}</span>
      </div>
      <div className="sv-card-body">{children}</div>
    </div>
  )
}

const Line = ({ label, value }) => (
  <div className="sv-card-line">{label}: <b>{value}</b></div>
)

function CardFront({ v }) {
  const valid = v.id_valid_from && v.id_valid_to ? `${formatDate(v.id_valid_from)} to ${formatDate(v.id_valid_to)}` : ''
  return (
    <CardFrame v={v}>
      <div style={{ display: 'flex', gap: '1.4mm', height: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Line label="ID No." value={v.id_card_no ?? ''} />
          <Line label="Name" value={fullName(v)} />
          <Line label="Age" value={`${v.age ?? ''},   Gender: ${v.gender ?? ''}`} />
          <Line label="Certificate valid from" value={valid} />
          <Line label="Vending activity" value={`${display(v, 'vending_activity')}${v.vending_mode ? ` (${v.vending_mode})` : ''}`} />
          <Line label="Vending place" value={[v.vending_place_name, v.ward_name].filter(Boolean).join(', ')} />
          <Line label="Address" value={localAddressLine(v)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="sv-card-photo">
            {v.passport_photo ? <img src={mediaUrl(v.passport_photo)} alt="" /> : <span>Photo</span>}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ width: '22mm', borderTop: '0.15mm solid #000', marginBottom: '0.4mm' }} />
          <div style={{ fontSize: '1.8mm', textAlign: 'center', lineHeight: 1.2 }}>Signature<br />(Chairman, TVC)</div>
        </div>
      </div>
    </CardFrame>
  )
}

function CardBack({ v, qr }) {
  const members = (v.family_members ?? []).filter(m => m?.name?.trim())
  return (
    <CardFrame v={v}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="sv-card-line"><b>Family members :</b></div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="sv-card-line" style={{ paddingLeft: '2.8mm', marginBottom: '0.4mm' }}>
            {i + 1}.&nbsp; {i < members.length ? `${members[i].name}${members[i].relation ? ` (${members[i].relation})` : ''}` : '.'.repeat(40)}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div className="sv-card-line">Mobile: {v.mobile_no ?? ''}</div>
          {qr && <img src={qr} alt="QR" style={{ width: '13mm', height: '13mm' }} />}
        </div>
      </div>
    </CardFrame>
  )
}

// ---------------- Form II : Application ----------------

const Fill = ({ value, blank = 18 }) => {
  const s = String(value ?? '').trim()
  return s ? <b style={{ textDecoration: 'underline' }}> {s} </b> : <span>{'_'.repeat(blank)}</span>
}

/** Options separated by "/": selected bold, others struck out. */
function Choose({ options, selected }) {
  return options.map((o, i) => (
    <span key={o}>
      <span
        style={
          !selected ? undefined
            : o === selected ? { fontWeight: 700, textDecoration: 'underline' }
              : { textDecoration: 'line-through', color: '#757575' }
        }
      >
        {o.toLowerCase()}
      </span>
      {i < options.length - 1 ? '/ ' : ''}
    </span>
  ))
}

const Dotted = ({ label, value }) => (
  <div style={{ marginBottom: 10 }}>
    {label}: {value ? <b>{value}</b> : '.'.repeat(50)}
  </div>
)

function Form2({ v }) {
  const members = (v.family_members ?? []).filter(m => m?.name?.trim())
  const relation = v.guardian_relation?.replace(' of', '')
  return (
    <div className="sv-a4 sv-form2">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img src={LOGO} alt="" style={{ width: 56, height: 56 }} />
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>
          <div style={{ fontSize: 13 }}>Form II</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>(Application Form for Registration)</div>
        </div>
        <div style={{ width: 56 }} />
      </div>
      <div style={{ textAlign: 'right', fontWeight: 700, marginTop: 6 }}>Application No. {v.application_no ?? ''}</div>

      <div style={{ display: 'flex', marginTop: 10 }}>
        <div style={{ flex: 1, paddingTop: 50 }}>
          <div>To,</div>
          <div style={{ paddingLeft: 60, marginTop: 8 }}>
            <div>The Town Vending Committee,</div>
            <div style={{ marginTop: 6 }}>Zone/ Ward<Fill value={[v.zone_name, v.ward_name].filter(Boolean).join(' / ')} />,</div>
            <div style={{ marginTop: 6 }}>Municipal Corporation/ Council/ Committee,<Fill value={v.municipality_name} />.</div>
          </div>
        </div>
        <div className="sv-photo-box">
          {v.passport_photo ? <img src={mediaUrl(v.passport_photo)} alt="" /> : <span>Photograph</span>}
        </div>
      </div>

      <div style={{ paddingLeft: 36, marginTop: 24, fontWeight: 700 }}>Subject: Application Form for registration</div>
      <p style={{ textAlign: 'justify', marginTop: 10, textIndent: 80 }}>
        I<Fill value={fullName(v)} blank={22} />, <Choose options={['Son', 'Daughter', 'Wife']} selected={relation} /> of Sh.
        <Fill value={v.guardian_name} />, resident of house no.<Fill value={v.house_no} blank={10} />, street/ ward
        <Fill value={[v.residential_address, v.ward_name].filter(Boolean).join(', ')} />, colony/ sector
        <Fill value={v.colony_sector} blank={14} />, town<Fill value={v.city} blank={14} />, hereby applies for permission for{' '}
        <Choose options={OPTIONS.vending_activity} selected={v.vending_activity} /> activity as{' '}
        <Choose options={OPTIONS.vending_mode} selected={v.vending_mode} /> vending in the
        <Fill value={v.zone_name || v.ward_name} blank={14} />zone.
      </p>

      <div style={{ marginTop: 22 }}>Place: {v.application_place ?? ''}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
        <div>Dated: {formatDate(v.application_date)}</div>
        <div style={{ width: 200, textAlign: 'center' }}>
          {v.signature ? <img src={mediaUrl(v.signature)} alt="" style={{ height: 36, maxWidth: 200, objectFit: 'contain' }} /> : <div style={{ height: 36 }} />}
          <div>Signature</div>
        </div>
      </div>

      <div style={{ paddingLeft: 200, marginTop: 12 }}>
        <Dotted label="Name of Applicant" value={fullName(v)} />
        <Dotted label="Local Address" value={localAddressLine(v)} />
        <Dotted label="Permanent Address" value={v.permanent_address} />
      </div>

      <div style={{ marginTop: 6 }}>Family Members:</div>
      <div style={{ marginTop: 10 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ paddingLeft: 20, marginBottom: 9 }}>
            {i + 1}.&nbsp; Name: {i < members.length ? <b>{members[i].name}</b> : '.'.repeat(55)},&nbsp; relation:{' '}
            {i < members.length ? <b>{members[i].relation ?? ''}</b> : '.'.repeat(40)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------- Form I : Survey answers ----------------

function answer(v, key) {
  const kind = FIELDS[key][1]
  const value = v[key]
  if (value == null || value === '') return '—'
  if (kind === 'bool') return value ? 'Yes' : 'No'
  if (kind === 'multi') return (value ?? []).join(', ') || '—'
  if (kind === 'date') return formatDate(value)
  if (kind === 'select') return display(v, key) || '—'
  if (key === 'created_at' || key === 'updated_at') return new Date(value).toLocaleString()
  return String(value)
}

function Form1({ v }) {
  const members = (v.family_members ?? []).filter(m => m?.name?.trim())
  const photos = MEDIA.filter(([key, , kind]) => kind === 'image' && v[key] && !/\.pdf$/i.test(v[key]))
  return (
    <div className="sv-a4 sv-form1">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <img src={LOGO} alt="" style={{ width: 48, height: 48 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Form-I · Survey form for street vendors</div>
          <div style={{ color: '#555' }}>{fullName(v)} · Record #{v.id} · {v.application_no ?? 'Draft'}</div>
        </div>
      </div>
      {SECTIONS.map(section => (
        <table key={section.title} className="sv-table">
          <thead><tr><th colSpan={2}>{section.title}</th></tr></thead>
          <tbody>
            {section.fields.map(key => (
              <tr key={key}><td>{FIELDS[key][0]}</td><td>{answer(v, key)}</td></tr>
            ))}
            {section.family && (
              <tr>
                <td>Family members</td>
                <td>{members.length ? members.map(m => `${m.name}${m.relation ? ` (${m.relation})` : ''}${m.age != null ? `, ${m.age}` : ''}`).join('; ') : '—'}</td>
              </tr>
            )}
          </tbody>
        </table>
      ))}
      {photos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, breakInside: 'avoid' }}>
          {photos.map(([key, label]) => (
            <figure key={key} style={{ margin: 0, width: 150 }}>
              <img src={mediaUrl(v[key])} alt="" style={{ width: 150, height: 120, objectFit: 'cover', border: '1px solid #ccc' }} />
              <figcaption style={{ fontSize: 10 }}>{label}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}

const PRINT_CSS = cr80 => `
  body { background: #e5e7eb; margin: 0; }
  .sv-print-root { font-family: Arial, Helvetica, sans-serif; color: #000; }
  .sv-toolbar { position: sticky; top: 0; z-index: 10; display: flex; gap: 12px; align-items: center; justify-content: flex-end;
    padding: 10px 20px; background: #1e3a5f; color: #fff; }
  .sv-toolbar strong { margin-right: auto; }
  .sv-btn { background: #fff; color: #1e3a5f; border: none; border-radius: 6px; padding: 7px 14px; font-weight: 600; cursor: pointer; text-decoration: none; font-size: 13px; }
  .sv-btn-light { background: rgba(255,255,255,0.15); color: #fff; }
  .sv-warning { max-width: 210mm; margin: 16px auto 0; padding: 10px 14px; background: #fff7ed; color: #9a3412; border: 1px solid #fdba74; border-radius: 6px; font-size: 14px; }
  .sv-a4 { width: 210mm; min-height: 297mm; box-sizing: border-box; margin: 16px auto; padding: 48px 56px; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.15); }
  .sv-form2 { font-size: 11pt; line-height: 1.9; }
  .sv-form1 { font-size: 10pt; padding: 32px 40px; }
  .sv-photo-box { width: 92px; height: 112px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 9pt; overflow: hidden; flex-shrink: 0; }
  .sv-photo-box img { width: 100%; height: 100%; object-fit: cover; }
  .sv-card-slot { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 24px; }
  .sv-card { width: 85.6mm; height: 54mm; box-sizing: border-box; border: 0.2mm solid #000; border-radius: 2mm; overflow: hidden; display: flex; flex-direction: column; background: #fff; }
  .sv-card-head { background: ${NAVY}; color: #fff; display: flex; align-items: center; gap: 1.4mm; padding: 0.9mm 1.8mm; font-size: 2.8mm; font-weight: 700; white-space: nowrap; overflow: hidden;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sv-card-head img { width: 5.3mm; height: 5.3mm; object-fit: contain; }
  .sv-card-body { flex: 1; padding: 1.4mm 2.1mm; min-height: 0; }
  .sv-card-line { font-size: 2.4mm; line-height: 1.25; margin-bottom: 0.78mm; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .sv-card-photo { width: 19mm; height: 23mm; border: 0.18mm solid #000; display: flex; align-items: center; justify-content: center; font-size: 2.4mm; overflow: hidden; }
  .sv-card-photo img { width: 100%; height: 100%; object-fit: cover; }
  .sv-cr80-page { width: 85.6mm; margin: 16px auto; }
  .sv-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; break-inside: auto; }
  .sv-table th { text-align: left; background: #eef2f7; padding: 5px 8px; border: 1px solid #cbd5e1; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sv-table td { padding: 4px 8px; border: 1px solid #cbd5e1; vertical-align: top; }
  .sv-table td:first-child { width: 45%; color: #374151; }
  @media print {
    body { background: #fff; }
    .sv-toolbar, .sv-warning { display: none; }
    .sv-a4 { margin: 0; box-shadow: none; min-height: auto; width: auto; }
    ${cr80
      ? `@page { size: 85.6mm 54mm; margin: 0; }
         .sv-cr80-page { margin: 0; page-break-after: always; }
         .sv-card { border-radius: 0; border: none; }`
      : `@page { size: A4; margin: 0; }`}
  }
`
