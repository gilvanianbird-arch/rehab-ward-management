'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [patients, setPatients] = useState<any[]>([])

  useEffect(() => {
    fetchPatients()
  }, [])

  async function fetchPatients() {
    const { data, error } = await supabase.from('patients').select('*')

    if (error) {
      console.error(error)
    } else {
      setPatients(data)
    }
  }

  async function addPatient() {
    const { error } = await supabase.from('patients').insert([
      {
        name: 'テスト患者',
        disease: '脳血管',
        admission_days: 30,
        fim_total: 80,
        fim_initial: 70,
        target_days: 110,
        discharge_status: '未開始'
      }
    ])

    if (!error) fetchPatients()
  }

  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">患者一覧</h1>

      <button
        onClick={addPatient}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        テスト追加
      </button>

      <ul>
        {patients.map((p) => (
          <li key={p.id}>
            {p.name} / {p.admission_days}日 / FIM:{p.fim_total}
          </li>
        ))}
      </ul>
    </div>
  )
}
