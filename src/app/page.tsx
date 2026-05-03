'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '../lib/supabase-browser'
const supabase = createSupabaseBrowserClient()

export default function Home() {
  const supabase = createSupabaseBrowserClient()
  const [userRole, setUserRole] = useState<string | null>(null)
  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single()
      setUserRole(data?.role ?? null)
    }
    fetchRole()
  }, [])
  const [patients, setPatients] = useState<any[]>([])
  const [name, setName] = useState('')
  const [disease, setDisease] = useState('脳血管')
  const [admissionDate, setAdmissionDate] = useState('')
  const [editingPatient, setEditingPatient] = useState<any | null>(null)
  const [fimInitial, setFimInitial] = useState('')
  const [fimCurrent, setFimCurrent] = useState('')
  const [fimTarget, setFimTarget] = useState('')

  function calcDays(dateString: string): number {
    if (!dateString) return 0
      const nowJST = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
    )
    const todayJST = new Date(
      nowJST.getFullYear(),
      nowJST.getMonth(),
      nowJST.getDate()
    )

    const admission = new Date(dateString)
    const admissionDate = new Date(
      admission.getFullYear(),
      admission.getMonth(),
      admission.getDate()
    )

    if (isNaN(admissionDate.getTime())) return 0

    const diff = todayJST.getTime() - admissionDate.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
  }

  function calcRemainingDays(p: any): number {
    if (!p.admission_date || !p.target_days) return 0
    return p.target_days - calcDays(p.admission_date)
  }

  // 目標退院日を計算（入院日 + target_days）
  function calcTargetDischargeDate(p: any): string {
    if (!p.admission_date || !p.target_days) return '-'
    const admission = new Date(p.admission_date)
    admission.setDate(admission.getDate() + p.target_days - 1)
    return admission.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  // 疾患別の目標入院日数をイジるのはここ！！
  function getDiseaseParams(disease: string): { targetDays: number; limitDays: number } {
    if (disease === '脳血管') return { targetDays: 120, limitDays: 150 }
    if (disease === '運動器(90日)') return { targetDays: 80, limitDays: 90 }
    if (disease === '廃用') return { targetDays: 70, limitDays: 90 }
    return { targetDays: 50, limitDays: 60 }
  }

  // 実績指数（現在）= FIM利得（退院時目標-入院時）÷ 目標入院日数 × 入院上限日数
  function calcPerformanceIndex(p: any): string {
    const { targetDays, limitDays } = getDiseaseParams(p.disease)
    if (p.fim_initial == null || p.fim_target == null) return '-'
    const fimGain = p.fim_target - p.fim_initial
    if (fimGain <= 0) return '0.00'
    return (fimGain / targetDays * limitDays).toFixed(2)
  }

  // 予測実績指数（目標退院日時点も同じ計算式）
  function calcPredictedIndex(p: any): string {
    return calcPerformanceIndex(p)
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  // FIM頭打ち判定（前回値との差が3点未満）
  function isFimPlateau(p: any): boolean {
    if (p.fim_previous == null || p.fim_total == null) return false
    return (p.fim_total - p.fim_previous) <= 3
  }

  // カンファ未実施アラート（方向性が未定の患者）
  function isConferenceAlert(p: any): boolean {
    if (p.discharge_direction && p.discharge_direction !== '未定') return false
    if (!p.last_conference_date) return true
    const last = new Date(p.last_conference_date)
    const nowJST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const diff = Math.floor((nowJST.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 14
  }

  // 退院促進スコア（高いほど要対応）
  function calcDischargeScore(p: any): number {
    let score = 0
    if (isFimPlateau(p)) score += 3
    if (isConferenceAlert(p)) score += 2
    if (p.discharge_direction === '未定') score += 2
    const remaining = calcRemainingDays(p)
    if (remaining <= 14 && remaining > 0) score += 2
    if (remaining <= 0) score += 3
    return score
  }

  async function fetchPatients() {
    const { data, error } = await supabase.from('patients').select('*')
    if (error) {
      console.error('fetch error:', error)
    } else {
      setPatients(data || [])
    }
  }

  async function addPatient() {
    if (!name || !admissionDate) {
      alert('名前と入院日を入力してください')
      return
    }

    const { error } = await supabase.from('patients').insert([
      {
        name,
        disease,
        admission_date: admissionDate,
        fim_total: 80,
        fim_initial: 70,
        target_days:
          disease === '脳血管' ? 120 :
          disease === '運動器(90日)' ? 80 :
          disease === '廃用' ? 70 :
          50,
        discharge_status: '未開始'
      }
    ])

    if (error) {
      console.error('insert error:', error)
      alert('登録に失敗しました')
      return
    }

    setName('')
    setAdmissionDate('')
    setDisease('脳血管')
    fetchPatients()
  }

  async function updateFim() {
    if (!editingPatient) return

    const { error } = await supabase
      .from('patients')
      .update({
        fim_initial: Number(fimInitial),
        fim_total: Number(fimCurrent),
        fim_target: Number(fimTarget),
      })
      .eq('id', editingPatient.id)

    if (error) {
      console.error('update error:', error)
      alert('更新に失敗しました')
      return
    }

    setEditingPatient(null)
    fetchPatients()
  }

  async function updateDischargeStatus(id: number, status: string) {
    const { error } = await supabase
      .from('patients')
      .update({ discharge_status: status })
      .eq('id', id)

    if (error) {
      console.error('status update error:', error)
      alert('更新に失敗しました')
      return
    }

    fetchPatients()
  }

  async function deletePatient(id: number, name: string) {
    if (!confirm(`${name}さんのデータを削除しますか？`)) return

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('delete error:', error)
      alert('削除に失敗しました')
      return
    }

    fetchPatients()
  }

  async function updateConference(id: number, date: string) {
    const { error } = await supabase
      .from('patients')
      .update({ last_conference_date: date })
      .eq('id', id)
    if (error) { console.error(error); return }
    fetchPatients()
  }

  async function updateDischargeDirection(id: number, direction: string) {
    const { error } = await supabase
      .from('patients')
      .update({ discharge_direction: direction })
      .eq('id', id)
    if (error) { console.error(error); return }
    fetchPatients()
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      {/* ヘッダー */}
      <header className="bg-blue-700 text-white px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🏥</div>
            <div>
              <h1 className="text-xl font-bold leading-tight">回復期リハ 患者管理システム</h1>
              <p className="text-blue-200 text-xs">Rehabilitation Ward Management</p>
            </div>
          </div>
          <button
            onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/login'
            }}
            className="text-sm bg-blue-800 hover:bg-blue-900 px-4 py-2 rounded-lg transition"
          >
            ログアウト
          </button>
        </div>
      </header>

    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* サマリーカード */}
      {(() => {
        const activePatientsAll = patients.filter((p) => p.admission_date)
        const activePatients = activePatientsAll.filter((p) => p.discharge_status !== '退院済み')
        const alertPatients = activePatients.filter((p) => isFimPlateau(p) || isConferenceAlert(p))
        const avgIndex = (() => {
          const valid = activePatientsAll.filter((p) => {
            const idx = parseFloat(calcPerformanceIndex(p))
            return !isNaN(idx)
          })
          if (valid.length === 0) return '-'
          const sum = valid.reduce((acc, p) => acc + parseFloat(calcPerformanceIndex(p)), 0)
          return (sum / valid.length).toFixed(2)
        })()

        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">在棟患者数</p>
              <p className="text-3xl font-bold text-blue-600">{activePatients.length}<span className="text-sm font-normal text-gray-500 ml-1">名</span></p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">病棟平均実績指数</p>
              <p className={`text-3xl font-bold ${parseFloat(avgIndex) >= 0.5 ? 'text-green-600' : parseFloat(avgIndex) >= 0.3 ? 'text-orange-500' : 'text-red-600'}`}>
                {avgIndex}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">要対応患者数</p>
              <p className="text-3xl font-bold text-red-500">{alertPatients.length}<span className="text-sm font-normal text-gray-500 ml-1">名</span></p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">退院済み（総数）</p>
              <p className="text-3xl font-bold text-gray-400">
                {activePatientsAll.filter((p) => p.discharge_status === '退院済み').length}
                <span className="text-sm font-normal text-gray-500 ml-1">名</span>
              </p>
            </div>
          </div>
        )
      })()}

      {/* 入力フォーム */}
      {userRole === 'admin' && (
        <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">患者登録</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              placeholder="名前"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 bg-white text-gray-900 p-2 rounded-lg text-sm w-32"
            />
            <select
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              className="border border-gray-300 bg-white text-gray-900 p-2 rounded-lg text-sm"
            >
              <option value="脳血管">脳血管</option>
              <option value="運動器(90日)">運動器(90日)</option>
              <option value="運動器(60日)">運動器(60日)</option>
              <option value="廃用">廃用症候群</option>
            </select>
            <input
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className="border border-gray-300 bg-white text-gray-900 p-2 rounded-lg text-sm"
            />
            <button
              onClick={addPatient}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              登録
            </button>
            </div>
        </div>
      )}

      {/* 患者一覧テーブル */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="p-3 text-left font-medium whitespace-nowrap">名前</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">疾患</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">入院日</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">在院日数</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">残り日数</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">目標退院日</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">FIM</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">実績指数</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">退院状況</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">カンファ日</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">退院先</th>
                <th className="p-3 text-left font-medium whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {patients
                .filter((p) => p.admission_date)
                .sort((a, b) => calcDischargeScore(b) - calcDischargeScore(a))
                .map((p, i) => {
                  const remaining = calcRemainingDays(p)
                  const remainingColor =
                    remaining <= 0 ? 'text-red-600 font-bold' :
                    remaining <= 10 ? 'text-orange-500 font-semibold' :
                    'text-gray-800'

                  const perfIndex = parseFloat(calcPerformanceIndex(p))
                  const indexColor = isNaN(perfIndex) ? 'text-gray-400' :
                    perfIndex >= 0.5 ? 'text-green-600 font-semibold' :
                    perfIndex >= 0.3 ? 'text-orange-500 font-semibold' :
                    'text-red-600 font-semibold'

                  const score = calcDischargeScore(p)
                  const scoreColor =
                    score >= 6 ? 'bg-red-100 text-red-800' :
                    score >= 3 ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-600'

                  const plateau = isFimPlateau(p)
                  const confAlert = isConferenceAlert(p)

                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-gray-100 hover:bg-blue-50 transition-colors
                        ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-medium text-gray-900 whitespace-nowrap">{p.name}</span>
                          {plateau && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full whitespace-nowrap">FIM↑止</span>
                          )}
                          {confAlert && (
                            <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full whitespace-nowrap">カンファ</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 whitespace-nowrap">
                        {p.disease === '脳血管' ? '脳血管' :
                         p.disease === '運動器(90日)' ? '運動器(90日)' :
                         p.disease === '運動器(60日)' ? '運動器(60日)' :
                         p.disease === '廃用' ? '廃用' : p.disease}
                      </td>
                      <td className="p-3 text-gray-600 whitespace-nowrap">
                        {p.admission_date
                          ? new Date(p.admission_date).toLocaleDateString('ja-JP', {
                              year: 'numeric', month: '2-digit', day: '2-digit'
                            })
                          : '-'}
                      </td>
                      <td className="p-3 text-gray-800 whitespace-nowrap">
                        {calcDays(p.admission_date)}日
                      </td>
                      <td className={`p-3 whitespace-nowrap ${remainingColor}`}>
                        {remaining}日
                      </td>
                      <td className="p-3 text-gray-600 whitespace-nowrap">
                        {calcTargetDischargeDate(p)}
                      </td>
                      <td className="p-3 font-mono text-gray-700 whitespace-nowrap">
                        {p.fim_initial ?? '-'} → {p.fim_total ?? '-'} → {p.fim_target ?? '-'}
                      </td>
                      <td className={`p-3 font-mono whitespace-nowrap ${indexColor}`}>
                        <div>{calcPerformanceIndex(p)}</div>
                        <div className="text-xs text-gray-400">予測:{calcPredictedIndex(p)}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <select
                          value={p.discharge_status ?? '未開始'}
                          onChange={(e) => updateDischargeStatus(p.id, e.target.value)}
                          className={`border rounded-lg px-2 py-1 text-xs font-medium
                            ${p.discharge_status === '退院済み' ? 'bg-green-100 text-green-800 border-green-300' :
                              p.discharge_status === '進行中' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              'bg-gray-100 text-gray-700 border-gray-300'}
                          `}
                        >
                          <option value="未開始">未開始</option>
                          <option value="進行中">進行中</option>
                          <option value="退院済み">退院済み</option>
                        </select>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <input
                          type="date"
                          value={p.last_conference_date ?? ''}
                          onChange={(e) => updateConference(p.id, e.target.value)}
                          className={`border rounded-lg px-2 py-1 text-xs
                            ${confAlert ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
                          `}
                        />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <select
                          value={p.discharge_direction ?? '未定'}
                          onChange={(e) => updateDischargeDirection(p.id, e.target.value)}
                          className={`border rounded-lg px-2 py-1 text-xs
                            ${p.discharge_direction === '未定' ? 'border-orange-300 bg-orange-50 text-orange-800' : 'border-gray-300 bg-white text-gray-700'}
                          `}
                        >
                          <option value="未定">未定</option>
                          <option value="自宅">自宅</option>
                          <option value="施設">施設</option>
                          <option value="転院">転院</option>
                        </select>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs text-center rounded-full px-2 py-0.5 ${scoreColor}`}>
                            スコア:{score}
                          </span>
                          {userRole === 'admin' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingPatient(p)
                                  setFimInitial(p.fim_initial ?? '')
                                  setFimCurrent(p.fim_total ?? '')
                                  setFimTarget(p.fim_target ?? '')
                                }}
                                className="text-blue-600 hover:text-blue-800 text-xs underline whitespace-nowrap"
                              >
                                FIM編集
                              </button>
                              <button
                                onClick={() => deletePatient(p.id, p.name)}
                                className="text-red-500 hover:text-red-700 text-xs underline whitespace-nowrap"
                              >
                                削除
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>

          {patients.filter((p) => p.admission_date).length === 0 && (
            <p className="text-gray-400 text-center py-12">患者データがありません</p>
          )}
        </div>
      </div>
    </div>

    {/* FIM編集モーダル */}
    {editingPatient && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-80 shadow-2xl">
          <h2 className="text-lg font-bold mb-4 text-gray-800">
            FIM編集：{editingPatient.name}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">入院時FIM（運動項目合計）</label>
              <input
                type="number" min={0} max={91}
                value={fimInitial}
                onChange={(e) => setFimInitial(e.target.value)}
                className="border border-gray-300 rounded-lg p-2 w-full text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">現在FIM（運動項目合計）</label>
              <input
                type="number" min={0} max={91}
                value={fimCurrent}
                onChange={(e) => setFimCurrent(e.target.value)}
                className="border border-gray-300 rounded-lg p-2 w-full text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">退院時目標FIM（運動項目合計）</label>
              <input
                type="number" min={0} max={91}
                value={fimTarget}
                onChange={(e) => setFimTarget(e.target.value)}
                className="border border-gray-300 rounded-lg p-2 w-full text-gray-900"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={updateFim}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => setEditingPatient(null)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg font-medium transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)
}