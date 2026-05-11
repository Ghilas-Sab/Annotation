import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjects, useCreateProject, useDeleteProject } from '../api/projects'
import { Logo, ThemeToggle, Icon, EmptyState } from '../components/ui'
import type { Project } from '../types/project'

function WaveformOverlay({ visible }: { visible: boolean }) {
  const bars = 24
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end',
      padding: '0 12px 12px', gap: 3,
      opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease',
      background: 'linear-gradient(to top, hsla(228,20%,5%,0.85) 0%, transparent 60%)',
      pointerEvents: 'none',
    }}>
      {Array.from({ length: bars }).map((_, i) => {
        const h = 6 + Math.sin(i * 0.7) * 8 + Math.random() * 14
        return (
          <div key={i} style={{
            flex: 1, borderRadius: '2px 2px 0 0',
            background: `hsl(var(--chart-1) / ${0.5 + Math.sin(i * 0.5) * 0.3})`,
            height: Math.max(4, h),
            animation: visible ? `waveform-in 0.3s ease ${i * 0.02}s both` : 'none',
          }} />
        )
      })}
    </div>
  )
}

function ProjectThumbnail({ name }: { name: string }) {
  const hue = (name.charCodeAt(0) * 13 + 180) % 360
  return (
    <svg width="100%" height="100%" viewBox="0 0 280 158" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`pg-${name}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={`hsl(${hue},25%,10%)`} />
          <stop offset="100%" stopColor={`hsl(${hue + 18},20%,16%)`} />
        </linearGradient>
      </defs>
      <rect width="280" height="158" fill={`url(#pg-${name})`} />
      {[0.08, 0.18, 0.29, 0.41, 0.52, 0.63, 0.74, 0.85].map((p, i) => (
        <rect key={i} x={p * 280} y={158 - 28} width="1.5" height={16 + Math.sin(i) * 6}
          fill={`hsla(${hue},84%,70%,${0.4 + i * 0.06})`} rx="0.75" />
      ))}
      <circle cx="140" cy="79" r="20" fill="hsla(0,0%,0%,0.38)" />
      <polygon points="133,70 133,88 151,79" fill="rgba(255,255,255,0.65)" />
    </svg>
  )
}

function ProjectCard({ project, onClick, onDelete }: { project: Project; onClick: () => void; onDelete?: (id: string) => void }) {
  const [hov, setHov] = useState(false)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 10, overflow: 'hidden', position: 'relative',
        background: 'var(--card-bg)',
        border: `1px solid ${hov ? 'hsl(var(--accent)/0.45)' : 'var(--border-c)'}`,
        boxShadow: hov ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
        transform: hov ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.2s ease',
      }}
    >
      <div onClick={onClick} style={{ cursor: 'pointer' }}>
        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000', overflow: 'hidden' }}>
          <ProjectThumbnail name={project.name} />
          <WaveformOverlay visible={hov} />
          <div className="badge badge-muted" style={{
            position: 'absolute', bottom: 10, left: 10,
            background: 'hsl(var(--surface-glass))', backdropFilter: 'blur(10px)',
          }}>
            {(project.videos?.length ?? 0)} vidéo{(project.videos?.length ?? 0) !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ padding: '12px 14px 14px' }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, letterSpacing: '-0.01em', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </div>
          {project.description && (
            <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.description}
            </div>
          )}
        </div>
      </div>
      {onDelete && (
        <button
          className="btn btn-danger btn-xs btn-icon"
          aria-label="Supprimer le projet"
          onClick={e => { e.stopPropagation(); if (window.confirm(`Supprimer le projet "${project.name}" ?`)) onDelete(project.id) }}
          style={{ position: 'absolute', top: 8, right: 8, opacity: hov ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: hov ? 'auto' : 'none' }}
        >
          <Icon.Trash />
        </button>
      )}
    </div>
  )
}

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate()
  const { data: projects = [], isLoading, error } = useProjects()
  const createMutation = useCreateProject()
  const deleteMutation = useDeleteProject()

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [search, setSearch] = useState('')
  const [activeFilter] = useState<'all' | 'recent' | 'starred'>('all')

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalVideos = projects.reduce((a, p) => a + (p.videos?.length ?? 0), 0)

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const created = await createMutation.mutateAsync({ name: newName.trim(), description: '' })
      setNewName('')
      setCreating(false)
      navigate(`/projects/${created.id}`)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    try { await deleteMutation.mutateAsync(id) } catch (err) { console.error(err) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <header className="topbar">
        <Logo />
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 20, marginRight: 16 }}>
          {[['Projets', projects.length], ['Vidéos', totalVideos]].map(([l, v]) => (
            <div key={String(l)} style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Geist Mono,monospace', fontSize: 12, fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 1 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)', pointerEvents: 'none' }}>
            <Icon.Search />
          </div>
          <input
            className="input input-sm"
            style={{ width: 180, paddingLeft: 28 }}
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <ThemeToggle />
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon.Plus /> Nouveau projet
        </button>
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div className="text-h2">Gestion des Projets</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              {filtered.length} projet{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['Tous', 'Récents'] as const).map((t, i) => (
              <button key={t} className="btn btn-ghost btn-sm" style={{
                background: i === 0 ? 'var(--ac-muted)' : 'transparent',
                color: i === 0 ? 'var(--ac)' : 'var(--text-2)',
                border: `1px solid ${i === 0 ? 'var(--border-ac)' : 'var(--border-c)'}`,
              }}>{t}</button>
            ))}
          </div>
        </div>

        {creating && (
          <div className="fade-up" style={{
            background: 'var(--elevated)', border: '1px solid var(--border-ac)',
            borderRadius: 10, padding: '16px 18px', marginBottom: 20,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Créer un nouveau projet</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label htmlFor="project-name" style={{ display: 'none' }}>Nom du projet</label>
              <input
                id="project-name"
                className="input"
                aria-label="Nom du projet"
                placeholder="Nom du projet…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') { setCreating(false); setNewName('') }
                }}
                autoFocus
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
                {createMutation.isPending ? 'Création…' : 'Créer le projet →'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setCreating(false); setNewName('') }}>Annuler</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-2)' }}>
            Chargement des projets…
          </div>
        ) : error ? (
          <div style={{ color: 'var(--danger-c)', padding: '2rem' }}>Une erreur est survenue lors du chargement.</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Icon.Video />}
            title="Aucun projet"
            description="Créez votre premier projet pour commencer à annoter."
            action={<button className="btn btn-primary" onClick={() => setCreating(true)}><Icon.Plus /> Nouveau projet</button>}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 18 }}>
            {filtered.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}`)} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectsPage
