'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TaskOwner = 'investor' | 'agent' | 'lender' | 'inspector' | 'pm' | 'contractor' | 'title'

const STAGE_LABELS: Record<string, string> = {
  exploring: 'Exploring',
  active_interest: 'Active interest',
  offer_submitted: 'Offer submitted',
  under_contract: 'Under contract',
  clear_to_close: 'Clear to close',
  closed_setup: 'Setting up',
  performing: 'Performing',
}

const OWNER_COLORS: Record<TaskOwner, string> = {
  investor:   'bg-gold/10 text-gold',
  agent:      'bg-[#2E7D5E]/15 text-[#5EC89A]',
  lender:     'bg-blue-500/15 text-blue-300',
  inspector:  'bg-purple-500/15 text-purple-300',
  pm:         'bg-teal-500/15 text-teal-300',
  contractor: 'bg-orange-500/15 text-orange-300',
  title:      'bg-slate/20 text-[#888888]',
}

export function DealTrackerCard({ tracker }: { tracker: any }) {
  const [tasks, setTasks] = useState<any[]>(tracker.tasks ?? [])
  const [expanded, setExpanded] = useState(tracker.stage === 'under_contract')
  const supabase = createClient()

  const property = tracker.properties
  const blocking = tasks.filter(t => t.blocking && !t.completed)
  const pending = tasks.filter(t => !t.completed)
  const done = tasks.filter(t => t.completed)

  async function toggleTask(taskId: string) {
    const updated = tasks.map(t =>
      t.id === taskId
        ? { ...t, completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : null }
        : t
    )
    setTasks(updated)
    await supabase
      .from('deal_tracker')
      .update({ tasks: updated, updated_at: new Date().toISOString() })
      .eq('id', tracker.id)
  }

  const stageColor =
    tracker.stage === 'under_contract' ? 'text-[#5EC89A]' :
    tracker.stage === 'performing' ? 'text-[#5EC89A]' :
    'text-gold'

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-[#F5F0E8]/20 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-[#1A1A1A] text-sm font-medium truncate">{property?.address}, {property?.city} {property?.zip}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium ${stageColor}`}>{STAGE_LABELS[tracker.stage]}</span>
            {blocking.length > 0 && (
              <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded-full">
                {blocking.length} blocking
              </span>
            )}
            {pending.length === 0 && (
              <span className="text-[10px] bg-[#2E7D5E]/15 text-[#5EC89A] px-1.5 py-0.5 rounded-full">
                All done ✓
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          <div className="w-24 h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all"
              style={{ width: `${tasks.length > 0 ? (done.length / tasks.length) * 100 : 0}%` }} />
          </div>
          <span className="text-xs text-[#888888]">{done.length}/{tasks.length}</span>
        </div>

        <span className={`text-slate2 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>›</span>
      </button>

      {/* Blocking flag */}
      {blocking.length > 0 && expanded && (
        <div className="mx-5 mb-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-red-400 text-sm">🔴</span>
          <p className="text-xs text-red-300">
            <strong className="font-medium">Blocking:</strong>{' '}
            {blocking.map(t => t.task).join(' · ')}
          </p>
        </div>
      )}

      {/* Task list */}
      {expanded && (
        <div className="px-5 pb-5 space-y-2 border-t border-black/[0.05] pt-4">
          {tasks.map(task => (
            <div key={task.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${task.completed ? 'opacity-50' : task.blocking ? 'bg-red-500/5 border border-red-500/15' : 'bg-[#F5F0E8]/40'}`}>
              {/* Checkbox */}
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-5 h-5 rounded-md border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${task.completed ? 'bg-[#2E7D5E]/30 border-[#2E7D5E]/50' : 'border-black/15 hover:border-gold/40'}`}>
                {task.completed && <span className="text-[#5EC89A] text-xs">✓</span>}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.completed ? 'line-through text-[#888888]' : 'text-[#2A2A2A]'}`}>
                  {task.task}
                </p>
                {task.notes && !task.completed && (
                  <p className="text-xs text-[#888888] mt-0.5 leading-relaxed">{task.notes}</p>
                )}
                {task.due_note && !task.completed && (
                  <p className="text-[10px] text-red-400 mt-1 font-medium uppercase tracking-wider">{task.due_note}</p>
                )}
              </div>

              {/* Owner badge */}
              <span className={`text-[10px] px-2 py-1 rounded-lg flex-shrink-0 font-medium ${OWNER_COLORS[task.owner as TaskOwner] ?? 'bg-white/5 text-[#888888]'}`}>
                {task.owner}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
